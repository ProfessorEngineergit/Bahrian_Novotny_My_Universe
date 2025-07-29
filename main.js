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

// === UI, Beleuchtung (unverändert) ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// === Galaxie (unverändert) ===
let galaxy;
function createGalaxy() { /* ... unverändert ... */ }
createGalaxy();

// === NEU: Gravitationslinsen-Setup ===

// 1. Die 360-Grad-Kamera für die Reflexionen
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
});
const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
scene.add(cubeCamera); // Positioniert sich automatisch bei (0,0,0)

// 2. Das Shader-Material für den Linseneffekt
const blackHoleMaterial = new THREE.ShaderMaterial({
    uniforms: {
        // tCube ist das 360-Grad-Foto
        "tCube": { value: cubeRenderTarget.texture }
    },
    // Der Vertex-Shader positioniert das Objekt
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    // Der Fragment-Shader kümmert sich um die Farbe und Verzerrung
    fragmentShader: `
        uniform samplerCube tCube;
        varying vec3 vWorldPosition;
        void main() {
            // Berechne den "Blickwinkel" von der Kamera zum Punkt auf der Kugel
            vec3 cameraToWorld = normalize(vWorldPosition - cameraPosition);
            
            // Simuliere die Lichtkrümmung (das ist der "Trick")
            // Wir lenken den Blickwinkel leicht ab, basierend auf seiner Nähe zum Zentrum
            vec3 distortedVector = refract(cameraToWorld, vec3(0.0, 1.0, 0.0), 1.0 / 1.1);
            
            // Schaue in die gespiegelte, verzerrte Richtung in das 360-Grad-Foto
            vec4 color = textureCube(tCube, distortedVector);
            
            // Simuliere den Ereignishorizont: Je direkter der Blickwinkel, desto dunkler
            float intensity = 1.0 - dot(normalize(vWorldPosition), cameraToWorld);
            
            // Wenn der Blick zu direkt ist (nahe am Zentrum), wird es schwarz
            if (intensity < 0.2) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                gl_FragColor = color * intensity;
            }
        }
    `
});

// 3. Das eigentliche Schwarze-Loch-Objekt, das das Shader-Material verwendet
const blackHole = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 64), blackHoleMaterial);
scene.add(blackHole);


// === Hauptobjekt und Kamera-Setup ===
let ship;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();
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
    ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
    camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position);
    setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.style.display = 'none', 500); }, 300);
    animate();
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });

// === Steuerung und Animation (unverändert) ===
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8;
const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03;
const DAMPING = 0.90;
const LERP_FACTOR = 0.05;
let cameraFingerId = null;
let initialPinchDistance = 0;
let previousTouch = { x: 0, y: 0 };
nipplejs.create({ /*...*/ });
renderer.domElement.addEventListener('touchstart', (e) => { /*...*/ }, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { /*...*/ }, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => { /*...*/ });
function getPinchDistance(e) { /*...*/ }

// --- Die Animations-Schleife mit dem CubeCamera-Update ---
function animate() {
    requestAnimationFrame(animate);

    // NEU: Update für das Schwarze Loch
    if (blackHole) {
        // Verstecke das Schwarze Loch, damit es sich nicht selbst spiegelt
        blackHole.visible = false;
        // Mache das 360-Grad-Foto von der Position des Schwarzen Lochs aus
        cubeCamera.update(renderer, scene);
        // Zeige das Schwarze Loch wieder an, damit es gerendert werden kann
        blackHole.visible = true;
    }

    if (ship) {
        const shipRadius = 5;
        const previousPosition = ship.position.clone();
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
        const collisionThreshold = shipRadius + blackHole.geometry.parameters.radius;
        if (ship.position.distanceTo(blackHole.position) < collisionThreshold) {
            ship.position.copy(previousPosition);
        }
    }

    // --- Restliche Animation (unverändert) ---
    if (cameraFingerId === null) { /* ... */ }
    if (cameraHolder.rotation.x > ROTATION_LIMIT) { /* ... */ }
    /* ... (restlicher Code bleibt exakt gleich) ... */

    renderer.render(scene, camera);
}
// (Der Rest der Logik wie die Steuerungshandler und die `animate`-Funktion bleibt gleich)
