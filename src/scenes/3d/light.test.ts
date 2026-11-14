import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Light } from './light';
import { Node3D } from './node-3d';
import { Mesh } from './mesh';
import { SceneManager } from '@/scenes/scene-manager';
import { LightServer } from '@/servers/3d/light-server';
import { MeshServer } from '@/servers/3d/mesh-server';

describe('Light & LightServer', () => {
	let sceneManager: SceneManager;
	let root: Node3D;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerNode(Mesh, MeshServer);
		sceneManager.registerNode(Light, LightServer);

		root = new Node3D('Root');
		sceneManager.setRootNode(root);
	});

	describe('Light component', () => {
		it('initializes with default directional light and supports type switching', () => {
			const light = new Light('DefaultLight');
			expect(light.DebugName).toBe('DefaultLight');
			expect(light.Type).toBe('directional');
			expect(light.Color).toBe(0xffffff);
			expect(light.Intensity).toBe(1);
			expect(light.ThreeLight).toBeInstanceOf(THREE.DirectionalLight);

			light.Type = 'ambient';
			expect(light.Type).toBe('ambient');
			expect(light.ThreeLight).toBeInstanceOf(THREE.AmbientLight);

			light.Type = 'point';
			expect(light.Type).toBe('point');
			expect(light.ThreeLight).toBeInstanceOf(THREE.PointLight);

			light.Type = 'spot';
			expect(light.Type).toBe('spot');
			expect(light.ThreeLight).toBeInstanceOf(THREE.SpotLight);
		});

		it('updates color, intensity, distance, decay, angle, penumbra, and castShadow', () => {
			const light = new Light({
				debugName: 'SpotLight',
				type: 'spot',
				color: 0xff0000,
				intensity: 2,
				distance: 50,
				decay: 1.5,
				angle: Math.PI / 4,
				penumbra: 0.5,
				castShadow: true,
			});

			const spot = light.ThreeLight as THREE.SpotLight;
			expect(spot.color.getHex()).toBe(0xff0000);
			expect(spot.intensity).toBe(2);
			expect(spot.distance).toBe(50);
			expect(spot.decay).toBe(1.5);
			expect(spot.angle).toBeCloseTo(Math.PI / 4);
			expect(spot.penumbra).toBeCloseTo(0.5);
			expect(spot.castShadow).toBe(true);

			light.Color = 0x00ff00;
			light.Intensity = 0.8;
			light.Distance = 100;
			light.Decay = 1;
			light.Angle = Math.PI / 6;
			light.Penumbra = 0.25;
			light.CastShadow = false;

			expect(spot.color.getHex()).toBe(0x00ff00);
			expect(spot.intensity).toBe(0.8);
			expect(spot.distance).toBe(100);
			expect(spot.decay).toBe(1);
			expect(spot.angle).toBeCloseTo(Math.PI / 6);
			expect(spot.penumbra).toBeCloseTo(0.25);
			expect(spot.castShadow).toBe(false);
		});

		it('synchronizes transform and visibility with Node3D hierarchy and Enable/Disable state', () => {
			const light = new Light({
				type: 'directional',
				intensity: 1.2,
			});
			root.addChild(light);

			root.setPosition(2, 3, 4);
			light.setPosition(5, 5, 5);

			expect(light.ThreeLight.position.x).toBeCloseTo(7);
			expect(light.ThreeLight.position.y).toBeCloseTo(8);
			expect(light.ThreeLight.position.z).toBeCloseTo(9);

			light.Disable();
			expect(light.ThreeLight.visible).toBe(false);

			light.Enable();
			expect(light.ThreeLight.visible).toBe(true);
		});
	});

	describe('LightServer integration', () => {
		it('adds and removes Light.ThreeLight from shared ThreeScene on activation/deactivation', () => {
			const lightServer = sceneManager.getServer(LightServer)!;
			const meshServer = sceneManager.getServer(MeshServer)!;
			expect(lightServer.ThreeScene).toBe(meshServer.ThreeScene);

			const ambient = new Light({ type: 'ambient', intensity: 0.6 });
			const directional = new Light({
				type: 'directional',
				intensity: 1.2,
			});

			root.addChild(ambient);
			root.addChild(directional);

			expect(lightServer.Nodes).toHaveLength(2);
			expect(meshServer.ThreeScene.children).toContain(
				ambient.ThreeLight
			);
			expect(meshServer.ThreeScene.children).toContain(
				directional.ThreeLight
			);

			// Changing light type while active replaces ThreeLight in the scene
			const oldDirectionalThreeLight = directional.ThreeLight;
			directional.Type = 'point';
			expect(meshServer.ThreeScene.children).not.toContain(
				oldDirectionalThreeLight
			);
			expect(meshServer.ThreeScene.children).toContain(
				directional.ThreeLight
			);

			root.removeChild(ambient);
			expect(lightServer.Nodes).toHaveLength(1);
			expect(meshServer.ThreeScene.children).not.toContain(
				ambient.ThreeLight
			);
		});
	});
});
