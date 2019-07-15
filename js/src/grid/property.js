var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        class PropertyGrid {
            constructor(el) {
                this.el = el;
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
            get meta() {
                return this._meta;
            }
            set meta(value) {
                this._meta = value;
                // refresh table structure
            }
        }
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
