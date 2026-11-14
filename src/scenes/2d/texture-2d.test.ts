import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Texture2D } from './texture-2d';
import { Node2D } from './node-2d';
import { SceneManager } from '@/scenes/scene-manager';
import { Texture2DServer } from '@/servers/2d/texture-2d-server';
import { isResultSuccess } from '@/types';

describe('Texture2D & Texture2DServer', () => {
	let sceneManager: SceneManager;
	let root: Node2D;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Texture2D, Texture2DServer);

		root = new Node2D('Root2D');
		sceneManager.setRootNode(root);
	});

	describe('Texture2D component', () => {
		it('loads image resource and updates material map and dimensions', async () => {
			const texNode = new Texture2D('/assets/sample.png');
			expect(texNode.ImageFilePath).toBe('/assets/sample.png');
			expect(texNode.ThreeMesh).toBeInstanceOf(THREE.Mesh);

			const loadResult = await texNode.load();
			expect(isResultSuccess(loadResult)).toBe(true);
			expect(texNode.Width).toBe(64);
			expect(texNode.Height).toBe(64);
			expect(texNode.Material.map).toBe(texNode.Resource.Texture);

			texNode.setSize(128, 96);
			expect(texNode.Width).toBe(128);
			expect(texNode.Height).toBe(96);

			const unloadResult = await texNode.unload();
			expect(isResultSuccess(unloadResult)).toBe(true);
			expect(texNode.Material.map).toBeNull();
		});

		it('synchronizes 2D transform and visibility with Node2D hierarchy and Enable/Disable state', () => {
			const texNode = new Texture2D('/assets/sample.png');
			root.addChild(texNode);

			root.setPosition(100, 200);
			texNode.setPosition(25, -50);
			texNode.setRotation(Math.PI / 4);

			expect(texNode.ThreeMesh.position.x).toBeCloseTo(125);
			expect(texNode.ThreeMesh.position.y).toBeCloseTo(150);
			expect(texNode.ThreeMesh.rotation.z).toBeCloseTo(Math.PI / 4);

			texNode.Disable();
			expect(texNode.ThreeMesh.visible).toBe(false);

			texNode.Enable();
			expect(texNode.ThreeMesh.visible).toBe(true);
		});
	});

	describe('Texture2DServer integration', () => {
		it('adds and removes Texture2D.ThreeMesh from Texture2DServer.ThreeScene on activation/deactivation', () => {
			const textureServer = sceneManager.getServer(Texture2DServer)!;
			const texNode = new Texture2D('/assets/sample.png');

			root.addChild(texNode);
			expect(textureServer.Nodes).toContain(texNode);
			expect(textureServer.ThreeScene.children).toContain(
				texNode.ThreeMesh
			);

			root.removeChild(texNode);
			expect(textureServer.Nodes).not.toContain(texNode);
			expect(textureServer.ThreeScene.children).not.toContain(
				texNode.ThreeMesh
			);
		});
	});
});
