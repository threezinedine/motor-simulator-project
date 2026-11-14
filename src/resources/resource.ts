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
			return RESULT_SUCCESS;
		}

		if (this.status === 'loading' || this.status === 'unloading') {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: `Cannot load resource '${this.DebugName}' while status is '${this.status}'.`,
			};
		}

		this.status = 'loading';
		try {
			const result = await this._Load();
			this.status = isResultSuccess(result) ? 'loaded' : 'failed';
			return result;
		} catch (error) {
			this.status = 'failed';
			return {
				status: ResultStatus.FAILURE,
				errorMessage:
					error instanceof Error ? error.message : String(error),
			};
		}
	}
	protected _Load(): Promise<Result> {
		throw new Error('Method not implemented.');
	}

	async Unload(): Promise<Result> {
		if (this.status === 'unloaded') {
			return RESULT_SUCCESS;
		}

		if (this.status !== 'loaded') {
			return {
				status: ResultStatus.FAILURE,
				errorMessage: `Cannot unload resource '${this.DebugName}' while status is '${this.status}'.`,
			};
		}

		this.status = 'unloading';
		try {
			const result = await this._Unload();
			this.status = isResultSuccess(result) ? 'unloaded' : 'failed';
			return result;
		} catch (error) {
			this.status = 'failed';
			return {
				status: ResultStatus.FAILURE,
				errorMessage:
					error instanceof Error ? error.message : String(error),
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
