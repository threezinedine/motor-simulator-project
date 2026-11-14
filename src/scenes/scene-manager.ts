import { ObjectBase } from '@/common';
import type { NodeBase } from './node-base';
import { ServerBase } from '@/servers';
import { Renderer3D } from '@/render/3d/renderer-3d';
import { Renderer2D } from '@/render/2d/renderer-2d';
import {
	ObjectConstructor,
	Result,
	ResultStatus,
	RESULT_SUCCESS,
} from '@/types';

export class SceneManager extends ObjectBase {
	private static _instance: SceneManager | null = null;

	private readonly _nodeToServerTypes = new Map<
		ObjectConstructor<NodeBase>,
		Set<ObjectConstructor<ServerBase>>
	>();
	private readonly _servers = new Map<
		ObjectConstructor<ServerBase>,
		ServerBase
	>();
	private readonly _activeNodes = new Set<NodeBase>();
	private _rootNode: NodeBase | null = null;

	private constructor(debugName = 'SceneManager') {
		super(debugName);
	}

	static get Instance(): SceneManager {
		if (!SceneManager._instance) {
			SceneManager._instance = new SceneManager();
		}
		return SceneManager._instance;
	}

	static getInstance(): SceneManager {
		return SceneManager.Instance;
	}

	get RootNode(): NodeBase | null {
		return this._rootNode;
	}

	get ActiveNodes(): ReadonlySet<NodeBase> {
		return this._activeNodes;
	}

	get Servers(): ReadonlyMap<ObjectConstructor<ServerBase>, ServerBase> {
		return this._servers;
	}

