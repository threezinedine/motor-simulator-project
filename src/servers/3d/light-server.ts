import * as THREE from 'three';
import { ServerBase } from '@/servers/server-base';
import { Light } from '@/scenes/3d/light';
import { SceneManager } from '@/scenes/scene-manager';
import { MeshServer } from './mesh-server';

export class LightServer extends ServerBase<Light> {
	private _threeScene: THREE.Scene;

	constructor(debugName = 'LightServer') {
		super(debugName);
		const meshServer = SceneManager.Instance.getServer(MeshServer);
		this._threeScene = meshServer
			? meshServer.ThreeScene
			: new THREE.Scene();
	}

	get ThreeScene(): THREE.Scene {
		return this._threeScene;
	}

	setThreeScene(scene: THREE.Scene): void {
		if (this._threeScene === scene) {
			return;
		}

		for (const node of this.Nodes) {
			this._threeScene.remove(node.ThreeLight);
			scene.add(node.ThreeLight);
		}

		this._threeScene = scene;
	}

	protected override _onNodeAdded(node: Light): void {
		const meshServer = SceneManager.Instance.getServer(MeshServer);
		if (meshServer && this._threeScene !== meshServer.ThreeScene) {
			this.setThreeScene(meshServer.ThreeScene);
		}
		this._threeScene.add(node.ThreeLight);
	}

	protected override _onNodeRemoved(node: Light): void {
		this._threeScene.remove(node.ThreeLight);
	}
}
