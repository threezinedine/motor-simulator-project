import * as THREE from 'three';
import { Node2D } from './node-2d';

export interface Camera2DOptions {
	debugName?: string;
	width?: number;
	height?: number;
	zoom?: number;
	near?: number;
	far?: number;
}

export class Camera2D extends Node2D {
	private _width: number;
	private _height: number;
	private _zoom: number;
	private _near: number;
	private _far: number;

	private readonly _orthographicCamera: THREE.OrthographicCamera;

	constructor(options: Camera2DOptions | string = 'Camera2D') {
		const opts: Camera2DOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Camera2D');

		this._width = opts.width ?? 800;
		this._height = opts.height ?? 600;
		this._zoom = opts.zoom ?? 1;
		this._near = opts.near ?? -1000;
		this._far = opts.far ?? 1000;

		const halfWidth = this._width / (2 * this._zoom);
		const halfHeight = this._height / (2 * this._zoom);

		this._orthographicCamera = new THREE.OrthographicCamera(
			-halfWidth,
			halfWidth,
			halfHeight,
			-halfHeight,
			this._near,
			this._far
		);

		this.syncThreeCamera();
	}

	get Width(): number {
		return this._width;
	}

	set Width(value: number) {
		this.setViewportSize(value, this._height);
	}

	get Height(): number {
		return this._height;
	}

	set Height(value: number) {
		this.setViewportSize(this._width, value);
	}

	get Zoom(): number {
		return this._zoom;
	}

	set Zoom(value: number) {
		this.setZoom(value);
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

	get ThreeCamera(): THREE.OrthographicCamera {
		return this._orthographicCamera;
	}

	get OrthographicCamera(): THREE.OrthographicCamera {
		return this._orthographicCamera;
	}

	setViewportSize(width: number, height: number): void {
		if (
			width <= 0 ||
			height <= 0 ||
			(this._width === width && this._height === height)
		) {
			return;
		}
		this._width = width;
		this._height = height;
		this.updateProjectionMatrix();
	}

	setZoom(zoom: number): void {
		if (zoom <= 0 || this._zoom === zoom) {
			return;
		}
		this._zoom = zoom;
		this.updateProjectionMatrix();
	}

	setNear(near: number): void {
		if (near >= this._far || this._near === near) {
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

	updateProjectionMatrix(): void {
		const halfWidth = this._width / (2 * this._zoom);
		const halfHeight = this._height / (2 * this._zoom);

		this._orthographicCamera.left = -halfWidth;
		this._orthographicCamera.right = halfWidth;
		this._orthographicCamera.top = halfHeight;
		this._orthographicCamera.bottom = -halfHeight;
		this._orthographicCamera.near = this._near;
		this._orthographicCamera.far = this._far;
		this._orthographicCamera.updateProjectionMatrix();
	}

	protected override _onTransformChanged(): void {
		this.syncThreeCamera();
	}

	private syncThreeCamera(): void {
		if (!this._orthographicCamera) {
			return;
		}

		const pos = this.Position;
		const rot = this.Rotation;
		const scale = this.Scale;

		this._orthographicCamera.position.set(pos.x, pos.y, 0);
		this._orthographicCamera.rotation.set(0, 0, rot, 'XYZ');
		this._orthographicCamera.scale.set(scale.x, scale.y, 1);
		this._orthographicCamera.updateMatrixWorld(true);
	}
}