	setRootNode(root: NodeBase): Result {
		if (root.Parent) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: 'Cannot set a node with a parent as RootNode.',
			};
		}

		this._rootNode = root;
		root.asRoot();
		return RESULT_SUCCESS;
	}

	registerServer<K extends ServerBase>(
		serverType: ObjectConstructor<K>,
		serverInstance?: K
	): Result {
		if (serverInstance) {
			this._servers.set(serverType, serverInstance);
			return RESULT_SUCCESS;
		}
		this.ensureServer(serverType);
		return RESULT_SUCCESS;
	}

	unregisterServer<K extends ServerBase>(
		serverType: ObjectConstructor<K>
	): Result {
		const server = this._servers.get(serverType);
		if (!server) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: `Server '${serverType.name}' is not registered.`,
			};
		}

		server.clearNodes();
		this._servers.delete(serverType);

		for (const [nodeType, serverSet] of this._nodeToServerTypes) {
			serverSet.delete(serverType);
			if (serverSet.size === 0) {
				this._nodeToServerTypes.delete(nodeType);
			}
		}

		return RESULT_SUCCESS;
	}

	hasServer<K extends ServerBase>(serverType: ObjectConstructor<K>): boolean {
		return this._servers.has(serverType);
	}

	update(deltaTime = 0): void {
		this._update(deltaTime);
	}

	protected _update(deltaTime: number): void {
		for (const server of this._servers.values()) {
			server.update(deltaTime);
		}

		const canAutoInitRenderer =
			typeof window !== 'undefined' &&
			typeof window.document !== 'undefined';

		if (Renderer3D.hasInstance() || canAutoInitRenderer) {
			Renderer3D.Instance.render();
		}
		if (Renderer2D.hasInstance() || canAutoInitRenderer) {
			Renderer2D.Instance.render();
		}
	}

	/**
	 * One node can be registered to multiple servers, one server can contains multiple nodes
	 */
	registerNode<T extends NodeBase, K extends ServerBase>(
		nodeType: ObjectConstructor<T>,
		serverType: ObjectConstructor<K>
	): Result {
		let serverSet = this._nodeToServerTypes.get(nodeType);
		if (!serverSet) {
			serverSet = new Set();
			this._nodeToServerTypes.set(nodeType, serverSet);
		}

		if (serverSet.has(serverType)) {
			return RESULT_SUCCESS;
		}

		serverSet.add(serverType);
		const server = this.ensureServer(serverType);

		// Attach any already-active nodes of this type to the newly bound server
		for (const activeNode of this._activeNodes) {
			if (activeNode instanceof nodeType) {
				server.addNode(activeNode);
			}
		}

		return RESULT_SUCCESS;
	}

	unregisterNode<T extends NodeBase, K extends ServerBase>(
		nodeType: ObjectConstructor<T>,
		serverType?: ObjectConstructor<K>
	): Result {
		const serverSet = this._nodeToServerTypes.get(nodeType);
		if (!serverSet) {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: `Node type '${nodeType.name}' is not registered to any servers.`,
			};
		}

		if (serverType) {
			if (!serverSet.has(serverType)) {
				return {
					status: ResultStatus.FAILURE,
					errorMessage: `Node type '${nodeType.name}' is not registered to server '${serverType.name}'.`,
				};
			}

			serverSet.delete(serverType);
			if (serverSet.size === 0) {
				this._nodeToServerTypes.delete(nodeType);
			}

			const server = this._servers.get(serverType);
			if (server) {
				for (const activeNode of this._activeNodes) {
					if (
						activeNode instanceof nodeType &&
						!this.isNodeBoundToServer(activeNode, serverType)
					) {
						server.removeNode(activeNode);
					}
				}
			}

			return RESULT_SUCCESS;
		}

		const affectedServers = Array.from(serverSet);
		this._nodeToServerTypes.delete(nodeType);

		for (const srvType of affectedServers) {
			const server = this._servers.get(srvType);
			if (server) {
				for (const activeNode of this._activeNodes) {
					if (
						activeNode instanceof nodeType &&
						!this.isNodeBoundToServer(activeNode, srvType)
					) {
						server.removeNode(activeNode);
					}
				}
			}
		}

		return RESULT_SUCCESS;
	}

	getServer<K extends ServerBase>(
		serverType: ObjectConstructor<K>
	): K | null {
		return (this._servers.get(serverType) as K) ?? null;
	}

	getServersForNode<T extends NodeBase>(
		nodeOrType: T | ObjectConstructor<T>
	): ServerBase[] {
		const matchedServerTypes = new Set<ObjectConstructor<ServerBase>>();

		if (typeof nodeOrType === 'function') {
			const directSet = this._nodeToServerTypes.get(nodeOrType);
			if (directSet) {
				for (const s of directSet) {
					matchedServerTypes.add(s);
				}
			}
		} else {
			for (const [registeredNodeType, serverSet] of this
				._nodeToServerTypes) {
				if (nodeOrType instanceof registeredNodeType) {
					for (const s of serverSet) {
						matchedServerTypes.add(s);
					}
				}
			}
		}

		const result: ServerBase[] = [];
		for (const srvType of matchedServerTypes) {
			result.push(this.ensureServer(srvType));
		}
		return result;
	}

	notifyNodeActivated(node: NodeBase): void {
		if (this._activeNodes.has(node)) {
			return;
		}

		this._activeNodes.add(node);
		const servers = this.getServersForNode(node);
		for (const server of servers) {
			server.addNode(node);
		}
	}

	notifyNodeDeactivated(node: NodeBase): void {
		if (!this._activeNodes.has(node)) {
			return;
		}

		this._activeNodes.delete(node);
		for (const server of this._servers.values()) {
			server.removeNode(node);
		}
	}

	clear(): void {
		for (const server of this._servers.values()) {
			server.clearNodes();
		}
		this._servers.clear();
		this._nodeToServerTypes.clear();
		this._activeNodes.clear();
		this._rootNode = null;
	}

	private ensureServer<K extends ServerBase>(
		serverType: ObjectConstructor<K>
	): K {
		let server = this._servers.get(serverType) as K | undefined;
		if (!server) {
			server = new serverType();
			this._servers.set(serverType, server);
		}
		return server;
	}

	private isNodeBoundToServer(
		node: NodeBase,
		serverType: ObjectConstructor<ServerBase>
	): boolean {
		for (const [registeredNodeType, serverSet] of this._nodeToServerTypes) {
			if (
				node instanceof registeredNodeType &&
				serverSet.has(serverType)
			) {
				return true;
			}
		}
		return false;
	}
}
