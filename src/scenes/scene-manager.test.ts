import { describe, it, expect, beforeEach } from 'vitest';
import { NodeBase } from './node-base';
import { SceneManager } from './scene-manager';
import { ServerBase } from '@/servers';
import { isResultSuccess, ResultStatus } from '@/types';

class RenderNode extends NodeBase {
	constructor(debugName = 'RenderNode') {
		super(debugName);
	}
}

class PhysicsNode extends NodeBase {
	constructor(debugName = 'PhysicsNode') {
		super(debugName);
	}
}

class HybridNode extends RenderNode {
	constructor(debugName = 'HybridNode') {
		super(debugName);
	}
}

class RenderServer extends ServerBase<RenderNode> {
	public added: RenderNode[] = [];
	public removed: RenderNode[] = [];
	public updateCount = 0;
	public lastDelta = 0;

	constructor() {
		super('RenderServer');
	}

	protected override _onNodeAdded(node: RenderNode): void {
		this.added.push(node);
	}

	protected override _onNodeRemoved(node: RenderNode): void {
		this.removed.push(node);
	}

	protected override _update(deltaTime: number): void {
		this.updateCount += 1;
		this.lastDelta = deltaTime;
	}
}

class PhysicsServer extends ServerBase<NodeBase> {
	public added: NodeBase[] = [];
	public removed: NodeBase[] = [];

	constructor() {
		super('PhysicsServer');
	}

	protected override _onNodeAdded(node: NodeBase): void {
		this.added.push(node);
	}

	protected override _onNodeRemoved(node: NodeBase): void {
		this.removed.push(node);
	}
}

