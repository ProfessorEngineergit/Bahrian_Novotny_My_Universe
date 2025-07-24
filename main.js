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

// === UI, Beleuchtung, Sterne (unverändert) ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);
function createStarField(count, size, speed) { /* ... Code aus voriger Antwort ... */ }
const stars1 = createStarField(10000, 0.1, 0.1);
const stars2 = createStarField(12000, 0.2, 0.05);

// === Hauptobjekt und Kamera-Setup ===
let ship;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(
    modelURL,
    (gltf) => {
        progressBar.style.width = '100%';
        loadingText.textContent = 'Modell geladen!';
        ship = gltf.scene;
        scene.add(ship);
        ship.add(cameraPivot);
        cameraPivot.add(cameraHolder);
        cameraHolder.add(camera);
        camera.position.set(0, 4, -15);
        camera.lookAt(cameraHolder.position);
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }, 300);
        animate();
    },
    (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; },
    (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; }
);

// === Steuerung und Physik-Parameter ===
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.3;
const INITIAL_ZOOM = 15; // Die Ruheposition des Zooms
let zoomDistance = INITIAL_ZOOM;
const minZoom = 8;
const maxZoom = 25;

let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const DAMPING = 0.92; // Ausklang-Stärke

// NEUE PHYSIK-KONSTANTEN
const SPRING_STRENGTH_RETURN = 0.0005; // Kraft, die zur Mitte zurückzieht
const SPRING_STRENGTH_BOUNDARY = 0.01; // Kraft, die an den Rändern zurückstößt
const SOFTZONE_THRESHOLD = 0.8; // Bei 80% des Limits startet der "Reverb"

// === Event Listener ===
let isDragging = false;
let previousTouch = { x: 0, y: 0 };
let initialPinchDistance = 0;
nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120
}).on('move', (evt, data) => {
    if (data.vector && ship) {
        shipMove.forward = data.vector.y * 0.1;
        shipMove.turn = -data.vector.x * 0.05;
    }
}).on('end', () => shipMove = { forward: 0, turn: 0 });

renderer.domElement.addEventListener('touchstart', (e) => {
    if (e.target.closest('#joystick-zone')) return;
    if (e.touches.length === 1) {
        isDragging = true;
        cameraVelocity.set(0, 0); // Stoppe den Ausklang bei neuer Berührung
        previousTouch.x = e.touches[0].clientX;
        previousTouch.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        zoomVelocity = 0; // Stoppe Zoom-Ausklang
        initialPinchDistance = getPinchDistance(e);
    }
}, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousTouch.x;
        const deltaY = e.touches[0].clientY - previousTouch.y;
        cameraVelocity.x += deltaY * 0.0002;
        cameraVelocity.y -= deltaX * 0.0002;
        previousTouch.x = e.touches[0].clientX;
        previousTouch.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const currentPinchDistance = getPinchDistance(e);
        // KORREKTUR: Zoom-Bewegung ist jetzt langsamer
        zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.01;
        initialPinchDistance = currentPinchDistance;
    }
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => {
    isDragging = false; // Wichtig für die Rückkehr-Logik
});
function getPinchDistance(e) { /* ... unverändert ... */ }

// === Animations-Schleife mit neuer Physik ===
function animate() {
    requestAnimationFrame(animate);

    // Schiffsbewegung und Sterne (unverändert)
    if (ship) ship.translateZ(shipMove.forward);
    if (ship) ship.rotateY(shipMove.turn);
    stars1.position.z += stars1.userData.speed;
    if (stars1.position.z > 2000) stars1.position.z -= 4000;
    stars2.position.z += stars2.userData.speed;
    if (stars2.position.z > 2000) stars2.position.z -= 4000;

    // --- NEUE FEDER-PHYSIK ---

    // 1. Sanfte Rückkehr zur Mitte, wenn der Nutzer NICHT interagiert
    if (!isDragging) {
        // Rotation zur Mitte ziehen
        cameraVelocity.x += (0 - cameraHolder.rotation.x) * SPRING_STRENGTH_RETURN;
        cameraVelocity.y += (0 - cameraPivot.rotation.y) * SPRING_STRENGTH_RETURN;
        // Zoom zur Mitte ziehen
        zoomVelocity += (INITIAL_ZOOM - zoomDistance) * SPRING_STRENGTH_RETURN;
    }

    // 2. Weiche Grenzen (Reverb/Soft-Zone), die immer aktiv sind
    const softLimitX = ROTATION_LIMIT * SOFTZONE_THRESHOLD;
    if (cameraHolder.rotation.x > softLimitX) {
        cameraVelocity.x -= (cameraHolder.rotation.x - softLimitX) * SPRING_STRENGTH_BOUNDARY;
    } else if (cameraHolder.rotation.x < -softLimitX) {
        cameraVelocity.x -= (cameraHolder.rotation.x - -softLimitX) * SPRING_STRENGTH_BOUNDARY;
    }
    // (Gleiche Logik für die Y-Rotation)
    const softLimitY = ROTATION_LIMIT * SOFTZONE_THRESHOLD;
    if (cameraPivot.rotation.y > softLimitY) {
        cameraVelocity.y -= (cameraPivot.rotation.y - softLimitY) * SPRING_STRENGTH_BOUNDARY;
    } else if (cameraPivot.rotation.y < -softLimitY) {
        cameraVelocity.y -= (cameraPivot.rotation.y - -softLimitY) * SPRING_STRENGTH_BOUNDARY;
    }
    // (Gleiche Logik für den Zoom)
    if (zoomDistance > maxZoom) {
        zoomVelocity -= (zoomDistance - maxZoom) * SPRING_STRENGTH_BOUNDARY;
    } else if (zoomDistance < minZoom) {
        zoomVelocity -= (zoomDistance - minZoom) * SPRING_STRENGTH_BOUNDARY;
    }

    // 3. Finale Bewegung und Dämpfung anwenden
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    zoomDistance += zoomVelocity;
    
    cameraVelocity.multiplyScalar(DAMPING);
    zoomVelocity *= DAMPING;

    // 4. Szene rendern
    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
