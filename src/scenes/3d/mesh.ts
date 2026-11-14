import * as THREE from 'three';
import { Node3D } from './node-3d';
import { MeshResource } from '@/resources/mesh-resource';
import { Result, isResultSuccess } from '@/types';

export interface MeshOptions {
	debugName?: string;
	color?: number;
	roughness?: number;
	metalness?: number;
	wireframeOverlay?: boolean;
	wireframeColor?: number;
}

export class Mesh extends Node3D {
	private readonly _resource: MeshResource;
	private readonly _threeMesh: THREE.Mesh;
	private readonly _material: THREE.MeshStandardMaterial;
	private _wireframeSegments: THREE.LineSegments | null = null;
	private _wireframeOverlay: boolean;
	private _wireframeColor: number;

	constructor(
		meshOrPath: string | MeshResource = '/assets/cube.obj',
		textureFilePathOrOptions?: string | MeshOptions,
		options?: MeshOptions
	) {
		const isResource = meshOrPath instanceof MeshResource;
		const texturePath =
			typeof textureFilePathOrOptions === 'string'
				? textureFilePathOrOptions
				: undefined;
		const opts: MeshOptions =
			(typeof textureFilePathOrOptions === 'object'
				? textureFilePathOrOptions
				: options) ?? {};

		const resource = isResource
			? meshOrPath
			: new MeshResource(meshOrPath, texturePath);

		super(opts.debugName ?? `Mesh: ${resource.MeshFilePath}`);

		this._resource = resource;
		this._wireframeOverlay = opts.wireframeOverlay ?? true;
		this._wireframeColor = opts.wireframeColor ?? 0xffffff;

		this._material = new THREE.MeshStandardMaterial({
			color: opts.color ?? 0x00d2ff,
			roughness: opts.roughness ?? 0.4,
			metalness: opts.metalness ?? 0.2,
		});

		const initialGeometry =
			this._resource.Geometry ?? new THREE.BoxGeometry(1, 1, 1);
		this._threeMesh = new THREE.Mesh(initialGeometry, this._material);

		if (this._resource.IsLoaded() && this._resource.Geometry) {
			this.applyResourceToMesh();
		} else if (this._wireframeOverlay) {
			this.rebuildWireframe(initialGeometry);
		}

		this.syncThreeMeshTransform();
	}

	get Resource(): MeshResource {
		return this._resource;
	}

	get MeshFilePath(): string {
		return this._resource.MeshFilePath;
	}

	get TextureFilePath(): string | undefined {
		return this._resource.TextureFilePath;
	}

	get ThreeMesh(): THREE.Mesh {
		return this._threeMesh;
	}

	get Material(): THREE.MeshStandardMaterial {
		return this._material;
	}

	get WireframeOverlay(): boolean {
		return this._wireframeOverlay;
	}

	set WireframeOverlay(value: boolean) {
		if (this._wireframeOverlay === value) {
			return;
		}
		this._wireframeOverlay = value;
		if (value) {
			this.rebuildWireframe(this._threeMesh.geometry);
		} else if (this._wireframeSegments) {
			this._threeMesh.remove(this._wireframeSegments);
			this._wireframeSegments.geometry.dispose();
			(this._wireframeSegments.material as THREE.Material).dispose();
			this._wireframeSegments = null;
		}
	}

	async load(): Promise<Result> {
		const result = await this._resource.Load();
		if (isResultSuccess(result)) {
			this.applyResourceToMesh();
		}
		return result;
	}

	async unload(): Promise<Result> {
		return this._resource.Unload();
	}

	private applyResourceToMesh(): void {
		if (this._resource.Geometry) {
			this._threeMesh.geometry = this._resource.Geometry;
			if (this._wireframeOverlay) {
				this.rebuildWireframe(this._resource.Geometry);
			}
		}
		if (this._resource.Texture) {
			this._material.map = this._resource.Texture;
			this._material.needsUpdate = true;
		}
	}

	private rebuildWireframe(geometry: THREE.BufferGeometry): void {
		if (this._wireframeSegments) {
			this._threeMesh.remove(this._wireframeSegments);
			this._wireframeSegments.geometry.dispose();
			(this._wireframeSegments.material as THREE.Material).dispose();
		}

		const edges = new THREE.EdgesGeometry(geometry);
		const lineMaterial = new THREE.LineBasicMaterial({
			color: this._wireframeColor,
		});
		this._wireframeSegments = new THREE.LineSegments(edges, lineMaterial);
		this._threeMesh.add(this._wireframeSegments);
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
		const order = (rot.order || 'XYZ') as THREE.EulerOrder;

		this._threeMesh.position.set(pos.x, pos.y, pos.z);
		this._threeMesh.rotation.set(rot.x, rot.y, rot.z, order);
		this._threeMesh.scale.set(scale.x, scale.y, scale.z);
		this._threeMesh.updateMatrixWorld(true);
	}
}
