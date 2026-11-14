import * as THREE from 'three';
import { Node2D } from './node-2d';
import { Vector2 } from '@/types';

export type ClickCallback = (worldPosition: Vector2, node: Clickable) => void;
export type HoverCallback = (worldPosition: Vector2, node: Clickable) => void;

export interface ClickableOptions {
	debugName?: string;
	width?: number;
	height?: number;
	zIndex?: number;
	onClick?: ClickCallback;
	onHoverEnter?: HoverCallback;
	onHoverExit?: HoverCallback;
}

export class Clickable extends Node2D {
	private _width: number;
	private _height: number;
	private _zIndex: number;
	private _isHovered = false;
	private readonly _clickListeners = new Set<ClickCallback>();
	private readonly _hoverEnterListeners = new Set<HoverCallback>();
	private readonly _hoverExitListeners = new Set<HoverCallback>();

	constructor(options: ClickableOptions | string = 'Clickable') {
		const opts: ClickableOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Clickable');

		this._width = opts.width ?? 64;
		this._height = opts.height ?? 64;
		this._zIndex = opts.zIndex ?? 0;

		if (opts.onClick) {
			this._clickListeners.add(opts.onClick);
		}
		if (opts.onHoverEnter) {
			this._hoverEnterListeners.add(opts.onHoverEnter);
		}
		if (opts.onHoverExit) {
			this._hoverExitListeners.add(opts.onHoverExit);
		}
	}

	get Width(): number {
		return this._width;
	}

	set Width(value: number) {
		this.setSize(value, this._height);
	}

	get Height(): number {
		return this._height;
	}

	set Height(value: number) {
		this.setSize(this._width, value);
	}

	get ZIndex(): number {
		return this._zIndex;
	}

	set ZIndex(value: number) {
		this._zIndex = value;
	}

	get IsHovered(): boolean {
		return this._isHovered;
	}

	setSize(width: number, height: number): void {
		if (width <= 0 || height <= 0) {
			return;
		}
		this._width = width;
		this._height = height;
	}

	setOnClick(callback: ClickCallback | null): void {
		this._clickListeners.clear();
		if (callback) {
			this._clickListeners.add(callback);
		}
	}

	addClickListener(callback: ClickCallback): void {
		this._clickListeners.add(callback);
	}

	removeClickListener(callback: ClickCallback): void {
		this._clickListeners.delete(callback);
	}

	clearClickListeners(): void {
		this._clickListeners.clear();
	}

	setOnHoverEnter(callback: HoverCallback | null): void {
		this._hoverEnterListeners.clear();
		if (callback) {
			this._hoverEnterListeners.add(callback);
		}
	}

	addHoverEnterListener(callback: HoverCallback): void {
		this._hoverEnterListeners.add(callback);
	}

	removeHoverEnterListener(callback: HoverCallback): void {
		this._hoverEnterListeners.delete(callback);
	}

	clearHoverEnterListeners(): void {
		this._hoverEnterListeners.clear();
	}

	setOnHoverExit(callback: HoverCallback | null): void {
		this._hoverExitListeners.clear();
		if (callback) {
			this._hoverExitListeners.add(callback);
		}
	}

	addHoverExitListener(callback: HoverCallback): void {
		this._hoverExitListeners.add(callback);
	}

	removeHoverExitListener(callback: HoverCallback): void {
		this._hoverExitListeners.delete(callback);
	}

	clearHoverExitListeners(): void {
		this._hoverExitListeners.clear();
	}

	containsPoint(worldPoint: Vector2): boolean {
		const worldMatrix = this.WorldMatrix;
		if (worldMatrix.determinant() === 0) {
			return false;
		}

		const invMatrix = worldMatrix.clone().invert();
		const localPoint = new THREE.Vector3(
			worldPoint.x,
			worldPoint.y,
			0
		).applyMatrix4(invMatrix);

		const halfWidth = this._width / 2;
		const halfHeight = this._height / 2;

		return (
			localPoint.x >= -halfWidth &&
			localPoint.x <= halfWidth &&
			localPoint.y >= -halfHeight &&
			localPoint.y <= halfHeight
		);
	}

	triggerClick(worldPosition: Vector2 = this.Position): void {
		for (const listener of this._clickListeners) {
			listener(worldPosition, this);
		}
	}

	triggerHoverEnter(worldPosition: Vector2 = this.Position): void {
		if (this._isHovered) {
			return;
		}
		this._isHovered = true;
		for (const listener of this._hoverEnterListeners) {
			listener(worldPosition, this);
		}
	}

	triggerHoverExit(worldPosition: Vector2 = this.Position): void {
		if (!this._isHovered) {
			return;
		}
		this._isHovered = false;
		for (const listener of this._hoverExitListeners) {
			listener(worldPosition, this);
		}
	}

	protected override _onDisable(): void {
		if (this._isHovered) {
			this.triggerHoverExit(this.Position);
		}
	}

	protected override _onDeactivate(): void {
		if (this._isHovered) {
			this.triggerHoverExit(this.Position);
		}
	}
}
