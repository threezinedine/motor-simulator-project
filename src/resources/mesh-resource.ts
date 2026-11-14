import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Result, ResultStatus, RESULT_SUCCESS } from '@/types';
import { Resource } from './resource';

export class MeshResource extends Resource {
	private readonly _meshFilePath: string;
	private readonly _textureFilePath?: string;
	private _geometry: THREE.BufferGeometry | null = null;
	private _texture: THREE.Texture | null = null;

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
		return this._texture;
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

		let foundGeometry: THREE.BufferGeometry | null = null;
		group.traverse((child) => {
			if (!foundGeometry && child instanceof THREE.Mesh) {
				foundGeometry = child.geometry.clone();
			}
		});

		if (!foundGeometry) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: `No mesh geometry found in '${this._meshFilePath}'.`,
			};
		}

		this._geometry = foundGeometry;

		if (this._textureFilePath) {
			const texLoader = new THREE.TextureLoader();
			this._texture = await texLoader.loadAsync(this._textureFilePath);
		}

		return RESULT_SUCCESS;
	}

	protected override async _Unload(): Promise<Result> {
		if (this._geometry) {
			this._geometry.dispose();
			this._geometry = null;
		}
		if (this._texture) {
			this._texture.dispose();
			this._texture = null;
		}
		return RESULT_SUCCESS;
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
