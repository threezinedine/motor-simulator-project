import { describe, it, expect, beforeEach } from 'vitest';
import { SceneManager } from '@/scenes/scene-manager';
import { NodeBase } from '@/scenes/node-base';
import { Node3D } from '@/scenes/3d/node-3d';
import { Camera3D } from '@/scenes/3d/camera-3d';
import { Mesh } from '@/scenes/3d/mesh';
import { Camera3DServer } from './camera-3d-server';

describe('Camera3DServer', () => {
	let sceneManager: SceneManager;
	let server: Camera3DServer;
	let root: Node3D;
	let cam1: Camera3D;
	let cam2: Camera3D;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Camera3D, Camera3DServer);

		root = new Node3D('Root');
		sceneManager.setRootNode(root);

		server = sceneManager.getServer(Camera3DServer)!;
		cam1 = new Camera3D('MainCamera');
		cam2 = new Camera3D('SecondaryCamera');
	});

	describe('active camera management', () => {
		it('auto-selects the first added active camera and falls back when removed or disabled', () => {
			expect(server.ActiveCamera).toBeNull();

			root.addChild(cam1);
			root.addChild(cam2);
			expect(server.ActiveCamera).toBe(cam1);

			// Disabling cam1 falls back to cam2
			cam1.Disable();
			expect(server.ActiveCamera).toBe(cam2);

			cam1.Enable();
			expect(server.ActiveCamera).toBe(cam1);

			// Removing cam1 promotes cam2
			root.removeChild(cam1);
			expect(server.ActiveCamera).toBe(cam2);
		});

		it('allows explicitly switching the active camera via setActiveCamera', () => {
			root.addChild(cam1);
			root.addChild(cam2);

			expect(server.setActiveCamera(cam2)).toBe(true);
			expect(server.ActiveCamera).toBe(cam2);

			// Unregistered/inactive camera cannot be set as active
			const orphanCam = new Camera3D('Orphan');
			expect(server.setActiveCamera(orphanCam)).toBe(false);
			expect(server.ActiveCamera).toBe(cam2);
		});

		it('updates aspect ratio across all registered cameras via setAspect', () => {
			root.addChild(cam1);
			root.addChild(cam2);

			server.setAspect(21 / 9);

			expect(cam1.Aspect).toBeCloseTo(21 / 9);
			expect(cam2.Aspect).toBeCloseTo(21 / 9);
		});
	});

	describe('getCapturedNodes (scene tree capture)', () => {
		it('captures all nodes in the active root tree, including nodes nested under other cameras', () => {
			const worldMesh = new Mesh('world.glb');
			const hudNodeUnderCam1 = new Node3D('Cam1Attachment');
			const weaponUnderCam2 = new Mesh('weapon.glb');
			const deepChildUnderCam2 = new NodeBase('DeepSocket');

			root.addChild(worldMesh);
			root.addChild(cam1);
			root.addChild(cam2);

			cam1.addChild(hudNodeUnderCam1);
			cam2.addChild(weaponUnderCam2);
			weaponUnderCam2.addChild(deepChildUnderCam2);

			const capturedByCam1 = server.getCapturedNodes(cam1);

			expect(capturedByCam1).toEqual([
				root,
				worldMesh,
				cam1,
				hudNodeUnderCam1,
				cam2,
				weaponUnderCam2,
				deepChildUnderCam2,
			]);

			// Cam2 is also in the same root tree and captures the exact same full tree
			expect(server.getCapturedNodes(cam2)).toEqual(capturedByCam1);
		});

		it('returns an empty array when the camera is inactive (not in root tree) or disabled', () => {
			const orphanBranch = new Node3D('OrphanBranch');
			const orphanChild = new Node3D('OrphanChild');
			orphanBranch.addChild(cam1);
			cam1.addChild(orphanChild);

			// cam1 is not under an active root node
			expect(cam1.IsActive).toBe(false);
			expect(server.getCapturedNodes(cam1)).toEqual([]);

			// Attach to active root -> now captures everything
			root.addChild(orphanBranch);
			expect(server.getCapturedNodes(cam1)).toContain(orphanChild);

			// Disable cam1 -> captures nothing while disabled
			cam1.Disable();
			expect(server.getCapturedNodes(cam1)).toEqual([]);
		});
	});
});
