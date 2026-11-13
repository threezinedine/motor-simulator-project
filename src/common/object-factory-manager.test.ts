import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectBase } from './object-base';
import { ObjectFactory } from './object-factory';
import { ObjectFactoryManager } from './object-factory-manager';

class MotorObject extends ObjectBase {
	public id = 0;
}

class SensorObject extends ObjectBase {
	public label = '';
}

describe('ObjectFactoryManager', () => {
	let manager: ObjectFactoryManager;

	beforeEach(() => {
		manager = ObjectFactoryManager.Instance;
		manager.clear();
	});

	describe('singleton & initial state', () => {
		it('returns the exact same singleton instance across calls', () => {
			expect(ObjectFactoryManager.Instance).toBe(manager);
			expect(ObjectFactoryManager.getInstance()).toBe(manager);
		});

		it('starts with no registered factories', () => {
			expect(manager.hasFactory(MotorObject)).toBe(false);
			expect(manager.getFactory(MotorObject)).toBeNull();
		});
	});

	describe('registerFactory', () => {
		it('creates and registers a default factory with optional pre-allocation', () => {
			const factory = manager.registerFactory(MotorObject, undefined, 4);

			expect(manager.hasFactory(MotorObject)).toBe(true);
			expect(manager.getFactory(MotorObject)).toBe(factory);
			expect(factory.PoolSize).toBe(4);
		});

		it('preserves the existing factory when called again without a custom factory', () => {
			const first = manager.registerFactory(MotorObject);
			const second = manager.registerFactory(MotorObject);

			expect(second).toBe(first);
		});

		it('replaces the registered factory when an explicit custom factory is provided', () => {
			manager.registerFactory(MotorObject);
			const customFactory = new ObjectFactory(MotorObject, 2);

			const registered = manager.registerFactory(
				MotorObject,
				customFactory
			);

			expect(registered).toBe(customFactory);
			expect(manager.getFactory(MotorObject)).toBe(customFactory);
		});
	});

	describe('spawn & despawn', () => {
		it('auto-registers a factory when spawning an unregistered type', () => {
			const motor = manager.spawn(MotorObject);

			expect(motor).toBeInstanceOf(MotorObject);
			expect(manager.hasFactory(MotorObject)).toBe(true);
		});

		it('recycles despawned instances on subsequent spawns of the same type', () => {
			const motor = manager.spawn(MotorObject);
			manager.despawn(motor);

			expect(manager.getFactory(MotorObject)?.PoolSize).toBe(1);

			const recycled = manager.spawn(MotorObject);
			expect(recycled).toBe(motor);
			expect(manager.getFactory(MotorObject)?.PoolSize).toBe(0);
		});

		it('auto-registers a factory when despawning an externally instantiated object', () => {
			const externalSensor = new SensorObject();
			manager.despawn(externalSensor);

			expect(manager.hasFactory(SensorObject)).toBe(true);
			expect(manager.spawn(SensorObject)).toBe(externalSensor);
		});

		it('isolates object pools across distinct registered types', () => {
			const motor = manager.spawn(MotorObject);
			const sensor = manager.spawn(SensorObject);

			manager.despawn(motor);
			manager.despawn(sensor);

			expect(manager.spawn(MotorObject)).toBe(motor);
			expect(manager.spawn(SensorObject)).toBe(sensor);
		});
	});

	describe('unregisterFactory & clear', () => {
		it('clears the pool and removes a single factory registration', () => {
			const motor = manager.spawn(MotorObject);
			manager.despawn(motor);
			const oldFactory = manager.getFactory(MotorObject)!;

			manager.unregisterFactory(MotorObject);

			expect(manager.hasFactory(MotorObject)).toBe(false);
			expect(manager.getFactory(MotorObject)).toBeNull();
			expect(oldFactory.PoolSize).toBe(0);

			// Spawning after unregister allocates a fresh instance from a new factory
			const nextMotor = manager.spawn(MotorObject);
			expect(nextMotor).not.toBe(motor);
		});

		it('is a no-op when unregistering a type that was never registered', () => {
			expect(() => manager.unregisterFactory(MotorObject)).not.toThrow();
			expect(manager.hasFactory(MotorObject)).toBe(false);
		});

		it('clears all registered factories and their pools when clear is called', () => {
			const motor = manager.spawn(MotorObject);
			const sensor = manager.spawn(SensorObject);
			manager.despawn(motor);
			manager.despawn(sensor);

			const motorFactory = manager.getFactory(MotorObject)!;
			const sensorFactory = manager.getFactory(SensorObject)!;

			manager.clear();

			expect(manager.hasFactory(MotorObject)).toBe(false);
			expect(manager.hasFactory(SensorObject)).toBe(false);
			expect(motorFactory.PoolSize).toBe(0);
			expect(sensorFactory.PoolSize).toBe(0);
		});
	});
});
