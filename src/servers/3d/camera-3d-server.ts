import { ServerBase } from '@/servers/server-base';
import { Camera3D } from '@/scenes/3d/camera-3d';
import { NodeBase } from '@/scenes/node-base';

export class Camera3DServer extends ServerBase<Camera3D> {
	private _activeCamera: Camera3D | null = null;

	constructor(debugName = 'Camera3DServer') {
		super(debugName);
	}

	get ActiveCamera(): Camera3D | null {
		if (
			this._activeCamera &&
			this._activeCamera.IsActive &&
			this._activeCamera.IsEnable
		) {
			return this._activeCamera;
		}

		for (const camera of this.Nodes) {
			if (camera.IsActive && camera.IsEnable) {
				return camera;
			}
		}

		return null;
	}

	setActiveCamera(camera: Camera3D | null): boolean {
		if (camera === null) {
			this._activeCamera = null;
			return true;
		}

		if (!this.hasNode(camera) || !camera.IsActive) {
			return false;
		}

		this._activeCamera = camera;
		return true;
	}

	/**
	 * When a camera is inside the active root scene tree (IsActive),
	 * it captures all active nodes in the root scene tree (including nodes nested under other cameras).
	 */
	getCapturedNodes(camera: Camera3D | null = this.ActiveCamera): NodeBase[] {
		if (!camera || !camera.IsActive || !camera.IsEnable) {
			return [];
		}

		const root = this.findRootNode(camera);
		if (!root || !root.IsActive) {
			return [];
		}

		const captured: NodeBase[] = [];
		this.collectTreeNodes(root, captured);
		return captured;
	}

	setAspect(aspect: number): void {
		for (const camera of this.Nodes) {
			camera.setAspect(aspect);
		}
	}

	protected override _update(_deltaTime: number): void {
		const activeCamera = this.ActiveCamera;
		if (activeCamera) {
			activeCamera.update();
		}
	}

	protected override _onNodeAdded(node: Camera3D): void {
		if (!this._activeCamera) {
			this._activeCamera = node;
		}
	}

	protected override _onNodeRemoved(node: Camera3D): void {
		if (this._activeCamera === node) {
			this._activeCamera = this.Nodes.length > 0 ? this.Nodes[0] : null;
		}
	}

	private findRootNode(node: NodeBase): NodeBase | null {
		let current: NodeBase | null = node;
		while (current.Parent) {
			current = current.Parent;
		}
		return current;
	}

	private collectTreeNodes(node: NodeBase, result: NodeBase[]): void {
		result.push(node);
		for (const child of node.Children) {
			this.collectTreeNodes(child, result);
		}
	}
}
