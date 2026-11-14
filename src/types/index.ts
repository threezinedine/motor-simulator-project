import { ObjectBase } from '@/common';
import type { Vector2, Vector3, Euler } from './vector';
export * from './result';

export type { Vector2, Vector3, Euler };
export type ObjectConstructor<T extends ObjectBase = ObjectBase> = new () => T;
