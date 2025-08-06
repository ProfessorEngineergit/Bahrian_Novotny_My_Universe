import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// === NEU: Hyperspace-Effekt-Logik ===
const hyperspaceCanvas = document.getElementById('hyperspace-canvas');
const ctx = hyperspaceCanvas.getContext('2d');
let stars = [];
let speed = 5;
let width, height;

function resizeHyperspace() {
    width = window.innerWidth;
    height = window.innerHeight;
    hyperspaceCanvas.width = width;
    hyperspaceCanvas.height = height;
}

function initHyperspace() {
    for (let i = 0; i < 400; i++) {
        stars.push({
            x: Math.random() * width - width / 2,
            y: Math.random() * height - height / 2,
            z: Math.random() * width
        });
    }
}

function updateAndDrawHyperspace() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    
    for (const star of stars) {
        star.z -= speed;
        if (star.z < 1) {
            star.z = width;
            star.x = Math.random() * width - width / 2;
            star.y = Math.random() * height - height / 2;
        }
        
        const k = 128 / star.z;
        const px = star.x * k + width / 2;
        const py = star.y * k + height / 2;
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
            const size = (1 - star.z / width) * 5;
            const lineLength = size * speed * 0.2;
            ctx.globalAlpha = (1 - star.z / width);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + (star.x * k * lineLength), py + (star.y * k * lineLength));
            ctx.lineWidth = size;
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }
    }
    
    requestAnimationFrame(updateAndDrawHyperspace);
}

resizeHyperspace();
initHyperspace();
updateAndDrawHyperspace();
window.addEventListener('resize', resizeHyperspace);


// === Grund-Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

renderer.domElement.addEventListener('dragstart', (e) => e.preventDefault());
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'label-container';
document.body.appendChild(labelRenderer.domElement);

const renderScene = new RenderPass(scene, camera);
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
const muteButton = document.getElementById('mute-button');
const analyzeButton = document.getElementById('analyze-button');
const audio = document.getElementById('media-player');

// === Szenerie-Setup ===
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);
let galaxy; function createGalaxy() { const parameters = { count: 150000, size: 0.15, radius: 100, arms: 3, spin: 0.7, randomness: 0.5, randomnessPower: 3, insideColor: '#ffac89', outsideColor: '#54a1ff' }; const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(parameters.count * 3); const colors = new Float32Array(parameters.count * 3); const colorInside = new THREE.Color(parameters.insideColor); const colorOutside = new THREE.Color(parameters.outsideColor); for (let i = 0; i < parameters.count; i++) { const i3 = i * 3; const radius = Math.random() * parameters.radius; const spinAngle = radius * parameters.spin; const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2; const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.1; const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ; const mixedColor = colorInside.clone(); mixedColor.lerp(colorOutside, radius / parameters.radius); colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b; } geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32); gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.2, 'rgba(255,255,25
