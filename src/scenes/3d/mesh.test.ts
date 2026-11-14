import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Mesh } from './mesh';
import { Node3D } from './node-3d';
import { MeshResource } from '@/resources/mesh-resource';
import { SceneManager } from '@/scenes/scene-manager';
import { MeshServer } from '@/servers/3d/mesh-server';
import { isResultSuccess, ResultStatus } from '@/types';

describe('Mesh & MeshResource & MeshServer', () => {
	let sceneManager: SceneManager;
	let root: Node3D;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Mesh, MeshServer);

		root = new Node3D('Root');
		sceneManager.setRootNode(root);
	});

	describe('MeshResource', () => {
		it('loads geometry from assets/cube.obj and unloads cleanly', async () => {
			const resource = new MeshResource('/assets/cube.obj');
			expect(resource.MeshFilePath).toBe('/assets/cube.obj');
			expect(resource.Geometry).toBeNull();

			const loadResult = await resource.Load();
			expect(isResultSuccess(loadResult)).toBe(true);
			expect(resource.IsLoaded()).toBe(true);
			expect(resource.Geometry).toBeInstanceOf(THREE.BufferGeometry);

			const posAttr = resource.Geometry!.getAttribute('position');
			expect(posAttr.count).toBeGreaterThan(0);

			const unloadResult = await resource.Unload();
			expect(isResultSuccess(unloadResult)).toBe(true);
			expect(resource.Geometry).toBeNull();
		});

		it('fails when meshFilePath is empty or does not exist', async () => {
			const emptyRes = new MeshResource('');
			const res1 = await emptyRes.Load();
			expect(res1.status).toBe(ResultStatus.FAILURE);

			const missingRes = new MeshResource('/assets/nonexistent.obj');
			const res2 = await missingRes.Load();
			expect(res2.status).toBe(ResultStatus.FAILURE);
		});
	});

	describe('Mesh component', () => {
		it('creates ThreeMesh with wireframe overlay and updates geometry when loaded', async () => {
			const mesh = new Mesh('/assets/cube.obj', {
				color: 0xff0000,
				wireframeOverlay: true,
			});

			expect(mesh.MeshFilePath).toBe('/assets/cube.obj');
			expect(mesh.ThreeMesh).toBeInstanceOf(THREE.Mesh);
			expect(mesh.WireframeOverlay).toBe(true);
			expect(mesh.ThreeMesh.children).toHaveLength(1);

			const result = await mesh.load();
			expect(isResultSuccess(result)).toBe(true);
			expect(mesh.ThreeMesh.geometry).toBe(mesh.Resource.Geometry);

			// Toggling wireframe overlay off removes child LineSegments
			mesh.WireframeOverlay = false;
			expect(mesh.ThreeMesh.children).toHaveLength(0);
		});

		it('synchronizes transform and visibility with Node3D hierarchy and Enable/Disable state', () => {
			const mesh = new Mesh('/assets/cube.obj');
			root.addChild(mesh);

			root.setPosition(5, 10, 15);
			mesh.setPosition(1, 2, 3);

			expect(mesh.ThreeMesh.position.x).toBeCloseTo(6);
			expect(mesh.ThreeMesh.position.y).toBeCloseTo(12);
			expect(mesh.ThreeMesh.position.z).toBeCloseTo(18);

			mesh.Disable();
			expect(mesh.ThreeMesh.visible).toBe(false);

			mesh.Enable();
			expect(mesh.ThreeMesh.visible).toBe(true);
		});
	});

	describe('MeshServer integration', () => {
		it('adds and removes Mesh.ThreeMesh from MeshServer.ThreeScene on scene activation/deactivation', () => {
			const meshServer = sceneManager.getServer(MeshServer)!;
			const mesh = new Mesh('/assets/cube.obj');

			root.addChild(mesh);
			expect(meshServer.Nodes).toContain(mesh);
			expect(meshServer.ThreeScene.children).toContain(mesh.ThreeMesh);

			root.removeChild(mesh);
			expect(meshServer.Nodes).not.toContain(mesh);
			expect(meshServer.ThreeScene.children).not.toContain(
				mesh.ThreeMesh
			);
		});
	});
});
