import os
import re
import json
import mimetypes
from orun.apps import apps
from orun.conf import settings
from orun.http import HttpRequest, JsonResponse, HttpResponse, FileResponse
from orun.shortcuts import render
from orun.utils.translation import gettext as _


def help_center(request: HttpRequest):
    return render(request, 'help-center/help-center.jinja2', {'settings': settings})


def _toc_items(app_name: str, tocs: dict):
    res = []
    for k, v in tocs.items():
        if isinstance(v, dict):
            res.append({
                'title': k,
                'toc': _toc_items(app_name, v),
            })
        else:
            if not v.startswith('/'):
                v = f'/{app_name}/{v}'
            res.append({'title': k, 'index': v, })
    return res


def toc(request: HttpRequest):
    # collect toc from all apps
    docs = []
    for name, app in apps.addons.items():
        fname = os.path.join(app.path, 'docs', 'index.json')
        if os.path.isfile(fname):
            with open(fname, 'r') as f:
                data = json.load(f)
                app_toc = data.get('toc')
                if app_toc:
                    app_toc = data['toc'] = _toc_items(name, app_toc)
                if data.get('include_models'):
                    if not app_toc:
                        data['toc'] = app_toc = []
                    # iter over models and extract their docs
                    models = app.get_models(False)
                    if models:
                        cur_toc = []
                        app_toc.append({'title': _('Models'), 'index': f'{name}/models/index.md', 'toc': cur_toc})
                        for m in models:
                            cur_toc.append({'title': m._meta.verbose_name, 'index': f'{name}/$models/{m._meta.name}'})
                data['name'] = name
                if 'title' not in data:
                    data['title'] = app.verbose_name
                if 'index' not in data and os.path.isfile(os.path.join(app.path, 'docs', 'index.md')):
                    data['index'] = os.path.join(name, 'index.md')
                docs.append(data)

    return JsonResponse({"toc": docs})


def prepare_content(content: str):
    RE_INCLUDE = re.compile(r'^\{\{\s*include\s+["\'](?P<filename>[\w/.-]+)["\']\s*}}\s*$', re.MULTILINE)
    for match in RE_INCLUDE.finditer(content):
        filename = match.group('filename')
        content_file = _get_content_file(filename)
        content = content.replace(match.group(0), content_file)
    return content


def get_model_help(app, model_name: str):
    model = apps.models[model_name]
    content = '## ' + str(model._meta.verbose_name_plural or model._meta.verbose_name) + '\n\n'
    if model._meta.help_text:
        content += model._meta.help_text + '\n\n'
    else:
        # try to find the model documentation file
        model_index = os.path.join(app.path, 'docs', 'models', model._meta.name, 'index.md')
        if os.path.isfile(model_index):
            with open(model_index, 'r') as f:
                content = f.read()
            content += '\n\n'
    # append fields documentation
    for f in model._meta.fields:
        if f.help_text:
            content += f'\n\n### {f.label}:  \n(`{f.name}`)  \n{f.help_text}'
    return content


def _get_content_file(filename: str):
    if filename.startswith('/'):
        filename = filename[1:]
    app_name, fname = filename.split('/', 1)
    app = apps.addons.get(app_name)
    content = ''
    if fname.startswith('$'):
        # special case (magic folders)
        if fname.startswith('$models/'):
            content = get_model_help(app, fname[8:])
    else:
        filepath = os.path.join(app.path, 'docs', fname)
        if os.path.isfile(filepath):
            with open(filepath, 'r') as f:
                content = f.read()
        elif fname == 'models/index.md':
            # fallback to models index
            content = '## Models\n\n'
            models = app.get_models(False)
            if models:
                content += '\n'.join(
                    f'- [{m._meta.verbose_name_plural}]({app_name}/$models/{m._meta.name})  \n{m._meta.help_text or ""}'
                    for m in models)
            else:
                content += 'No models found.'
    return prepare_content(content) if content else ''


def get_content(request: HttpRequest):
    content_name = request.GET.get('content')
    return JsonResponse({'content': _get_content_file(content_name)})


def get_image(request: HttpRequest, app_name, path: str):
    path = os.path.normpath(path)
    app = apps.addons.get(app_name)
    path = os.path.join(app.path, 'docs', 'images', path)
    if os.path.isfile(path):
        content_type, _ = mimetypes.guess_type(path)
        return FileResponse(open(path, 'rb'), content_type=content_type)
    return None
