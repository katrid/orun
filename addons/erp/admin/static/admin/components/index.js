
Katrid.Forms.ModelView.contributions.contributeToRender((view) => {
  if (view instanceof Katrid.Forms.FormView) {
    const actionView = view.element.closest('.action-view');
    if (view.toolbarVisible && actionView) {
      console.debug('create aside toolbars')
      const div = document.createElement('div');
      div.className = 'aside-toolbar bg-body';
      view.element.querySelector('.page-sheet').appendChild(div);
      let btn = document.createElement('button');
      btn.className = 'btn tool-button';
      btn.innerHTML = '<i class="fa fa-duotone fa-2x fa-file-circle-info"></i>';
      div.appendChild(btn);
      div.onclick = () => view.showProperties();
      // rel diagram
      btn = document.createElement('button');
      btn.className = 'btn tool-button';
      btn.innerHTML = '<i class="fa fa-duotone fa-2x fa-diagram-project"></i>';
      btn.title = 'Diagrama de relações';
      btn.onclick = () => window.open('/web/erp.core/rel-mapping-diagram?model=' + view.model.name + '&object_id=' + view.record.id);
      div.appendChild(btn);
    }
  }
})