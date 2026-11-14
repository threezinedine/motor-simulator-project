import { describe, it, expect, beforeEach } from 'vitest';
import { Result, ResultStatus, RESULT_SUCCESS, isResultSuccess } from '@/types';
import { Resource } from './resource';

class TestResource extends Resource {
	public loadBehavior: () => Promise<Result> = async () => RESULT_SUCCESS;
	public unloadBehavior: () => Promise<Result> = async () => RESULT_SUCCESS;
	public loadCallCount = 0;
	public unloadCallCount = 0;

	constructor(debugName = 'TestResource') {
		super(debugName);
	}

	protected override async _Load(): Promise<Result> {
		this.loadCallCount++;
		return this.loadBehavior();
	}

	protected override async _Unload(): Promise<Result> {
		this.unloadCallCount++;
		return this.unloadBehavior();
	}
}

describe('Resource', () => {
	let resource: TestResource;

	beforeEach(() => {
		resource = new TestResource('SampleAsset');
	});

	describe('initial state', () => {
		it('initializes in unloaded status with DebugName set', () => {
			expect(resource.DebugName).toBe('SampleAsset');
			expect(resource.Status).toBe('unloaded');
			expect(resource.IsUnloaded()).toBe(true);
			expect(resource.IsLoading()).toBe(false);
			expect(resource.IsLoaded()).toBe(false);
			expect(resource.IsUnloading()).toBe(false);
			expect(resource.IsFailed()).toBe(false);
		});
	});

	describe('Load', () => {
		it('transitions through loading to loaded when _Load succeeds', async () => {
			let resolveLoad!: (res: Result) => void;
			resource.loadBehavior = () =>
				new Promise<Result>((resolve) => {
					resolveLoad = resolve;
				});

			const loadPromise = resource.Load();
			expect(resource.Status).toBe('loading');
			expect(resource.IsLoading()).toBe(true);

			resolveLoad(RESULT_SUCCESS);
			const result = await loadPromise;

			expect(isResultSuccess(result)).toBe(true);
			expect(resource.Status).toBe('loaded');
			expect(resource.IsLoaded()).toBe(true);
			expect(resource.loadCallCount).toBe(1);
		});

		it('returns RESULT_SUCCESS immediately without calling _Load if already loaded', async () => {
			await resource.Load();

			const secondResult = await resource.Load();

			expect(secondResult).toBe(RESULT_SUCCESS);
			expect(resource.loadCallCount).toBe(1);
		});

		it('transitions to failed when _Load returns a FAILURE Result, and allows retrying Load', async () => {
			resource.loadBehavior = async () => ({
				status: ResultStatus.FAILURE,
				errorMessage: 'File not found',
			});

			const failResult = await resource.Load();

			expect(failResult.status).toBe(ResultStatus.FAILURE);
			expect(failResult.errorMessage).toBe('File not found');
			expect(resource.Status).toBe('failed');
			expect(resource.IsFailed()).toBe(true);

			// Retry after failure
			resource.loadBehavior = async () => RESULT_SUCCESS;
			const retryResult = await resource.Load();

			expect(isResultSuccess(retryResult)).toBe(true);
			expect(resource.IsLoaded()).toBe(true);
			expect(resource.loadCallCount).toBe(2);
		});

		it('catches thrown exceptions from _Load, sets status to failed, and returns FAILURE Result', async () => {
			resource.loadBehavior = async () => {
				throw new Error('Network error');
			};

			const result = await resource.Load();

			expect(result.status).toBe(ResultStatus.FAILURE);
			expect(result.errorMessage).toBe('Network error');
			expect(resource.IsFailed()).toBe(true);
		});

		it('rejects concurrent Load calls while already loading or unloading', async () => {
			let resolveLoad!: (res: Result) => void;
			resource.loadBehavior = () =>
				new Promise<Result>((resolve) => {
					resolveLoad = resolve;
				});

			const firstLoad = resource.Load();
			const concurrentLoad = await resource.Load();

			expect(concurrentLoad.status).toBe(ResultStatus.FAILURE);
			expect(resource.loadCallCount).toBe(1);

			resolveLoad(RESULT_SUCCESS);
			await firstLoad;
		});
	});

	describe('Unload', () => {
		it('returns RESULT_SUCCESS immediately without calling _Unload if already unloaded', async () => {
			const result = await resource.Unload();

			expect(result).toBe(RESULT_SUCCESS);
			expect(resource.unloadCallCount).toBe(0);
		});

		it('transitions from loaded through unloading to unloaded when _Unload succeeds', async () => {
			await resource.Load();

			let resolveUnload!: (res: Result) => void;
			resource.unloadBehavior = () =>
				new Promise<Result>((resolve) => {
					resolveUnload = resolve;
				});

			const unloadPromise = resource.Unload();
			expect(resource.Status).toBe('unloading');
			expect(resource.IsUnloading()).toBe(true);

			resolveUnload(RESULT_SUCCESS);
			const result = await unloadPromise;

			expect(isResultSuccess(result)).toBe(true);
			expect(resource.Status).toBe('unloaded');
			expect(resource.IsUnloaded()).toBe(true);
			expect(resource.unloadCallCount).toBe(1);
		});

		it('returns FAILURE Result when Unload is called while loading, unloading, or failed', async () => {
			resource.loadBehavior = async () => ({
				status: ResultStatus.FAILURE,
				errorMessage: 'Load failed',
			});
			await resource.Load();
			expect(resource.IsFailed()).toBe(true);

			const result = await resource.Unload();
			expect(result.status).toBe(ResultStatus.FAILURE);
			expect(resource.unloadCallCount).toBe(0);
		});

		it('transitions to failed when _Unload returns FAILURE or throws an error', async () => {
			await resource.Load();
			resource.unloadBehavior = async () => {
				throw new Error('GPU buffer locked');
			};

			const result = await resource.Unload();

			expect(result.status).toBe(ResultStatus.FAILURE);
			expect(result.errorMessage).toBe('GPU buffer locked');
			expect(resource.IsFailed()).toBe(true);
		});
	});
});
