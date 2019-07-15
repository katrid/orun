namespace Katrid.UI.Designer {

  export class BaseDesigner {
    private _selection: Array<any> = [];
    handles: Array<GrabHandleObject> = [];
    surface: HTMLElement;

    constructor(container: HTMLElement) {
      container.addEventListener('keydown', (evt) => {
        switch (evt.key) {
          case 'ArrowUp':
          case 'ArrowRight':
          case 'ArrowDown':
          case 'ArrowLeft':
            this.startMove(evt);
            this.moveSelection(evt);
            break;
        }
      });

      container.addEventListener('keyup', (evt) => {
        switch (evt.key) {
          case 'ArrowUp':
          case 'ArrowRight':
          case 'ArrowDown':
          case 'ArrowLeft':
            this.stopMove(evt);
            this.refreshSelection(evt);
            break;
        }
      });

      container.addEventListener('keypress', (evt) => {
        if (evt.key === 'Delete') {
          evt.stopPropagation();
          this.deleteSelection();
        }
      });

    }

    deleteSelection() {
      for (let child of this.selection)
        child.$delete();
      this.destroyHandles();
    }

    moveSelection(evt) {
      let top = 0, right = 0, bottom = 0, left = 0;
      switch (evt.key) {
        case 'ArrowUp':
          top = -1;
          break;
        case 'ArrowRight':
          left = 1;
          break;
        case 'ArrowDown':
          top = 1;
          break;
        case 'ArrowLeft':
          left = -1;
          break;
      }
      this._moveSelection(top, right, bottom, left);
    }

    _moveSelection(top, right, bottom, left) {
      for (let sel of this.selection) {
        if (top)
          sel.top += top;
        if (right)
          sel.width += right;
        if (bottom)
          sel.height += bottom;
        if (left)
          sel.left += left;
      }
    }

    clearSelection() {
      this.destroyHandles();
      this.selection = [];
    }

    refreshSelection(evt) {
      this.selection = this._selection;
    }

    updateSelection() {
      this.destroyHandles();
      for (let sel of this.selection)
        this.addGrabHandles(sel);
    }

    get selection() {
      return this._selection;
    }

    set selection(value) {
      this._selection = value;
      this.updateSelection();
      this.onSelectionChange(value);
    }

    destroyHandles() {
      for (let h of this.handles)
        h.destroy();
      this.handles = [];
    }

    startMove(evt) {
      // start keyboard move
      this.destroyHandles();
    }

    stopMove(evt) {
      // stop keyboard move
      this.updateSelection();
    }

    onSelectionChange(value) {
      // on selection change event
    }

    addGrabHandles(obj) {
      // show grab handles to an object
      let handle = new GrabHandleObject(obj.el, this);
      handle.createHandles();
    }

  }

  export class GrabHandleObject {
    designer: BaseDesigner;
    topCenter: any;
    topRight: any;
    middleLeft: any;
    bottomRight: any;
    bottomCenter: any;
    bottomLeft: any;
    middleRight: any;
    topLeft: any;
    handles: Array<JQuery<HTMLElement>> = [];
    el: HTMLElement;
    dragObject: DragObject;
    dragging: boolean = false;

    constructor(el, designer) {
      this.el = el;
      this.designer = designer;

      // init object drag
      this.dragObject = new DragObject(el, designer.surface[0]);
    }

    createHandle() {
      let h = $('<label class="target-handle"></label>');
      this.handles.push(h);
      return h;
    }

    setPosition() {
      let rect = this.el.getBoundingClientRect();

      let handle = this.bottomLeft;
      handle.css('left', rect.left - 3);
      handle.css('top', rect.bottom - 5);

      handle = this.middleLeft;
      handle.css('left', rect.left - 3);
      handle.css('top', rect.bottom - rect.height / 2 - 4);

      handle = this.topLeft;
      handle.css('left', rect.left - 3);
      handle.css('top', rect.top - 3);

      handle = this.topRight;
      handle.css('left', rect.right - 4);
      handle.css('top', rect.top - 3);

      handle = this.middleRight;
      handle.css('left', rect.right - 4);
      handle.css('top', rect.bottom - rect.height / 2 - 4);

      handle = this.bottomRight;
      handle.css('left', rect.right - 4);
      handle.css('top', rect.bottom - 5);

      handle = this.topCenter;
      handle.css('left', rect.right - rect.width / 2 - 4);
      handle.css('top', rect.top - 3);

      handle = this.bottomCenter;
      handle.css('left', rect.right - rect.width / 2 - 4);
      handle.css('top', rect.bottom - 5);
    }

    _setGrabHandle() {
      let handle = this.topLeft;
      let _y, _x;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let pos = el.position();
            el.css('left', (pos.left - x).toString() + 'px');
            el.css('top', pos.top - y);
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('height', h + y);
            el.css('width', (w + x).toString() + 'px');
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup)
      });

      handle = this.topRight;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let parent = el.parent();
            let pos = el.position();
            el.css('top', pos.top - y);
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('height', h + y);
            el.css('width', w - x);
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].setPointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup)
      });

      handle = this.bottomRight;
      handle.on('pointerdown', (evt) => {
        _y = evt.pageY;
        _x = evt.pageX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = _y - evt.pageY;
            let x = _x - evt.pageX;
            let el = $(this.el);
            let parent = el.parent();
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('height', h - y);
            el.css('width', w - x);
            _y = evt.pageY;
            _x = evt.pageX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup)
      });

      handle = this.middleLeft;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let pos = el.position();
            el.css('left', pos.left - x);
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('width', w + x);
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup);
      });

      handle = this.middleRight;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let pos = el.position();
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('width', w - x);
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup);
      });

      handle = this.bottomCenter;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let parent = el.parent();
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('height', h - y);
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup);
      });

      handle = this.topCenter;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let parent = el.parent();
            let pos = el.position();
            el.css('top', pos.top - y);
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('height', h + y);
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup);
      });

      handle = this.bottomLeft;
      handle.on('pointerdown', (evt) => {
        _y = evt.screenY;
        _x = evt.screenX;
        this.dragging = true;
        evt.stopPropagation();
        evt.preventDefault();
        handle[0].setPointerCapture(evt.pointerId);

        let _onmousemove = (evt) => {
          evt.preventDefault();
          if (this.dragging) {
            let y = evt.screenY;
            let x = evt.screenX;
            y = _y - y;
            x = _x - x;
            let el = $(this.el);
            let pos = el.position();
            let h = el.outerHeight();
            let w = el.outerWidth();
            el.css('height', h - y);
            el.css('left', pos.left - x);
            el.css('width', w + x);
            _y = evt.screenY;
            _x = evt.screenX;
            this.setPosition();
            el[0].dispatchEvent(new Event('designerresizing'));
          }
        };

        let _onmouseup = (evt) => {
          handle[0].releasePointerCapture(evt.pointerId);
          if (this.dragging) {
            evt.preventDefault();
            this.dragging = false;
            this.el.dispatchEvent(new Event('designerresized'));
            handle.off('pointermove');
            handle.off('pointerup');
          }
        };
        handle.on('pointermove', _onmousemove);
        handle.on('pointerup', _onmouseup);
      });

    }

    createHandles() {
      let handle;

      // bottom-left
      this.bottomLeft = handle = this.createHandle();
      handle.addClass('bottom-left');
      this.designer.surface.append(handle);

      // middle-left
      this.middleLeft = handle = this.createHandle();
      handle.addClass('middle-left');
      this.designer.surface.append(handle);

      // top-left
      this.topLeft = handle = this.createHandle();
      handle.addClass('top-left');
      this.designer.surface.append(handle);

      // top-right
      this.topRight = handle = this.createHandle();
      handle.addClass('top-right');
      this.designer.surface.append(handle);

      // middle-right
      this.middleRight = handle = this.createHandle();
      handle.addClass('middle-right');
      this.designer.surface.append(handle);

      // bottom-right
      this.bottomRight = handle = this.createHandle();
      handle.addClass('bottom-right');
      this.designer.surface.append(handle);

      // top-center
      this.topCenter = handle = this.createHandle();
      handle.addClass('top-center');
      this.designer.surface.append(handle);

      // bottom-center
      this.bottomCenter = handle = this.createHandle();
      handle.addClass('bottom-center');
      this.designer.surface.append(handle);

      this.designer.handles.push(this);
      this.setPosition();
      this._setGrabHandle();
    }

    destroy() {
      for (let h of this.handles)
        h.remove();
      this.handles = [];
      this.dragObject.destroy();
    }
  }

  export class DragObject {
    mousedown: any;
    mouseup: any;
    mousemove: any;
    private _dragging: boolean = false;
    private _y: number;
    private _x: number;

    constructor(public el: HTMLElement, public container: HTMLElement) {
      this.el = el;
      this.mousedown = (evt) => this.dragStart(evt);
      this.mouseup = (evt) => this.dragEnd(evt);
      this.mousemove = (evt) => this.drag(evt);
      container.addEventListener('mousedown', this.mousedown);
      container.addEventListener('mouseup', this.mouseup);
      container.addEventListener('mousemove', this.mousemove);
    }

    dragStart(evt) {
      if ((evt.button === 0) && (evt.target === this.el)) {
        this._y = evt.screenY;
        this._x = evt.screenX;
        this.dragging = true;
      }
    }

    dragEnd(evt) {
      if (this.dragging) {
        this.dragging = false;
        this.el.dispatchEvent(new Event('designerdragend'));
      }
    }

    drag(evt) {
      if (this.dragging) {
        evt.preventDefault();
        evt.stopPropagation();
        let el = $(this.el);
        if (this.dragging) {
          let y = evt.screenY;
          let x = evt.screenX;
          y = this._y - y;
          x = this._x - x;
          let el = $(this.el);
          let pos = el.position();
          el.css('left', (pos.left - x).toString() + 'px');
          el.css('top', (pos.top - y).toString() + 'px');
          this._y = evt.screenY;
          this._x = evt.screenX;
        }

        this.el.dispatchEvent(new Event('designerdrag'));
      }
    }

    destroy() {
      this.container.removeEventListener('mousedown', this.mousedown);
      this.container.removeEventListener('mouseup', this.mouseup);
      this.container.removeEventListener('mousemove', this.mousemove);
    }

    get dragging() {
      return this._dragging;
    }

    set dragging(value) {
      if (value)
        this.el.dispatchEvent(new Event('designerdragstart'));
      this._dragging = value;
    }
  }
}

