import { ObjectBase } from './object-base';
import { ObjectConstructor, ObjectFactory } from './object-factory';

export class ObjectFactoryManager {
	private static _instance: ObjectFactoryManager | null = null;

	private readonly _factories = new Map<
		ObjectConstructor,
		ObjectFactory<ObjectBase>
	>();

	private constructor() {}

	static get Instance(): ObjectFactoryManager {
		if (!ObjectFactoryManager._instance) {
			ObjectFactoryManager._instance = new ObjectFactoryManager();
		}
		return ObjectFactoryManager._instance;
	}

	static getInstance(): ObjectFactoryManager {
		return ObjectFactoryManager.Instance;
	}

	hasFactory<T extends ObjectBase>(type: ObjectConstructor<T>): boolean {
		return this._factories.has(type);
	}

	getFactory<T extends ObjectBase>(
		type: ObjectConstructor<T>
	): ObjectFactory<T> | null {
		return (this._factories.get(type) as ObjectFactory<T>) ?? null;
	}

	registerFactory<T extends ObjectBase>(
		type: ObjectConstructor<T>,
		factory?: ObjectFactory<T>,
		initialPoolSize = 0
	): ObjectFactory<T> {
		const existing = this._factories.get(type) as
			ObjectFactory<T> | undefined;
		if (existing && !factory) {
			return existing;
		}

		const resolvedFactory =
			factory ?? new ObjectFactory<T>(type, initialPoolSize);
		this._factories.set(type, resolvedFactory);
		return resolvedFactory;
	}

	spawn<T extends ObjectBase>(type: ObjectConstructor<T>): T {
		let factory = this._factories.get(type) as ObjectFactory<T> | undefined;
		if (!factory) {
			factory = this.registerFactory(type);
		}
		return factory.create();
	}

	despawn<T extends ObjectBase>(instance: T): void {
		const type = instance.constructor as ObjectConstructor<T>;
		let factory = this._factories.get(type) as ObjectFactory<T> | undefined;
		if (!factory) {
			factory = this.registerFactory(type);
		}
		factory.release(instance);
	}

	unregisterFactory<T extends ObjectBase>(type: ObjectConstructor<T>): void {
		const factory = this._factories.get(type);
		if (factory) {
			factory.clear();
			this._factories.delete(type);
		}
	}

	clear(): void {
		for (const factory of this._factories.values()) {
			factory.clear();
		}
		this._factories.clear();
	}
}