describe('SceneManager', () => {
	let manager: SceneManager;
	let root: NodeBase;

	beforeEach(() => {
		manager = SceneManager.Instance;
		manager.clear();
		root = new NodeBase('Root');
	});

	describe('singleton & initial state', () => {
		it('returns the same singleton instance with null RootNode and empty ActiveNodes', () => {
			expect(SceneManager.Instance).toBe(manager);
			expect(SceneManager.getInstance()).toBe(manager);
			expect(manager.RootNode).toBeNull();
			expect(manager.ActiveNodes.size).toBe(0);
			expect(manager.getServer(RenderServer)).toBeNull();
		});
	});

	describe('setRootNode', () => {
		it('sets the root node, activates it, and registers it in ActiveNodes', () => {
			const result = manager.setRootNode(root);

			expect(isResultSuccess(result)).toBe(true);
			expect(manager.RootNode).toBe(root);
			expect(root.IsRoot).toBe(true);
			expect(root.IsActive).toBe(true);
			expect(manager.ActiveNodes.has(root)).toBe(true);
		});

		it('returns FAILURE Result when attempting to set a child node with a parent as RootNode', () => {
			const child = new NodeBase('Child');
			root.addChild(child);

			const result = manager.setRootNode(child);

			expect(result.status).toBe(ResultStatus.FAILURE);
			expect(manager.RootNode).toBeNull();
			expect(child.IsRoot).toBe(false);
		});
	});

	describe('registerNode (many-to-many node <-> server binding)', () => {
		it('registers a single node type to multiple servers and dispatches active nodes to all bound servers', () => {
			manager.registerNode(RenderNode, RenderServer);
			manager.registerNode(RenderNode, PhysicsServer);

			manager.setRootNode(root);
			const node = new RenderNode();
			root.addChild(node);

			const renderServer = manager.getServer(RenderServer)!;
			const physicsServer = manager.getServer(PhysicsServer)!;

			expect(renderServer.Nodes).toEqual([node]);
			expect(physicsServer.Nodes).toEqual([node]);
			expect(renderServer.added).toEqual([node]);
			expect(physicsServer.added).toEqual([node]);
		});

		it('registers multiple node types to a single server and collects instances of all bound types', () => {
			manager.registerNode(RenderNode, PhysicsServer);
			manager.registerNode(PhysicsNode, PhysicsServer);

			manager.setRootNode(root);
			const renderNode = new RenderNode();
			const physicsNode = new PhysicsNode();
			root.addChild(renderNode);
			root.addChild(physicsNode);

			const physicsServer = manager.getServer(PhysicsServer)!;
			expect(physicsServer.Nodes).toEqual([renderNode, physicsNode]);
		});

		it('matches derived node subclasses against registered base node types', () => {
			manager.registerNode(RenderNode, RenderServer);
			manager.setRootNode(root);

			const hybrid = new HybridNode();
			root.addChild(hybrid);

			const renderServer = manager.getServer(RenderServer)!;
			expect(renderServer.Nodes).toEqual([hybrid]);
		});

		it('retroactively adds already-active nodes when registerNode is called after scene activation', () => {
			manager.setRootNode(root);
			const node = new RenderNode();
			root.addChild(node);

			manager.registerNode(RenderNode, RenderServer);

			const renderServer = manager.getServer(RenderServer)!;
			expect(renderServer.Nodes).toEqual([node]);
		});

		it('is idempotent when registering the same nodeType and serverType pair twice', () => {
			manager.setRootNode(root);
			const node = new RenderNode();
			root.addChild(node);

			manager.registerNode(RenderNode, RenderServer);
			const secondResult = manager.registerNode(RenderNode, RenderServer);

			const renderServer = manager.getServer(RenderServer)!;
			expect(isResultSuccess(secondResult)).toBe(true);
			expect(renderServer.Nodes).toEqual([node]);
			expect(renderServer.added).toHaveLength(1);
		});
	});

	describe('scene tree activation & deactivation sync', () => {
		it('does not add inactive nodes to servers until they become active in the scene tree', () => {
			manager.registerNode(RenderNode, RenderServer);
			const node = new RenderNode();
			root.addChild(node);

			const renderServer = manager.getServer(RenderServer)!;
			expect(renderServer.Nodes).toEqual([]);

			// Activating root activates the whole tree and adds node to RenderServer
			manager.setRootNode(root);
			expect(renderServer.Nodes).toEqual([node]);
		});

		it('removes nodes from all bound servers when detached from an active scene tree', () => {
			manager.registerNode(RenderNode, RenderServer);
			manager.registerNode(RenderNode, PhysicsServer);
			manager.setRootNode(root);

			const node = new RenderNode();
			root.addChild(node);

			root.removeChild(node);

			const renderServer = manager.getServer(RenderServer)!;
			const physicsServer = manager.getServer(PhysicsServer)!;

			expect(renderServer.Nodes).toEqual([]);
			expect(renderServer.removed).toEqual([node]);
			expect(physicsServer.Nodes).toEqual([]);
			expect(physicsServer.removed).toEqual([node]);
			expect(manager.ActiveNodes.has(node)).toBe(false);
		});
	});

	describe('unregisterNode', () => {
		it('unregisters a specific server from a node type while keeping other bound servers intact', () => {
			manager.registerNode(RenderNode, RenderServer);
			manager.registerNode(RenderNode, PhysicsServer);
			manager.setRootNode(root);

			const node = new RenderNode();
			root.addChild(node);

			const res = manager.unregisterNode(RenderNode, RenderServer);

			expect(isResultSuccess(res)).toBe(true);
			expect(manager.getServer(RenderServer)?.Nodes).toEqual([]);
			expect(manager.getServer(PhysicsServer)?.Nodes).toEqual([node]);
		});

		it('unregisters all servers for a node type when serverType is omitted', () => {
			manager.registerNode(RenderNode, RenderServer);
			manager.registerNode(RenderNode, PhysicsServer);
			manager.setRootNode(root);

			const node = new RenderNode();
			root.addChild(node);

			const res = manager.unregisterNode(RenderNode);

			expect(isResultSuccess(res)).toBe(true);
			expect(manager.getServer(RenderServer)?.Nodes).toEqual([]);
			expect(manager.getServer(PhysicsServer)?.Nodes).toEqual([]);
		});

		it('returns FAILURE Result when unregistering an unbound nodeType or serverType', () => {
			expect(manager.unregisterNode(RenderNode).status).toBe(
				ResultStatus.FAILURE
			);

			manager.registerNode(RenderNode, RenderServer);
			expect(
				manager.unregisterNode(RenderNode, PhysicsServer).status
			).toBe(ResultStatus.FAILURE);
		});
	});

	describe('registerServer, unregisterServer & update', () => {
		it('registers and unregisters servers directly and updates all registered servers on SceneManager.update()', () => {
			const regRes = manager.registerServer(RenderServer);
			expect(isResultSuccess(regRes)).toBe(true);
			expect(manager.hasServer(RenderServer)).toBe(true);

			const renderServer = manager.getServer(RenderServer)!;
			expect(renderServer).toBeInstanceOf(RenderServer);

			manager.update(0.016);
			expect(renderServer.updateCount).toBe(1);
			expect(renderServer.lastDelta).toBeCloseTo(0.016);

			const unregRes = manager.unregisterServer(RenderServer);
			expect(isResultSuccess(unregRes)).toBe(true);
			expect(manager.hasServer(RenderServer)).toBe(false);
			expect(manager.unregisterServer(RenderServer).status).toBe(
				ResultStatus.FAILURE
			);
		});
	});
});
