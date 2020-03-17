(function () {

  let pwApp = angular.module('pwApp', ['ui.katrid'])
    .config(['$locationProvider', '$interpolateProvider', function ($locationProvider, $interpolateProvider) {
      $locationProvider.hashPrefix('');
      $interpolateProvider.startSymbol('${');
      $interpolateProvider.endSymbol('}');
    }]);

  pwApp.controller('pwaController', function ($scope) {
    $scope.pwa = new Pwa($scope);
  });


  class Pwa {

    constructor(scope) {
      this.scope = scope;
    }

    get db() {
      if (!this._db) {
        this._db = new Dexie(DB_NAME);
        this._db.version(1)
          .stores({ records: '++$id, service, status, id', });
      }
      return this._db;
    }

    async save(service, obj, config) {
      let r;
      if (obj.$id) {
        await this.db.records.update(obj.$id, {
          $id: obj.$id,
          service,
          data: obj,
          status: 'pending',
        });
        r = obj.$id;
      } else {
        r = await this.db.records.add({
          service,
          data: obj,
          status: 'pending',
        });
        obj.$id = r;
      }
      navigator.serviceWorker.ready.then(reg => reg.sync.register('syncRecords'));

      if (config && config.redirect)
        window.location.href = config.redirect;

      return r;
    }

    async write(service, obj, redir) {
      let model = new katrid.services.Model(service);
      let res = await model.write(obj);
      if (redir)
        window.location.href = redir;
      return res;
    }

    saveChild(name) {
      //, form_.$records.push(form_{{ field.name }}.record);record.{{ field.name }} = record.{{ field.name }} || [];record.{{ field.name }}.push({action:'CREATE', values: form_{{ field.name }}.record);form_{{ field.name }}.record=null;"
      let child = this.scope['form_' + name];
      let record = child.record;
      child.$records.push(child.record);
      if (!this.scope.record[name])
        this.scope.record[name] = [];
      record = {action: 'CREATE', values: record};
      this.scope.record[name].push(record);
      child.record = null;
    }

    async getById(service, member, where) {
      let model = new katrid.services.Model(service);
      let res = await model.getById(where);
      this.scope[member] = res.data[0];
      this.scope.$apply();
      return res;
    }

    async loadToClient(service, member, where) {
      let model = new katrid.services.Model(service);
      let res = await model.search();
      this.scope[member] = res.data;
      this.scope.$apply();
      return res;
    }

    async list(member, service, where) {
      let res = await this.db.records.where({ service }).toArray();

      this.scope.$apply(() => this.scope[member] = res);
    }

  }

})();
