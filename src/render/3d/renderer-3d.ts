import * as THREE from 'three';
import { ObjectBase } from '@/common';
import { SceneManager } from '@/scenes/scene-manager';
import { Camera3DServer, LightServer, MeshServer } from '@/servers/3d';

export interface Renderer3DOptions {
	debugName?: string;
	width?: number;
	height?: number;
	antialias?: boolean;
	alpha?: boolean;
	container?: HTMLElement | null;
	autoResize?: boolean;
	webGLRenderer?: THREE.WebGLRenderer;
}

export class Renderer3D extends ObjectBase {
	private static _instance: Renderer3D | null = null;

	private readonly _threeRenderer: THREE.WebGLRenderer;
	private _width: number;
	private _height: number;
	private readonly _autoResize: boolean;
	private readonly _boundOnWindowResize: () => void;

	private constructor(options: Renderer3DOptions | string = 'Renderer3D') {
		const opts: Renderer3DOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Renderer3D');

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
				alpha: opts.alpha ?? false,
			});

		this._threeRenderer.setSize(this._width, this._height);
		if (typeof window !== 'undefined' && window.devicePixelRatio) {
			this._threeRenderer.setPixelRatio(
				Math.min(window.devicePixelRatio, 2)
			);
		}

		const container =
			opts.container !== undefined
				? opts.container
				: typeof document !== 'undefined'
					? document.body
					: null;

		if (container && this._threeRenderer.domElement) {
			container.appendChild(this._threeRenderer.domElement);
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
		return Renderer3D._instance !== null;
	}

	static get Instance(): Renderer3D {
		if (!Renderer3D._instance) {
			Renderer3D._instance = new Renderer3D();
		}
		return Renderer3D._instance;
	}

	static getInstance(options?: Renderer3DOptions | string): Renderer3D {
		if (!Renderer3D._instance) {
			Renderer3D._instance = new Renderer3D(options);
		}
		return Renderer3D._instance;
	}

	static resetInstance(options?: Renderer3DOptions | string): Renderer3D {
		if (Renderer3D._instance) {
			Renderer3D._instance.dispose();
		}
		Renderer3D._instance = new Renderer3D(options);
		return Renderer3D._instance;
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

		const cameraServer = SceneManager.Instance.getServer(Camera3DServer);
		if (cameraServer) {
			cameraServer.setAspect(width / height);
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
		const cameraServer = sceneManager.getServer(Camera3DServer);
		if (!cameraServer) {
			return;
		}

		const activeCamera = cameraServer.ActiveCamera;
		if (!activeCamera) {
			return;
		}

		const meshServer = sceneManager.getServer(MeshServer);
		const lightServer = sceneManager.getServer(LightServer);
		const threeScene = meshServer?.ThreeScene ?? lightServer?.ThreeScene;
		if (!threeScene) {
			return;
		}

		this._threeRenderer.render(threeScene, activeCamera.ThreeCamera);
	}

	dispose(): void {
		this._dispose();
		if (Renderer3D._instance === this) {
			Renderer3D._instance = null;
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
