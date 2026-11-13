import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeBase } from './node-base';

class TestNode extends NodeBase {
	public addedChildren: NodeBase[] = [];
	public removedChildren: NodeBase[] = [];
	public parentHistory: (NodeBase | null)[] = [];
	public selfEnableCount = 0;
	public selfDisableCount = 0;
	public enableCount = 0;
	public disableCount = 0;
	public activateCount = 0;
	public deactivateCount = 0;

	protected override onChildAdded_Impl(child: NodeBase): void {
		this.addedChildren.push(child);
	}

	protected override onChildRemoved_Impl(child: NodeBase): void {
		this.removedChildren.push(child);
	}

	protected override onParentChanged_Impl(newParent: NodeBase | null): void {
		this.parentHistory.push(newParent);
	}

	protected override onSelfEnable_Impl(): void {
		this.selfEnableCount++;
	}

	protected override onSelfDisable_Impl(): void {
		this.selfDisableCount++;
	}

	protected override onEnable_Impl(): void {
		this.enableCount++;
	}

	protected override onDisable_Impl(): void {
		this.disableCount++;
	}

	protected override onActivate_Impl(): void {
		this.activateCount++;
	}

	protected override onDeactivate_Impl(): void {
		this.deactivateCount++;
	}
}

describe('NodeBase', () => {
	let parent: TestNode;
	let child1: TestNode;
	let child2: TestNode;
	let child3: TestNode;

	beforeEach(() => {
		parent = new TestNode();
		child1 = new TestNode();
		child2 = new TestNode();
		child3 = new TestNode();
	});

	describe('initial state', () => {
		it('initializes with null Parent, empty Children, enabled, inactive/non-root, and null pointers', () => {
			expect(parent.Parent).toBeNull();
			expect(parent.Children).toEqual([]);
			expect(parent.IsSelfEnable).toBe(true);
			expect(parent.IsEnable).toBe(true);
			expect(parent.IsRoot).toBe(false);
			expect(parent.IsActive).toBe(false);
			expect(parent.getFirstChild()).toBeNull();
			expect(parent.getSiblingNode()).toBeNull();
		});
	});

	describe('addChild', () => {
		it('attaches a child, updates Parent/Children, and invokes lifecycle hooks in order', () => {
			const callOrder: string[] = [];
			vi.spyOn(parent, 'onChildAdded').mockImplementation((c) => {
				callOrder.push('parent.onChildAdded');
				parent['onChildAdded_Impl'](c);
			});
			vi.spyOn(child1, 'onParentChanged').mockImplementation((p) => {
				callOrder.push('child.onParentChanged');
				child1['onParentChanged_Impl'](p);
			});

			parent.addChild(child1);

			expect(child1.Parent).toBe(parent);
			expect(parent.Children).toEqual([child1]);
			expect(callOrder).toEqual([
				'parent.onChildAdded',
				'child.onParentChanged',
			]);
			expect(parent.addedChildren).toEqual([child1]);
			expect(child1.parentHistory).toEqual([parent]);
		});

		it('maintains insertion order when adding multiple children', () => {
			parent.addChild(child1);
			parent.addChild(child2);
			parent.addChild(child3);

			expect(parent.Children).toEqual([child1, child2, child3]);
		});

		it('ignores self-parenting (adding a node to itself)', () => {
			parent.addChild(parent);

			expect(parent.Parent).toBeNull();
			expect(parent.Children).toEqual([]);
			expect(parent.addedChildren).toEqual([]);
			expect(parent.parentHistory).toEqual([]);
		});

		it('ignores duplicate additions of an existing direct child', () => {
			parent.addChild(child1);

			parent.addChild(child1);

			expect(parent.Children).toEqual([child1]);
			expect(parent.addedChildren).toHaveLength(1);
			expect(child1.parentHistory).toHaveLength(1);
		});

		it('prevents circular hierarchy (adding an ancestor as a child of its descendant)', () => {
			parent.addChild(child1);
			child1.addChild(child2);

			child1.addChild(parent);
			child2.addChild(parent);

			expect(parent.Parent).toBeNull();
			expect(child1.Children).toEqual([child2]);
			expect(child2.Children).toEqual([]);
		});

		it('automatically reparents a child that already belongs to another parent', () => {
			const newParent = new TestNode();
			parent.addChild(child1);

			newParent.addChild(child1);

			expect(parent.Children).toEqual([]);
			expect(parent.removedChildren).toEqual([child1]);
			expect(newParent.Children).toEqual([child1]);
			expect(newParent.addedChildren).toEqual([child1]);
			expect(child1.Parent).toBe(newParent);
			expect(child1.parentHistory).toEqual([parent, null, newParent]);
		});
	});

	describe('removeChild', () => {
		it('detaches an existing child, updates state, and invokes lifecycle hooks in order', () => {
			parent.addChild(child1);

			const callOrder: string[] = [];
			vi.spyOn(parent, 'onChildRemoved').mockImplementation((c) => {
				callOrder.push('parent.onChildRemoved');
				parent['onChildRemoved_Impl'](c);
			});
			vi.spyOn(child1, 'onParentChanged').mockImplementation((p) => {
				callOrder.push('child.onParentChanged');
				child1['onParentChanged_Impl'](p);
			});

			parent.removeChild(child1);

			expect(child1.Parent).toBeNull();
			expect(parent.Children).toEqual([]);
			expect(callOrder).toEqual([
				'parent.onChildRemoved',
				'child.onParentChanged',
			]);
			expect(parent.removedChildren).toEqual([child1]);
			expect(child1.parentHistory).toEqual([parent, null]);
		});

		it('is a no-op when removing a node that is not a child (orphan or another parent’s child)', () => {
			const otherParent = new TestNode();
			otherParent.addChild(child2);
			parent.addChild(child1);

			parent.removeChild(child3); // orphan
			parent.removeChild(child2); // belongs to otherParent

			expect(parent.Children).toEqual([child1]);
			expect(parent.removedChildren).toEqual([]);
			expect(otherParent.Children).toEqual([child2]);
			expect(child2.Parent).toBe(otherParent);
		});

		it('allows re-adding a child after it was removed', () => {
			parent.addChild(child1);
			parent.removeChild(child1);
			parent.addChild(child1);

			expect(parent.Children).toEqual([child1]);
			expect(child1.Parent).toBe(parent);
			expect(parent.addedChildren).toEqual([child1, child1]);
		});
	});

	describe('getFirstChild', () => {
		it('updates dynamically as first children are added and removed', () => {
			parent.addChild(child1);
			parent.addChild(child2);
			expect(parent.getFirstChild()).toBe(child1);

			parent.removeChild(child1);
			expect(parent.getFirstChild()).toBe(child2);

			parent.removeChild(child2);
			expect(parent.getFirstChild()).toBeNull();
		});
	});

	describe('getSiblingNode', () => {
		beforeEach(() => {
			parent.addChild(child1);
			parent.addChild(child2);
			parent.addChild(child3);
		});

		it('traverses siblings in order and returns null at the tail', () => {
			expect(child1.getSiblingNode()).toBe(child2);
			expect(child2.getSiblingNode()).toBe(child3);
			expect(child3.getSiblingNode()).toBeNull();
		});

		it('bridges the sibling link when a middle sibling is removed', () => {
			parent.removeChild(child2);

			expect(child1.getSiblingNode()).toBe(child3);
			expect(child2.getSiblingNode()).toBeNull();
			expect(child3.getSiblingNode()).toBeNull();
		});

		it('returns null when the tail sibling is removed from its previous sibling', () => {
			parent.removeChild(child3);

			expect(child2.getSiblingNode()).toBeNull();
		});
	});

	describe('isAncestorOf', () => {
		it('correctly identifies direct and indirect ancestors vs unrelated nodes', () => {
			parent.addChild(child1);
			child1.addChild(child2);

			expect(parent.isAncestorOf(child1)).toBe(true);
			expect(parent.isAncestorOf(child2)).toBe(true);
			expect(child1.isAncestorOf(child2)).toBe(true);

			expect(parent.isAncestorOf(parent)).toBe(false);
			expect(child2.isAncestorOf(parent)).toBe(false);
			expect(parent.isAncestorOf(child3)).toBe(false);
		});
	});

	describe('Enable & Disable (standalone node)', () => {
		it('is a no-op when calling Enable on an already self-enabled node', () => {
			parent.Enable();

			expect(parent.IsSelfEnable).toBe(true);
			expect(parent.IsEnable).toBe(true);
			expect(parent.selfEnableCount).toBe(0);
			expect(parent.enableCount).toBe(0);
		});

		it('disables a self-enabled node and invokes onSelfDisable then onDisable', () => {
			const callOrder: string[] = [];
			vi.spyOn(parent, 'onSelfDisable').mockImplementation(() => {
				callOrder.push('onSelfDisable');
				parent['onSelfDisable_Impl']();
			});
			vi.spyOn(parent, 'onDisable').mockImplementation(() => {
				callOrder.push('onDisable');
				parent['onDisable_Impl']();
			});

			parent.Disable();

			expect(parent.IsSelfEnable).toBe(false);
			expect(parent.IsEnable).toBe(false);
			expect(callOrder).toEqual(['onSelfDisable', 'onDisable']);
			expect(parent.selfDisableCount).toBe(1);
			expect(parent.disableCount).toBe(1);
		});

		it('is a no-op when calling Disable on an already self-disabled node', () => {
			parent.Disable();
			parent.Disable();

			expect(parent.selfDisableCount).toBe(1);
			expect(parent.disableCount).toBe(1);
		});

		it('re-enables a self-disabled node and invokes onSelfEnable then onEnable', () => {
			parent.Disable();

			const callOrder: string[] = [];
			vi.spyOn(parent, 'onSelfEnable').mockImplementation(() => {
				callOrder.push('onSelfEnable');
				parent['onSelfEnable_Impl']();
			});
			vi.spyOn(parent, 'onEnable').mockImplementation(() => {
				callOrder.push('onEnable');
				parent['onEnable_Impl']();
			});

			parent.Enable();

			expect(parent.IsSelfEnable).toBe(true);
			expect(parent.IsEnable).toBe(true);
			expect(callOrder).toEqual(['onSelfEnable', 'onEnable']);
			expect(parent.selfEnableCount).toBe(1);
			expect(parent.enableCount).toBe(1);
		});
	});

	describe('Enable & Disable (hierarchy propagation)', () => {
		it('disables effective IsEnable on descendants while preserving their IsSelfEnable', () => {
			parent.addChild(child1);
			child1.addChild(child2);

			parent.Disable();

			expect(parent.IsSelfEnable).toBe(false);
			expect(parent.IsEnable).toBe(false);

			expect(child1.IsSelfEnable).toBe(true);
			expect(child1.IsEnable).toBe(false);
			expect(child1.selfDisableCount).toBe(0);
			expect(child1.disableCount).toBe(1);

			expect(child2.IsSelfEnable).toBe(true);
			expect(child2.IsEnable).toBe(false);
			expect(child2.selfDisableCount).toBe(0);
			expect(child2.disableCount).toBe(1);
		});

		it('re-enables effective IsEnable on self-enabled descendants when parent re-enables', () => {
			parent.addChild(child1);
			child1.addChild(child2);
			parent.Disable();

			parent.Enable();

			expect(child1.IsEnable).toBe(true);
			expect(child1.selfEnableCount).toBe(0);
			expect(child1.enableCount).toBe(1);

			expect(child2.IsEnable).toBe(true);
			expect(child2.selfEnableCount).toBe(0);
			expect(child2.enableCount).toBe(1);
		});

		it('stops propagation at descendants whose IsSelfEnable is false', () => {
			parent.addChild(child1);
			child1.addChild(child2);

			child1.Disable();
			expect(child1.disableCount).toBe(1);
			expect(child2.disableCount).toBe(1);

			parent.Disable();
			expect(child1.disableCount).toBe(1);
			expect(child2.disableCount).toBe(1);

			parent.Enable();
			expect(child1.IsSelfEnable).toBe(false);
			expect(child1.IsEnable).toBe(false);
			expect(child2.IsSelfEnable).toBe(true);
			expect(child2.IsEnable).toBe(false);
			expect(child1.enableCount).toBe(0);
			expect(child2.enableCount).toBe(0);
		});

		it('updates only IsSelfEnable (without firing onEnable/onDisable) when toggling a child under a disabled parent', () => {
			parent.Disable();
			parent.addChild(child1);
			child1.disableCount = 0;

			child1.Disable();
			expect(child1.IsSelfEnable).toBe(false);
			expect(child1.IsEnable).toBe(false);
			expect(child1.selfDisableCount).toBe(1);
			expect(child1.disableCount).toBe(0);

			child1.Enable();
			expect(child1.IsSelfEnable).toBe(true);
			expect(child1.IsEnable).toBe(false);
			expect(child1.selfEnableCount).toBe(1);
			expect(child1.enableCount).toBe(0);
		});

		it('fires onDisable on an enabled subtree when added to a disabled parent', () => {
			parent.Disable();
			child1.addChild(child2);

			parent.addChild(child1);

			expect(child1.IsSelfEnable).toBe(true);
			expect(child1.IsEnable).toBe(false);
			expect(child1.disableCount).toBe(1);

			expect(child2.IsSelfEnable).toBe(true);
			expect(child2.IsEnable).toBe(false);
			expect(child2.disableCount).toBe(1);
		});

		it('does not fire onEnable/onDisable when adding an enabled child to an enabled parent', () => {
			parent.addChild(child1);

			expect(child1.IsEnable).toBe(true);
			expect(child1.enableCount).toBe(0);
			expect(child1.disableCount).toBe(0);
		});

		it('restores effective IsEnable and fires onEnable when removing a self-enabled child from a disabled parent', () => {
			parent.Disable();
			parent.addChild(child1);
			child1.addChild(child2);

			parent.removeChild(child1);

			expect(child1.IsEnable).toBe(true);
			expect(child1.enableCount).toBe(1);
			expect(child2.IsEnable).toBe(true);
			expect(child2.enableCount).toBe(1);
		});
	});

	describe('IsActive & asRoot (scene tree activation)', () => {
		it('marks a parentless node as root, sets IsActive to true, and propagates onActivate to all descendants (including disabled ones)', () => {
			parent.addChild(child1);
			child1.addChild(child2);
			child2.Disable();

			parent.asRoot();

			expect(parent.IsRoot).toBe(true);
			expect(parent.IsActive).toBe(true);
			expect(parent.activateCount).toBe(1);

			expect(child1.IsRoot).toBe(false);
			expect(child1.IsActive).toBe(true);
			expect(child1.activateCount).toBe(1);

			expect(child2.IsActive).toBe(true);
			expect(child2.IsEnable).toBe(false);
			expect(child2.activateCount).toBe(1);
		});

		it('is a no-op when calling asRoot on a node that is already a root or has a parent', () => {
			parent.addChild(child1);

			// Child with a parent cannot become a root
			child1.asRoot();
			expect(child1.IsRoot).toBe(false);
			expect(child1.IsActive).toBe(false);
			expect(child1.activateCount).toBe(0);

			// Calling asRoot twice on root only activates once
			parent.asRoot();
			parent.asRoot();
			expect(parent.activateCount).toBe(1);
		});

		it('prevents a root node from being added as a child of another node', () => {
			child1.asRoot();

			parent.addChild(child1);

			expect(child1.Parent).toBeNull();
			expect(parent.Children).toEqual([]);
			expect(child1.IsRoot).toBe(true);
			expect(child1.IsActive).toBe(true);
		});

		it('activates an inactive subtree when added to an active parent', () => {
			parent.asRoot();
			child1.addChild(child2);

			parent.addChild(child1);

			expect(child1.IsActive).toBe(true);
			expect(child1.activateCount).toBe(1);
			expect(child2.IsActive).toBe(true);
			expect(child2.activateCount).toBe(1);
		});

		it('does not fire onActivate/onDeactivate when adding or removing children within an inactive tree', () => {
			parent.addChild(child1);
			parent.removeChild(child1);

			expect(child1.IsActive).toBe(false);
			expect(child1.activateCount).toBe(0);
			expect(child1.deactivateCount).toBe(0);
		});

		it('deactivates an active subtree and fires onDeactivate when removed from an active parent', () => {
			parent.asRoot();
			parent.addChild(child1);
			child1.addChild(child2);

			parent.removeChild(child1);

			expect(child1.IsActive).toBe(false);
			expect(child1.deactivateCount).toBe(1);
			expect(child2.IsActive).toBe(false);
			expect(child2.deactivateCount).toBe(1);
		});

		it('fires onDeactivate then onActivate when reparenting a child from one active tree to another', () => {
			const otherRoot = new TestNode();
			parent.asRoot();
			otherRoot.asRoot();
			parent.addChild(child1);

			otherRoot.addChild(child1);

			expect(child1.Parent).toBe(otherRoot);
			expect(child1.IsActive).toBe(true);
			expect(child1.activateCount).toBe(2);
			expect(child1.deactivateCount).toBe(1);
		});
	});
});
