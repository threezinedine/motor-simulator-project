import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ImageResource } from './image-resource';
import { isResultSuccess, ResultStatus } from '@/types';

describe('ImageResource', () => {
	it('initializes in unloaded state with null Texture and zero dimensions', () => {
		const res = new ImageResource('/assets/sample.png');

		expect(res.ImageFilePath).toBe('/assets/sample.png');
		expect(res.IsUnloaded()).toBe(true);
		expect(res.Texture).toBeNull();
		expect(res.Width).toBe(0);
		expect(res.Height).toBe(0);
	});

	it('loads a PNG image into a Three.js Texture with dimensions and unloads cleanly', async () => {
		const res = new ImageResource('/assets/sample.png');

		const loadResult = await res.Load();
		expect(isResultSuccess(loadResult)).toBe(true);
		expect(res.IsLoaded()).toBe(true);
		expect(res.Texture).toBeInstanceOf(THREE.Texture);
		expect(res.Width).toBe(64);
		expect(res.Height).toBe(64);

		const unloadResult = await res.Unload();
		expect(isResultSuccess(unloadResult)).toBe(true);
		expect(res.IsUnloaded()).toBe(true);
		expect(res.Texture).toBeNull();
		expect(res.Width).toBe(0);
		expect(res.Height).toBe(0);
	});

	it('fails when imageFilePath is empty or file does not exist', async () => {
		const emptyRes = new ImageResource('');
		const res1 = await emptyRes.Load();
		expect(res1.status).toBe(ResultStatus.FAILURE);
		expect(emptyRes.IsFailed()).toBe(true);

		const missingRes = new ImageResource('/assets/missing.png');
		const res2 = await missingRes.Load();
		expect(res2.status).toBe(ResultStatus.FAILURE);
		expect(missingRes.IsFailed()).toBe(true);
	});
});
