import * as THREE from 'three';
import { ObjectBase } from '@/common';
import { SceneManager } from '@/scenes/scene-manager';
import { Camera2DServer, Texture2DServer } from '@/servers/2d';

export interface Renderer2DOptions {
	debugName?: string;
	width?: number;
	height?: number;
	antialias?: boolean;
	alpha?: boolean;
	overlay?: boolean;
	container?: HTMLElement | null;
	autoResize?: boolean;
	webGLRenderer?: THREE.WebGLRenderer;
}

export class Renderer2D extends ObjectBase {
	private static _instance: Renderer2D | null = null;

	private readonly _threeRenderer: THREE.WebGLRenderer;
	private _width: number;
	private _height: number;
	private readonly _autoResize: boolean;
	private readonly _boundOnWindowResize: () => void;

	private constructor(options: Renderer2DOptions | string = 'Renderer2D') {
		const opts: Renderer2DOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Renderer2D');

		const defaultWidth =
			typeof window !== 'undefined' ? window.innerWidth : 800;
		const defaultHeight =
			typeof window !== 'undefined' ? window.innerHeight : 600;

		this._width = opts.width ?? defaultWidth;
		this._height = opts.height ?? defaultHeight;
		this._autoResize = opts.autoResize ?? true;

		this._threeRenderer =
			opts.webGLRenderer ??
			new THREE.WebGLRenderer({
				antialias: opts.antialias ?? true,
				alpha: opts.alpha ?? true,
			});

		this._threeRenderer.setSize(this._width, this._height);
		this._threeRenderer.setClearColor(0x000000, 0);
		if (typeof window !== 'undefined' && window.devicePixelRatio) {
			this._threeRenderer.setPixelRatio(
				Math.min(window.devicePixelRatio, 2)
			);
		}

		const domElement = this._threeRenderer.domElement;
		if ((opts.overlay ?? true) && domElement && domElement.style) {
			domElement.style.position = 'fixed';
			domElement.style.top = '0';
			domElement.style.left = '0';
			domElement.style.pointerEvents = 'none';
			domElement.style.zIndex = '1';
		}

		const container =
			opts.container !== undefined
				? opts.container
				: typeof document !== 'undefined'
					? document.body
					: null;

		if (container && domElement) {
			container.appendChild(domElement);
		}

		this._boundOnWindowResize = () => {
			if (typeof window !== 'undefined') {
				this.resize(window.innerWidth, window.innerHeight);
			}
		};

		if (this._autoResize && typeof window !== 'undefined') {
			window.addEventListener('resize', this._boundOnWindowResize);
		}
	}

	static hasInstance(): boolean {
		return Renderer2D._instance !== null;
	}

	static get Instance(): Renderer2D {
		if (!Renderer2D._instance) {
			Renderer2D._instance = new Renderer2D();
		}
		return Renderer2D._instance;
	}

	static getInstance(options?: Renderer2DOptions | string): Renderer2D {
		if (!Renderer2D._instance) {
			Renderer2D._instance = new Renderer2D(options);
		}
		return Renderer2D._instance;
	}

	static resetInstance(options?: Renderer2DOptions | string): Renderer2D {
		if (Renderer2D._instance) {
			Renderer2D._instance.dispose();
		}
		Renderer2D._instance = new Renderer2D(options);
		return Renderer2D._instance;
	}

	get ThreeRenderer(): THREE.WebGLRenderer {
		return this._threeRenderer;
	}

	get DomElement(): HTMLCanvasElement {
		return this._threeRenderer.domElement;
	}

	get Width(): number {
		return this._width;
	}

	get Height(): number {
		return this._height;
	}

	resize(width: number, height: number): void {
		if (width <= 0 || height <= 0) {
			return;
		}
		this._width = width;
		this._height = height;
		this._threeRenderer.setSize(width, height);

		const camera2DServer = SceneManager.Instance.getServer(Camera2DServer);
		if (camera2DServer) {
			camera2DServer.setViewportSize(width, height);
		}

		this.onResize(width, height);
	}

	onResize(width: number, height: number): void {
		this._onResize(width, height);
	}
	protected _onResize(_width: number, _height: number): void {}

	render(): void {
		this._render();
	}

	update(): void {
		this._render();
	}

	protected _render(): void {
		const sceneManager = SceneManager.Instance;
		const camera2DServer = sceneManager.getServer(Camera2DServer);
		if (!camera2DServer) {
			return;
		}

		const activeCamera2D = camera2DServer.ActiveCamera;
		if (!activeCamera2D) {
			return;
		}

		const texture2DServer = sceneManager.getServer(Texture2DServer);
		if (!texture2DServer) {
			return;
		}

		this._threeRenderer.render(
			texture2DServer.ThreeScene,
			activeCamera2D.ThreeCamera
		);
	}

	dispose(): void {
		this._dispose();
		if (Renderer2D._instance === this) {
			Renderer2D._instance = null;
		}
	}

	protected _dispose(): void {
		if (this._autoResize && typeof window !== 'undefined') {
			window.removeEventListener('resize', this._boundOnWindowResize);
		}
		const domElement = this._threeRenderer.domElement;
		if (domElement && domElement.parentElement) {
			domElement.parentElement.removeChild(domElement);
		}
		this._threeRenderer.dispose();
	}
}
