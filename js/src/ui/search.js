(function() {

  let conditionsLabels = {
    '=': Katrid.i18n.gettext('Is equal'),
    '!=': Katrid.i18n.gettext('Is different'),
    '>': Katrid.i18n.gettext('Greater-than'),
    '<': Katrid.i18n.gettext('Less-than'),
  };

  let conditionSuffix = {
    '=': '',
    '!=': '__isnot',
    'like': '__icontains',
    'not like': '__not_icontains',
    '>': '__gt',
    '>=': '__gte',
    '<': '__lt',
    '<=': '__lte',
    'in': '__in',
    'not in': '__not_in',
  };


  class SearchQuery {
    constructor(searchView) {
      this.searchView = searchView;
      this.items = [];
      this.groups = [];
    }

    add(item) {
      if (this.items.includes(item)) {
        item.facet.addValue(item);
        item.facet.refresh();
      } else {
        this.items.push(item);
        this.searchView.renderFacets();
      }
      if (item instanceof SearchGroup)
        this.groups.push(item);
      this.searchView.change();
    }

    loadItem(item) {
      this.items.push(item);
      if (item instanceof SearchGroup)
        this.groups.push(item);
    }

    remove(item) {
      this.items.splice(this.items.indexOf(item), 1);
      if (item instanceof SearchGroup) {
        this.groups.splice(this.groups.indexOf(item), 1);
      }
      this.searchView.change();
    }

    getParams() {
      let r = [];
      for (let i of this.items)
        r = r.concat(i.getParamValues());
      return r;
    }
  }


  class FacetView {
    constructor(item) {
      this.item = item;
      this.values = [];
    }

    get separator() {
      return ` <span class="facet-values-separator">${Katrid.i18n.gettext('or')}</span> `;
    }

    init(item, values) {
      this.item = item;
      if (values)
        this.values = values;
      else
        this.values = [{
          searchString: this.item.getDisplayValue(), value: this.item.value
        }];
    }

    addValue(value) {
      return this.values.push(value);
    }

    get caption() {
      return this.item.caption;
    }

    clear() {
      this.values = [];
    }

    get templateValue() {
      return (Array.from(this.values).map(
        s => s instanceof SearchObject ? s.display : s)
      ).join(this.separator);
    }

    link(searchView) {
      const html = $(this.template());
      this.item.facet = this;
      this.element = html;
      const rm = html.find('.facet-remove');
      rm.click(evt => searchView.onRemoveItem(evt, this.item));
      return html;
    }

    refresh() {
      return this.element.find('.facet-value').html(this.templateValue());
    }

    load(searchView) {
      searchView.query.loadItem(this.item);
      this.render(searchView);
    }

    destroy() {
      this.clear();
    }

    getParamValues() {
      const r = [];
      for (let v of this.values) {
        r.push(this.item.getParamValue(v));
      }
      if (r.length > 1)
        return [{'OR': r}];
      return r;
    }
  }

  class FacetGroup extends FacetView {
    constructor(...args) {
      super(...args);
      this.grouping = true;
    }

    clear() {
      let oldValues = this.values;
      super.clear();
      for (let v of oldValues)
        if (v._ref)
          v._ref._selected = false;
    }

    get separator() {
      return ` <span> &gt; </span> `;
    }

    get caption() {
      return '<span class="fa fa-bars"></span>';
    }
  }




  class SearchItem {
    constructor(view, name, el) {
      this.view = view;
      this.name = name;
      this.el = el;
    }

    getDisplayValue() {
      if (this.value) {
        return this.value[1];
      }
      return this.searchString;
    }

    getParamValue(name, value) {
      const r = {};
      if (_.isArray(value)) {
        r[name] = value[0];
      } else {
        r[name + '__icontains'] = value;
      }
      return r;
    }

    _doChange() {
      this.view.update();
    }
  }

  class SearchFilter extends SearchItem {
    constructor(view, name, caption, domain, group, el) {
      super(view, name, el);
      this.group = group;
      this.caption = caption;
      if (_.isString(domain))
        domain = JSON.parse(domain.replace(/'/g, '"'));
      this.domain = domain;
      this._selected = false;
    }

    static fromItem(view, el, group) {
      return new SearchFilter(view, el.attr('name'), el.attr('caption') || el.attr('label'), el.attr('domain'), group, el);
    }

    toString() {
      return this.caption;
    }

    toggle() {
      this.selected = !this.selected;
    }

    get selected() {
      return this._selected;
    }

    set selected(value) {
      this._selected = value;
      if (value)
        this.group.addValue(this);
      else
        this.group.removeValue(this);
      this._doChange();
    }

    getDisplayValue() {
      return this.caption;
    }

    get facet() {
      return this.group.facet;
    }

    getParamValue() {
      return this.domain;
    }

    get value() {
      return this.domain;
    }
  }

  class SearchFilters extends Array {
    constructor(view, facet) {
      super();
      this.view = view;
      this._selection = [];
      if (!facet)
        facet = new FacetView(this);
      this._facet = facet;
    }

    static fromItem(view, el) {
      let group = new SearchFilters(view);
      group.push(SearchFilter.fromItem(view, el, group));
      return group;
    }

    static fromGroup(view, el) {
      let group = new SearchFilters(view);
      for (let child of el.children())
        group.push(SearchFilter.fromItem(view, $(child), group));
      console.log(group);
      return group;
    }

    addValue(item) {
      this._selection.push(item);
      this._facet.values = this._selection.map(item => (new SearchObject(item.toString(), item.value)));
      this._refresh();
    }

    removeValue(item) {
      this._selection.splice(this._selection.indexOf(item), 1);
      this._facet.values = this._selection.map(item => ({ searchString: item.getDisplayValue(), value: item.value }));
      this._refresh();
    }

    selectAll() {
      for (let item of this)
        this.addValue(item);
      this.view.update();
    }

    get caption() {
      return '<span class="fa fa-filter"></span>';
    }

    _refresh() {
      if (this._selection.length) {
        if (this.view.facets.indexOf(this._facet) === -1)
          this.view.facets.push(this._facet);
      } else if (this.view.facets.indexOf(this._facet) > -1)
        this.view.facets.splice(this.view.facets.indexOf(this._facet), 1);
    }

    getParamValue(v) {
      return v.value;
    }

    clear() {
      this._selection = [];
    }

  }

  class SearchGroups extends SearchFilters {
    constructor(view, facet) {
      if (!facet)
        facet = new FacetGroup();
      super(view, facet);
    }

    static fromGroup(opts) {
      let view = opts.view;
      let el = opts.el;
      // get default facet
      let facet = opts.facet || view.facetGrouping;
      let group = new SearchGroups(view, facet);
      if (el)
        for (let child of el.children())
          group.push(SearchGroup.fromItem(view, $(child), group));
      return group;
    }

    addValue(item) {
      this.view.groupLength++;
      let newItem = new SearchObject(item.toString(), item.value);
      newItem._ref = item;
      this._facet.values.push(newItem);
      this._refresh();
    }

    removeValue(item) {
      this.view.groupLength--;
      for (let i of this._facet.values)
        if (i._ref === item) {
          this._facet.values.splice(this._facet.values.indexOf(i), 1);
          break;
        }
      this._refresh();
    }

    _refresh() {
      if (this._facet.values.length) {
        if (this.view.facets.indexOf(this._facet) === -1)
          this.view.facets.push(this._facet);
      } else if (this.view.facets.indexOf(this._facet) > -1)
        this.view.facets.splice(this.view.facets.indexOf(this._facet), 1);
    }
  }

  class SearchObject {
    constructor(display, value) {
      this.display = display;
      this.value = value;
    }
  }

  class SearchResult {
    constructor(field, value) {
      this.field = field;
      this.value = value;
      this.text = value[1];
      this.indent = true;
    }

    select() {
      this.field.selectItem(this.value);
    }
  }

  class SearchField extends SearchItem {
    constructor(view, name, el, field) {
      super(view, name, el);
      this.field = field;
      this._expanded = false;
      if (field.type === 'ForeignKey') {
        this.expandable = true;
        this.children = [];
      } else {
        this.expandable = false;
      }
    }

    get expanded() {
      return this._expanded;
    }

    set expanded(value) {
      this._expanded = value;
      if (value)
        this._loadChildren();
      else {
        this.children = [];
        if (this.view.$items)
          for (let i = this.view.$items.length-1; i > 0; i--) {
            let obj = this.view.$items[i];
            if (obj.field === this) {
              this.view.$items.splice(i, 1);

            }
          }
      }
    }

    _loadChildren() {
      this.loading = true;
      this.view.scope.model.getFieldChoices(this.name, this.view.text)
      .then(res => {
        this.children = res.items;
        // append returned items onto searchView.$items menu
        let index = this.view.$items.indexOf(this);
        if (index > -1) {
          for (let obj of this.children) {
            index++;
            this.view.$items.splice(index, 0, new SearchResult(this, obj))
          }
        }
      })
      .finally(() => this.view.scope.$apply(() => this.loading = false));
    }

    get facet() {
      if (!this._facet)
        this._facet = new FacetView(this);
      return this._facet;
    }

    getDisplayValue() {
      return this.value;
    }

    getParamValue(value) {
      const r = {};
      let name = this.name;
      if (_.isArray(value)) {
        r[name] = value[0];
      } else if (value instanceof SearchObject) {
        return value.value;
      } else {
        r[name + '__icontains'] = value;
      }
      return r;
    }

    get caption() {
      return this.field.caption;
    }

    get value() {
      if (this._value)
        return this._value[1];
      return this.view.text;
    }

    select() {
      this.facet.addValue(this.value);
      this.view.addFacet(this.facet);
      this.view.close();
      this.view.update();
    }

    selectItem(item) {
      let domain = {};
      domain[this.field.name] = item[0];
      this.facet.addValue(new SearchObject(item[1], domain));
      this.view.addFacet(this.facet);
      this.view.close();
      this.view.update();
    }

    static fromField(view, el) {
      let field = view.view.fields[el.attr('name')];
      return new SearchField(view, field.name, el, field);
    }

    get template() {
      return _.sprintf(Katrid.i18n.gettext(`Search <i>%(caption)s</i> by: <strong>%(text)s</strong>`), {
        caption: this.field.caption,
        text: this.view.text,
      });
    }
  }

  class SearchGroup extends SearchFilter {
    constructor(view, name, caption, group, el) {
      super(view, name, el);
      this.group = group;
      this.caption = caption;
      this._selected = false;
    }

    static fromItem(view, el, group) {
      return new SearchGroup(view, el.attr('name'), el.attr('caption'), group, el);
    }

    toString() {
      return this.caption;
    }
  }

  class CustomFilterItem extends SearchFilter {
    constructor(view, field, condition, value, group) {
      super(view, field.name, field.caption, null, group);
      this.field = field;
      this.condition = condition;
      this._value = value;
      this._selected = true;
    }

    toString() {
      let s = this.field.format(this._value);
      return this.field.caption + ' ' + conditionsLabels[this.condition].toLowerCase() + ' "' + s + '"';
    }

    get value() {
      let r = {};
      r[this.field.name + conditionSuffix[this.condition]] = this._value;
      return r;
    }

  }

  Katrid.UI.uiKatrid.controller('CustomFilterController', ['$scope', '$element', '$filter', function ($scope, $element, $filter) {
    $scope.tempFilter = null;
    $scope.customFilter = [];

    $scope.fieldChange = function (field) {
      $scope.field = field;
      $scope.condition = field.defaultCondition;
      $scope.conditionChange($scope.condition);
    };

    $scope.conditionChange = (condition) => {
      $scope.controlVisible = $scope.field.isControlVisible(condition);
    };

    $scope.valueChange = (value) => {
      $scope.searchValue = value;
    };

    $scope.addCondition = (field, condition, value) => {
      if (!$scope.tempFilter)
        $scope.tempFilter = new SearchFilters($scope.$parent.search);
      $scope.tempFilter.push(new CustomFilterItem($scope.$parent.search, field, condition, value, $scope.tempFilter));
      $scope.field = null;
      $scope.condition = null;
      $scope.controlVisible = false;
      $scope.searchValue = undefined;
    };

    $scope.applyFilter = () => {
      if ($scope.searchValue)
        $scope.addCondition($scope.field, $scope.condition, $scope.searchValue);
      $scope.customFilter.push($scope.tempFilter);
      $scope.tempFilter.selectAll();
      $scope.tempFilter = null;
      $scope.customSearchExpanded = false;
    };
  }])

  .directive('customFilter', () => (
    {
      restrict: 'A',
      scope: {
        action: '=',
      },
    }
  ));

  class SearchView {
    constructor(scope, element, view) {
      this.scope = scope;
      this.element = element;
      this.query = new SearchQuery(this);
      this._viewMoreButtons = localStorage.getItem('katrid.search.viewMoreButtons') === 'true';
      this.items = [];
      this.fields = [];
      this.filterGroups = [];
      this.groups = [];
      this._groupLength = this.groupLength = 0;
      this.facets = [];
      this.input = element.find('.search-view-input');
      this.view = view;
      // available dropdown items
      this.$items = null;

      // groups must have a unique facet
      this.facetGrouping = new FacetGroup();

      if (view) {
        this.el = $(view.content);
        this.menu = element.find('.search-dropdown-menu.search-view-menu');
        // let menu = this.createMenu(scope, element.find('.search-dropdown-menu.search-view-menu'), element);

        for (let child of this.el.children()) {
          child = $(child);
          let tag = child.prop('tagName');
          let obj;
          if (tag === 'FILTER') {
            obj = SearchFilters.fromItem(this, child);
            this.filterGroups.push(obj);
          }
          else if (tag === 'FILTER-GROUP') {
            obj = SearchFilters.fromGroup(this, child);
            this.filterGroups.push(obj);
            continue;
          }
          else if (tag === 'GROUP') {
            obj = SearchGroup.fromItem({ view: this, el: child });
            this.groups.push(obj);
            continue;
          }
          else if (tag === 'FIELD') {
            obj = SearchField.fromField(this, child);
            this.fields.push(obj);
            continue;
          }
          console.log('obj', obj);
          if (obj)
            this.append(obj);
        }

        this.input
        .on('input', evt => {
          if (this.input.val().length) {
            return this.show(evt);
          } else {
            return this.close(evt);
          }
        })
        .on('keydown', evt => {
          switch (evt.which) {
            case Katrid.UI.keyCode.DOWN:
              this.move(1);
              evt.preventDefault();
              break;
            case Katrid.UI.keyCode.UP:
              this.move(-1);
              evt.preventDefault();
              break;
            case Katrid.UI.keyCode.ENTER:
              this.scope.$apply(() => angular.element(this.menu.find('li.active a.search-menu-item')).scope().item.select(evt));
              break;
            case Katrid.UI.keyCode.BACKSPACE:
              if (this.input.val() === '') {
                this.scope.$apply(() => this.facets.splice(this.facets.length-1, 1).map(facet => facet.clear()));
                this.update();
                // const item = this.query.items[this.searchView.query.items.length-1];
              }
              break;
          }
        })
        .on('blur', evt => {
          this.input.val('');
          return this.close();
        });
      }
    }

    addCustomGroup(field) {
      if (!this.customGroups) {
        this.customGroups = new SearchGroups(this, this.facetGrouping);
        this.groups.push(this.customGroups);
      }
      let obj = new SearchGroup(this, field.name, field.caption, this.customGroups);
      this.customGroups.push(obj);
      obj.selected = true;
    }

    set viewMoreButtons(value) {
      if (this._viewMoreButtons !== value) {
        this._viewMoreButtons = value;
        localStorage.setItem('katrid.search.viewMoreButtons', value);
      }
    }

    get viewMoreButtons() {
      return this._viewMoreButtons;
    }

    load(filter) {
      Object.entries(filter).map((item, idx) => {
        let i = this.getByName(item[0]);
        if (i)
          i.selected = true;
      })
    }

    getByName(name) {
      // try to find inside a group of filters
      for (let item of this.filterGroups)
        for (let subitem of item)
          if (subitem.name === name)
            return subitem;

      for (let item of this.items)
        if (item.name === name)
          return item;
    }

    append(item) {
      this.items.push(item);
    }

    addFacet(facet) {
      if (!this.facets.includes(facet))
        this.facets.push(facet);
    }

    first() {
      this.menu.find('li.active a.search-menu-item').removeClass('active');
      this.menu.find('li:first').addClass('active');
    }

    remove(index) {
      let facet = this.facets[index];
      facet.destroy();
      this.facets.splice(index, 1);
      this.update();
    }

    getParams() {
      let r = [];
      for (let i of this.facets)
        if (!i.grouping)
          r = r.concat(i.getParamValues());
      return r;
    }

    dump() {
      let res = [];
      for (let i of this.facets)
        res.push(i);
      return res;
    }

    move(distance) {
      const fw = distance > 0;
      distance = Math.abs(distance);
      while (distance !== 0) {
        distance--;
        let el = this.element.find('.search-view-menu li.active');
        if (el.length) {
          el.removeClass('active');
          if (fw) {
            el = el.next();
          } else {
            el = el.prev();
          }
          el.addClass('active');
        } else {
          if (fw) {
            el = this.element.find('.search-view-menu > li:first');
          } else {
            el = this.element.find('.search-view-menu > li:last');
          }
          el.addClass('active');
        }
      }
    }

    update() {
      if (this.groupLength !== this._groupLength) {
        this._groupLength = this.groupLength;
        this.scope.action.applyGroups(this.groupBy(), this.getParams());
      }
      else
        // apply changes to window action
        this.scope.action.setSearchParams(this.getParams());
    }

    groupBy() {
      return this.facetGrouping.values.map(obj => obj._ref.name);
    }

    show() {
      let shouldApply = false;
      if (!this.$items) {
        this.$items = [].concat(this.fields);
        shouldApply = true;
      }
      // close expanded items
      for (let obj of this.$items)
        if (obj.expanded) {
          obj.expanded = false;
          shouldApply = true;
        }
      if (shouldApply)
        this.scope.$apply();
      this.menu.show();
      this.first();
    }

    close() {
      this.$items = null;
      this.menu.hide();
      this.reset();
      this.input.val('');
    }

    reset() {
      for (let i of this.fields)
        if (i && i.children && i.children.length)
          i.expanded = false;
    }
  }

  class SearchViewComponent {
    constructor() {
      this.retrict = 'E';
      this.templateUrl = 'view.search.jinja2';
      this.replace = true;
      this.scope = false;
    }
  }

  class SearchViewArea {
    constructor() {
      this.restrict = 'A';
      this.scope = false;
    }

    link(scope, el, attrs) {
      let view = scope.action.views.search;
      scope.action.searchView = new SearchView(scope, el, view);
      if (scope.action.context.default_search) {
        scope.action.searchView.load(scope.action.context.default_search);
      }
    }
  }

  Katrid.UI.uiKatrid.controller('SearchMenuController', ['$scope', function($scope) {

  }]);

  Katrid.UI.uiKatrid.directive('searchView', SearchViewComponent);
  Katrid.UI.uiKatrid.directive('searchViewArea', SearchViewArea);

  Katrid.UI.Views.SearchView = SearchView;
  Katrid.UI.Views.SearchViewComponent = SearchViewComponent;

})();
