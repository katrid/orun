(function () {
  function myActivitiesPorlet(portlet) {
    let el = document.createElement('div');
    let table = document.createElement('table');
    table.className = 'table table-striped table-bordered table-hover';
    table.innerHTML = `<thead><tr><th>Timestamp</th><th>Action</th><th>Object</th></tr></thead>`;
    let tbody = table.createTBody();
    el.append(table);
    let loading = document.createElement('div');
    loading.innerHTML = Katrid.i18n.gettext('Loading...');
    el.append(loading);
    setTimeout(async () => {
      const model = new Katrid.Services.ModelService('admin.log.entry');
      let res = await model.rpc('get_entries');
      let count = res.entries.length;
      loading.innerHTML = count ? '' : 'Nenhuma atividade recente';
      if (count === 0) return
      for (let item of res.entries) {
        let tr = document.createElement('tr');
        tr.innerHTML = `
<td>${Katrid.filtersRegistry.dateTimeHumanize(item.timestamp)}</td>
<td>${item.details.codename}</td>
<td>${item.details.record_name}</td>`;
        tbody.append(tr);
      }
    }, 3000);
    return el;
  }

  myActivitiesPorlet.info = {
    name: 'Minhas Atividades Recentes',
    description: 'Tabela de registro das suas atividades recentes',
    category: 'Core',
  }


  function recentActionsPortlet() {
    let el = document.createElement('div');
    let table = document.createElement('table');
    table.className = 'table table-striped table-bordered table-hover';
    table.innerHTML = `<thead><tr><th>Last Access</th><th>Action</th></tr></thead>`;
    let tbody = table.createTBody();
    el.append(table);
    let loading = document.createElement('div');
    loading.innerHTML = Katrid.i18n.gettext('Loading...');
    el.append(loading);
    setTimeout(async () => {
      const model = new Katrid.Services.ModelService('admin.ux.counter');
      let res = await model.rpc('get_entries');
      let count = res.entries.length;
      loading.innerHTML = count ? '' : 'Nenhuma atividade recente';
      if (count === 0) return
      for (let item of res.entries) {
        let tr = document.createElement('tr');
        tr.innerHTML = `
<td>${Katrid.filtersRegistry.dateTimeHumanize(item.last_access)}</td>
<td>${item.description}</td>
`;
        tbody.append(tr);
      }
    }, 3000);
    return el;
  }


  recentActionsPortlet.info = {
    name: 'Ações Mais Acessadas', description: 'Registro das ações mais acessadas pelo usuário', category: 'Core',
  }

  function workflowPortlet(portlet) {

    const el = document.createElement('div');
    el.innerHTML = Katrid.i18n.gettext('Loading...');
    const loadFromView = async () => {
      if (portlet.data.title) {
        portlet.title = portlet.data.title;
      }
      const svc = new Katrid.Services.ModelService('ui.view');
      const res = await svc.rpc('get_view_content', null, { id: portlet.data.viewId });
      el.innerHTML = Katrid.i18n.gettext('Loading...');
      setTimeout(async () => {
        const { svg } = await mermaid.render('diagram-' + portlet.data.viewId.toString(), res);
        el.innerHTML = svg;
      }, 5000)
    }
    if (portlet.data) {
      // load data
      loadFromView();
    } else {
      el.innerHTML = '';
      const h3 = document.createElement('h3');
      h3.innerHTML = Katrid.i18n.gettext('Selecione o workflow');
      el.appendChild(h3);
      const list = document.createElement('div');
      list.className = 'list-group';
      const svc = new Katrid.Services.ModelService('ui.view');
      svc.search({ where: { view_type: 'workflow' } })
      .then(res => {
        if (res.data) {
          for (const obj of res.data) {
            const a = document.createElement('a');
            a.className = 'list-group-item';
            const h5 = document.createElement('h5');
            h5.innerHTML = obj.name;
            a.appendChild(h5);
            if (obj.usage) {
              const span = document.createElement('small');
              span.innerHTML = obj.usage;
              a.appendChild(span);
            }
            a.addEventListener('click', () => {
              this.data = portlet.data = { viewId: obj.id, title: obj.name };
              loadFromView();
              el.closest('.homepage-view').dispatchEvent(new CustomEvent('oui:userChange', { detail: { portlet } }));
            });
            list.appendChild(a);
          }
        }
      })
      el.appendChild(list);
      // .then(res => {
      //   console.debug('load list', res)
      // })
    }
    return el;
  }

  workflowPortlet.info = {
    name: 'Workflow', description: 'Workflow process diagram', category: 'Core',
  }

  workflowPortlet.dump = () => {

  }

  oui.portlets.registerPortlet(myActivitiesPorlet, 'admin');
  oui.portlets.registerPortlet(recentActionsPortlet, 'admin');
  oui.portlets.registerPortlet(workflowPortlet, 'admin');
})();
