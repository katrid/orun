(function() {

  const globals = this;

  // Internationalization
  Katrid.i18n = {
    languageCode: 'pt-BR',
    formats: {},
    catalog: {},

    initialize(plural, catalog, formats) {
      Katrid.i18n.plural = plural;
      Katrid.i18n.catalog = catalog;
      Katrid.i18n.formats = formats;
      if (plural) {
        Katrid.i18n.pluralidx = function (n) {
          if (plural instanceof boolean) {
            if (plural) {
              return 1;
            } else {
              return 0;
            }
          } else {
            return plural;
          }
        };
      } else {
        Katrid.i18n.pluralidx = function (n) {
          if (count === 1) {
            return 0;
          } else {
            return 1;
          }
        };
      }

      globals.pluralidx = Katrid.i18n.pluralidx;
      globals.gettext = Katrid.i18n.gettext;
      globals.ngettext = Katrid.i18n.ngettext;
      globals.gettext_noop = Katrid.i18n.gettext_noop;
      globals.pgettext = Katrid.i18n.pgettext;
      globals.npgettext = Katrid.i18n.npgettext;
      globals.interpolate = Katrid.i18n.interpolate;
      globals.get_format = Katrid.i18n.get_format;

      _.mixin({
        gettext: Katrid.i18n.gettext,
        sprintf: sprintf,
      });

      return Katrid.i18n.initialized = true;
    },

    merge(catalog) {
      return Array.from(catalog).map((key) =>
        (Katrid.i18n.catalog[key] = catalog[key]));
    },

    gettext(s) {
      const value = Katrid.i18n.catalog[s];
      if (value != null) {
        return value;
      } else {
        return s;
      }
    },

    gettext_noop(s) {
      return s;
    },

    ngettext(singular, plural, count) {
      const value = Katrid.i18n.catalog[singular];
      if (value != null) {
        return value[Katrid.i18n.pluralidx(count)];
      } else if (count === 1) {
        return singular;
      } else {
        return plural;
      }
    },

    pgettext(s) {
      let value = Katrid.i18n.gettext(s);
      if (value.indexOf('\x04') !== -1) {
        value = s;
      }
      return value;
    },

    npgettext(ctx, singular, plural, count) {
      let value = Katrid.i18n.ngettext(ctx + '\x04' + singular, ctx + '\x04' + plural, count);
      if (value.indexOf('\x04') !== -1) {
        value = Katrid.i18n.ngettext(singular, plural, count);
      }
      return value;
    },

    interpolate(fmt, obj, named) {
      if (named) {
        fmt.replace(/%\(\w+\)s/g, match => String(obj[match.slice(2, -2)]));
      } else {
        fmt.replace(/%s/g, match => String(obj.shift()));
      }

      return {
        get_format(formatType) {
          const value = Katrid.i18n.formats[formatType];
          if (value != null) {
            return value;
          } else {
            return formatType;
          }
        }
      };
    }
  };

})();
