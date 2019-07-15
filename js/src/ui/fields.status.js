(function() {

  Katrid.UI.uiKatrid.directive('statusField', ['$compile', ($compile) =>
    ({
      restrict: 'A',
      priority: 1,
      replace: true,
      link(scope, element, attrs, controller) {
        const field = scope.view.fields[attrs.name];
        scope.choices = field.choices;
        if (!attrs.readonly) {
          scope.itemClick = () => console.log('status field item click');
        }
        element.closest('header').prepend(element);
      },
      template(element, attrs) {
        return sprintf(Katrid.app.$templateCache.get('view.field.StatusField'), { fieldName: attrs.name });
      }
    })

  ]);

})();
