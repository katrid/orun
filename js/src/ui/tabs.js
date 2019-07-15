(function() {

  let uiKatrid = Katrid.UI.uiKatrid;

  uiKatrid.controller('TabsetController', [
    '$scope',
    function ($scope) {
      const ctrl = this;
      const tabs = (ctrl.tabs = ($scope.tabs = []));

      ctrl.select = function (selectedTab) {
        angular.forEach(tabs, function (tab) {
          if (tab.active && (tab !== selectedTab)) {
            tab.active = false;
            tab.onDeselect();
          }
        });
        selectedTab.active = true;
        selectedTab.onSelect();
      };

      ctrl.addTab = function (tab) {
        tabs.push(tab);
        // we can't run the select function on the first tab
        // since that would select it twice
        if (tabs.length === 1) {
          tab.active = true;
        } else if (tab.active) {
          ctrl.select(tab);
        }
      };

      ctrl.removeTab = function (tab) {
        const index = tabs.indexOf(tab);
        //Select a new tab if the tab to be removed is selected and not destroyed
        if (tab.active && (tabs.length > 1) && !destroyed) {
          //If this is the last tab, select the previous tab. else, the next tab.
          const newActiveIndex = index === (tabs.length - 1) ? index - 1 : index + 1;
          ctrl.select(tabs[newActiveIndex]);
        }
        tabs.splice(index, 1);
      };

      var destroyed = undefined;
      $scope.$on('$destroy', function () {
        destroyed = true;
      });
    }
  ]);

  uiKatrid.directive('tabset', () =>
    ({
      restrict: 'EA',
      transclude: true,
      replace: true,
      scope: {
        type: '@'
      },
      controller: 'TabsetController',
      template: `<div class="tabset"><div class=\"clearfix\"></div>\n` +
      "  <div class=\"nav nav-{{type || 'tabs'}}\" ng-class=\"{'nav-stacked': vertical, 'nav-justified': justified}\" ng-transclude></div>\n" +
      "  <div class=\"tab-content\">\n" +
      "    <div class=\"tab-pane\" \n" +
      "         ng-repeat=\"tab in tabs\" \n" +
      `         ng-class="{active: tab.active}">` +
      `<div class="col-12"><div class="row" tab-content-transclude="tab"></div></div>` +
      "    </div>\n" +
      "  </div>\n" +
      "</div>\n",
      link(scope, element, attrs) {
        scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
        return scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
      }
    })
  );


  uiKatrid.directive('tab', [
    '$parse',
    $parse =>
      ({
        require: '^tabset',
        restrict: 'EA',
        replace: true,
        template: `<a class="nav-item nav-link" href ng-click="select()" tab-heading-transclude ng-class="{active: active, disabled: disabled}">{{heading}}</a>`,
        transclude: true,
        scope: {
          active: '=?',
          heading: '@',
          onSelect: '&select',
          onDeselect: '&deselect'
        },
        controller() {
          //Empty controller so other directives can require being 'under' a tab
        },
        compile(elm, attrs, transclude) {
          return function (scope, elm, attrs, tabsetCtrl) {
            scope.$watch('active', function (active) {
              if (active) {
                tabsetCtrl.select(scope);
              }
            });
            scope.disabled = false;
            if (attrs.disabled) {
              scope.$parent.$watch($parse(attrs.disabled), function (value) {
                scope.disabled = !!value;
              });
            }

            scope.select = function () {
              if (!scope.disabled) {
                scope.active = true;
              }
            };

            tabsetCtrl.addTab(scope);
            scope.$on('$destroy', function () {
              tabsetCtrl.removeTab(scope);
            });
            //We need to transclude later, once the content container is ready.
            //when this link happens, we're inside a tab heading.
            scope.$transcludeFn = transclude;
          };
        }

      })

  ]);

  uiKatrid.directive('tabHeadingTransclude', [() =>
    ({
      restrict: 'A',
      require: '^tab',
      link(scope, elm, attrs, tabCtrl) {
        scope.$watch('headingElement', function (heading) {
          if (heading) {
            elm.html('');
            elm.append(heading);
          }
        });
      }
    })

  ]);


  uiKatrid.directive('tabContentTransclude', function () {

    const isTabHeading = node => node.tagName && (node.hasAttribute('tab-heading') || node.hasAttribute('data-tab-heading') || (node.tagName.toLowerCase() === 'tab-heading') || (node.tagName.toLowerCase() === 'data-tab-heading'));

    return {
      restrict: 'A',
      require: '^tabset',
      link(scope, elm, attrs) {
        const tab = scope.$eval(attrs.tabContentTransclude);
        //Now our tab is ready to be transcluded: both the tab heading area
        //and the tab content area are loaded.  Transclude 'em both.
        tab.$transcludeFn(tab.$parent, function (contents) {
          angular.forEach(contents, function (node) {
            if (isTabHeading(node)) {
              //Let tabHeadingTransclude know.
              tab.headingElement = node;
            } else {
              elm.append(node);
            }
          });
        });
      }

    };
  });

}).call(this);
