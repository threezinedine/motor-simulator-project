import * as THREE from 'three';
import { NodeBase } from '@/scenes/node-base';
import { Vector2 } from '@/types';

export class Node2D extends NodeBase {
	private _selfPosition: Vector2 = { x: 0, y: 0 };
	private _selfRotation = 0;
	private _selfScale: Vector2 = { x: 1, y: 1 };

	private _worldPosition: Vector2 = { x: 0, y: 0 };
	private _worldRotation = 0;
	private _worldScale: Vector2 = { x: 1, y: 1 };

	private readonly _localMatrix = new THREE.Matrix4();
	private readonly _worldMatrix = new THREE.Matrix4();

	constructor(debugName = 'Node2D') {
		super(debugName);
		this.recalculateTransform();
	}

	get SelfPosition(): Vector2 {
		return { ...this._selfPosition };
	}

	set SelfPosition(value: Vector2) {
		this.setPosition(value.x, value.y);
	}

	get Position(): Vector2 {
		return { ...this._worldPosition };
	}

	get SelfRotation(): number {
		return this._selfRotation;
	}

	set SelfRotation(value: number) {
		this.setRotation(value);
	}

	get Rotation(): number {
		return this._worldRotation;
	}

	get SelfScale(): Vector2 {
		return { ...this._selfScale };
	}

	set SelfScale(value: Vector2) {
		this.setScale(value.x, value.y);
	}

	get Scale(): Vector2 {
		return { ...this._worldScale };
	}

	get LocalMatrix(): THREE.Matrix4 {
		return this._localMatrix.clone();
	}

	get WorldMatrix(): THREE.Matrix4 {
		return this._worldMatrix.clone();
	}

	setPosition(x: number, y: number): void {
		if (this._selfPosition.x === x && this._selfPosition.y === y) {
			return;
		}

		this._selfPosition = { x, y };
		this.updateWorldTransform();
	}

	setRotation(angle: number): void {
		if (this._selfRotation === angle) {
			return;
		}

		this._selfRotation = angle;
		this.updateWorldTransform();
	}

	setScale(x: number, y: number): void {
		if (this._selfScale.x === x && this._selfScale.y === y) {
			return;
		}

		this._selfScale = { x, y };
		this.updateWorldTransform();
	}

	protected override _onParentChanged(_newParent: NodeBase | null): void {
		this.updateWorldTransform();
	}

	updateWorldTransform(): void {
		this.recalculateTransform();
		this.onTransformChanged();

		this.propagateTransformToChildren(this);
	}

	private propagateTransformToChildren(parent: NodeBase): void {
		for (const child of parent.Children) {
			if (child instanceof Node2D) {
				child.updateWorldTransform();
			} else {
				this.propagateTransformToChildren(child);
			}
		}
	}

	private recalculateTransform(): void {
		const pos = new THREE.Vector3(
			this._selfPosition.x,
			this._selfPosition.y,
			0
		);
		const quat = new THREE.Quaternion().setFromAxisAngle(
			new THREE.Vector3(0, 0, 1),
			this._selfRotation
		);
		const scale = new THREE.Vector3(
			this._selfScale.x,
			this._selfScale.y,
			1
		);

		this._localMatrix.compose(pos, quat, scale);

		const parent2D = this.findNearestNode2DParent();
		if (parent2D) {
			this._worldMatrix.multiplyMatrices(
				parent2D._worldMatrix,
				this._localMatrix
			);
		} else {
			this._worldMatrix.copy(this._localMatrix);
		}

		const worldPos = new THREE.Vector3();
		const worldQuat = new THREE.Quaternion();
		const worldScale = new THREE.Vector3();
		this._worldMatrix.decompose(worldPos, worldQuat, worldScale);

		const worldEuler = new THREE.Euler().setFromQuaternion(
			worldQuat,
			'XYZ'
		);

		this._worldPosition = {
			x: worldPos.x || 0,
			y: worldPos.y || 0,
		};
		this._worldRotation = worldEuler.z || 0;
		this._worldScale = {
			x: worldScale.x || 0,
			y: worldScale.y || 0,
		};
	}

	private findNearestNode2DParent(): Node2D | null {
		let current = this.Parent;
		while (current) {
			if (current instanceof Node2D) {
				return current;
			}
			current = current.Parent;
		}
		return null;
	}

	onTransformChanged(): void {
		this._onTransformChanged();
	}
	protected _onTransformChanged(): void {}
}
