import { ObjectBase } from './object-base';

export type ObjectConstructor<T extends ObjectBase = ObjectBase> = new () => T;

export class ObjectFactory<T extends ObjectBase> {
	private readonly _type: ObjectConstructor<T>;
	private readonly _pool: T[] = [];
	private readonly _inPool: Set<T> = new Set();

	constructor(type: ObjectConstructor<T>, initialPoolSize = 0) {
		this._type = type;

		for (let i = 0; i < initialPoolSize; i++) {
			const instance = new this._type();
			this._pool.push(instance);
			this._inPool.add(instance);
		}
	}

	get Type(): ObjectConstructor<T> {
		return this._type;
	}

	get PoolSize(): number {
		return this._pool.length;
	}

	create(): T {
		const instance = this._pool.pop();
		if (instance) {
			this._inPool.delete(instance);
			return instance;
		}
		return new this._type();
	}

	release(instance: T): void {
		if (!(instance instanceof this._type) || this._inPool.has(instance)) {
			return;
		}

		this._pool.push(instance);
		this._inPool.add(instance);
	}

	clear(): void {
		this._pool.length = 0;
		this._inPool.clear();
	}
}
