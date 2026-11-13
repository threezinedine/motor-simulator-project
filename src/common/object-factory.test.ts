import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectBase } from './object-base';
import { ObjectFactory } from './object-factory';

class DummyObject extends ObjectBase {
	public value = 0;
}

class OtherObject extends ObjectBase {}

describe('ObjectFactory', () => {
	let factory: ObjectFactory<DummyObject>;

	beforeEach(() => {
		factory = new ObjectFactory(DummyObject);
	});

	describe('initial state & pre-allocation', () => {
		it('initializes with target Type and empty pool by default', () => {
			expect(factory.Type).toBe(DummyObject);
			expect(factory.PoolSize).toBe(0);
		});

		it('pre-allocates instances when initialPoolSize is positive and ignores non-positive values', () => {
			const prewarmed = new ObjectFactory(DummyObject, 3);
			const negative = new ObjectFactory(DummyObject, -2);

			expect(prewarmed.PoolSize).toBe(3);
			expect(negative.PoolSize).toBe(0);
		});
	});

	describe('create', () => {
		it('allocates a new instance when the pool is empty', () => {
			const obj1 = factory.create();
			const obj2 = factory.create();

			expect(obj1).toBeInstanceOf(DummyObject);
			expect(obj2).toBeInstanceOf(DummyObject);
			expect(obj1).not.toBe(obj2);
			expect(factory.PoolSize).toBe(0);
		});

		it('reuses pooled instances in LIFO order before allocating new ones', () => {
			const obj1 = factory.create();
			const obj2 = factory.create();

			factory.release(obj1);
			factory.release(obj2);
			expect(factory.PoolSize).toBe(2);

			expect(factory.create()).toBe(obj2);
			expect(factory.create()).toBe(obj1);
			expect(factory.PoolSize).toBe(0);

			const obj3 = factory.create();
			expect(obj3).not.toBe(obj1);
			expect(obj3).not.toBe(obj2);
		});
	});

	describe('release', () => {
		it('returns a valid instance to the pool', () => {
			const obj = factory.create();
			factory.release(obj);

			expect(factory.PoolSize).toBe(1);
		});

		it('ignores duplicate releases of an instance already in the pool', () => {
			const obj = factory.create();
			factory.release(obj);
			factory.release(obj);

			expect(factory.PoolSize).toBe(1);
		});

		it('ignores instances that are not of the factory target type', () => {
			const unrelated = new OtherObject() as unknown as DummyObject;
			factory.release(unrelated);

			expect(factory.PoolSize).toBe(0);
		});
	});

	describe('clear', () => {
		it('empties the pool and allows previously pooled instances to be released again', () => {
			const obj = factory.create();
			factory.release(obj);
			expect(factory.PoolSize).toBe(1);

			factory.clear();
			expect(factory.PoolSize).toBe(0);

			factory.release(obj);
			expect(factory.PoolSize).toBe(1);
		});
	});
});
