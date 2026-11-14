import { ObjectBase } from '@/common';
import type { NodeBase } from '@/scenes/node-base';

export class ServerBase<T extends NodeBase = NodeBase> extends ObjectBase {
	private readonly _nodes: T[] = [];

	constructor(debugName = 'ServerBase') {
		super(debugName);
	}

	get Nodes(): readonly T[] {
		return this._nodes;
	}

	hasNode(node: T): boolean {
		return this._nodes.includes(node);
	}

	addNode(node: T): void {
		if (this._nodes.includes(node)) {
			return;
		}

		this._nodes.push(node);
		this.onNodeAdded(node);
	}

	removeNode(node: T): void {
		const index = this._nodes.indexOf(node);
		if (index === -1) {
			return;
		}

		this._nodes.splice(index, 1);
		this.onNodeRemoved(node);
	}

	clearNodes(): void {
		for (let i = this._nodes.length - 1; i >= 0; i--) {
			const node = this._nodes[i];
			this._nodes.splice(i, 1);
			this.onNodeRemoved(node);
		}
	}

	onNodeAdded(node: T): void {
		this._onNodeAdded(node);
	}
	protected _onNodeAdded(_node: T): void {}

	onNodeRemoved(node: T): void {
		this._onNodeRemoved(node);
	}
	protected _onNodeRemoved(_node: T): void {}
}
