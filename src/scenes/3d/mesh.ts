import { Node3D } from './node-3d';

export class Mesh extends Node3D {
	private _meshFilePath: string;
	private _textureFilePath?: string;

	constructor(meshFilePath: string, textureFilePath?: string) {
		super(`Mesh: ${meshFilePath}`);
		this._meshFilePath = meshFilePath;
		this._textureFilePath = textureFilePath;
	}
}
