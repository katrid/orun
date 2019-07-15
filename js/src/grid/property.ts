namespace Katrid.UI {

  class PropertyGrid {
    private _target: any;
    private _meta: Object;
    values: Object;

    constructor(public el: Element) {
      this.values = null;
    }

    get target() {
      return this._target;
    }

    set target(value) {
      this.values = {};
      this._target = value;
      this.setTarget(value);
    }

    setTarget(value) {
      for (let k of Object.keys(this.meta)) {
        this.setValue(k, this._target[k]);
      }
    }

    setValue(key, value) {
      this.values[key] = value;
    }

    get meta(): Object {
      return this._meta;
    }

    set meta(value: Object) {
      this._meta = value;
      // refresh table structure
    }
  }

}
