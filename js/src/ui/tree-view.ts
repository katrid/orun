namespace Katrid.UI {

  const DEFAULT_EXPAND_CLASS = 'fa-caret-right';
  const DEFAULT_COLLAPSE_CLASS = 'fa-caret-down';

  export class Component {
    protected _el: HTMLElement;

    get el(): HTMLElement {
      return this._el;
    }

    set el(value: HTMLElement) {
      this.setElement(value);
    }

    protected setElement(el) {
      this._el = el;
      el.katrid = { object: this };
    }
  }

  export class TreeNode extends Component {
    data: Object;
    private readonly  _ul: HTMLElement;
    private readonly _a: HTMLElement;
    private readonly _exp: HTMLElement;
    private _iconElement: HTMLElement;
    private _parent: TreeNode;
    private readonly _children: Array<TreeNode>;
    private _selected: boolean = false;
    private _expanded: boolean = false;
    private _canExpand: boolean;
    private _level: number = 0;
    private _icon: string;

    constructor(public treeView: TreeView, item: any) {
      super();
      this._children = [];
      let el: HTMLElement;
      if (item instanceof HTMLElement)
        this.el = item;
      else if (item) {
        this.data = item;
        el = document.createElement('li');
        el.classList.add('tree-node');
        let a = document.createElement('a');
        a.addEventListener('mousedown', (evt) => {
          evt.preventDefault();
          this.treeView.el.focus();
        });
        a.addEventListener('click', () => this.select());
        a.addEventListener('dblclick', (evt) => {
          evt.preventDefault();
          this.expanded = !this.expanded
        });
        // children elements
        this._ul = document.createElement('ul');
        a.classList.add('tree-item');
        el.appendChild(a);
        el.appendChild(this._ul);
        this.el = el;
        this._a = a;
        // expand toggle element
        this._canExpand = true;
        this._exp = document.createElement('span');
        this._exp.addEventListener('dblclick', (evt) => evt.stopPropagation());
        this._exp.addEventListener('click', (evt) => {
          evt.preventDefault();
          this.expanded = !this.expanded
        });
        this._exp.classList.add('fa', 'fa-fw');
        a.appendChild(this._exp);
        // icon element
        if (Katrid.isString(item.icon)) {
          this._iconElement = document.createElement('span');
          this._iconElement.classList.add('icon', 'fa', 'fa-fw');
          this._iconElement.classList.add(item.icon);
          a.appendChild(this._iconElement);
        }
        a.appendChild(document.createTextNode(item.text));
      }
    }

    get children(): Array<TreeNode> {
      return this._children;
    }

    select() {
      this.treeView.selection = [this];
    }

    collapse() {
      this.expanded = false;
    }

    expand() {
      this.expanded = true;
    }

    get expanded(): boolean {
      return this._expanded;
    }

    set expanded(value: boolean) {
      this._expanded = value;
      if (value) {
        this.el.classList.add('expanded');
        this._exp.classList.remove(DEFAULT_EXPAND_CLASS);
        this._exp.classList.add(DEFAULT_COLLAPSE_CLASS);
      }
      else {
        this.el.classList.remove('expanded');
        this._exp.classList.remove(DEFAULT_COLLAPSE_CLASS);
        this._exp.classList.add(DEFAULT_EXPAND_CLASS);
      }
    }

    get index(): number {
      if (this._parent)
        return this._parent.children.indexOf(this);
      else
        return this.treeView.nodes.indexOf(this);
    }

    get previousSibling(): TreeNode {
      let nodes;
      if (this._parent)
        nodes = this._parent.children;
      else
        nodes = this.treeView.nodes;
      return nodes[this.index - 1];
    }

    get nextSibling(): TreeNode {
      let nodes;
      if (this._parent)
        nodes = this._parent.children;
      else
        nodes = this.treeView.nodes;
      return nodes[this.index + 1];
    }

    get previous(): TreeNode {
      let p = this.previousSibling;
      if (p && p._expanded && p.children && p.children.length)
          return p.last;
      if (this._parent)
        return this._parent;
      return p;
    }

    get next(): TreeNode {
      if (this._expanded && this.children.length)
        return this.first;
      let n = this.nextSibling;
      if (n && n._expanded && n.children && n.children.length)
        return n.first;
      else if (this._parent)
        return this._parent.nextSibling;
      return n;
    }

    get first(): TreeNode {
      return this.children[0];
    }

    get last(): TreeNode {
      return this.children[this.children.length - 1];
    }


    get selected(): boolean {
      return this._selected;
    }

    set selected(value: boolean) {
      this._selected = value;
      if (value)
        this._a.classList.add('selected');
      else
        this._a.classList.remove('selected');
      if (!this.treeView.selection.includes(this))
        this.treeView.selection.push(this);
    }

    get parent(): TreeNode {
      return this._parent;
    }

    set parent(value: TreeNode) {
      // remove node from its parent
      if (this._parent)
        this._parent.remove(this);
      this._parent = value;
      // add node onto new parent
      if (value)
        value.add(this);
    }

    add(node: TreeNode) {
      this.children.push(node);
      this._ul.appendChild(node.el);
      this.update();
      node.calcLevel();
    }

    remove(node: TreeNode) {
      this.children.splice(this.children.indexOf(node), 1);
      this.update();
      node.calcLevel();
    }

    private calcLevel() {
      this.level = this._parent.level + 1;
    }

    update() {
      if (this._canExpand && this.children.length)
        this._exp.classList.add(DEFAULT_EXPAND_CLASS);
      else
        this._exp.classList.remove(DEFAULT_COLLAPSE_CLASS);
    }

    get level(): number {
      return this._level;
    }

    set level(value: number) {
      console.log('set level', value, this._level);
      if (value !== this._level) {
        for (let c of this.el.querySelectorAll('.indent'))
          c.parentNode.removeChild(c);

        let delta = value - this._level;
        this._level = value;
        for (let n of this.all())
          n.level -= delta;
        for (let c = 0;c < this._level;c++) {
          let indent = document.createElement('span');
          indent.classList.add('indent');
          this._a.prepend(indent);
        }
      }
    }

    * all(): IterableIterator<TreeNode> {
      for (let x of this.children) {
        for (let y of x.all())
          yield y;
        yield x;
      }
    }
  }

  export class TreeView {
    nodes: Array<TreeNode>;
    readonly el: HTMLElement;
    private _selection: Array<TreeNode> = [];

    constructor(cfg) {
      this.el = cfg.dom;
      this.nodes = [];
      if (cfg.items)
        this.addNodes(cfg.items);

      this.el.classList.add('tree-view');
      this.el.tabIndex = 0;

      this.el.addEventListener('keydown', (evt) => {
        console.log('key down;');
        let n: TreeNode;
        switch (evt.key) {
          case 'ArrowDown':
            console.log('arrow down;;');
            this.next();
            break;
          case 'ArrowUp':
            this.previous();
            break;
          case 'ArrowRight':
            n = this.currentNode;
            if (n && n.children.length) {
              if (n.expanded)
                n.next.select();
              else
                n.expand();
            } else
              this.next();
            break;
          case 'ArrowLeft':
            n = this.currentNode;
            if (n && n.children.length) {
              if (n.expanded)
                n.collapse();
              else
                n.previous.select();
            } else
              this.previous();
            break;
        }
      })
    }

    get selection(): Array<TreeNode> {
      return this._selection;
    }

    set selection(value: Array<TreeNode>) {
      // unselect old selection
      for (let node of this._selection)
        node.selected = false;

      this._selection = value;
      // set new nodes selection to selected
      for (let node of value)
        node.selected = true;

      // dispatch selection change event
      let evt = new CustomEvent('selectionchange', { detail: { selection: value } });
      this.el.dispatchEvent(evt);
    }

    get firstNode(): TreeNode {
      if (this.nodes.length)
        return this.nodes[0];
    }

    get lastNode(): TreeNode {
      if (this.nodes.length)
        return this.nodes[this.nodes.length - 1];
    }

    previous() {
      let curNode = this.currentNode;
      if (curNode) {
        let n = curNode.previous;
        if (n)
          n.select();
      }
      else
        this.lastNode.select();
    }

    next() {
      let curNode = this.currentNode;
      if (curNode) {
        let n = curNode.next;
        if (n)
          n.select();
      }
      else
        this.firstNode.select();
    }

    addNodes(nodes: Array<any>, parent=null) {
      for (let node of nodes) {
        let item = this.addNode(node, parent);
        if (node.children)
          this.addNodes(node.children, item);
      }
    }

    addNode(item, parent): TreeNode {
      let r: TreeNode;
      if (item instanceof HTMLElement) {}
      else if (typeof item === 'string')
        item = { text: item };
      console.log(item);
      r = new TreeNode(this, item);
      if (parent)
        r.parent = parent;
      else {
        this.nodes.push(r);
        console.log(r.el);
        this.el.appendChild(r.el);
      }
      return r;
    }

    get currentNode(): TreeNode {
      if (this.selection.length)
        return this.selection[this.selection.length - 1];
    }
  }

}
