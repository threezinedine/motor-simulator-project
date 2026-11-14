import * as THREE from 'three';
import { ServerBase } from '@/servers/server-base';
import { Mesh } from '@/scenes/3d/mesh';

export class MeshServer extends ServerBase<Mesh> {
	private readonly _threeScene: THREE.Scene;

	constructor(debugName = 'MeshServer') {
		super(debugName);
		this._threeScene = new THREE.Scene();
		this._threeScene.background = new THREE.Color(0x1a1a2e);
	}

	get ThreeScene(): THREE.Scene {
		return this._threeScene;
	}

	protected override _onNodeAdded(node: Mesh): void {
		this._threeScene.add(node.ThreeMesh);
	}

	protected override _onNodeRemoved(node: Mesh): void {
		this._threeScene.remove(node.ThreeMesh);
	}
}
