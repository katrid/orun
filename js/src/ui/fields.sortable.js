(function() {

  Katrid.UI.uiKatrid.directive('sortableField', ['$compile', '$timeout', ($compile, $timeout) =>
    ({
      restrict: 'E',
      require: 'ngModel',
      replace: true,
      scope: {},
      link: {
        post: function (scope, el, attrs) {
          let tbl = el.closest('tbody');
          let fixHelperModified = function (e, tr) {
              let $originals = tr.children();
              let $helper = tr.clone();
              $helper.children().each(function (index) {
                $(this).width($originals.eq(index).width())
              });
              return $helper;
            },
            updateIndex = function (e, ui) {
              $('td.list-column-sortable', ui.item.parent()).each(function (i) {
                // $(this).html(i + 1);
              });
            };

          tbl.sortable({
            helper: fixHelperModified,
            stop: updateIndex
          }).disableSelection();
        }
      },
      template(element, attrs) {
        return sprintf(Katrid.$templateCache.get('view.field.SortableField'), { fieldName: attrs.name });
      }
    })

  ]);

})();
