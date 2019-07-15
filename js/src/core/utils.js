var Katrid;
(function (Katrid) {
    function isObject(value) {
        // http://jsperf.com/isobject4
        return value !== null && typeof value === 'object';
    }
    function isString(value) {
        return typeof value === 'string';
    }
    Katrid.isString = isString;
    function isNumber(value) {
        return typeof value === 'number';
    }
    Katrid.isNumber = isNumber;
    function isArray(arr) {
        return Array.isArray(arr) || arr instanceof Array;
    }
    Katrid.isArray = isArray;
})(Katrid || (Katrid = {}));
