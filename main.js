import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// === Grund-Setup ===
const mainScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

renderer.domElement.addEventListener('dragstart', (e) => e.preventDefault());
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'label-container';
document.body.appendChild(labelRenderer.domElement);

const renderScene = new RenderPass(mainScene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.9);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// === UI Elemente ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingTitle = document.getElementById('loading-title');
const loadingPercentage = document.getElementById('loading-percentage');
const infoElement = document.getElementById('info');
const joystickZone = document.getElementById('joystick-zone');
const bottomBar = document.getElementById('bottom-bar');
const muteButton = document.getElementById('mute-button');
const analyzeButton = document.getElementById('analyze-button');
const mapButton = document.getElementById('map-button');
const audio = document.getElementById('media-player');

// === Hyperspace-Animation Setup ===
const loadingScene = new THREE.Scene();
const loadingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let hyperspaceParticles;
const HYPERSPACE_LENGTH = 800;
let loadingProgress = 0;

function createHyperspaceEffect() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 5000; i++) {
        vertices.push(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * HYPERSPACE_LENGTH
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, blending: THREE.AdditiveBlending });
    hyperspaceParticles = new THREE.Points(geometry, material);
    loadingScene.add(hyperspaceParticles);
}

// === Szenerie-Setup ===
mainScene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 15);
mainScene.add(directionalLight);
let galaxy; function createGalaxy() { const parameters = { count: 150000, size: 0.15, radius: 100, arms: 3, spin: 0.7, randomness: 0.5, randomnessPower: 3, insideColor: '#ffac89', outsideColor: '#54a1ff' }; const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(parameters.count * 3); const colors = new Float32Array(parameters.count * 3); const colorInside = new THREE.Color(parameters.insideColor); const colorOutside = new THREE.Color(parameters.outsideColor); for (let i = 0; i < parameters.count; i++) { const i3 = i * 3; const radius = Math.random() * parameters.radius; const spinAngle = radius * parameters.spin; const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2; const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.1; const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ; const mixedColor = colorInside.clone(); mixedColor.lerp(colorOutside, radius / parameters.radius); colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b; } geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32); gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.2, 'rgba(255,255,255,1)'); gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gradient.addColorStop(1, 'rgba(255,255,255,0)'); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); const particleTexture = new THREE.CanvasTexture(canvas); const material = new THREE.PointsMaterial({ size: parameters.size, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, map: particleTexture, transparent: true }); galaxy = new THREE.Points(geometry, material); mainScene.add(galaxy); }
createGalaxy();
const blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
mainScene.add(blackHoleCore);
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
mainScene.add(cubeCamera);
const lensingSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 64), new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.9, color: 0xffffff }));
mainScene.add(lensingSphere);
function createAccretionDisk() { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(128, 128, 80, 128, 128, 128); gradient.addColorStop(0, 'rgba(255, 180, 80, 1)'); gradient.addColorStop(0.7, 'rgba(255, 100, 20, 0.5)'); gradient.addColorStop(1, 'rgba(0,0,0,0)'); context.fillStyle = gradient; context.fillRect(0, 0, 256, 256); const texture = new THREE.CanvasTexture(canvas); const geometry = new THREE.RingGeometry(2.5, 5, 64); const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending }); const disk = new THREE.Mesh(geometry, material); disk.rotation.x = Math.PI / 2; mainScene.add(disk); return disk; }
const accretionDisk = createAccretionDisk();
const blackHoleLabelDiv = document.createElement('div'); blackHoleLabelDiv.className = 'label'; blackHoleLabelDiv.textContent = 'Project_Mariner'; const lineDiv = document.createElement('div'); lineDiv.className = 'label-line'; blackHoleLabelDiv.appendChild(lineDiv); const blackHoleLabel = new CSS2DObject(blackHoleLabelDiv); blackHoleLabel.position.set(0, 7, 0); mainScene.add(blackHoleLabel);
const pacingCircleGeometry = new THREE.TorusGeometry(12, 0.1, 16, 100);
const pacingCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pacingCircle = new THREE.Mesh(pacingCircleGeometry, pacingCircleMaterial);
pacingCircle.rotation.x = Math.PI / 2;
mainScene.add(pacingCircle);

const planets = [];
const planetData = [
    { name: 'Xylos', radius: 1, orbit: 20, speed: 0.04 }, { name: 'Cygnus X-1a', radius: 1.5, orbit: 35, speed: 0.025 }, { name: 'Veridia', radius: 1.2, orbit: 50, speed: 0.015 }, { name: 'Klendathu', radius: 0.8, orbit: 65, speed: 0.03 }, { name: 'Terminus', radius: 2, orbit: 80, speed: 0.01 }, { name: 'Helion Prime', radius: 1.8, orbit: 95, speed: 0.012 }
];
function createPlanetTexture(color) { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const context = canvas.getContext('2d'); context.fillStyle = `hsl(${color}, 70%, 50%)`; context.fillRect(0, 0, 128, 128); for (let i = 0; i < 3000; i++) { const x = Math.random() * 128; const y = Math.random() * 128; const radius = Math.random() * 1.5; context.beginPath()
