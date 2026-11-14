import { ObjectBase } from '@/common';
import { Result, ResultStatus, RESULT_SUCCESS, isResultSuccess } from '@/types';

export type ResourceStatus =
	'unloaded' | 'loading' | 'loaded' | 'unloading' | 'failed';

export class Resource extends ObjectBase {
	protected status: ResourceStatus = 'unloaded';

	constructor(debugName = 'Resource') {
		super(debugName);
	}

	get Status(): ResourceStatus {
		return this.status;
	}

	async Load(): Promise<Result> {
		if (this.status === 'loaded') {
			console.debug(
				`[Resource:${this.DebugName}] Already loaded, skipping Load().`
			);
			return RESULT_SUCCESS;
		}

		if (this.status === 'loading' || this.status === 'unloading') {
			const errorMessage = `Cannot load resource '${this.DebugName}' while status is '${this.status}'.`;
			console.warn(`[Resource:${this.DebugName}] ${errorMessage}`);
			return {
				status: ResultStatus.FAILURE,
				errorMessage,
			};
		}

		console.debug(`[Resource:${this.DebugName}] Loading started...`);
		this.status = 'loading';
		try {
			const result = await this._Load();
			if (isResultSuccess(result)) {
				this.status = 'loaded';
				console.debug(
					`[Resource:${this.DebugName}] Loaded successfully.`
				);
			} else {
				this.status = 'failed';
				console.error(
					`[Resource:${this.DebugName}] Load failed: ${result.errorMessage ?? 'Unknown error'}`
				);
			}
			return result;
		} catch (error) {
			this.status = 'failed';
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`[Resource:${this.DebugName}] Exception during Load: ${errorMessage}`
			);
			return {
				status: ResultStatus.FAILURE,
				errorMessage,
			};
		}
	}
	protected _Load(): Promise<Result> {
		throw new Error('Method not implemented.');
	}

	async Unload(): Promise<Result> {
		if (this.status === 'unloaded') {
			console.debug(
				`[Resource:${this.DebugName}] Already unloaded, skipping Unload().`
			);
			return RESULT_SUCCESS;
		}

		if (this.status !== 'loaded') {
			const errorMessage = `Cannot unload resource '${this.DebugName}' while status is '${this.status}'.`;
			console.warn(`[Resource:${this.DebugName}] ${errorMessage}`);
			return {
				status: ResultStatus.FAILURE,
				errorMessage,
			};
		}

		console.debug(`[Resource:${this.DebugName}] Unloading started...`);
		this.status = 'unloading';
		try {
			const result = await this._Unload();
			if (isResultSuccess(result)) {
				this.status = 'unloaded';
				console.debug(
					`[Resource:${this.DebugName}] Unloaded successfully.`
				);
			} else {
				this.status = 'failed';
				console.error(
					`[Resource:${this.DebugName}] Unload failed: ${result.errorMessage ?? 'Unknown error'}`
				);
			}
			return result;
		} catch (error) {
			this.status = 'failed';
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`[Resource:${this.DebugName}] Exception during Unload: ${errorMessage}`
			);
			return {
				status: ResultStatus.FAILURE,
				errorMessage,
			};
		}
	}
	protected _Unload(): Promise<Result> {
		throw new Error('Method not implemented.');
	}

	IsLoading(): boolean {
		return this.status === 'loading';
	}

	IsLoaded(): boolean {
		return this.status === 'loaded';
	}

	IsUnloading(): boolean {
		return this.status === 'unloading';
	}

	IsUnloaded(): boolean {
		return this.status === 'unloaded';
	}

	IsFailed(): boolean {
		return this.status === 'failed';
	}
}
