import { Resource } from './resource';

export class MeshResource extends Resource {
	private _meshFilePath: string;
	private _textureFilePath?: string;

	constructor(meshFilePath: string, textureFilePath?: string) {
		super(`MeshResource: ${meshFilePath}`);
		this._meshFilePath = meshFilePath;
		this._textureFilePath = textureFilePath;
	}
}
