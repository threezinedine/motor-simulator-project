import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Node2D } from './node-2d';
import { Camera2D } from './camera-2d';

describe('Node2D & Camera2D', () => {
	let camera: Camera2D;

	beforeEach(() => {
		camera = new Camera2D();
	});

	describe('initial state & options', () => {
		it('initializes with default 2D orthographic frustum (800x600, zoom 1)', () => {
			expect(camera.DebugName).toBe('Camera2D');
			expect(camera.Width).toBe(800);
			expect(camera.Height).toBe(600);
			expect(camera.Zoom).toBe(1);
			expect(camera.Near).toBe(-1000);
			expect(camera.Far).toBe(1000);
			expect(camera.ThreeCamera).toBeInstanceOf(THREE.OrthographicCamera);
			expect(camera.OrthographicCamera.left).toBe(-400);
			expect(camera.OrthographicCamera.right).toBe(400);
			expect(camera.OrthographicCamera.top).toBe(300);
			expect(camera.OrthographicCamera.bottom).toBe(-300);
		});

		it('supports custom viewport size and zoom options at construction', () => {
			const customCam = new Camera2D({
				debugName: 'MinimapCam',
				width: 400,
				height: 200,
				zoom: 2,
				near: -500,
				far: 500,
			});

			expect(customCam.DebugName).toBe('MinimapCam');
			expect(customCam.OrthographicCamera.left).toBe(-100);
			expect(customCam.OrthographicCamera.right).toBe(100);
			expect(customCam.OrthographicCamera.top).toBe(50);
			expect(customCam.OrthographicCamera.bottom).toBe(-50);
		});
	});

	describe('viewport, zoom & clipping setters', () => {
		it('updates Width, Height, Zoom, Near, and Far and ignores invalid bounds', () => {
			camera.Width = 1000;
			camera.Height = 500;
			camera.Zoom = 2;
			camera.Near = -200;
			camera.Far = 200;

			expect(camera.OrthographicCamera.left).toBe(-250);
			expect(camera.OrthographicCamera.right).toBe(250);
			expect(camera.OrthographicCamera.top).toBe(125);
			expect(camera.OrthographicCamera.bottom).toBe(-125);
			expect(camera.OrthographicCamera.near).toBe(-200);
			expect(camera.OrthographicCamera.far).toBe(200);

			// Invalid bounds are ignored
			camera.setViewportSize(-100, 500);
			camera.setZoom(0);
			camera.setNear(500); // >= Far
			camera.setFar(-500); // <= Near

			expect(camera.Width).toBe(1000);
			expect(camera.Zoom).toBe(2);
			expect(camera.Near).toBe(-200);
			expect(camera.Far).toBe(200);
		});
	});

	describe('2D transform synchronization', () => {
		it('synchronizes ThreeCamera position, Z-rotation, and scale with Node2D hierarchy', () => {
			const parent2D = new Node2D('Rig2D');
			parent2D.addChild(camera);

			camera.setPosition(10, 20);
			camera.setRotation(Math.PI / 4);
			parent2D.setPosition(100, 200);

			expect(camera.Position).toEqual({ x: 110, y: 220 });
			expect(camera.ThreeCamera.position.x).toBeCloseTo(110);
			expect(camera.ThreeCamera.position.y).toBeCloseTo(220);
			expect(camera.ThreeCamera.rotation.z).toBeCloseTo(Math.PI / 4);
		});
	});
});
