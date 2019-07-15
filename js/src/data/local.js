(function() {

  /**
  *  Basic in-memory database specification:
  *  {
  *    meta: { // metadata definition
  *      "model.name": { // model specification
  *        fields: { // fields collections
  *          fieldName: { // field specification
  *            name: "fieldName" // field name
  *            attrs: {} // widget dom attributes
  *            default: value, // default field value
  *            required: true, // indicates if field is required or not
  *            caption: "Field Caption",
  *            help_text: "A long field description or a help documentation",
  *            choices: { "1": "One", "2": "Two" }, // field
  *              // if field have choices, its control will be shown as a dropdown select
  *            readonly: false, // indicates if the field can be modified by the user
  *            editable: true, // indicates if the field is visible
  *            type: ForeignKey, // the field type (
  *                            ForeignKey, StringField, CharField, TextField, IntegerField, BooleanField,
  *                            DateField, DateTimeField, NumericField, DecimalField, ManyToManyField,
  *                            OneToManyField)
  *            model: "model.name", // if the field type is ForeignKey or ManyToManyField, the foreign model name must be specified
  *            domain: { foreignField: value }, // the domain/filter for the related field in a foreign model object
  *          }
  *        }
  *      }
  *    }
  *  }
  */

  // in-memory katrid data adapter
  // it would be useful for demo and testing purposes
  class Adapter {
    constructor(name, data) {
      this.db = data;
    }

    _ensureModel(model) {
      if (!this.db)
        this.db = {
          data: {},
          defaults: {},
        };
      if (_.isUndefined(this.db.data[model]))
        this.db.data[model] = [];
      return this.db.data[model];
    }

    // dispatch the rpc
    rpc(meth, model, args, kwargs) {
      if (meth === 'get')
        return this.get(model, args[0], kwargs);
      else if (meth === 'search')
        return this.search(model, args, kwargs);
      else if (meth === 'write')
        return this.write(model, args, kwargs);
      else if (meth === 'get_defaults')
        return this.getDefaults(model);
    }

    get(model, id, kwargs) {
      let data = this._ensureModel(this.data[model]);
      let res = alasql("select * from ? where id = ?", [data, id]);
      return {
        result: {
          data: [res]
        }
      };
    }

    getDefaults(model) {
      // returns the defaults values for a given model
      let m = this.db.meta[model];
      if (m) {
        let res = {};
        for (let f of m.fields)
          if (f.default)
            res[f.name] = f.default;
        return {
          result: {
            data: [res]
          }
        };
      }
    }

    search(model, args, kwargs) {
      let data = this._ensureModel(model);
      let res = alasql("select * from ?", [data]);
      return {
        result: {
          data: [res]
        }
      };
    }

    write(model, args, kwargs) {
      let data = this._ensureModel(model);
      data.push(data);
    }
  }

  Katrid.Data.Local = {
    Adapter
  };

})();
