import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as THREE from 'three';
import { Renderer2D } from './renderer-2d';
import { SceneManager } from '@/scenes/scene-manager';
import { Node2D } from '@/scenes/2d/node-2d';
import { Camera2D } from '@/scenes/2d/camera-2d';
import { Texture2D } from '@/scenes/2d/texture-2d';
import { Camera2DServer, Texture2DServer } from '@/servers/2d';

function createMockWebGLRenderer(): THREE.WebGLRenderer {
	const domElement = {
		style: {},
		parentElement: null,
	} as unknown as HTMLCanvasElement;

	return {
		domElement,
		setSize: vi.fn(),
		setClearColor: vi.fn(),
		setPixelRatio: vi.fn(),
		render: vi.fn(),
		dispose: vi.fn(),
	} as unknown as THREE.WebGLRenderer;
}

describe('Renderer2D', () => {
	let sceneManager: SceneManager;
	let root: Node2D;
	let mockWebGLRenderer: THREE.WebGLRenderer;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Camera2D, Camera2DServer);
		sceneManager.registerNode(Texture2D, Texture2DServer);

		root = new Node2D('Root2D');
		sceneManager.setRootNode(root);
		mockWebGLRenderer = createMockWebGLRenderer();
	});

	it('returns the same singleton instance, initializes overlay canvas styles, and updates Camera2DServer viewport size on resize', () => {
		const cam2D = new Camera2D({ width: 800, height: 600 });
		root.addChild(cam2D);

		const renderer = Renderer2D.resetInstance({
			debugName: 'TestRenderer2D',
			width: 800,
			height: 600,
			container: null,
			webGLRenderer: mockWebGLRenderer,
		});

		expect(Renderer2D.Instance).toBe(renderer);
		expect(Renderer2D.getInstance()).toBe(renderer);
		expect(renderer.DebugName).toBe('TestRenderer2D');
		expect(renderer.DomElement.style.pointerEvents).toBe('none');
		expect(renderer.DomElement.style.position).toBe('fixed');

		renderer.resize(1280, 720);
		expect(renderer.Width).toBe(1280);
		expect(renderer.Height).toBe(720);
		expect(cam2D.Width).toBe(1280);
		expect(cam2D.Height).toBe(720);

		renderer.dispose();
		expect(mockWebGLRenderer.dispose).toHaveBeenCalledTimes(1);
	});

	it('renders the Texture2DServer ThreeScene using the active Camera2D', () => {
		const cam2D = new Camera2D();
		const tex = new Texture2D('/assets/sample.png');
		root.addChild(cam2D);
		root.addChild(tex);

		const renderer = Renderer2D.resetInstance({
			container: null,
			webGLRenderer: mockWebGLRenderer,
		});

		renderer.render();

		const texture2DServer = sceneManager.getServer(Texture2DServer)!;
		expect(mockWebGLRenderer.render).toHaveBeenCalledWith(
			texture2DServer.ThreeScene,
			cam2D.ThreeCamera
		);
		renderer.dispose();
	});
});
