import * as THREE from 'three';
import { Node3D } from './node-3d';

export type LightType = 'ambient' | 'directional' | 'point' | 'spot';

export interface LightOptions {
	debugName?: string;
	type?: LightType;
	color?: number;
	intensity?: number;
	distance?: number;
	decay?: number;
	angle?: number;
	penumbra?: number;
	castShadow?: boolean;
}

export class Light extends Node3D {
	private _type: LightType;
	private _color: number;
	private _intensity: number;
	private _distance: number;
	private _decay: number;
	private _angle: number;
	private _penumbra: number;
	private _castShadow: boolean;
	private _threeLight: THREE.Light;

	constructor(options: LightOptions | string = 'Light') {
		const opts: LightOptions =
			typeof options === 'string' ? { debugName: options } : options;

		super(opts.debugName ?? 'Light');

		this._type = opts.type ?? 'directional';
		this._color = opts.color ?? 0xffffff;
		this._intensity = opts.intensity ?? 1;
		this._distance = opts.distance ?? 0;
		this._decay = opts.decay ?? 2;
		this._angle = opts.angle ?? Math.PI / 3;
		this._penumbra = opts.penumbra ?? 0;
		this._castShadow = opts.castShadow ?? false;

		this._threeLight = this.createThreeLight();
		this.syncThreeLightTransform();
	}

	get Type(): LightType {
		return this._type;
	}

	set Type(value: LightType) {
		this.setType(value);
	}

	get Color(): number {
		return this._color;
	}

	set Color(value: number) {
		this.setColor(value);
	}

	get Intensity(): number {
		return this._intensity;
	}

	set Intensity(value: number) {
		this.setIntensity(value);
	}

	get Distance(): number {
		return this._distance;
	}

	set Distance(value: number) {
		this.setDistance(value);
	}

	get Decay(): number {
		return this._decay;
	}

	set Decay(value: number) {
		this.setDecay(value);
	}

	get Angle(): number {
		return this._angle;
	}

	set Angle(value: number) {
		this.setAngle(value);
	}

	get Penumbra(): number {
		return this._penumbra;
	}

	set Penumbra(value: number) {
		this.setPenumbra(value);
	}

	get CastShadow(): boolean {
		return this._castShadow;
	}

	set CastShadow(value: boolean) {
		this.setCastShadow(value);
	}

	get ThreeLight(): THREE.Light {
		return this._threeLight;
	}

	setType(type: LightType): void {
		if (this._type === type) {
			return;
		}

		const oldLight = this._threeLight;
		const parent = oldLight.parent;
		if (parent) {
			parent.remove(oldLight);
		}
		oldLight.dispose();

		this._type = type;
		this._threeLight = this.createThreeLight();
		this._threeLight.visible = this.IsEnable;
		this.syncThreeLightTransform();

		if (parent) {
			parent.add(this._threeLight);
		}
	}

	setColor(color: number): void {
		if (this._color === color) {
			return;
		}
		this._color = color;
		this._threeLight.color.setHex(color);
	}

	setIntensity(intensity: number): void {
		if (intensity < 0 || this._intensity === intensity) {
			return;
		}
		this._intensity = intensity;
		this._threeLight.intensity = intensity;
	}

	setDistance(distance: number): void {
		if (distance < 0 || this._distance === distance) {
			return;
		}
		this._distance = distance;
		if (
			this._threeLight instanceof THREE.PointLight ||
			this._threeLight instanceof THREE.SpotLight
		) {
			this._threeLight.distance = distance;
		}
	}

	setDecay(decay: number): void {
		if (decay < 0 || this._decay === decay) {
			return;
		}
		this._decay = decay;
		if (
			this._threeLight instanceof THREE.PointLight ||
			this._threeLight instanceof THREE.SpotLight
		) {
			this._threeLight.decay = decay;
		}
	}

	setAngle(angle: number): void {
		if (angle <= 0 || angle > Math.PI / 2 || this._angle === angle) {
			return;
		}
		this._angle = angle;
		if (this._threeLight instanceof THREE.SpotLight) {
			this._threeLight.angle = angle;
		}
	}

	setPenumbra(penumbra: number): void {
		if (penumbra < 0 || penumbra > 1 || this._penumbra === penumbra) {
			return;
		}
		this._penumbra = penumbra;
		if (this._threeLight instanceof THREE.SpotLight) {
			this._threeLight.penumbra = penumbra;
		}
	}

	setCastShadow(castShadow: boolean): void {
		if (this._castShadow === castShadow) {
			return;
		}
		this._castShadow = castShadow;
		if (!(this._threeLight instanceof THREE.AmbientLight)) {
			this._threeLight.castShadow = castShadow;
		}
	}

	protected override _onTransformChanged(): void {
		this.syncThreeLightTransform();
	}

	protected override _onEnable(): void {
		if (this._threeLight) {
			this._threeLight.visible = true;
		}
	}

	protected override _onDisable(): void {
		if (this._threeLight) {
			this._threeLight.visible = false;
		}
	}

	private createThreeLight(): THREE.Light {
		let light: THREE.Light;
		switch (this._type) {
			case 'ambient':
				light = new THREE.AmbientLight(this._color, this._intensity);
				break;
			case 'point':
				light = new THREE.PointLight(
					this._color,
					this._intensity,
					this._distance,
					this._decay
				);
				light.castShadow = this._castShadow;
				break;
			case 'spot':
				light = new THREE.SpotLight(
					this._color,
					this._intensity,
					this._distance,
					this._angle,
					this._penumbra,
					this._decay
				);
				light.castShadow = this._castShadow;
				break;
			case 'directional':
			default:
				light = new THREE.DirectionalLight(
					this._color,
					this._intensity
				);
				light.castShadow = this._castShadow;
				break;
		}
		return light;
	}

	private syncThreeLightTransform(): void {
		if (!this._threeLight) {
			return;
		}

		const pos = this.Position;
		const rot = this.Rotation;
		const scale = this.Scale;
		const order = (rot.order || 'XYZ') as THREE.EulerOrder;

		this._threeLight.position.set(pos.x, pos.y, pos.z);
		this._threeLight.rotation.set(rot.x, rot.y, rot.z, order);
		this._threeLight.scale.set(scale.x, scale.y, scale.z);
		this._threeLight.updateMatrixWorld(true);
	}
}
