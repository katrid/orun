(function() {

  class ClientAction extends Katrid.Actions.Action {
    static initClass() {
      this.actionType = 'ir.action.client';
      this.registry = {};
    }

    static register(tag, obj) {
      this.registry[tag] = obj;
    }

    static executeTag(parent, act) {
      // get action
      let action = this.registry[act.tag];
      if (action.prototype instanceof Katrid.UI.Views.ActionView) {
        action = new action(parent.scope);
        action.renderTo(parent);
      }
      else console.log('is a function');
    }

    static tagButtonClick(btn) {
      let action = {
        type: 'ir.action.client',
        tag: btn.attr('name'),
        target: btn.attr('target') || 'new',
      };

      action = new ClientAction(action, Katrid.Actions.actionManager.action.scope, Katrid.Actions.actionManager.action.location);
      action.execute();
    }

    tag_refresh() {
      this.dataSource.refresh();
    }

    get templateUrl() {
      console.log(this.tag);
      return this.tag.templateUrl;
    }

    async execute() {
      let tag = ClientAction.registry[this.info.tag];
      this.tag = tag;
      if (tag.prototype instanceof Katrid.UI.Views.ClientView) {
        this.tag = new tag(this);
        let el = await this.tag.render();
        if (this.info.target === 'new') {
          el = el.modal();
        } else {
          $('#katrid-action-view').empty().append(el);
        }
      } else if (_.isString(tag))
        this[tag].apply(this);
    }

    async routeUpdate(location) {
      // this.execute();
    }

    get template() {
      return this.tag.template;
    }
  }

  ClientAction.initClass();

  Katrid.Actions.ClientAction = ClientAction;
  Katrid.Actions[ClientAction.actionType] = ClientAction;

})();
