import gettext as gettext_module
import importlib
import json
import os

from orun.shortcuts import render
from orun.apps import apps
from orun.conf import settings
#from orun.core.urlresolvers import translate_url
from orun.http import HttpResponse, JsonResponse
from orun.utils.encoding import smart_text
from orun.utils.formats import get_format, get_format_modules
from orun.utils.translation import (
    LANGUAGE_SESSION_KEY, check_for_language, get_language, to_locale,
)

DEFAULT_PACKAGES = ['orun.conf']
LANGUAGE_QUERY_PARAMETER = 'language'


# def set_language(request):
#     """
#     Redirect to a given url while setting the chosen language in the
#     session or cookie. The url and the language code need to be
#     specified in the request parameters.
#
#     Since this view changes how the user will see the rest of the site, it must
#     only be accessed as a POST request. If called as a GET request, it will
#     redirect to the page in the request (the 'next' parameter) without changing
#     any state.
#     """
#     next = request.POST.get('next', request.GET.get('next'))
#     response = app.make_response(redirect(next))
#     if request.method == 'POST':
#         lang_code = request.POST.get(LANGUAGE_QUERY_PARAMETER)
#         if lang_code and check_for_language(lang_code):
#             next_trans = translate_url(next, lang_code)
#             if next_trans != next:
#                 return redirect(next_trans)
#             if hasattr(request, 'session'):
#                 request.session[LANGUAGE_SESSION_KEY] = lang_code
#             else:
#                 response.set_cookie(settings.LANGUAGE_COOKIE_NAME, lang_code,
#                                     max_age=settings.LANGUAGE_COOKIE_AGE,
#                                     path=settings.LANGUAGE_COOKIE_PATH,
#                                     domain=settings.LANGUAGE_COOKIE_DOMAIN)
#     return response
#

def get_formats():
    """
    Returns all formats strings required for i18n to work
    """
    FORMAT_SETTINGS = (
        'DATE_FORMAT', 'DATETIME_FORMAT', 'TIME_FORMAT',
        'YEAR_MONTH_FORMAT', 'MONTH_DAY_FORMAT', 'SHORT_DATE_FORMAT',
        'SHORT_DATETIME_FORMAT', 'FIRST_DAY_OF_WEEK', 'DECIMAL_SEPARATOR',
        'THOUSAND_SEPARATOR', 'NUMBER_GROUPING',
        'DATE_INPUT_FORMATS', 'TIME_INPUT_FORMATS', 'DATETIME_INPUT_FORMATS'
    )
    result = {}
    for module in [settings] + get_format_modules(reverse=True):
        for attr in FORMAT_SETTINGS:
            result[attr] = get_format(attr)
    formats = {}
    for k, v in result.items():
        if isinstance(v, (str, int)):
            formats[k] = smart_text(v)
        elif isinstance(v, (tuple, list)):
            formats[k] = [smart_text(value) for value in v]
    return formats


js_catalog_template = r"""
(function(globals) {
  /* initialize gettext library */
  globals.katrid.i18n.initialize('{{ plural|safe or 'false' }}', {{ catalog_str|safe or '{}' }}, {{ format_str|safe or '[]' }});
}(this));
"""


def render_javascript_catalog(catalog=None, plural=None):
    indent = lambda s: s.replace('\n', '\n  ')
    ctx = {
        'catalog_str': indent(json.dumps(
            catalog, sort_keys=True, indent=2)) if catalog else None,
        'formats_str': indent(json.dumps(
            get_formats(), sort_keys=True, indent=2)),
        'plural': plural,
    }
    template = render_template_string(js_catalog_template, **ctx)

    return Response(template, mimetype='text/javascript')


