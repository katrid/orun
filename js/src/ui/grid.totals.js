(function() {

  class Total {
    constructor($filter) {
      this.restrict = 'E';
      this.scope = false;
      this.replace = true;
      this.$filter = $filter;
    }

    template(el, attrs) {
      if (attrs.expr[0] === "'")
        return `<span>${ attrs.expr.substring(1, attrs.expr.length - 1) }</span>`;
      else
        return `<span ng-bind="total$${attrs.field}|number:2"></span>`;
    }

    link(scope, element, attrs, controller) {
      if (attrs.expr[0] !== "'")
        scope.$watch(`records`, (newValue) => {
          let total = 0;
          newValue.map((r) => total += parseFloat(r[attrs.field]));
          scope['total$' + attrs.field] = total;
          scope.parent['total$' + scope.fieldName + '$' + attrs.field] = total;
        });
    }
  }

  Katrid.UI.uiKatrid.directive('ngTotal', ['$filter', Total]);

})();
