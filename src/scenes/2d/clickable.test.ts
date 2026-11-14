import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Clickable } from './clickable';
import { Node2D } from './node-2d';
import { Camera2D } from './camera-2d';
import { SceneManager } from '@/scenes/scene-manager';
import { Camera2DServer, ClickableServer } from '@/servers/2d';

describe('Clickable & ClickableServer', () => {
	let sceneManager: SceneManager;
	let root: Node2D;

	beforeEach(() => {
		sceneManager = SceneManager.Instance;
		sceneManager.clear();
		sceneManager.registerServer(Camera2DServer);
		sceneManager.registerServer(ClickableServer);
		sceneManager.registerNode(Camera2D, Camera2DServer);
		sceneManager.registerNode(Clickable, ClickableServer);

		root = new Node2D('Root2D');
		sceneManager.setRootNode(root);
	});

	describe('Clickable component', () => {
		it('checks point containment accounting for position, rotation, and scale', () => {
			const clickable = new Clickable({
				debugName: 'Button',
				width: 100,
				height: 50,
			});
			root.addChild(clickable);

			clickable.setPosition(200, 100);
			expect(clickable.containsPoint({ x: 200, y: 100 })).toBe(true);
			expect(clickable.containsPoint({ x: 250, y: 125 })).toBe(true);
			expect(clickable.containsPoint({ x: 251, y: 100 })).toBe(false);

			// Scale 2x -> effective bounds become 200x100 around (200, 100)
			clickable.setScale(2, 2);
			expect(clickable.containsPoint({ x: 295, y: 145 })).toBe(true);
			expect(clickable.containsPoint({ x: 305, y: 100 })).toBe(false);
		});

		it('registers, removes, and invokes click listeners', () => {
			const cb1 = vi.fn();
			const cb2 = vi.fn();
			const clickable = new Clickable({ onClick: cb1 });

			clickable.addClickListener(cb2);
			clickable.triggerClick({ x: 10, y: 20 });

			expect(cb1).toHaveBeenCalledWith({ x: 10, y: 20 }, clickable);
			expect(cb2).toHaveBeenCalledWith({ x: 10, y: 20 }, clickable);

			clickable.removeClickListener(cb1);
			clickable.triggerClick({ x: 5, y: 5 });
			expect(cb1).toHaveBeenCalledTimes(1);
			expect(cb2).toHaveBeenCalledTimes(2);
		});
	});

	describe('ClickableServer update & top-most dispatch', () => {
		it('converts screen click coordinates to 2D world coordinates using ActiveCamera and triggers only the top-most Clickable', () => {
			const cam2D = new Camera2D({ width: 800, height: 600 });
			root.addChild(cam2D);

			const bottomSpy = vi.fn();
			const topSpy = vi.fn();

			const bottomButton = new Clickable({
				debugName: 'BottomButton',
				width: 100,
				height: 100,
				zIndex: 0,
				onClick: bottomSpy,
			});
			const topButton = new Clickable({
				debugName: 'TopButton',
				width: 100,
				height: 100,
				zIndex: 1,
				onClick: topSpy,
			});

			root.addChild(bottomButton);
			root.addChild(topButton);

			const clickableServer = sceneManager.getServer(ClickableServer)!;

			// Screen center (400, 300) maps to 2D world origin (0, 0)
			clickableServer.enqueueScreenClick(400, 300);
			expect(clickableServer.PendingClickCount).toBe(1);

			sceneManager.update();
			expect(clickableServer.PendingClickCount).toBe(0);
			expect(topSpy).toHaveBeenCalledTimes(1);
			expect(bottomSpy).not.toHaveBeenCalled();

			// Disabling topButton allows bottomButton to receive the next click
			topButton.Disable();
			clickableServer.enqueueScreenClick(400, 300);
			sceneManager.update();
			expect(bottomSpy).toHaveBeenCalledTimes(1);
		});
	});
});
