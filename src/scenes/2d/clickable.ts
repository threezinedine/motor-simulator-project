import * as THREE from 'three';
import { Node2D } from './node-2d';
import { Vector2 } from '@/types';

export type ClickCallback = (worldPosition: Vector2, node: Clickable) => void;

export interface ClickableOptions {
	debugName?: string;
	width?: number;
	height?: number;
	zIndex?: number;
	onClick?: ClickCallback;
}

export class Clickable extends Node2D {
	private _width: number;
	private _height: number;
	private _zIndex: number;
	private readonly _listeners = new Set<ClickCallback>();

	constructor(options: ClickableOptions | string = 'Clickable') {
		const opts: ClickableOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Clickable');

		this._width = opts.width ?? 64;
		this._height = opts.height ?? 64;
		this._zIndex = opts.zIndex ?? 0;

		if (opts.onClick) {
			this._listeners.add(opts.onClick);
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

	setSize(width: number, height: number): void {
		if (width <= 0 || height <= 0) {
			return;
		}
		this._width = width;
		this._height = height;
	}

	setOnClick(callback: ClickCallback | null): void {
		this._listeners.clear();
		if (callback) {
			this._listeners.add(callback);
		}
	}

	addClickListener(callback: ClickCallback): void {
		this._listeners.add(callback);
	}

	removeClickListener(callback: ClickCallback): void {
		this._listeners.delete(callback);
	}

	clearClickListeners(): void {
		this._listeners.clear();
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
		for (const listener of this._listeners) {
			listener(worldPosition, this);
		}
	}
}
