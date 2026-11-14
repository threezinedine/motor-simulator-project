import * as THREE from 'three';
import { Result, ResultStatus, RESULT_SUCCESS } from '@/types';
import { Resource } from './resource';

export class ImageResource extends Resource {
	private readonly _imageFilePath: string;
	private _texture: THREE.Texture | null = null;
	private _width = 0;
	private _height = 0;

	constructor(imageFilePath = '') {
		super(`ImageResource: ${imageFilePath}`);
		this._imageFilePath = imageFilePath;
	}

	get ImageFilePath(): string {
		return this._imageFilePath;
	}

	get Texture(): THREE.Texture | null {
		return this._texture;
	}

	get Width(): number {
		return this._width;
	}

	get Height(): number {
		return this._height;
	}

	protected override async _Load(): Promise<Result> {
		if (!this._imageFilePath) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: 'Image file path is empty.',
			};
		}

		// Browser environment with DOM Image support
		if (
			typeof window !== 'undefined' &&
			typeof window.document !== 'undefined'
		) {
			const loader = new THREE.TextureLoader();
			const texture = await loader.loadAsync(this._imageFilePath);
			this._texture = texture;
			const img = texture.image as
				{ width?: number; height?: number } | undefined;
			this._width = img?.width ?? 0;
			this._height = img?.height ?? 0;
			return RESULT_SUCCESS;
		}

		// Node.js / Vitest test environment fallback
		const { readFile } = await import('fs/promises');
		const { resolve } = await import('path');
		const normalized = this._imageFilePath.replace(/^\//, '');
		const buffer = await readFile(resolve(process.cwd(), normalized));

		const dimensions = this.parseImageDimensions(buffer);
		this._width = dimensions.width;
		this._height = dimensions.height;

		const data = new Uint8Array(this._width * this._height * 4);
		const dataTexture = new THREE.DataTexture(
			data,
			this._width,
			this._height,
			THREE.RGBAFormat
		);
		dataTexture.needsUpdate = true;
		this._texture = dataTexture;

		return RESULT_SUCCESS;
	}

	protected override async _Unload(): Promise<Result> {
		if (this._texture) {
			this._texture.dispose();
			this._texture = null;
		}
		this._width = 0;
		this._height = 0;
		return RESULT_SUCCESS;
	}

	private parseImageDimensions(buffer: Buffer): {
		width: number;
		height: number;
	} {
		// PNG signature: 89 50 4E 47 0D 0A 1A 0A, IHDR width at offset 16, height at offset 20
		if (
			buffer.length >= 24 &&
			buffer[0] === 0x89 &&
			buffer[1] === 0x50 &&
			buffer[2] === 0x4e &&
			buffer[3] === 0x47
		) {
			return {
				width: buffer.readUInt32BE(16),
				height: buffer.readUInt32BE(20),
			};
		}
		return { width: 1, height: 1 };
	}
}
