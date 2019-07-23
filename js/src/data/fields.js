(function() {

  function toCamelCase(s) {
    // remove all characters that should not be in a variable name
    // as well underscores an numbers from the beginning of the string
    s = s.replace(/([^a-zA-Z0-9_\- ])|^[_0-9]+/g, "").trim().toLowerCase();

    // uppercase letters preceeded by a hyphen or a space
    s = s.replace(/([ -]+)([a-zA-Z0-9])/g, function(a,b,c) {
      return c.toUpperCase();
    });

    // uppercase letters following numbers
    s = s.replace(/([0-9]+)([a-zA-Z])/g, function(a,b,c) {
      return b + c.toUpperCase();
    });

    return s;
  }

  class Field {
    constructor(info) {
      this.cols = info.cols || 6;
      this.visible = true;
      this._info = info;
      this.cssClass = info.type;
      this.caption = info.caption || info.name;
      this.helpText = this._info.help_text;
      this.required = this._info.required;
      this.onChange = this._info.onchange;
      this.nolabel = false;

      if (this._info.visible === false)
        this.visible = false;
      this.readonly = this._info.readonly;
      if (!this.readonly)
        this.readonly = false;

      this.displayChoices = _.object(info.choices);
      this.choices = info.choices;

      if (info.choices)
        this.template = {
          list: 'view.list.selection-field.jinja2',
          form: 'view.form.selection-field.jinja2',
        };
      else
        this.template = {
          list: 'view.list.field.jinja2',
          form: 'view.form.field.jinja2',
        };

      if (info.template)
        this.template = Object.assign(this.template, info.template);

      this.emptyText = '--';
    }

    static fromInfo(info) {
      let cls = Katrid.Data.Fields[info.type] || StringField;
      return new cls(info);
    }

    static fromArray(fields) {
      let r = {};
      Object.keys(fields).map(k => r[k] = this.fromInfo(fields[k]));
      return r;
    }

    render(viewType, el, context) {
      this.$el = el;
      let attrs = {};
      for (let attr of el[0].attributes) {
        attrs[attr.name] = attr.value;
        let camelCase = toCamelCase(attr.name);
        if (camelCase !== attr.name)
          attrs[camelCase] = attr.value;
      }

      if (attrs.cols)
        this.cols = attrs.cols;
      if (attrs.ngReadonly)
        this.ngReadonly = attrs.ngReadonly;
      if (attrs.domain)
        this.domain = attrs.domain;
      if (attrs.visible === 'false')
        this.visible = false;
      else if (attrs.visible === 'true')
        this.visible = true;
      if (attrs.ngShow)
        this.ngShow = attrs.ngShow;
      if (attrs.ngIf)
        this.ngIf = attrs.ngIf;
      if (attrs.ngClass)
        this.ngClass = attrs.ngClass;
      this.attrs = attrs;

      context['field'] = this;
      context['attrs'] = attrs;

      // replace the field content by its html content
      context['html'] = el.html();

      return Katrid.app.getTemplate(this.template[viewType], context);
    }

    assign(el) {
      this.$el = el;
      let caption = el.attr('label');
      if (!_.isUndefined(caption))
          this.caption = caption;
      let readonly = el.attr('ng-readonly');
      let invisible = el.attr('invisible');
      if (!_.isUndefined(invisible))
        this.visible = false;
      if (!_.isUndefined(readonly))
        this.ngReadonly = readonly;
      let cols = el.attr('cols');
      if (!_.isUndefined(cols))
        this.cols = cols;

    }

    fromJSON(value, dataSource) {
      dataSource.record[this.name] = value;
    }

    get validAttributes() {
       return ['name', 'nolabel', 'readonly', 'required'];
    }

    getAttributes() {
      let res = {};
      let validAttrs = this.validAttributes;
      if (this.ngReadonly)
        res['ng-readonly'] = this.ngReadonly;
      else if (this.readonly)
        res['readonly'] = this.readonly;
      res['ng-model'] = 'record.' + this.name;
      if (attrs.ngFieldChange) {
        res['ng-change'] = attrs.ngFieldChange;
        console.log('change', attrs.ngFieldChange);
      }
      if (this.required)
        res['required'] = this.required;
      return res;
    }

    get hasChoices() {
      return this._info.choices && this._info.choices.length > 0;
    }

   get name() {
      return this._info.name;
    }

    get model() {
      return this._info.model;
    }

    get maxLength() {
      return this._info.max_length;
    }

    get type() {
      return this._info.type;
    }

    get paramTemplate() {
      return 'view.param.String';
    }

    format(value) {
      return value.toString();
    }

    toJSON(val) {
      return val;
    }

    createWidget(widget, scope, attrs, element) {
      if (!widget) {
        // special fields case
        if (this.hasChoices)
          widget = 'SelectionField';
      }
      let cls = Katrid.ui.Widgets[widget || this.type] || Katrid.ui.Widgets.StringField;
      return new cls(scope, attrs, this, element);
    }

    validate() {

    }

    get defaultCondition() {
      return '=';
    }

    isControlVisible(condition) {
      switch (condition) {
        case 'is null':
          return false;
        case 'is not null':
          return false;
      }
      return true;
    }

  }

  class StringField extends Field {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
    }
  }

  class PasswordField extends StringField {
    constructor(info) {
      if (!info.template)
        info.template = {};
      if (!info.template.form)
        info.template.form = 'view.form.password.jinja2';
      if (!info.template.list)
        info.template.list = 'view.list.password.jinja2';
      super(info);
    }
  }


  class BooleanField extends Field {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
      this.template.form = 'view.form.boolean-field.jinja2';
      this.template.list = 'view.list.boolean-field.jinja2';
      this.nolabel = true;
    }

    get paramTemplate() {
      return 'view.param.Boolean';
    }

  }

  class DateField extends Field {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
      this.template.form = 'view.form.date-field.jinja2';
      this.template.list = 'view.list.date-field.jinja2';
    }

    toJSON(val) {
      return val;
    }

    get paramTemplate() {
      return 'view.param.Date';
    }

    format(value) {
      if (_.isString(value))
        return moment(value).format(Katrid.i18n.gettext('yyyy-mm-dd').toUpperCase());
      return '';
    }

    getAttributes(attrs) {
      let res = super.getAttributes(attrs);
      res['type'] = 'date';
      return res;
    }
  }

  class DateTimeField extends DateField {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
      this.template.form = 'view.form.datetime-field.jinja2';
      this.template.list = 'view.list.datetime-field.jinja2';
    }

    get paramTemplate() {
      return 'view.param.DateTime';
    }

    getAttributes(attrs) {
      let res = super.getAttributes(attrs);
      res['type'] = 'datetime-local';
      return res;
    }
  }


  class TimeField extends DateTimeField {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
      this.template.form = 'view.form.time-field.jinja2';
      this.template.list = 'view.list.time-field.jinja2';
    }
  }


  class NumericField extends Field {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
      if (Katrid.UI.isMobile)
        this.template.form = 'view.form.numpad-field.pug';
      else
        this.template.form = 'view.form.numeric-field.jinja2';
      this.template.list = 'view.list.numeric-field.jinja2';
    }

    fromJSON(value, dataSource) {
      dataSource.record[this.name] = parseFloat(value);
    }

    toJSON(val) {
      if (val && _.isString(val))
        return parseFloat(val);
      return val;
    }

  }


  class IntegerField extends Field {
    constructor(info) {
      if (!info.cols)
        info.cols = 3;
      super(...arguments);
    }

    toJSON(val) {
      if (val && _.isString(val))
        return parseInt(val);
      return val;
    }

    get paramTemplate() {
      return 'view.param.Integer';
    }
  }

  class FloatField extends NumericField {
  }

  class DecimalField extends NumericField {
    constructor() {
      super(...arguments);
      this.decimalPlaces = 2;
      if (this._info.attrs) {
        this.decimalPlaces = this._info.attrs.decimal_places || 2;
      }
    }
  }

  class ForeignKey extends Field {
    constructor(info) {
      super(...arguments);
      this.domain = info.domain;
      Object.assign(this.template, {
        list: 'view.list.foreignkey.jinja2',
        form: 'view.form.foreignkey.jinja2',
      });
    }

    assign(el) {
      super.assign(el);
      let domain = $(el).attr('domain');
      if (domain)
        this.domain = domain;
    }

    toJSON(val) {
      if (_.isArray(val))
        return val[0];
      return val;
    }

    get validAttributes() {
      return super.validAttributes.concat(['domain']);
    }
  }

  class OneToManyField extends Field {
    constructor(info) {
      if (!info.cols)
        info.cols = 12;
      super(...arguments);
      this.template.form = 'view.form.grid.jinja2';
    }
    get field() {
      return this._info.field;
    }

    get validAttributes() {
      return super.validAttributes.concat(['inline-editor', 'ng-default-values']);
    }

    fromJSON(val, dataSource) {
      if (val && val instanceof Array) {
        let child = dataSource.childByName(this.name);
        val.map((obj) => {
          if (obj.action === 'CLEAR') {
            child.scope.records = [];
            dataSource.record[this.name] = [];
          }
          else if (obj.action === 'CREATE') {
            child.scope.addRecord(obj.values);
          }
        });
          child.scope.$apply();

      }
    }
  }

  class ManyToManyField extends ForeignKey {
    toJSON(val) {
      if (_.isArray(val))
        return val.map(obj => _.isArray(obj) ? obj[0] : obj);
      else if (_.isString(val))
        val = val.split(',');
      return val;
    }
  }

  class TextField extends StringField {
    constructor(info) {
      super(...arguments);
      if (!info.template || (info.template && !info.template.form))
        this.template.form = 'view.form.text-field.jinja2';
    }
  }

  class XmlField extends TextField {
    constructor(info) {
      super(...arguments);
      // TODO change to code editor
      if (!info.template || (info.template && !info.template.form))
        this.template.form = 'view.form.code-editor.jinja2';
    }
  }

  class JsonField extends TextField {
    constructor(info) {
      super(...arguments);
      // TODO change to code editor
      if (!info.template || (info.template && !info.template.form))
        this.template.form = 'view.form.json-field.jinja2';
    }
  }

  class PythonCodeField extends TextField {
    constructor(info) {
      super(...arguments);
      console.log('python code field');
      if (!info.template || (info.template && !info.template.form))
        this.template.form = 'view.form.python-code.jinja2';
    }
  }

  class ImageField extends Field {
    constructor(info) {
      if (!info.template)
        info.template = {};
      if (!info.template.form)
        info.template.form = 'view.form.image-field.jinja2';
      super(...arguments);
      this.noImageUrl = '/static/web/assets/img/no-image.png';
    }

    getAttributes(attrs) {
      let res = super.getAttributes(attrs);
      res.ngSrc = attrs.ngEmptyImage || (attrs.emptyImage && (`'${attrs.emptyImage}`)) || `'${this.noImageUrl}'`;
      res.ngSrc = `{{ ${res['ng-model']} || ${res.ngSrc} }}`;
      return res;
    }

    get ngSrc() {
      let ngSrc = this.attrs.ngEmptyImage || (this.attrs.emptyImage && (`'${this.attrs.emptyImage}`)) || `'${this.noImageUrl}'`;
      ngSrc = `\${ record.${this.name} || ${ngSrc} }`;
      return ngSrc
    }
  }

  Katrid.Data.Fields = {
    Field,
    StringField,
    PasswordField,
    IntegerField,
    FloatField,
    DecimalField,
    DateTimeField,
    TimeField,
    ForeignKey,
    OneToManyField,
    ManyToManyField,
    TextField,
    XmlField,
    JsonField,
    PythonCodeField,
    DateField,
    BooleanField,
    ImageField,
  }


})();
