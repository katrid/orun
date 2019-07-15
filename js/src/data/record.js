(function() {

  class Record {
    constructor(data, dataSource, state) {
      // current record data
      this.raw = data;
      // modified data only
      this.data = {};
      // original record
      // this.old = jQuery.extend({}, data);
      this.dataSource = dataSource;
      this.pending = null;
      this.modified = false;
      this.children = [];
      this.state = state;
      this.submitted = false;
      data.$record = this;
    }

    get scope() {
      return this.dataSource.scope;
    }

    get pk() {
      return this.raw.id;
    }

    $delete() {
      this.state = RecordState.destroyed;
      if (this.pk)
        this.setModified();
      else if (this.parent.children.indexOf(this) > -1)
        this.parent.children.splice(this.parent.children.indexOf(this), 1);
    }

    _prepareRecord(rec, parent) {
      console.log(rec.constructor.name);
      return;
      let getValue = (v) => {
        if (_.isObject(v))
          return this._prepareRecord(v, rec);
        else if (_.isArray(v))
          return v.map(obj => getValue(obj));
        return v;
      };

      let res = {};
      for (let [k, v] of Object.entries(rec)) {
        // prevent circular json object
        if (parent && _.isObject(v))
          continue;
        res[k] = getValue(v);
        if (v)
        console.log(v.constructor.name);
      }
      if (this.dataSource.parent && !parent) {
        let field = this.dataSource.parent.scope.view.fields[this.dataSource.fieldName]._info.field;
        res[field] = this.dataSource.parent.record.$record._prepareRecord(this.dataSource.parent.record);
      }
      return res;
    }

    setModified(field) {
      if (!this.modified && (this.state !== RecordState.destroyed)) {
        if (this.pk)
          this.state = RecordState.modified;
        else
          this.state = RecordState.created;
      }
      if (field)
        this.dataSource.$setDirty(field);
      this.dataSource._pendingChanges = true;
      this.modified = true;

      if (this.parent && this.scope.fieldName) {
        this.parent.setModified(this.scope.fieldName);
        this.parent.addChild(this);
      }
    }

    get parent() {
      return this.dataSource.parent && this.dataSource.parent.record.$record;
    }

    addChild(child) {
      this.setModified(child.scope.fieldName);
      if (this.children.indexOf(child) === -1) {
        this.children.push(child);
      }
    }

    compare(oldValue, newValue) {
      if (_.isArray(oldValue) && _.isArray(newValue))
        return oldValue.join(',') !== newValue.join(',');
      return oldValue != newValue;
    }

    set(propKey, value) {
      let field = this.dataSource.fieldByName(propKey);
      if (field) {
        let oldValue = this.raw[propKey];
        value = field.toJSON(value);
        // check if field value has been changed
        if (this.compare(oldValue, value)) {
          this.setModified(propKey);
          this.data[propKey] = value;
          this.modified = true;
          // send field change event
          if (field.onChange) {
            let rec = this.$encode(this.raw);
            rec[propKey] = value;

            // let's send parent data
            if (this.dataSource.parent && this.dataSource.fieldName) {
              let field = this.dataSource.parent.fields[this.dataSource.fieldName]._info.field;
              rec[field] = this.$encode(this.dataSource.parent.record);
            }

            // send prepared data
            this.dataSource.dispatchEvent('field_change_event', [propKey, rec]);
          }
        }
      }
      return true;
    }

    $encode(obj) {
      if (_.isArray(obj))
        return obj.map(v => this.$encode(v));
      else if (_.isObject(obj)) {
        let r = {};
        for (let [k, v] of Object.entries(obj))
          if (!k.startsWith('$'))
            r[k] = this.$encode(v);
        return r;
      } else
        return obj;
    }

    $new() {
      return Record(this.raw);
    }

    toObject() {
      let data = jQuery.extend({}, this.data);
      if (this.pk)
        data.id = this.pk;
      for (let child of this.children) {
        if (!(child.scope.fieldName in data))
          data[child.scope.fieldName] = [];
        if (child.state === RecordState.created)
          data[child.scope.fieldName].push({ action: 'CREATE', values: child.toObject() });
        else if (child.state === RecordState.modified)
          data[child.scope.fieldName].push({ action: 'UPDATE', values: child.toObject() });
        else if (child.state === RecordState.destroyed)
          data[child.scope.fieldName].push({ action: 'DESTROY', id: child.pk });
      }
      return data;
    }
  }

  class SubRecords {
    constructor(recs) {
      this.recs = recs;
    }

    append(rec) {
      if (this.recs.indexOf(rec) === -1)
        this.recs.push(rec);
    }
  }


  function createRecord(rec, dataSource) {
    new Record(rec, dataSource);
    return new Proxy(rec, {
      set(target, propKey, value, receiver) {
        let scope = dataSource.scope;
        let field = dataSource.fieldByName(propKey);
        if (!propKey.startsWith('$$')) {
          if (!propKey.startsWith('$') && scope && field && !(_.isArray(value) && ((field instanceof Katrid.Data.Fields.OneToManyField) || (field instanceof Katrid.Data.Fields.ManyToManyField)))) {
            rec.$record.set(propKey, value);
          }
        }
        return Reflect.set(target, propKey, value, receiver);
      }
    })
  }

  class RecordState {
    static initClass() {
      this.destroyed = 'destroyed';
      this.created = 'created';
      this.modified = 'modified';
    }
  }
  RecordState.initClass();

  Katrid.Data.RecordState = RecordState;
  Katrid.Data.createRecord = createRecord;
  Katrid.Data.SubRecords = SubRecords;

})();
