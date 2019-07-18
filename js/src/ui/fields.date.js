(function () {
  let uiKatrid = Katrid.UI.uiKatrid;

  uiKatrid.directive('datePicker', ['$filter', $filter => ({
    restrict: 'A',
    require: '?ngModel',
    link(scope, el, attrs, controller) {
      // TODO localize the date format
      let mask = '99/99/9999';
      let format = attrs.datePicker || 'L';
      if (format === 'L LT')
        mask = '99/99/9999 99:99';
      el.inputmask({
        mask,
        insertMode: false,
      });
      let calendar = $(el.parent()).datetimepicker({
        useCurrent: false,
        format,
        icons: {
          time: 'fa fa-clock',
        },
      })
      .on('dp.change', function (evt) {
        calendar.datetimepicker('hide');
      })
      .on('dp.hide', function (evt) {
        controller.$setDirty();
        controller.$setViewValue(el.val());
      });
      el.on('focus', () => el.select());

      controller.$render = function () {
        if (controller.$modelValue) {
          calendar.datetimepicker('date', moment.utc(controller.$modelValue));
        } else
          el.val('');
      };

      el.on('blur', () => {
        let v = moment(el.val(), format);
        if (v.isValid())
          controller.$modelValue = v.format('YYYY-MM-DD');
        else
          controller.$modelValue = null;
      });

      controller.$parsers.push(value => {
        let v = moment(el.val(), format);
        if (v.isValid()) {
          if (format === 'L')
            return v.format('YYYY-MM-DD');
          else if (format === 'L LT')
            return v.format('YYYY-MM-DD HH:mm');
        }
        return null;
      });

      // el.on('click', () => setTimeout(() => $(el).select()));
      // controller.$formatters.push(function (value) {
      //   if (value) {
      //     const dt = new Date(value);
      //     // calendar.datepicker('setDate', dt);
      //     return $filter('date')(value, dateFmt);
      //   }
      //   return value;
      // });

      // controller.$render = function () {
      //   if (_.isDate(controller.$viewValue)) {
      //     const v = $filter('date')(controller.$viewValue, dateFmt);
      //     return el.val(v);
      //   } else {
      //     return el.val(controller.$viewValue);
      //   }
      // };

    }
  })]);

  uiKatrid.directive('timePicker', ['$filter', $filter => ({
    restrict: 'A',
    require: '?ngModel',
    link(scope, el, attrs, controller) {
      // TODO localize the time format
      let mask = '99:99';
      el.inputmask({
        mask,
        insertMode: false,
      });
      el.on('focus', () => el.select());

    }
  })]);

})();
