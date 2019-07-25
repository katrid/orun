(function () {

  let requestManager;
  class RequestManager {
    constructor() {
      this.requestId = 0;
      this.requests = {};
    }

    request() {
      const reqId = ++requestManager.requestId;
      const def = new $.Deferred();
      this.requests[reqId] = def;
      def.requestId = reqId;
      return def;
    }
  }


  if (Katrid.socketio) {
    requestManager = new RequestManager();

    Katrid.socketio.on('connect', () => console.log("I'm connected!"));

    Katrid.socketio.on('api', function (data) {
      if (_.isString(data)) {
        data = JSON.parse(data);
      }
      const def = requestManager.requests[data['req-id']];
      return def.resolve(data);
    });
  }


  class Service {
    static get url() { return '/api/rpc/' };

    constructor(name, scope) {
      this.name = name;
    }

    static $fetch(url, config, params) {
      if (params) {
        url = new URL(url);
        Object.entries(params).map((k, v) => url.searchParams.append(k, v));
      }
      // send events
      $(Katrid).trigger('fetch.before');
      return fetch(url, config)
      .then(response => {
        $(Katrid).trigger('fetch.done');
        return response;
      });
    }

    static $post(url, data, params) {
      return this.$fetch(url, {
        method: 'POST',
        credentials: "same-origin",
        body: JSON.stringify(data),
        headers: {
          'content-type': 'application/json',
        }
      }, params)
      .then(res => res.json());
    }

    delete(name, params, data) {
    }

    get(name, params) {
      if (Katrid.Settings.servicesProtocol === 'ws') {
        // Using websocket protocol
        return Katrid.socketio.emit('api', {channel: 'rpc', service: this.name, method: name, data, args: params});
      } else {
        // Using http protocol
        const methName = this.name ? this.name + '/': '';
        const rpcName = Katrid.Settings.server + this.constructor.url + methName + name + '/';
        return $.get(rpcName, params);
      }
    }

    post(name, data, params) {
      let context;
      if (Katrid.app)
        context = Katrid.app.context;
      if (!data)
        data = {};
      if (context)
        data.context = context;

      data = {
        jsonrpc: '2.0',
        method: name,
        params: data,
        id: Math.floor(Math.random() * 1000 * 1000 * 1000)
      };

      // Check if protocol is socket.io
      if (Katrid.settings.servicesProtocol === 'io') {
        const def = requestManager.request();
        Katrid.socketio.emit('api',
          {
            "req-id": def.requestId,
            "req-method": 'POST',
            service: this.name,
            method: name,
            data,
            args: params
          }
        );
        return def;

        // Else, using ajax
      } else {
        const methName = this.name ? this.name + '/': '';
        let rpcName = Katrid.settings.server + this.constructor.url + methName + name + '/';
        if (params) {
          rpcName += `?${$.param(params)}`;
        }
        return new Promise(
          (resolve, reject) => {

            fetch(rpcName, {
              method: 'POST',
              body: JSON.stringify(data),
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            })
            .then(res => res.json())
            .then(res => {
              if (res.error)
                reject(res.error);
              else {
                if (res.result) {
                  let messages;
                  if (res.result.messages)
                    messages = res.result.messages;
                  else
                    messages = [];
                  if (res.result.message)
                    messages.push(res.result.message);
                  else if (res.result.warn)
                    messages.push({ type: 'warn', message: res.result.warn });
                  else if (res.result.info)
                    messages.push({ type: 'info', message: res.result.info });
                  else if (res.result.error)
                    messages.push({ type: 'error', message: res.result.error });
                  messages.forEach(function (msg) {
                    if (_.isString(msg))
                      Katrid.UI.Dialogs.Alerts.success(msg);
                    else if (msg.type === 'warn')
                      Katrid.UI.Dialogs.Alerts.warn(msg.message);
                    else if (msg.type === 'info')
                      Katrid.UI.Dialogs.Alerts.info(msg.message);
                    else if ((msg.type === 'error') || (msg.type === 'danger'))
                      Katrid.UI.Dialogs.Alerts.error(msg.message);
                  });
                }
                resolve(res.result);
              }
            })
            .catch(res => reject(res));
          }
        );
      }
    }
  }


  class Model extends Service {
    searchName(name) {
      if (_.isString(name))
        name = { args: name };
      return this.post('search_name', name);
    }

    createName(name) {
      let kwargs = {name};
      return this.post('create_name', { kwargs: kwargs });
    }

    search(data, params) {
      return this.post('search', { kwargs: data }, params);
    }

    destroy(id) {
      if (!_.isArray(id))
        id = [id];
      return this.post('destroy', { kwargs: {ids: id} });
    }

    getById(id) {
      return this.post('get', { args: [id] });
    }

    getDefaults(kwargs) {
      return this.post('get_defaults', { kwargs });
    }

    copy(id) {
      return this.post('copy', { args: [id] });
    }

    static _prepareFields(res) {
      if (res) {
        res.fields = Katrid.Data.Fields.Field.fromArray(res.fields);
        res.fieldList = Object.values(res.fields);
        if (res.views) {
          Object.values(res.views).map(v => v.fields = Katrid.Data.Fields.Field.fromArray(v.fields));
          Object.keys(res.views).map(k => res.views[k] = new Katrid.UI.ViewInfo(res.views[k]));
        }
      }
      return res;
    }

    getViewInfo(data) {
      return this.post('get_view_info', { kwargs: data })
      .then(this.constructor._prepareFields);
    }

    async loadViews(data) {
      return this.post('load_views', { kwargs: data })
      .then(this.constructor._prepareFields);
    }

    getFieldsInfo(data) {
      return this.post('get_fields_info', { kwargs: data })
      .then(this.constructor._prepareFields);
    }

    getFieldChoices(field, term, kwargs) {
      return this.post('get_field_choices', { args: [ field, term ], kwargs: kwargs } );
    }

    doViewAction(data) {
      return this.post('do_view_action', { kwargs: data });
    }

    write(data, params) {
      return new Promise((resolve, reject) => {
        this.post('write', {kwargs: {data}}, params)
        .then((res) => {
          Katrid.UI.Dialogs.Alerts.success(Katrid.i18n.gettext('Record saved successfully.'));
          resolve(res);
        })
        .catch(res => {
          if ((res.status === 500) && res.responseText)
            alert(res.responseText);
          else
            Katrid.UI.Dialogs.Alerts.error(Katrid.i18n.gettext('Error saving record changes'));
          reject(res);
        });
      });
    }

    groupBy(grouping, params) {
      return this.post('group_by', { kwargs: { grouping, params } });
    }

    autoReport() {
      return this.post('auto_report', { kwargs: {} });
    }

    rpc(meth, args, kwargs) {
      // execute rpc
      return new Promise((resolve, reject) => {
        this.post(meth, { args: args, kwargs: kwargs })
        .then(res => {
          // open a document
          if (res && res.open)
            window.open(res.open);
          resolve(res);
        })
        .catch(res => {
          if (res.messages && _.isObject(res.messages))
            for (let msg of Object.values(res.messages))
              Katrid.UI.Dialogs.Alerts.error(msg.join('\n'));
          else
            Katrid.UI.Dialogs.Alerts.error(res.message);
          reject(res);
        });
      });
    }
  }


  // Represents a server query
  class Query extends Model {
    constructor() {
      super('ir.query');
    }

    static read(config) {
      // read data from server
      let details, id, params;
      if (_.isObject(config)) {
        details = config.details;
        params = config.params;
        id = config.id;
      } else
        id = config;
      return (new Query()).post('read', { args: [id], kwargs: { with_desc: details, params, as_dict: config.as_dict } });
    }

    static all() {
      return (new Query()).rpc('all');
    }

    static executeSql(sql) {
      return (new Query()).post('execute_sql', { args: [sql] });
    }
  }


  class Data extends Service {
    static get url() { return '/web/data/' };

    reorder(model, ids, field='sequence', offset=0) {
      return this.post('reorder', { args: [ model, ids, field, offset ] });
    }
  }

  class Attachments {
    static destroy(id) {
      let svc = new Model('ir.attachment');
      svc.destroy(id);
    }

    static upload(file, scope=null) {
      let data = new FormData();
      if (scope === null) scope = angular.element(file).scope();
      data.append('model', scope.model.name);
      data.append('id', scope.recordId);
      for (let f of file.files) data.append('attachment', f, f.name);
      return $.ajax({
        url: '/web/content/upload/',
        type: 'POST',
        data: data,
        processData: false,
        contentType: false
      })
      .done((res) => {
        console.log('attachments', scope.attachments, scope);
        if (!scope.attachments)
          scope.attachments = [];
        if (res)
          for (let obj of res) scope.attachments.push(obj);
        scope.$apply();
      });
    }
  }

  class View extends Model {
    constructor() {
      super('ui.view');
    }

    fromModel(model) {
      return this.post('from_model', null, {model});
    }
  }


  class Actions extends Model {
    static load(action) {
      let svc = new Model('ir.action');
      return svc.post('load', { args: [action] });
    }
  }


  class Auth extends Service {
    static login(username, password) {
      return this.$post('/web/login/', { username: username, password: password });
    }
  }

  class Upload {
    static sendFile(service, file) {
      let form = new FormData();
      form.append('files', file.files[0]);
      let scope = angular.element(file).scope();
      let url = `/web/file/upload/${scope.model.name}/${service}/`;
      if (scope.record && scope.record.id)
        form.append('id', scope.record.id);
      // try to detect the current datasource to be refreshed if needed
      let dataSource = scope.action.dataSource;
      if (!dataSource) {
        dataSource = scope.$parent.dataSource;
        let s = scope.$parent;
        while (s) {
          dataSource = s.dataSource;
          if (dataSource)
            break;
          s = scope.$parent;
        }
      }
      $.ajax({
        url: url,
        data: form,
        processData: false,
        contentType: false,
        type: 'POST',
        success: (data) => {
          dataSource.refresh();
          Katrid.UI.Dialogs.Alerts.success('Operação realizada com sucesso.')
        }
      });
    }

    static uploadTo(url, file) {
      let form = new FormData();
      form.append('files', file.files[0]);
      return $.ajax({
        url: url,
        data: form,
        processData: false,
        contentType: false,
        type: 'POST',
        success: (data) => {
          Katrid.UI.Dialogs.Alerts.success('Arquivo enviado com sucesso!');
        }
      });
    }
  }

  this.Katrid.Services = {
    Data,
    View,
    data: new Data('', ),
    Attachments,
    Service,
    Model,
    Query,
    Auth,
    Upload,
    Actions,
    post(url, data) {
      // post json data to server
      return fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }).then(res => res.json());
    }
  };

})();

