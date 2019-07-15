(function () {

  class ActionManager extends Array {
    constructor() {
      super();
      this.currentAction = null;
      this.mainAction = null;
    }

    addAction(action) {
      if (!this.mainAction)
        this.mainAction = action;
      this.push(action);
      this.currentAction = action;
    }

    back(action, url) {
      if (action)
        this.action = action;
      else if (this.length > 1)
        this.action = this[this.length-2];
      this.action.$attach();
      this.action.refreshBreadcrumb();
      if (angular.isString(url))
        Katrid.app.loadPage(url);
      else if (url)
        Katrid.app.$location.search(url);
    }

    removeAction(action) {
      this.splice(this.indexOf(action), this.length);
      if (this.length === 0)
        this.mainAction = null;
    }

    get action() {
      return this.currentAction;
    }

    set action(action) {
      let i = this.indexOf(action);
      if (i > -1) {
        i++;
        while (this.length > i)
          this[i].$destroy();
        this.currentAction = action;
      }
    }

    clear() {
      for (let action of this)
        action.$destroy();
      this.length = 0;
      this.mainAction = null;
      this.currentAction = null;
    }

    get path() {
      return this.action.path;
    }

    doAction(action) {

    }

    async onHashChange(params, reset) {
      let actionId = params.action;

      // clear action manager history
      if (reset)
        this.clear();

      // check if action has changed
      let oldAction, action;
      action = oldAction = this.currentAction;


      // action auto detection
      if (!actionId && params.model && (!action || (action.params && (action.params.model !== params.model)))) {
        // get a virtual window action
        let svc = new Katrid.Services.Model(params.model);
        let actionInfo = await svc.rpc('get_formview_action', [params.id]);
        let scope = this.createScope();
        action = scope.action = new Katrid.Actions[actionInfo.action_type](actionInfo, scope, params);
      } else if (!(this.currentAction && (this.currentAction.info.id == actionId))) {
        if (this.currentAction && reset)
          this.currentAction.$destroy();
        let actionInfo = await Katrid.Services.Actions.load(actionId);
        let scope = this.createScope();
        action = scope.action = new Katrid.Actions[actionInfo.action_type](actionInfo, scope, params);
      }

      await action.onHashChange(params);
    }

    createScope() {
      let scope = Katrid.app.$scope.$new(true);
      scope._ = _;
      return scope;
    }

    get breadcrumb() {
      if (this._breadcrumb)
        return this._breadcrumb;
      let breadcrumb = [];
      for (let action of this) {
        let bc = action.breadcrumb;
        if (bc && bc.length) {
          for (let b of bc)
            b.isLeaf = false;
          breadcrumb.push(...bc);
        }
      }
      breadcrumb[breadcrumb.length-1].isLeaf = true;
      this._breadcrumb = breadcrumb;
      return breadcrumb;
    }
  }

  class Action {
    static initClass() {
      this.actionType = null;
      this._context = null;
    }

    constructor(info, scope, params, $container) {
      this.info = info;
      this.scope = scope;
      Katrid.app.actionManager.addAction(this);

      if (!$container)
        $container = Katrid.app.$element;
      this.$parent = $container;
    }

    $destroy() {
      Katrid.app.actionManager.removeAction(this);
      this.scope.$destroy();
      if (this.$element)
        // check if there's an element
        this.$element.remove();
      else
        // or clear the container
        this.$parent.empty();
    }

    get id() {
      return this.info.id;
    }

    get context() {
      if (!this._context) {
        if (_.isString(this.info.context))
          this._context = JSON.parse(this.info.context);
        else
          this._context = {};
      }
      return this._context;
    }

    doAction(act) {
      let type = act.type || act.action_type;
      return Katrid.Actions[type].dispatchAction(this, act);
    }

    openObject(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (evt.ctrlKey) {
        window.open(evt.target.href);
        return false;
      } else {
        console.log(evt.target.href);
        location.hash = evt.target.href;
      }
      return false;
    }

    restore() {}

    apply() {}
    backTo(index) {
      let b = Katrid.app.actionManager.breadcrumb[index];
      if (b)
        Katrid.app.actionManager.back(b.action, b.url);
      return;
      if (this._currentPath !==  this._unregisterHook && (Katrid.app.actionManager.length > 1))
        this._unregisterHook();

      // restore to query view
      let action = Katrid.app.actionManager[index];
      if ((index === 0) && (viewType === 0))
        return action.restore(action.searchViewType || action.viewModes[0]);
      else if ((index === 0) && (viewType === 'form'))
        return action.restore('form');

      Katrid.app.actionManager.action = action;

      if (!viewType)
        viewType = 'form';

      let location;
      location = action.currentUrl;
      action.info.__cached = true;
      let p = this.location.path(location, true, action.info);
      let search = action._currentParams[viewType];
      console.log('search', search);
      if (search)
        p.search(search);
    }

    execute() {}

    getCurrentTitle() {
      return this.info.display_name;
    }

    search() {
      if (!this.isDialog) {
        return this.location.search.apply(null, arguments);
      }
    }


    async onHashChange(params) {
      location.hash = '#/app/?' + $.param(params);
      await this.execute();
    }
  }
  Action.initClass();


  class ViewAction extends Action {
    static initClass() {
      this.actionType = 'ir.action.view';
    }

    async onHashChange(params) {
      location.hash = '#/app/?' + $.param(params);
      let svc = new Katrid.Services.Model('ir.action.view');
      let res = await svc.post('get_view', { args: [ this.info.view[0] ] });
      let content = res.content;
      Katrid.app.$element.html(Katrid.Core.$compile(content)(this.scope));
    }
  }
  ViewAction.initClass();


  class UrlAction extends Action {
    static initClass() {
      this.actionType = 'ir.action.url';
    }

    constructor(info, scope, location) {
      super(info, scope, location);
      window.location.href = info.url;
    }
  }
  UrlAction.initClass();


  Katrid.Actions = {
    Action,
    ViewAction,
    UrlAction,
    ActionManager,
  };


  Katrid.Actions[ViewAction.actionType] = ViewAction;
  Katrid.Actions[UrlAction.actionType] = UrlAction;


})();
