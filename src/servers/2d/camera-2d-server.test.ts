import { describe, it, expect, beforeEach } from 'vitest';
import { SceneManager } from '@/scenes/scene-manager';
import { NodeBase } from '@/scenes/node-base';
import { Node2D } from '@/scenes/2d/node-2d';
import { Camera2D } from '@/scenes/2d/camera-2d';
import { Camera2DServer } from './camera-2d-server';

describe('Camera2DServer', () => {
	let sceneManager: SceneManager;
	let server: Camera2DServer;
	let root: Node2D;
	let cam1: Camera2D;
	let cam2: Camera2D;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Camera2D, Camera2DServer);

		root = new Node2D('Root2D');
		sceneManager.setRootNode(root);

		server = sceneManager.getServer(Camera2DServer)!;
		cam1 = new Camera2D('MainCamera2D');
		cam2 = new Camera2D('SecondaryCamera2D');
	});

	describe('active camera management', () => {
		it('auto-selects the first added active camera and falls back when removed or disabled', () => {
			expect(server.ActiveCamera).toBeNull();

			root.addChild(cam1);
			root.addChild(cam2);
			expect(server.ActiveCamera).toBe(cam1);

			cam1.Disable();
			expect(server.ActiveCamera).toBe(cam2);

			cam1.Enable();
			expect(server.ActiveCamera).toBe(cam1);

			root.removeChild(cam1);
			expect(server.ActiveCamera).toBe(cam2);
		});

		it('allows explicitly switching the active camera via setActiveCamera', () => {
			root.addChild(cam1);
			root.addChild(cam2);

			expect(server.setActiveCamera(cam2)).toBe(true);
			expect(server.ActiveCamera).toBe(cam2);

			const orphanCam = new Camera2D('Orphan2D');
			expect(server.setActiveCamera(orphanCam)).toBe(false);
			expect(server.ActiveCamera).toBe(cam2);
		});

		it('updates viewport size across all registered cameras via setViewportSize', () => {
			root.addChild(cam1);
			root.addChild(cam2);

			server.setViewportSize(1920, 1080);

			expect(cam1.Width).toBe(1920);
			expect(cam1.Height).toBe(1080);
			expect(cam2.Width).toBe(1920);
			expect(cam2.Height).toBe(1080);
		});
	});

	describe('getCapturedNodes (scene tree capture)', () => {
		it('captures all nodes in the active root tree, including nodes nested under other cameras', () => {
			const spriteNode = new Node2D('Sprite');
			const uiUnderCam1 = new Node2D('UIUnderCam1');
			const markerUnderCam2 = new Node2D('MarkerUnderCam2');
			const deepNodeUnderCam2 = new NodeBase('DeepLogic');

			root.addChild(spriteNode);
			root.addChild(cam1);
			root.addChild(cam2);

			cam1.addChild(uiUnderCam1);
			cam2.addChild(markerUnderCam2);
			markerUnderCam2.addChild(deepNodeUnderCam2);

			const capturedByCam1 = server.getCapturedNodes(cam1);

			expect(capturedByCam1).toEqual([
				root,
				spriteNode,
				cam1,
				uiUnderCam1,
				cam2,
				markerUnderCam2,
				deepNodeUnderCam2,
			]);

			expect(server.getCapturedNodes(cam2)).toEqual(capturedByCam1);
		});

		it('returns an empty array when the camera is inactive or disabled', () => {
			const orphanBranch = new Node2D('OrphanBranch');
			orphanBranch.addChild(cam1);

			expect(server.getCapturedNodes(cam1)).toEqual([]);

			root.addChild(orphanBranch);
			expect(server.getCapturedNodes(cam1)).toContain(cam1);

			cam1.Disable();
			expect(server.getCapturedNodes(cam1)).toEqual([]);
		});
	});
});
