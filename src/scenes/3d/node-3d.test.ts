import { describe, it, expect, beforeEach } from 'vitest';
import { NodeBase } from '@/scenes/node-base';
import { Node3D } from './node-3d';

class TestNode3D extends Node3D {
	public transformChangeCount = 0;

	protected override onTransformChanged_Impl(): void {
		this.transformChangeCount++;
	}
}

describe('Node3D', () => {
	let parent: TestNode3D;
	let child: TestNode3D;
	let grandChild: TestNode3D;

	beforeEach(() => {
		parent = new TestNode3D();
		child = new TestNode3D();
		grandChild = new TestNode3D();
	});

	describe('initial state & immutability', () => {
		it('initializes with identity position (0,0,0), rotation (0,0,0,XYZ), and scale (1,1,1)', () => {
			expect(parent.SelfPosition).toEqual({ x: 0, y: 0, z: 0 });
			expect(parent.Position).toEqual({ x: 0, y: 0, z: 0 });
			expect(parent.SelfRotation).toEqual({
				x: 0,
				y: 0,
				z: 0,
				order: 'XYZ',
			});
			expect(parent.Rotation).toEqual({
				x: 0,
				y: 0,
				z: 0,
				order: 'XYZ',
			});
			expect(parent.SelfScale).toEqual({ x: 1, y: 1, z: 1 });
			expect(parent.Scale).toEqual({ x: 1, y: 1, z: 1 });
		});

		it('returns defensive copies from getters so mutating returned objects does not corrupt state', () => {
			const pos = parent.SelfPosition;
			pos.x = 999;

			expect(parent.SelfPosition.x).toBe(0);
			expect(parent.Position.x).toBe(0);
		});
	});

	describe('local transform updates (standalone node)', () => {
		it('updates position via setter and setPosition, firing onTransformChanged only when changed', () => {
			parent.SelfPosition = { x: 2, y: 3, z: 4 };
			expect(parent.SelfPosition).toEqual({ x: 2, y: 3, z: 4 });
			expect(parent.Position).toEqual({ x: 2, y: 3, z: 4 });
			expect(parent.transformChangeCount).toBe(1);

			// Redundant update is a no-op
			parent.setPosition(2, 3, 4);
			expect(parent.transformChangeCount).toBe(1);
		});

		it('updates rotation via setter and setRotation, firing onTransformChanged only when changed', () => {
			const angle = Math.PI / 4;
			parent.SelfRotation = { x: 0, y: angle, z: 0, order: 'YXZ' };

			expect(parent.SelfRotation.y).toBeCloseTo(angle);
			expect(parent.SelfRotation.order).toBe('YXZ');
			expect(parent.Rotation.y).toBeCloseTo(angle);
			expect(parent.transformChangeCount).toBe(1);

			// Redundant update is a no-op
			parent.setRotation(0, angle, 0, 'YXZ');
			expect(parent.transformChangeCount).toBe(1);
		});

		it('updates scale via setter and setScale, firing onTransformChanged only when changed', () => {
			parent.SelfScale = { x: 2, y: 3, z: 4 };
			expect(parent.SelfScale).toEqual({ x: 2, y: 3, z: 4 });
			expect(parent.Scale).toEqual({ x: 2, y: 3, z: 4 });
			expect(parent.transformChangeCount).toBe(1);

			// Redundant update is a no-op
			parent.setScale(2, 3, 4);
			expect(parent.transformChangeCount).toBe(1);
		});
	});

	describe('hierarchy transform propagation', () => {
		it('propagates parent translation to children and grandchildren while preserving their SelfPosition', () => {
			parent.addChild(child);
			child.addChild(grandChild);

			child.setPosition(1, 2, 3);
			grandChild.setPosition(0, 5, 0);

			parent.setPosition(10, 20, 30);

			expect(child.SelfPosition).toEqual({ x: 1, y: 2, z: 3 });
			expect(child.Position).toEqual({ x: 11, y: 22, z: 33 });

			expect(grandChild.SelfPosition).toEqual({ x: 0, y: 5, z: 0 });
			expect(grandChild.Position).toEqual({ x: 11, y: 27, z: 33 });
		});

		it('scales child world position and world scale when parent scale changes', () => {
			parent.addChild(child);
			child.setPosition(2, 3, 4);
			child.setScale(2, 2, 2);

			parent.setScale(3, 4, 5);

			expect(child.SelfPosition).toEqual({ x: 2, y: 3, z: 4 });
			expect(child.Position).toEqual({ x: 6, y: 12, z: 20 });
			expect(child.SelfScale).toEqual({ x: 2, y: 2, z: 2 });
			expect(child.Scale).toEqual({ x: 6, y: 8, z: 10 });
		});

		it('rotates child world position and combines world rotation when parent rotates', () => {
			parent.addChild(child);
			child.setPosition(1, 0, 0);

			// Rotate parent 90 degrees around Z axis -> child at (1,0,0) moves to (0,1,0)
			parent.setRotation(0, 0, Math.PI / 2);

			expect(child.SelfPosition).toEqual({ x: 1, y: 0, z: 0 });
			expect(child.Position.x).toBeCloseTo(0);
			expect(child.Position.y).toBeCloseTo(1);
			expect(child.Position.z).toBeCloseTo(0);
			expect(child.Rotation.z).toBeCloseTo(Math.PI / 2);
		});

		it('recalculates child world transform automatically on addChild and removeChild', () => {
			parent.setPosition(10, 0, 0);
			child.setPosition(5, 0, 0);

			parent.addChild(child);
			expect(child.Position).toEqual({ x: 15, y: 0, z: 0 });

			parent.removeChild(child);
			expect(child.Position).toEqual({ x: 5, y: 0, z: 0 });
		});

		it('bridges transform propagation through an intermediate non-Node3D (NodeBase) node', () => {
			const intermediate = new NodeBase();
			parent.addChild(intermediate);
			intermediate.addChild(child);

			child.setPosition(1, 1, 1);
			parent.setPosition(10, 20, 30);

			expect(child.Position).toEqual({ x: 11, y: 21, z: 31 });
		});
	});
});
