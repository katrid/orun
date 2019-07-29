(function () {

  Katrid.$hashId = 0;

  _.mixin({
    hash(obj) {
      if (!obj.$hashId) {
        obj.$hashId = ++Katrid.$hashId;
      }
      return obj.$hashId;
    }
  });

  _.mixin({
    sum(iterable, member) {
      let r = 0;
      if (iterable)
        for (let row of iterable) {
          let v = row[member];
          if (!_.isNumber(v))
            v = Number(v);
          if (_.isNaN(v))
            v = 0;
          r += v;
        }
      return r;
    },
    avg(iterable, member) {
      if (iterable && iterable.length) {
        let r = 0;
        return _.sum(iterable, member) / iterable.length;
      }
    }
  })

}).call(this);
