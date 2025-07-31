import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// === Grund-Setup (unverändert) ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === UI und Beleuchtung (unverändert) ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// === Galaxie (unverändert) ===
let galaxy;
function createGalaxy() { /* ... unverändert ... */ }
createGalaxy();

// === NEU: Realistisches Schwarzes Loch (Interstellar-Stil) ===
const blackHoleGroup = new THREE.Group();
const blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
blackHoleGroup.add(blackHoleCore);

// Gravitationslinse (unverändert im Prinzip)
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
const lensingSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 64), new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.95, color: 0xffffff }));
blackHoleGroup.add(lensingSphere);

// Akkretionsscheibe (komplett neu)
function createAccretionDisk() {
    function generateGasTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const context = canvas.getContext('2d');
        for (let i = 0; i < 3000; i++) {
            context.fillStyle = `rgba(255, ${Math.random() * 150 + 100}, ${Math.random() * 50}, ${Math.random() * 0.1})`;
            context.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 50, Math.random() * 2);
        }
        const gradient = context.createRadialGradient(256, 256, 120, 256, 256, 256);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.2, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.3, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        context.globalCompositeOperation = 'destination-in';
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        context.globalCompositeOperation = 'source-over';
        return new THREE.CanvasTexture(canvas);
    }
    const texture = generateGasTexture();
    const diskMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, alphaMap: texture });

    // Horizontale Scheibe
    const horizontalDisk = new THREE.Mesh(new THREE.RingGeometry(2.6, 6, 64), diskMaterial);
    horizontalDisk.rotation.x = Math.PI / 2;
    
    // Vertikale Scheibe (für den "über/unter"-Effekt)
    const verticalDisk = new THREE.Mesh(new THREE.RingGeometry(1.6, 6.5, 64), diskMaterial);

    blackHoleGroup.add(horizontalDisk, verticalDisk);
}
createAccretionDisk();
scene.add(blackHoleGroup);


// === Hauptobjekt-Setup ===
let ship;
let forcefield;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

// === NEU: Forcefield mit Hexagon-Muster ===
function createForcefield(radius) {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d');
    context.strokeStyle = 'rgba(120, 220, 255, 0.8)';
    context.lineWidth = 1.5;

    const hexRadius = 10;
    const hexHeight = hexRadius * Math.sqrt(3);
    const hexWidth = hexRadius * 2;

    function drawHex(x, y) {
        context.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            context.lineTo(x + hexRadius * Math.cos(angle), y + hexRadius * Math.sin(angle));
        }
        context.closePath();
        context.stroke();
    }
    for (let row = -2; row < (size / hexHeight) + 2; row++) {
        for (let col = -2; col < (size / hexWidth) + 2; col++) {
            const x = col * hexWidth * 0.75;
            const y = row * hexHeight + (col % 2 === 0 ? 0 : hexHeight / 2);
            drawHex(x, y);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.BackSide });
    const ff = new THREE.Mesh(geometry, material);
    ff.visible = false;
    return ff;
}


// === GLTF Modell-Lader (unverändert) ===
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => {
    progressBar.style.width = '100%'; loadingText.textContent = 'Modell geladen!';
    ship = gltf.scene;
    scene.add(ship);
    ship.position.set(0, 0, -30);
