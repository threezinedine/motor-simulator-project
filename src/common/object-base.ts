export class ObjectBase {
	private _debugName: string;

	constructor(debugName = '') {
		this._debugName = debugName;
	}

	get DebugName(): string {
		return this._debugName;
	}
}
