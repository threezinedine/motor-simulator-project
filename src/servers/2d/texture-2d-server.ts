import * as THREE from 'three';
import { ServerBase } from '@/servers/server-base';
import { Texture2D } from '@/scenes/2d/texture-2d';

export class Texture2DServer extends ServerBase<Texture2D> {
	private readonly _threeScene: THREE.Scene;

	constructor(debugName = 'Texture2DServer') {
		super(debugName);
		this._threeScene = new THREE.Scene();
	}

	get ThreeScene(): THREE.Scene {
		return this._threeScene;
	}

	protected override _onNodeAdded(node: Texture2D): void {
		this._threeScene.add(node.ThreeMesh);
	}

	protected override _onNodeRemoved(node: Texture2D): void {
		this._threeScene.remove(node.ThreeMesh);
	}
}
export { Texture2DServer as TextureServer };
