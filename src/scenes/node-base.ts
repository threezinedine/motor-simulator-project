import { ObjectBase } from '@/common';

export class NodeBase extends ObjectBase {
	private _parent: NodeBase | null = null;
	private _children: NodeBase[] = [];
	private _isSelfEnable = true;
	private _isRoot = false;

	constructor() {
		super();
	}

	get Parent(): NodeBase | null {
		return this._parent;
	}

	get Children(): readonly NodeBase[] {
		return this._children;
	}

	get IsSelfEnable(): boolean {
		return this._isSelfEnable;
	}

	get IsEnable(): boolean {
		if (!this._isSelfEnable) {
			return false;
		}
		return this._parent ? this._parent.IsEnable : true;
	}

	get IsRoot(): boolean {
		return this._isRoot;
	}

	get IsActive(): boolean {
		if (this._isRoot) {
			return true;
		}
		return this._parent ? this._parent.IsActive : false;
	}

	addChild(child: NodeBase): void {
		if (
			child === this ||
			child._isRoot ||
			this._children.includes(child) ||
			child.isAncestorOf(this)
		) {
			return;
		}

		if (child._parent) {
			child._parent.removeChild(child);
		}

		const wasEnabled = child.IsEnable;
		const wasActive = child.IsActive;

		this._children.push(child);
		child._parent = this;

		this.onChildAdded(child);
		child.onParentChanged(this);

		const isNowActive = child.IsActive;
		if (wasActive !== isNowActive) {
			if (isNowActive) {
				child.notifyHierarchyActivated();
			} else {
				child.notifyHierarchyDeactivated();
			}
		}

		const isNowEnabled = child.IsEnable;
		if (wasEnabled !== isNowEnabled) {
			if (isNowEnabled) {
				child.notifyHierarchyEnabled();
			} else {
				child.notifyHierarchyDisabled();
			}
		}
	}

	removeChild(child: NodeBase): void {
		const index = this._children.indexOf(child);
		if (index === -1) {
			return;
		}

		const wasEnabled = child.IsEnable;
		const wasActive = child.IsActive;

		this._children.splice(index, 1);
		child._parent = null;

		this.onChildRemoved(child);
		child.onParentChanged(null);

		const isNowActive = child.IsActive;
		if (wasActive !== isNowActive) {
			if (isNowActive) {
				child.notifyHierarchyActivated();
			} else {
				child.notifyHierarchyDeactivated();
			}
		}

		const isNowEnabled = child.IsEnable;
		if (wasEnabled !== isNowEnabled) {
			if (isNowEnabled) {
				child.notifyHierarchyEnabled();
			} else {
				child.notifyHierarchyDisabled();
			}
		}
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

	Enable(): void {
		if (this._isSelfEnable) {
			return;
		}

		this._isSelfEnable = true;
		this.onSelfEnable();

		if (this.IsEnable) {
			this.notifyHierarchyEnabled();
		}
	}

	Disable(): void {
		if (!this._isSelfEnable) {
			return;
		}

		const wasEnabled = this.IsEnable;
		this._isSelfEnable = false;
		this.onSelfDisable();

		if (wasEnabled) {
			this.notifyHierarchyDisabled();
		}
	}

	private notifyHierarchyEnabled(): void {
		this.onEnable();
		for (const child of this._children) {
			if (child._isSelfEnable) {
				child.notifyHierarchyEnabled();
			}
		}
	}

	private notifyHierarchyDisabled(): void {
		this.onDisable();
		for (const child of this._children) {
			if (child._isSelfEnable) {
				child.notifyHierarchyDisabled();
			}
		}
	}

	onSelfEnable(): void {
		this.onSelfEnable_Impl();
	}
	protected onSelfEnable_Impl(): void {}

	onSelfDisable(): void {
		this.onSelfDisable_Impl();
	}
	protected onSelfDisable_Impl(): void {}

	onEnable(): void {
		this.onEnable_Impl();
	}
	protected onEnable_Impl(): void {}

	onDisable(): void {
		this.onDisable_Impl();
	}
	protected onDisable_Impl(): void {}

	asRoot(): void {
		if (this._parent || this._isRoot) {
			return;
		}

		this._isRoot = true;
		this.notifyHierarchyActivated();
	}

	private notifyHierarchyActivated(): void {
		this.onActivate();
		for (const child of this._children) {
			child.notifyHierarchyActivated();
		}
	}

	private notifyHierarchyDeactivated(): void {
		this.onDeactivate();
		for (const child of this._children) {
			child.notifyHierarchyDeactivated();
		}
	}

	onActivate(): void {
		this.onActivate_Impl();
	}
	protected onActivate_Impl(): void {}

	onDeactivate(): void {
		this.onDeactivate_Impl();
	}
	protected onDeactivate_Impl(): void {}
}
