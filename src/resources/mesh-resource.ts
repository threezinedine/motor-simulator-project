import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Result, ResultStatus, RESULT_SUCCESS, isResultSuccess } from '@/types';
import { Resource } from './resource';
import { ImageResource } from './image-resource';

export class MeshResource extends Resource {
	private readonly _meshFilePath: string;
	private readonly _textureFilePath?: string;
	private _geometry: THREE.BufferGeometry | null = null;
	private _imageResource: ImageResource | null = null;

	constructor(meshFilePath = '/assets/cube.obj', textureFilePath?: string) {
		super(`MeshResource: ${meshFilePath}`);
		this._meshFilePath = meshFilePath;
		this._textureFilePath = textureFilePath;
	}

	get MeshFilePath(): string {
		return this._meshFilePath;
	}

	get TextureFilePath(): string | undefined {
		return this._textureFilePath;
	}

	get Geometry(): THREE.BufferGeometry | null {
		return this._geometry;
	}

	get Texture(): THREE.Texture | null {
		return this._imageResource?.Texture ?? null;
	}

	get ImageResource(): ImageResource | null {
		return this._imageResource;
	}

	protected override async _Load(): Promise<Result> {
		if (!this._meshFilePath) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: 'Mesh file path is empty.',
			};
		}

		const text = await this.fetchMeshText(this._meshFilePath);
		const loader = new OBJLoader();
		const group = loader.parse(text);

		const foundGeometry = this.extractFirstGeometry(group);
		if (!foundGeometry) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: `No mesh geometry found in '${this._meshFilePath}'.`,
			};
		}

		this._geometry = foundGeometry;

		if (this._textureFilePath) {
			this._imageResource = new ImageResource(this._textureFilePath);
			const texResult = await this._imageResource.Load();
			if (!isResultSuccess(texResult)) {
				this._geometry.dispose();
				this._geometry = null;
				this._imageResource = null;
				return texResult;
			}
		}

		return RESULT_SUCCESS;
	}

	protected override async _Unload(): Promise<Result> {
		if (this._geometry) {
			this._geometry.dispose();
			this._geometry = null;
		}
		if (this._imageResource) {
			await this._imageResource.Unload();
			this._imageResource = null;
		}
		return RESULT_SUCCESS;
	}

	private extractFirstGeometry(
		group: THREE.Group
	): THREE.BufferGeometry | null {
		let foundGeometry: THREE.BufferGeometry | null = null;
		group.traverse((child) => {
			if (!foundGeometry && child instanceof THREE.Mesh) {
				foundGeometry = child.geometry.clone();
			}
		});
		return foundGeometry;
	}

	private async fetchMeshText(filePath: string): Promise<string> {
		// In browser / Vite dev or production build when fetch is available
		if (
			typeof fetch === 'function' &&
			typeof window !== 'undefined' &&
			typeof window.document !== 'undefined'
		) {
			const response = await fetch(filePath);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch mesh '${filePath}': ${response.status} ${response.statusText}`
				);
			}
			return response.text();
		}

		// Node.js / Vitest unit test environment fallback
		const { readFile } = await import('fs/promises');
		const { resolve } = await import('path');
		const normalized = filePath.replace(/^\//, '');
		return readFile(resolve(process.cwd(), normalized), 'utf-8');
	}
}
