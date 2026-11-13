import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeBase } from './node-base';

class TestNode extends NodeBase {
	public addedChildren: NodeBase[] = [];
	public removedChildren: NodeBase[] = [];
	public parentHistory: (NodeBase | null)[] = [];

	protected override onChildAdded_Impl(child: NodeBase): void {
		this.addedChildren.push(child);
	}

	protected override onChildRemoved_Impl(child: NodeBase): void {
		this.removedChildren.push(child);
	}

	protected override onParentChanged_Impl(newParent: NodeBase | null): void {
		this.parentHistory.push(newParent);
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
		it('initializes with null Parent, empty Children, and null pointers', () => {
			expect(parent.Parent).toBeNull();
			expect(parent.Children).toEqual([]);
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

			// Direct parent into child
			child1.addChild(parent);
			// Root ancestor into deeper descendant
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
});
