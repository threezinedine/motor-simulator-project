import * as THREE from 'three';
import {
	SceneManager,
	Node3D,
	Camera3D,
	Camera2D,
	Mesh,
	Light,
	Texture2D,
	MeshResource,
	ImageResource,
	Camera3DServer,
	Camera2DServer,
	MeshServer,
	LightServer,
	Texture2DServer,
} from '@/index';

// Register node types with their corresponding servers
const sceneManager = SceneManager.Instance;
sceneManager.registerNode(Camera3D, Camera3DServer);
sceneManager.registerNode(Camera2D, Camera2DServer);
sceneManager.registerNode(Mesh, MeshServer);
sceneManager.registerNode(Light, LightServer);
sceneManager.registerNode(Texture2D, Texture2DServer);

// Build scene hierarchy
const rootNode = new Node3D('Root');
sceneManager.setRootNode(rootNode);

// 3D Camera node (with internal OrbitControls enabled)
const cameraNode = new Camera3D({
	debugName: 'MainCamera',
	fov: 75,
	aspect: window.innerWidth / window.innerHeight,
	near: 0.1,
	far: 1000,
	orbitControls: true,
	enableDamping: true,
});
cameraNode.setPosition(2, 2, 3);
rootNode.addChild(cameraNode);

// 2D Camera node
const camera2DNode = new Camera2D({
	debugName: 'MainCamera2D',
	width: window.innerWidth,
	height: window.innerHeight,
});
rootNode.addChild(camera2DNode);

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

// Sample 2D Texture node (cross button in top-right corner)
const sampleImageResource = new ImageResource('/assets/sample.png');
const sampleTextureNode = new Texture2D(sampleImageResource, {
	debugName: 'CrossButtonTexture',
	width: 64,
	height: 64,
});
sampleTextureNode.setPosition(
	window.innerWidth / 2 - 48,
	window.innerHeight / 2 - 48
);
rootNode.addChild(sampleTextureNode);
void sampleTextureNode.load();

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
const camera2DServer = sceneManager.getServer(Camera2DServer)!;
const texture2DServer = sceneManager.getServer(Texture2DServer)!;
const threeScene = meshServer.ThreeScene;
const threeScene2D = texture2DServer.ThreeScene;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

// Handle window resize
window.addEventListener('resize', () => {
	cameraServer.setAspect(window.innerWidth / window.innerHeight);
	camera2DServer.setViewportSize(window.innerWidth, window.innerHeight);
	sampleTextureNode.setPosition(
		window.innerWidth / 2 - 48,
		window.innerHeight / 2 - 48
	);
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
	requestAnimationFrame(animate);
	cameraServer.update();

	renderer.clear();

	const currentCamera = cameraServer.ActiveCamera;
	if (currentCamera) {
		renderer.render(threeScene, currentCamera.ThreeCamera);
	}

	const currentCamera2D = camera2DServer.ActiveCamera;
	if (currentCamera2D) {
		renderer.clearDepth();
		renderer.render(threeScene2D, currentCamera2D.ThreeCamera);
	}
}

animate();
