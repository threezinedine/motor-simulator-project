import { describe, it, expect } from 'vitest';
import * as THREE from 'three';

describe('Sample Unit Test', () => {
  it('should pass a basic assertion and create a Three.js BoxGeometry', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    expect(geometry.type).toBe('BoxGeometry');
    expect(geometry.parameters.width).toBe(1);
  });
});
