(function() {

  class NumPad {
    constructor($compile) {
      this.restrict = 'A';
      this.require = 'ngModel';
      this.scope = {};
      this.$compile = $compile;
    }
    link(scope, el, attrs, ngModel) {

      el.bind('click', () => {
        console.log('numpad click');
        let templ = this.$compile(Katrid.app.getTemplate('ui.numpad.pug'))(scope);
        scope.val = parseFloat(ngModel.$modelValue || 0);
        scope.$apply();
        let modal = $(templ).modal();
        modal.on('hidden.bs.modal', function() {
          $(this).remove();
        });

        let comma = false;
        let frac = '';

        scope.done = () => {
          scope.$parent.record[ngModel.$name] = scope.val.toString();
          if (attrs.ngChange)
            scope.$parent.$eval(attrs.ngChange);
          ngModel.$setDirty();
          modal.modal('hide');
        };

        scope.cancel = () => {
          modal.modal('hide');
        };

        scope.buttonClick = (num) => {
          let s = scope.val.toFixed(2).toString().replace('.', '');
          if (num === 'bs') {
            s = s.substr(0, s.length-1);
            if (s)
              scope.val = parseFloat(s) / 100;
            else
              scope.val = 0;
          }
          else if (num === '0')
            scope.val *= 10;
          else
            scope.val = parseFloat(s + num) / 100;
        }
      });


    }
  }

  Katrid.UI.uiKatrid.directive('numpadInput', ['$compile', NumPad]);

})();
