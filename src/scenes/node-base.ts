import { ObjectBase } from '../common';

export class NodeBase extends ObjectBase {
	private _parent: NodeBase | null = null;
	private _children: NodeBase[] = [];

	constructor() {
		super();
	}

	get Parent(): NodeBase | null {
		return this._parent;
	}

	get Children(): readonly NodeBase[] {
		return this._children;
	}

	addChild(child: NodeBase): void {
		if (
			child === this ||
			this._children.includes(child) ||
			child.isAncestorOf(this)
		) {
			return;
		}

		if (child._parent) {
			child._parent.removeChild(child);
		}

		this._children.push(child);
		child._parent = this;

		this.onChildAdded(child);
		child.onParentChanged(this);
	}

	removeChild(child: NodeBase): void {
		const index = this._children.indexOf(child);
		if (index === -1) {
			return;
		}

		this._children.splice(index, 1);
		child._parent = null;

		this.onChildRemoved(child);
		child.onParentChanged(null);
	}

	getFirstChild(): NodeBase | null {
		return this._children.length > 0 ? this._children[0] : null;
	}

	getSiblingNode(): NodeBase | null {
		if (!this._parent) {
			return null;
		}

		const siblings = this._parent._children;
		const index = siblings.indexOf(this);
		if (index === -1 || index + 1 >= siblings.length) {
			return null;
		}

		return siblings[index + 1];
	}

	isAncestorOf(node: NodeBase): boolean {
		let current = node._parent;
		while (current) {
			if (current === this) {
				return true;
			}
			current = current._parent;
		}
		return false;
	}

	onChildAdded(child: NodeBase): void {
		this.onChildAdded_Impl(child);
	}
	protected onChildAdded_Impl(_child: NodeBase): void {}

	onChildRemoved(child: NodeBase): void {
		this.onChildRemoved_Impl(child);
	}
	protected onChildRemoved_Impl(_child: NodeBase): void {}

	onParentChanged(newParent: NodeBase | null): void {
		this.onParentChanged_Impl(newParent);
	}
	protected onParentChanged_Impl(_newParent: NodeBase | null): void {}
}
