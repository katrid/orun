var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        const DEFAULT_EXPAND_CLASS = 'fa-caret-right';
        const DEFAULT_COLLAPSE_CLASS = 'fa-caret-down';
        class Component {
            get el() {
                return this._el;
            }
            set el(value) {
                this.setElement(value);
            }
            setElement(el) {
                this._el = el;
                el.katrid = { object: this };
            }
        }
        UI.Component = Component;
        class TreeNode extends Component {
            constructor(treeView, item) {
                super();
                this.treeView = treeView;
                this._selected = false;
                this._expanded = false;
                this._level = 0;
                this._children = [];
                let el;
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
                        this.expanded = !this.expanded;
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
                        this.expanded = !this.expanded;
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
            get children() {
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
            get expanded() {
                return this._expanded;
            }
            set expanded(value) {
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
            get index() {
                if (this._parent)
                    return this._parent.children.indexOf(this);
                else
                    return this.treeView.nodes.indexOf(this);
            }
            get previousSibling() {
                let nodes;
                if (this._parent)
                    nodes = this._parent.children;
                else
                    nodes = this.treeView.nodes;
                return nodes[this.index - 1];
            }
            get nextSibling() {
                let nodes;
                if (this._parent)
                    nodes = this._parent.children;
                else
                    nodes = this.treeView.nodes;
                return nodes[this.index + 1];
            }
            get previous() {
                let p = this.previousSibling;
                if (p && p._expanded && p.children && p.children.length)
                    return p.last;
                if (this._parent)
                    return this._parent;
                return p;
            }
            get next() {
                if (this._expanded && this.children.length)
                    return this.first;
                let n = this.nextSibling;
                if (n && n._expanded && n.children && n.children.length)
                    return n.first;
                else if (this._parent)
                    return this._parent.nextSibling;
                return n;
            }
            get first() {
                return this.children[0];
            }
            get last() {
                return this.children[this.children.length - 1];
            }
            get selected() {
                return this._selected;
            }
            set selected(value) {
                this._selected = value;
                if (value)
                    this._a.classList.add('selected');
                else
                    this._a.classList.remove('selected');
                if (!this.treeView.selection.includes(this))
                    this.treeView.selection.push(this);
            }
            get parent() {
                return this._parent;
            }
            set parent(value) {
                // remove node from its parent
                if (this._parent)
                    this._parent.remove(this);
                this._parent = value;
                // add node onto new parent
                if (value)
                    value.add(this);
            }
            add(node) {
                this.children.push(node);
                this._ul.appendChild(node.el);
                this.update();
                node.calcLevel();
            }
            remove(node) {
                this.children.splice(this.children.indexOf(node), 1);
                this.update();
                node.calcLevel();
            }
            calcLevel() {
                this.level = this._parent.level + 1;
            }
            update() {
                if (this._canExpand && this.children.length)
                    this._exp.classList.add(DEFAULT_EXPAND_CLASS);
                else
                    this._exp.classList.remove(DEFAULT_COLLAPSE_CLASS);
            }
            get level() {
                return this._level;
            }
            set level(value) {
                console.log('set level', value, this._level);
                if (value !== this._level) {
                    for (let c of this.el.querySelectorAll('.indent'))
                        c.parentNode.removeChild(c);
                    let delta = value - this._level;
                    this._level = value;
                    for (let n of this.all())
                        n.level -= delta;
                    for (let c = 0; c < this._level; c++) {
                        let indent = document.createElement('span');
                        indent.classList.add('indent');
                        this._a.prepend(indent);
                    }
                }
            }
            *all() {
                for (let x of this.children) {
                    for (let y of x.all())
                        yield y;
                    yield x;
                }
            }
        }
        UI.TreeNode = TreeNode;
        class TreeView {
            constructor(cfg) {
                this._selection = [];
                this.el = cfg.dom;
                this.nodes = [];
                if (cfg.items)
                    this.addNodes(cfg.items);
                this.el.classList.add('tree-view');
                this.el.tabIndex = 0;
                this.el.addEventListener('keydown', (evt) => {
                    console.log('key down;');
                    let n;
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
                            }
                            else
                                this.next();
                            break;
                        case 'ArrowLeft':
                            n = this.currentNode;
                            if (n && n.children.length) {
                                if (n.expanded)
                                    n.collapse();
                                else
                                    n.previous.select();
                            }
                            else
                                this.previous();
                            break;
                    }
                });
            }
            get selection() {
                return this._selection;
            }
            set selection(value) {
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
            get firstNode() {
                if (this.nodes.length)
                    return this.nodes[0];
            }
            get lastNode() {
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
            addNodes(nodes, parent = null) {
                for (let node of nodes) {
                    let item = this.addNode(node, parent);
                    if (node.children)
                        this.addNodes(node.children, item);
                }
            }
            addNode(item, parent) {
                let r;
                if (item instanceof HTMLElement) { }
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
            get currentNode() {
                if (this.selection.length)
                    return this.selection[this.selection.length - 1];
            }
        }
        UI.TreeView = TreeView;
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
