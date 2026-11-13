import * as THREE from 'three';
import { NodeBase } from '../scenes/node-base';
import { Vector3, Euler } from '../types';

export class Node3D extends NodeBase {
	private _selfPosition: Vector3 = { x: 0, y: 0, z: 0 };
	private _selfRotation: Euler = { x: 0, y: 0, z: 0, order: 'XYZ' };
	private _selfScale: Vector3 = { x: 1, y: 1, z: 1 };

	private _worldPosition: Vector3 = { x: 0, y: 0, z: 0 };
	private _worldRotation: Euler = { x: 0, y: 0, z: 0, order: 'XYZ' };
	private _worldScale: Vector3 = { x: 1, y: 1, z: 1 };

	private readonly _localMatrix = new THREE.Matrix4();
	private readonly _worldMatrix = new THREE.Matrix4();

	constructor() {
		super();
		this.recalculateTransform();
	}

	get SelfPosition(): Vector3 {
		return { ...this._selfPosition };
	}

	set SelfPosition(value: Vector3) {
		this.setPosition(value.x, value.y, value.z);
	}

	get Position(): Vector3 {
		return { ...this._worldPosition };
	}

	get SelfRotation(): Euler {
		return { ...this._selfRotation };
	}

	set SelfRotation(value: Euler) {
		this.setRotation(value.x, value.y, value.z, value.order);
	}

	get Rotation(): Euler {
		return { ...this._worldRotation };
	}

	get SelfScale(): Vector3 {
		return { ...this._selfScale };
	}

	set SelfScale(value: Vector3) {
		this.setScale(value.x, value.y, value.z);
	}

	get Scale(): Vector3 {
		return { ...this._worldScale };
	}

	get LocalMatrix(): THREE.Matrix4 {
		return this._localMatrix.clone();
	}

	get WorldMatrix(): THREE.Matrix4 {
		return this._worldMatrix.clone();
	}

	setPosition(x: number, y: number, z: number): void {
		if (
			this._selfPosition.x === x &&
			this._selfPosition.y === y &&
			this._selfPosition.z === z
		) {
			return;
		}

		this._selfPosition = { x, y, z };
		this.updateWorldTransform();
	}

	setRotation(
		x: number,
		y: number,
		z: number,
		order: string = this._selfRotation.order
	): void {
		if (
			this._selfRotation.x === x &&
			this._selfRotation.y === y &&
			this._selfRotation.z === z &&
			this._selfRotation.order === order
		) {
			return;
		}

		this._selfRotation = { x, y, z, order };
		this.updateWorldTransform();
	}

	setScale(x: number, y: number, z: number): void {
		if (
			this._selfScale.x === x &&
			this._selfScale.y === y &&
			this._selfScale.z === z
		) {
			return;
		}

		this._selfScale = { x, y, z };
		this.updateWorldTransform();
	}

	protected override onParentChanged_Impl(_newParent: NodeBase | null): void {
		this.updateWorldTransform();
	}

	updateWorldTransform(): void {
		this.recalculateTransform();
		this.onTransformChanged();

		this.propagateTransformToChildren(this);
	}

	private propagateTransformToChildren(parent: NodeBase): void {
		for (const child of parent.Children) {
			if (child instanceof Node3D) {
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
			this._selfPosition.z
		);
		const eulerOrder = (this._selfRotation.order ||
			'XYZ') as THREE.EulerOrder;
		const euler = new THREE.Euler(
			this._selfRotation.x,
			this._selfRotation.y,
			this._selfRotation.z,
			eulerOrder
		);
		const quat = new THREE.Quaternion().setFromEuler(euler);
		const scale = new THREE.Vector3(
			this._selfScale.x,
			this._selfScale.y,
			this._selfScale.z
		);

		this._localMatrix.compose(pos, quat, scale);

		const parent3D = this.findNearestNode3DParent();
		if (parent3D) {
			this._worldMatrix.multiplyMatrices(
				parent3D._worldMatrix,
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
			eulerOrder
		);

		this._worldPosition = {
			x: worldPos.x || 0,
			y: worldPos.y || 0,
			z: worldPos.z || 0,
		};
		this._worldRotation = {
			x: worldEuler.x || 0,
			y: worldEuler.y || 0,
			z: worldEuler.z || 0,
			order: eulerOrder,
		};
		this._worldScale = {
			x: worldScale.x || 0,
			y: worldScale.y || 0,
			z: worldScale.z || 0,
		};
	}

	private findNearestNode3DParent(): Node3D | null {
		let current = this.Parent;
		while (current) {
			if (current instanceof Node3D) {
				return current;
			}
			current = current.Parent;
		}
		return null;
	}

	onTransformChanged(): void {
		this.onTransformChanged_Impl();
	}
	protected onTransformChanged_Impl(): void {}
}
