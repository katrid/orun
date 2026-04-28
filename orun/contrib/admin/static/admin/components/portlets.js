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
    name: 'Minhas Atividades Recentes', description: 'Tabela de registro das suas atividades recentes', category: 'Core',
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

  oui.portlets.registerPortlet(myActivitiesPorlet, 'admin');
  oui.portlets.registerPortlet(recentActionsPortlet, 'admin');
})();
