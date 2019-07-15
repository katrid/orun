namespace Katrid {

  function isObject(value) {
    // http://jsperf.com/isobject4
    return value !== null && typeof value === 'object';
  }

  export function isString(value: any): boolean {
    return typeof value === 'string';
  }

  export function isNumber(value: any): boolean {
    return typeof value === 'number';
  }

  export function isArray(arr) {
    return Array.isArray(arr) || arr instanceof Array;
  }

}
