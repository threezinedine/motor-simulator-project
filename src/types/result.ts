export enum ResultStatus {
	SUCCESS = 'success',
	FAILURE = 'failure',
}

export interface Result {
	status: ResultStatus;
	errorMessage?: string;
}

export const RESULT_SUCCESS: Result = {
	status: ResultStatus.SUCCESS,
};

export function isResultSuccess(result: Result): boolean {
	return result.status === ResultStatus.SUCCESS;
}
