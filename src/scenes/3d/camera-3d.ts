import * as THREE from 'three';
import { Node3D } from './node-3d';
import { Vector3 } from '@/types';

export type CameraProjection = 'perspective' | 'orthographic';

export interface Camera3DOptions {
	debugName?: string;
	projection?: CameraProjection;
	fov?: number;
	aspect?: number;
	near?: number;
	far?: number;
	orthoSize?: number;
}

export class Camera3D extends Node3D {
	private _projection: CameraProjection;
	private _fov: number;
	private _aspect: number;
	private _near: number;
	private _far: number;
	private _orthoSize: number;

	private readonly _perspectiveCamera: THREE.PerspectiveCamera;
	private readonly _orthographicCamera: THREE.OrthographicCamera;

	constructor(options: Camera3DOptions | string = 'Camera3D') {
		const opts: Camera3DOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Camera3D');

		this._projection = opts.projection ?? 'perspective';
		this._fov = opts.fov ?? 75;
		this._aspect = opts.aspect ?? 16 / 9;
		this._near = opts.near ?? 0.1;
		this._far = opts.far ?? 1000;
		this._orthoSize = opts.orthoSize ?? 5;

		this._perspectiveCamera = new THREE.PerspectiveCamera(
			this._fov,
			this._aspect,
			this._near,
			this._far
		);

		const halfHeight = this._orthoSize / 2;
		const halfWidth = halfHeight * this._aspect;
		this._orthographicCamera = new THREE.OrthographicCamera(
			-halfWidth,
			halfWidth,
			halfHeight,
			-halfHeight,
			this._near,
			this._far
		);

		this.syncThreeCameras();
	}

	get Projection(): CameraProjection {
		return this._projection;
	}

	set Projection(value: CameraProjection) {
		this.setProjection(value);
	}

	get Fov(): number {
		return this._fov;
	}

	set Fov(value: number) {
		this.setFov(value);
	}

	get Aspect(): number {
		return this._aspect;
	}

	set Aspect(value: number) {
		this.setAspect(value);
	}

	get Near(): number {
		return this._near;
	}

	set Near(value: number) {
		this.setNear(value);
	}

	get Far(): number {
		return this._far;
	}

	set Far(value: number) {
		this.setFar(value);
	}

	get OrthoSize(): number {
		return this._orthoSize;
	}

	set OrthoSize(value: number) {
		this.setOrthoSize(value);
	}

	get ThreeCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
		return this._projection === 'perspective'
			? this._perspectiveCamera
			: this._orthographicCamera;
	}

	get PerspectiveCamera(): THREE.PerspectiveCamera {
		return this._perspectiveCamera;
	}

	get OrthographicCamera(): THREE.OrthographicCamera {
		return this._orthographicCamera;
	}

	setProjection(projection: CameraProjection): void {
		if (this._projection === projection) {
			return;
		}
		this._projection = projection;
		this.updateProjectionMatrix();
	}

	setFov(fov: number): void {
		if (fov <= 0 || this._fov === fov) {
			return;
		}
		this._fov = fov;
		this.updateProjectionMatrix();
	}

	setAspect(aspect: number): void {
		if (aspect <= 0 || this._aspect === aspect) {
			return;
		}
		this._aspect = aspect;
		this.updateProjectionMatrix();
	}

	setNear(near: number): void {
		if (near <= 0 || near >= this._far || this._near === near) {
			return;
		}
		this._near = near;
		this.updateProjectionMatrix();
	}

	setFar(far: number): void {
		if (far <= this._near || this._far === far) {
			return;
		}
		this._far = far;
		this.updateProjectionMatrix();
	}

	setOrthoSize(orthoSize: number): void {
		if (orthoSize <= 0 || this._orthoSize === orthoSize) {
			return;
		}
		this._orthoSize = orthoSize;
		this.updateProjectionMatrix();
	}

	lookAt(target: Vector3): void {
		const worldPos = this.Position;
		const eye = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
		const targetVec = new THREE.Vector3(target.x, target.y, target.z);
		const up = new THREE.Vector3(0, 1, 0);

		const lookMatrix = new THREE.Matrix4().lookAt(eye, targetVec, up);
		const worldQuat = new THREE.Quaternion().setFromRotationMatrix(
			lookMatrix
		);

		let localQuat = worldQuat;
		let current = this.Parent;
		while (current) {
			if (current instanceof Node3D) {
				const parentWorldQuat = new THREE.Quaternion();
				current.WorldMatrix.decompose(
					new THREE.Vector3(),
					parentWorldQuat,
					new THREE.Vector3()
				);
				localQuat = parentWorldQuat.invert().multiply(worldQuat);
				break;
			}
			current = current.Parent;
		}

		const order = (this.SelfRotation.order || 'XYZ') as THREE.EulerOrder;
		const localEuler = new THREE.Euler().setFromQuaternion(
			localQuat,
			order
		);
		this.setRotation(
			localEuler.x || 0,
			localEuler.y || 0,
			localEuler.z || 0,
			order
		);
	}

	updateProjectionMatrix(): void {
		this._perspectiveCamera.fov = this._fov;
		this._perspectiveCamera.aspect = this._aspect;
		this._perspectiveCamera.near = this._near;
		this._perspectiveCamera.far = this._far;
		this._perspectiveCamera.updateProjectionMatrix();

		const halfHeight = this._orthoSize / 2;
		const halfWidth = halfHeight * this._aspect;
		this._orthographicCamera.left = -halfWidth;
		this._orthographicCamera.right = halfWidth;
		this._orthographicCamera.top = halfHeight;
		this._orthographicCamera.bottom = -halfHeight;
		this._orthographicCamera.near = this._near;
		this._orthographicCamera.far = this._far;
		this._orthographicCamera.updateProjectionMatrix();
	}

	protected override _onTransformChanged(): void {
		this.syncThreeCameras();
	}

	private syncThreeCameras(): void {
		// Guard during super() constructor before cameras are initialized
		if (!this._perspectiveCamera || !this._orthographicCamera) {
			return;
		}

		const pos = this.Position;
		const rot = this.Rotation;
		const scale = this.Scale;
		const order = (rot.order || 'XYZ') as THREE.EulerOrder;

		for (const cam of [this._perspectiveCamera, this._orthographicCamera]) {
			cam.position.set(pos.x, pos.y, pos.z);
			cam.rotation.set(rot.x, rot.y, rot.z, order);
			cam.scale.set(scale.x, scale.y, scale.z);
			cam.updateMatrixWorld(true);
		}
	}
}
