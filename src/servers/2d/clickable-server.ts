import * as THREE from 'three';
import { ServerBase } from '@/servers/server-base';
import { Clickable } from '@/scenes/2d/clickable';
import { SceneManager } from '@/scenes/scene-manager';
import { Camera2DServer } from './camera-2d-server';
import { Vector2 } from '@/types';

export interface QueuedPointerEvent {
	clientX: number;
	clientY: number;
	isWorldSpace?: boolean;
}

export type QueuedClickEvent = QueuedPointerEvent;

export class ClickableServer extends ServerBase<Clickable> {
	private readonly _clickQueue: QueuedPointerEvent[] = [];
	private _latestPointerMove: QueuedPointerEvent | null = null;
	private _hoveredNode: Clickable | null = null;
	private readonly _boundOnWindowClick: (event: MouseEvent) => void;
	private readonly _boundOnWindowMouseMove: (event: MouseEvent) => void;

	constructor(debugName = 'ClickableServer') {
		super(debugName);

		this._boundOnWindowClick = (event: MouseEvent) => {
			this.enqueueScreenClick(event.clientX, event.clientY);
		};

		this._boundOnWindowMouseMove = (event: MouseEvent) => {
			this.enqueueScreenMove(event.clientX, event.clientY);
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('click', this._boundOnWindowClick);
			window.addEventListener('mousemove', this._boundOnWindowMouseMove);
		}
	}

	get PendingClickCount(): number {
		return this._clickQueue.length;
	}

	get HoveredNode(): Clickable | null {
		return this._hoveredNode;
	}

	enqueueScreenClick(clientX: number, clientY: number): void {
		this._clickQueue.push({
			clientX,
			clientY,
			isWorldSpace: false,
		});
	}

	enqueueWorldClick(worldX: number, worldY: number): void {
		this._clickQueue.push({
			clientX: worldX,
			clientY: worldY,
			isWorldSpace: true,
		});
	}

	enqueueScreenMove(clientX: number, clientY: number): void {
		this._latestPointerMove = {
			clientX,
			clientY,
			isWorldSpace: false,
		};
	}

	enqueueWorldMove(worldX: number, worldY: number): void {
		this._latestPointerMove = {
			clientX: worldX,
			clientY: worldY,
			isWorldSpace: true,
		};
	}

	screenToWorld(clientX: number, clientY: number): Vector2 {
		const camera2DServer = SceneManager.Instance.getServer(Camera2DServer);
		const activeCamera = camera2DServer?.ActiveCamera ?? null;

		const viewportWidth =
			activeCamera?.Width ??
			(typeof window !== 'undefined' ? window.innerWidth : 800);
		const viewportHeight =
			activeCamera?.Height ??
			(typeof window !== 'undefined' ? window.innerHeight : 600);

		// Convert browser screen space (top-left origin, +Y down) to centered 2D camera view space (+Y up)
		const viewX = clientX - viewportWidth / 2;
		const viewY = viewportHeight / 2 - clientY;

		if (!activeCamera) {
			return { x: viewX, y: viewY };
		}

		const zoom = activeCamera.Zoom || 1;
		const localPoint = new THREE.Vector3(
			viewX / zoom,
			viewY / zoom,
			0
		).applyMatrix4(activeCamera.WorldMatrix);

		return {
			x: localPoint.x || 0,
			y: localPoint.y || 0,
		};
	}

	findTopMostNodeAt(worldPoint: Vector2): Clickable | null {
		let topMatch: Clickable | null = null;

		for (let i = this.Nodes.length - 1; i >= 0; i--) {
			const node = this.Nodes[i];
			if (!node.IsActive || !node.IsEnable) {
				continue;
			}

			if (node.containsPoint(worldPoint)) {
				if (!topMatch || node.ZIndex > topMatch.ZIndex) {
					topMatch = node;
				}
			}
		}

		return topMatch;
	}

	protected override _onNodeRemoved(node: Clickable): void {
		if (this._hoveredNode === node) {
			node.triggerHoverExit(node.Position);
			this._hoveredNode = null;
		}
	}

	protected override _update(_deltaTime: number): void {
		if (
			this._hoveredNode &&
			(!this._hoveredNode.IsActive || !this._hoveredNode.IsEnable)
		) {
			this._hoveredNode.triggerHoverExit(this._hoveredNode.Position);
			this._hoveredNode = null;
		}

		if (this._latestPointerMove) {
			const moveEvt = this._latestPointerMove;
			const worldPoint = moveEvt.isWorldSpace
				? { x: moveEvt.clientX, y: moveEvt.clientY }
				: this.screenToWorld(moveEvt.clientX, moveEvt.clientY);

			const nextHovered = this.findTopMostNodeAt(worldPoint);
			if (this._hoveredNode !== nextHovered) {
				if (this._hoveredNode) {
					this._hoveredNode.triggerHoverExit(worldPoint);
				}
				this._hoveredNode = nextHovered;
				if (this._hoveredNode) {
					this._hoveredNode.triggerHoverEnter(worldPoint);
				}
			}
		}

		if (this._clickQueue.length === 0) {
			return;
		}

		const events = this._clickQueue.splice(0, this._clickQueue.length);
		for (const evt of events) {
			const worldPoint = evt.isWorldSpace
				? { x: evt.clientX, y: evt.clientY }
				: this.screenToWorld(evt.clientX, evt.clientY);

			const hitNode = this.findTopMostNodeAt(worldPoint);
			if (hitNode) {
				hitNode.triggerClick(worldPoint);
			}
		}
	}

	dispose(): void {
		this._clickQueue.length = 0;
		this._latestPointerMove = null;
		this._hoveredNode = null;
		if (typeof window !== 'undefined') {
			window.removeEventListener('click', this._boundOnWindowClick);
			window.removeEventListener(
				'mousemove',
				this._boundOnWindowMouseMove
			);
		}
	}
}
export { ClickableServer as ClickableManager };