def get_javascript_catalog(locale, domain, packages):
    default_locale = to_locale(settings.LANGUAGE_CODE)
    addons = apps.addons
    allowable_packages = set(addons.keys())
    allowable_packages.update(DEFAULT_PACKAGES)
    packages = [p for p in packages if p in allowable_packages]
    t = {}
    paths = []
    en_selected = locale.startswith('en')
    en_catalog_missing = True
    # paths of requested packages
    for package in packages:
        p = apps.addons[package]
        path = os.path.join(p.path, 'locale')
        paths.append(path)
    # add the filesystem paths listed in the LOCALE_PATHS setting
    paths.extend(reversed(settings.LOCALE_PATHS))
    # first load all english languages files for defaults
    for path in paths:
        try:
            catalog = gettext_module.translation(domain, path, ['en'])
            t.update(catalog._catalog)
        except IOError:
            pass
        else:
            # 'en' is the selected language and at least one of the packages
            # listed in `packages` has an 'en' catalog
            if en_selected:
                en_catalog_missing = False
    # next load the settings.LANGUAGE_CODE translations if it isn't english
    if default_locale != 'en':
        for path in paths:
            try:
                catalog = gettext_module.translation(domain, path, [default_locale])
            except IOError:
                catalog = None
            if catalog is not None:
                t.update(catalog._catalog)
    # last load the currently selected language, if it isn't identical to the default.
    if locale != default_locale:
        # If the currently selected language is English but it doesn't have a
        # translation catalog (presumably due to being the language translated
        # from) then a wrong language catalog might have been loaded in the
        # previous step. It needs to be discarded.
        if en_selected and en_catalog_missing:
            t = {}
        else:
            locale_t = {}
            for path in paths:
                try:
                    catalog = gettext_module.translation(domain, path, [locale])
                except IOError:
                    catalog = None
                if catalog is not None:
                    locale_t.update(catalog._catalog)
            if locale_t:
                t = locale_t
    plural = None
    if '' in t:
        for l in t[''].split('\n'):
            if l.startswith('Plural-Forms:'):
                plural = l.split(':', 1)[1].strip()
    if plural is not None:
        # this should actually be a compiled function of a typical plural-form:
        # Plural-Forms: nplurals=3; plural=n%10==1 && n%100!=11 ? 0 :
        #               n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2;
        plural = [el.strip() for el in plural.split(';') if el.strip().startswith('plural=')][0].split('=', 1)[1]

    pdict = {}
    maxcnts = {}
    catalog = {}
    for k, v in t.items():
        if k == '':
            continue
        if isinstance(k, str):
            catalog[k] = v
        elif isinstance(k, tuple):
            msgid = k[0]
            cnt = k[1]
            maxcnts[msgid] = max(cnt, maxcnts.get(msgid, 0))
            pdict.setdefault(msgid, {})[cnt] = v
        else:
            raise TypeError(k)
    for k, v in pdict.items():
        catalog[k] = [v.get(i, '') for i in range(maxcnts[msgid] + 1)]

    return catalog, plural


def _get_locale(request):
    language = request.GET.get(LANGUAGE_QUERY_PARAMETER)
    if not (language and check_for_language(language)):
        language = get_language()
    return to_locale(language)


def _parse_packages(packages):
    if packages is None:
        packages = list(DEFAULT_PACKAGES)
    elif isinstance(packages, str):
        packages = packages.split('+')
    return packages


def null_javascript_catalog(request, domain=None, packages=None):
    """
    Returns "identity" versions of the JavaScript i18n functions -- i.e.,
    versions that don't actually do anything.
    """
    return render_javascript_catalog()


def javascript_catalog(request, domain='orunjs', packages=None):
    """
    Returns the selected language catalog as a javascript library.

    Receives the list of packages to check for translations in the
    packages parameter either from an infodict or as a +-delimited
    string from the request. Default is 'orun.conf'.

    Additionally you can override the gettext domain for this view,
    but usually you don't want to do that, as JavaScript messages
    go to the orunjs domain. But this might be needed if you
    deliver your JavaScript source from orun templates.
    """
    locale = _get_locale(request)
    packages = _parse_packages(packages)
    catalog, plural = get_javascript_catalog(locale, domain, packages)
    data = {
        'catalog': catalog,
        'formats': get_formats(),
        'plural': plural,
    }
    s = """var KATRID_I18N = %s;""" % json.dumps(data)
    return s


def json_catalog(request, domain='orunjs', packages=None):
    """
    Return the selected language catalog as a JSON object.

    Receives the same parameters as javascript_catalog(), but returns
    a response with a JSON object of the following format:

        {
            "catalog": {
                # Translations catalog
            },
            "formats": {
                # Language formats for date, time, etc.
            },
            "plural": '...'  # Expression for plural forms, or null.
        }
    """
    locale = _get_locale(request)
    packages = _parse_packages(packages)
    catalog, plural = get_javascript_catalog(locale, domain, packages)
    data = {
        'catalog': catalog,
        'formats': get_formats(),
        'plural': plural,
    }
    return jsonify(data)
