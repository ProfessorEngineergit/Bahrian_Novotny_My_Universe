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

// === GLTF Modell-Lader (unverändert) ===
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => {
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
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = `${(xhr.loaded / xhr.total) * 100}%`; },
   (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });

// === Steuerung und Animation ===
let shipMove = { forward: 0, turn: 0 };
// NEU: Rotationslimit um ca. 10% erhöht
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8;
const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03;
const DAMPING = 0.90;
const LERP_FACTOR = 0.05;

// Joystick (unverändert)
nipplejs.create({ /* ... */ }).on('move', (evt, data) => { /* ... */ });

// --- NEUES, MULTITOUCH-FÄHIGES SYSTEM ---
let activeCameraTouches = {}; // Verfolgt Finger, die die Kamera steuern
let initialPinchDistance = 0;
let isInteractingWithCamera = false; // Wird true, wenn Finger die Kamera bewegen

renderer.domElement.addEventListener('touchstart', (e) => {
    // Gehe durch alle neuen Finger, die den Bildschirm berühren
    for (let touch of e.changedTouches) {
        // Ignoriere den Finger, wenn er auf dem Joystick ist
        if (touch.target.closest('#joystick-zone')) continue;
        
        // Füge den Finger zur Liste der aktiven Kamera-Finger hinzu
        activeCameraTouches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
    }
    isInteractingWithCamera = Object.keys(activeCameraTouches).length > 0;
    if(isInteractingWithCamera) {
        cameraVelocity.set(0, 0);
        zoomVelocity = 0;
    }
    if(Object.keys(activeCameraTouches).length === 2) {
        const touches = Object.values(activeCameraTouches);
        initialPinchDistance = getPinchDistance(touches[0], touches[1]);
    }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchIds = Object.keys(activeCameraTouches);
    
    // Fall 1: Ein-Finger-Drag für Rotation
    if (touchIds.length === 1) {
        const touchId = touchIds[0];
        const currentTouch = Array.from(e.touches).find(t => t.identifier == touchId);
        if(!currentTouch) return;

        const lastPos = activeCameraTouches[touchId];
        const deltaX = currentTouch.clientX - lastPos.x;
        const deltaY = currentTouch.clientY - lastPos.y;
        
        cameraVelocity.x += deltaY * 0.0002;
        cameraVelocity.y -= deltaX * 0.0002;

        activeCameraTouches[touchId] = { x: currentTouch.clientX, y: currentTouch.clientY };
    } 
    // Fall 2: Zwei-Finger-Pinch für Zoom
    else if (touchIds.length === 2) {
        const t1 = Array.from(e.touches).find(t => t.identifier == touchIds[0]);
        const t2 = Array.from(e.touches).find(t => t.identifier == touchIds[1]);
        if(!t1 || !t2) return;

        const currentPinchDistance = getPinchDistance(t1, t2);
        zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03;
        initialPinchDistance = currentPinchDistance;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => {
    for (let touch of e.changedTouches) {
        delete activeCameraTouches[touch.identifier];
    }
    isInteractingWithCamera = Object.keys(activeCameraTouches).length > 0;
});

function getPinchDistance(t1, t2) {
    return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
}


// --- Animations-Schleife mit angepasster Physik ---
function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
    }
    
    // --- KAMERAPHYSIK ---
    // A. Return-to-Center (nur wenn kein Finger die Kamera berührt)
    if (!isInteractingWithCamera) {
        cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
        cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
    }

    // B. Federung an den Rotations-Grenzen
    if (cameraHolder.rotation.x > ROTATION_LIMIT) cameraVelocity.x -= (cameraHolder.rotation.x - ROTATION_LIMIT) * SPRING_STIFFNESS;
    else if (cameraHolder.rotation.x < -ROTATION_LIMIT) cameraVelocity.x -= (cameraHolder.rotation.x + ROTATION_LIMIT) * SPRING_STIFFNESS;
    if (cameraPivot.rotation.y > ROTATION_LIMIT) cameraVelocity.y -= (cameraPivot.rotation.y - ROTATION_LIMIT) * SPRING_STIFFNESS;
    else if (cameraPivot.rotation.y < -ROTATION_LIMIT) cameraVelocity.y -= (cameraPivot.rotation.y + ROTATION_LIMIT) * SPRING_STIFFNESS;
    
    // C. Geschwindigkeiten anwenden und dämpfen
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    zoomDistance += zoomVelocity;
    
    cameraVelocity.multiplyScalar(DAMPING);
    zoomVelocity *= DAMPING;

    // NEU: Harter Stopp für den Zoom (keine Federung)
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    if (zoomDistance <= minZoom || zoomDistance >= maxZoom) {
        zoomVelocity = 0;
    }

    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);
    
    // Sternenbewegung
    stars1.position.z += stars1.userData.speed;
    if (stars1.position.z > 2000) stars1.position.z -= 4000;
    stars2.position.z += stars2.userData.speed;
    if (stars2.position.z > 2000) stars2.position.z -= 4000;

    renderer.render(scene, camera);
}

// (Restlicher Code wie nipplejs und resize-Handler bleibt gleich, hier zur Übersicht weggelassen)
nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120
}).on('move', (evt, data) => {
    if (data.vector && ship) {
        shipMove.forward = data.vector.y * 0.1;
        shipMove.turn = -data.vector.x * 0.05;
    }
}).on('end', () => shipMove = { forward: 0, turn: 0 });
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
