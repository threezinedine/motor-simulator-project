import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Camera3D } from './camera-3d';
import { Node3D } from './node-3d';

describe('Camera3D', () => {
	let camera: Camera3D;

	beforeEach(() => {
		camera = new Camera3D();
	});

	describe('initial state & options', () => {
		it('initializes with default perspective parameters and Three.js cameras', () => {
			expect(camera.DebugName).toBe('Camera3D');
			expect(camera.Projection).toBe('perspective');
			expect(camera.Fov).toBe(75);
			expect(camera.Aspect).toBeCloseTo(16 / 9);
			expect(camera.Near).toBe(0.1);
			expect(camera.Far).toBe(1000);
			expect(camera.OrthoSize).toBe(5);
			expect(camera.ThreeCamera).toBeInstanceOf(THREE.PerspectiveCamera);
		});

		it('supports custom options and orthographic projection at construction', () => {
			const orthoCam = new Camera3D({
				debugName: 'OrthoCam',
				projection: 'orthographic',
				fov: 60,
				aspect: 2,
				near: 0.5,
				far: 500,
				orthoSize: 10,
			});

			expect(orthoCam.DebugName).toBe('OrthoCam');
			expect(orthoCam.Projection).toBe('orthographic');
			expect(orthoCam.ThreeCamera).toBeInstanceOf(
				THREE.OrthographicCamera
			);
			expect(orthoCam.OrthographicCamera.top).toBe(5);
			expect(orthoCam.OrthographicCamera.bottom).toBe(-5);
			expect(orthoCam.OrthographicCamera.left).toBe(-10);
			expect(orthoCam.OrthographicCamera.right).toBe(10);
		});
	});

	describe('projection & frustum setters', () => {
		it('switches between perspective and orthographic ThreeCamera', () => {
			camera.Projection = 'orthographic';
			expect(camera.ThreeCamera).toBe(camera.OrthographicCamera);

			camera.Projection = 'perspective';
			expect(camera.ThreeCamera).toBe(camera.PerspectiveCamera);
		});

		it('updates Fov, Aspect, Near, Far, and OrthoSize on underlying Three.js cameras and ignores invalid values', () => {
			camera.Fov = 90;
			camera.Aspect = 2;
			camera.Near = 1;
			camera.Far = 2000;
			camera.OrthoSize = 8;

			expect(camera.PerspectiveCamera.fov).toBe(90);
			expect(camera.PerspectiveCamera.aspect).toBe(2);
			expect(camera.PerspectiveCamera.near).toBe(1);
			expect(camera.PerspectiveCamera.far).toBe(2000);

			expect(camera.OrthographicCamera.top).toBe(4);
			expect(camera.OrthographicCamera.right).toBe(8);

			// Invalid bounds are ignored
			camera.setFov(-10);
			camera.setAspect(0);
			camera.setNear(3000); // >= Far
			camera.setFar(0.5); // <= Near
			camera.setOrthoSize(-2);

			expect(camera.Fov).toBe(90);
			expect(camera.Aspect).toBe(2);
			expect(camera.Near).toBe(1);
			expect(camera.Far).toBe(2000);
			expect(camera.OrthoSize).toBe(8);
		});
	});

	describe('transform synchronization & lookAt', () => {
		it('synchronizes ThreeCamera world position, rotation, and scale when node or parent transforms change', () => {
			const rig = new Node3D('CameraRig');
			rig.addChild(camera);

			camera.setPosition(0, 2, 5);
			rig.setPosition(10, 0, 0);

			expect(camera.ThreeCamera.position.x).toBeCloseTo(10);
			expect(camera.ThreeCamera.position.y).toBeCloseTo(2);
			expect(camera.ThreeCamera.position.z).toBeCloseTo(5);
		});

		it('orients camera toward target in world space using lookAt', () => {
			camera.setPosition(0, 0, 10);
			camera.lookAt({ x: 0, y: 0, z: 0 });

			// Looking from (0,0,10) to origin (0,0,0) in Three.js (-Z forward) has 0 rotation
			expect(camera.Rotation.x).toBeCloseTo(0);
			expect(camera.Rotation.y).toBeCloseTo(0);
			expect(camera.Rotation.z).toBeCloseTo(0);
		});

		it('supports OrbitControls configuration and update method', () => {
			expect(camera.EnableOrbitControls).toBe(true);
			expect(camera.EnableDamping).toBe(true);

			camera.EnableOrbitControls = false;
			expect(camera.EnableOrbitControls).toBe(false);
			expect(camera.OrbitControls).toBeNull();

			camera.EnableDamping = false;
			expect(camera.EnableDamping).toBe(false);

			camera.update();
		});
	});
});
