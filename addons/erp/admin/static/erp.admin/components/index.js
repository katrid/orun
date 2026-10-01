
Katrid.Forms.ModelView.contributions.contributeToRender((view) => {
  if (view instanceof Katrid.Forms.FormView) {
    const actionView = view.element.closest('.action-view');
    if (view.toolbarVisible && actionView && !view['__admin_contributed']) {
      view['__admin_contributed'] = true;
      const div = document.createElement('div');
      div.className = 'aside-toolbar bg-body';
      view.element.querySelector('.page-sheet').appendChild(div);
      let btn = document.createElement('button');
      btn.className = 'btn tool-button';
      btn.innerHTML = '<i class="fa fa-duotone fa-2x fa-file-circle-info"></i>';
      btn.onclick = () => view.showProperties();
      btn.title = 'Propriedades';
      div.appendChild(btn);
      // rel diagram
      btn = document.createElement('button');
      btn.className = 'btn tool-button';
      btn.innerHTML = '<i class="fa fa-duotone fa-light fa-2x fa-diagram-project"></i>';
      btn.title = 'Diagrama de relações';
      btn.onclick = () => {
        if (view.record) {
          window.open('/web/erp.core/rel-mapping-diagram?model=' + view.model.name + '&object_id=' + view.record.id);
        }
      }
      div.appendChild(btn);
    }
  }
})