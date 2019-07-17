(function() {

  Katrid.UI.uiKatrid
  .directive('codeEditor', [function () {
    return {
      restrict: 'EA',
      require: 'ngModel',
      link: function (scope, elm, attrs, ngModel) {

        let editor;

        require.config({
          paths: {
            vs: '/static/web/monaco/min/vs',
          }
        });


        console.log('set language', attrs.language);
        require(['vs/editor/editor.main'], function () {
          editor = monaco.editor.create(elm[0], {
            value: '',
            language: attrs.language || 'xml',
            minimap: {
              enabled: false,
            },
            automaticLayout: true,
          });

          editor.getModel().onDidChangeContent(evt => {
            ngModel.$setViewValue(editor.getValue());
          });

          ngModel.$render = function () {
            setTimeout(() => {
              editor.setValue(ngModel.$viewValue);
            }, 300);
          };

        });

      }
    };
  }]);

})();
