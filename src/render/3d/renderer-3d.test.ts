import { describe, it, expect, beforeEach, vi } from 'vitest';
import type * as THREE from 'three';
import { Renderer3D } from './renderer-3d';
import { SceneManager } from '@/scenes/scene-manager';
import { Node3D } from '@/scenes/3d/node-3d';
import { Camera3D } from '@/scenes/3d/camera-3d';
import { Mesh } from '@/scenes/3d/mesh';
import { Light } from '@/scenes/3d/light';
import { Camera3DServer, MeshServer, LightServer } from '@/servers/3d';

function createMockWebGLRenderer(): THREE.WebGLRenderer {
	const domElement = {
		style: {},
		parentElement: null,
	} as unknown as HTMLCanvasElement;

	return {
		domElement,
		setSize: vi.fn(),
		setPixelRatio: vi.fn(),
		render: vi.fn(),
		dispose: vi.fn(),
	} as unknown as THREE.WebGLRenderer;
}

describe('Renderer3D', () => {
	let sceneManager: SceneManager;
	let root: Node3D;
	let mockWebGLRenderer: THREE.WebGLRenderer;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Camera3D, Camera3DServer);
		sceneManager.registerNode(Mesh, MeshServer);
		sceneManager.registerNode(Light, LightServer);

		root = new Node3D('Root');
		sceneManager.setRootNode(root);
		mockWebGLRenderer = createMockWebGLRenderer();
	});

	it('returns the same singleton instance and updates Camera3DServer aspect on resize', () => {
		const cam = new Camera3D({ aspect: 1 });
		root.addChild(cam);

		const renderer = Renderer3D.resetInstance({
			debugName: 'TestRenderer3D',
			width: 1024,
			height: 768,
			container: null,
			webGLRenderer: mockWebGLRenderer,
		});

		expect(Renderer3D.Instance).toBe(renderer);
		expect(Renderer3D.getInstance()).toBe(renderer);
		expect(renderer.DebugName).toBe('TestRenderer3D');
		expect(renderer.Width).toBe(1024);
		expect(renderer.Height).toBe(768);
		expect(mockWebGLRenderer.setSize).toHaveBeenCalledWith(1024, 768);

		renderer.resize(1920, 1080);
		expect(renderer.Width).toBe(1920);
		expect(renderer.Height).toBe(1080);
		expect(cam.Aspect).toBeCloseTo(1920 / 1080);

		renderer.dispose();
		expect(mockWebGLRenderer.dispose).toHaveBeenCalledTimes(1);
	});

	it('renders the MeshServer ThreeScene using the active Camera3D', () => {
		const cam = new Camera3D({ orbitControls: false });
		const mesh = new Mesh('/assets/cube.obj');
		const light = new Light({ type: 'ambient' });
		root.addChild(cam);
		root.addChild(mesh);
		root.addChild(light);

		const renderer = Renderer3D.resetInstance({
			container: null,
			webGLRenderer: mockWebGLRenderer,
		});

		renderer.render();

		const meshServer = sceneManager.getServer(MeshServer)!;
		expect(mockWebGLRenderer.render).toHaveBeenCalledWith(
			meshServer.ThreeScene,
			cam.ThreeCamera
		);
		renderer.dispose();
	});
});
