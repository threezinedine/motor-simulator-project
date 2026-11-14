import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
	SceneManager,
	Node3D,
	Camera3D,
	Mesh,
	Light,
	MeshResource,
	Camera3DServer,
	MeshServer,
	LightServer,
} from '@/index';

// Register node types with their corresponding servers
const sceneManager = SceneManager.Instance;
sceneManager.registerNode(Camera3D, Camera3DServer);
sceneManager.registerNode(Mesh, MeshServer);
sceneManager.registerNode(Light, LightServer);

// Build scene hierarchy
const rootNode = new Node3D('Root');
sceneManager.setRootNode(rootNode);

// Camera node
const cameraNode = new Camera3D({
	debugName: 'MainCamera',
	fov: 75,
	aspect: window.innerWidth / window.innerHeight,
	near: 0.1,
	far: 1000,
});
cameraNode.setPosition(2, 2, 3);
rootNode.addChild(cameraNode);

// Cube resource & Mesh node
const cubeResource = new MeshResource('/assets/cube.obj');
const cubeNode = new Mesh(cubeResource, {
	debugName: 'CubeMesh',
	color: 0x00d2ff,
	roughness: 0.4,
	metalness: 0.2,
	wireframeOverlay: true,
	wireframeColor: 0xffffff,
});
rootNode.addChild(cubeNode);
void cubeNode.load();

// Light nodes
const ambientLightNode = new Light({
	debugName: 'AmbientLight',
	type: 'ambient',
	color: 0xffffff,
	intensity: 0.6,
});
rootNode.addChild(ambientLightNode);

const directionalLightNode = new Light({
	debugName: 'DirectionalLight',
	type: 'directional',
	color: 0xffffff,
	intensity: 1.2,
});
directionalLightNode.setPosition(5, 5, 5);
rootNode.addChild(directionalLightNode);

// Retrieve active servers
const meshServer = sceneManager.getServer(MeshServer)!;
const cameraServer = sceneManager.getServer(Camera3DServer)!;
const threeScene = meshServer.ThreeScene;
const activeThreeCamera = cameraServer.ActiveCamera!.ThreeCamera;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// OrbitControls (rotate with left-click drag, zoom with scroll, pan with right-click drag)
const controls = new OrbitControls(activeThreeCamera, renderer.domElement);
controls.enableDamping = true;

// Handle window resize
window.addEventListener('resize', () => {
	cameraServer.setAspect(window.innerWidth / window.innerHeight);
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	controls.update();

	const currentCamera = cameraServer.ActiveCamera;
	if (currentCamera) {
		renderer.render(threeScene, currentCamera.ThreeCamera);
	}
}

animate();
