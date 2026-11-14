import * as THREE from 'three';
import { Node2D } from './node-2d';
import { ImageResource } from '@/resources/image-resource';
import { Result, isResultSuccess } from '@/types';

export interface Texture2DOptions {
	debugName?: string;
	width?: number;
	height?: number;
	color?: number;
	opacity?: number;
}

export class Texture2D extends Node2D {
	private readonly _resource: ImageResource;
	private readonly _threeMesh: THREE.Mesh;
	private readonly _material: THREE.MeshBasicMaterial;
	private _geometry: THREE.PlaneGeometry;
	private _customWidth?: number;
	private _customHeight?: number;
	private _width: number;
	private _height: number;

	constructor(
		imageOrPath: string | ImageResource = '/assets/sample.png',
		options: Texture2DOptions = {}
	) {
		const resource =
			imageOrPath instanceof ImageResource
				? imageOrPath
				: new ImageResource(imageOrPath);

		super(options.debugName ?? `Texture2D: ${resource.ImageFilePath}`);

		this._resource = resource;
		this._customWidth = options.width;
		this._customHeight = options.height;
		this._width =
			options.width ?? (resource.Width > 0 ? resource.Width : 64);
		this._height =
			options.height ?? (resource.Height > 0 ? resource.Height : 64);

		this._geometry = new THREE.PlaneGeometry(this._width, this._height);
		this._material = new THREE.MeshBasicMaterial({
			color: options.color ?? 0xffffff,
			transparent: true,
			opacity: options.opacity ?? 1,
			side: THREE.DoubleSide,
		});

		this._threeMesh = new THREE.Mesh(this._geometry, this._material);

		if (this._resource.IsLoaded() && this._resource.Texture) {
			this.applyResourceToTexture();
		}

		this.syncThreeMeshTransform();
	}

	get Resource(): ImageResource {
		return this._resource;
	}

	get ImageFilePath(): string {
		return this._resource.ImageFilePath;
	}

	get Width(): number {
		return this._width;
	}

	set Width(value: number) {
		this.setSize(value, this._height);
	}

	get Height(): number {
		return this._height;
	}

	set Height(value: number) {
		this.setSize(this._width, value);
	}

	get ThreeMesh(): THREE.Mesh {
		return this._threeMesh;
	}

	get Material(): THREE.MeshBasicMaterial {
		return this._material;
	}

	setSize(width: number, height: number): void {
		if (
			width <= 0 ||
			height <= 0 ||
			(this._width === width && this._height === height)
		) {
			return;
		}
		this._customWidth = width;
		this._customHeight = height;
		this.rebuildGeometry(width, height);
	}

	async load(): Promise<Result> {
		const result = await this._resource.Load();
		if (isResultSuccess(result)) {
			this.applyResourceToTexture();
		}
		return result;
	}

	async unload(): Promise<Result> {
		const result = await this._resource.Unload();
		if (isResultSuccess(result)) {
			this._material.map = null;
			this._material.needsUpdate = true;
		}
		return result;
	}

	private applyResourceToTexture(): void {
		if (this._resource.Texture) {
			this._material.map = this._resource.Texture;
			this._material.needsUpdate = true;
		}

		const targetWidth =
			this._customWidth ??
			(this._resource.Width > 0 ? this._resource.Width : this._width);
		const targetHeight =
			this._customHeight ??
			(this._resource.Height > 0 ? this._resource.Height : this._height);

		if (targetWidth !== this._width || targetHeight !== this._height) {
			this.rebuildGeometry(targetWidth, targetHeight);
		}
	}

	private rebuildGeometry(width: number, height: number): void {
		this._width = width;
		this._height = height;
		this._geometry.dispose();
		this._geometry = new THREE.PlaneGeometry(this._width, this._height);
		this._threeMesh.geometry = this._geometry;
	}

	protected override _onTransformChanged(): void {
		this.syncThreeMeshTransform();
	}

	protected override _onEnable(): void {
		if (this._threeMesh) {
			this._threeMesh.visible = true;
		}
	}

	protected override _onDisable(): void {
		if (this._threeMesh) {
			this._threeMesh.visible = false;
		}
	}

	private syncThreeMeshTransform(): void {
		if (!this._threeMesh) {
			return;
		}

		const pos = this.Position;
		const rot = this.Rotation;
		const scale = this.Scale;

		this._threeMesh.position.set(pos.x, pos.y, 0);
		this._threeMesh.rotation.set(0, 0, rot, 'XYZ');
		this._threeMesh.scale.set(scale.x, scale.y, 1);
		this._threeMesh.updateMatrixWorld(true);
	}
}
export { Texture2D as Texture, type Texture2DOptions as TextureOptions };
