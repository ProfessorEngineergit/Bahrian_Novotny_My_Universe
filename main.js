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
function createStarField(count, size, speed) { /* ... Code ... */ }
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
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });

// === Steuerung und Animation ===
let shipMove = { forward: 0, turn: 0 };
// KORREKTUR 1: Rotationslimit um ca. 10% erhöht
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8;
const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0; // Wird nicht mehr für die Federung gebraucht, aber für den Ausklang
const SPRING_STIFFNESS = 0.03;
const DAMPING = 0.90;
const LERP_FACTOR = 0.05;

// --- MULTITOUCH-FÄHIGE STEUERUNG ---
// KORREKTUR 3: Wir verfolgen jetzt einzelne Finger
let cameraTouch = { id: null, x: 0, y: 0 };
let pinchInitialDistance = 0;

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
    // Verhindert, dass der Browser versucht, die Seite zu verschieben
    e.preventDefault(); 
    for (const touch of e.changedTouches) {
        // Ignoriere Touches, die auf dem Joystick starten
        if (touch.target.closest('#joystick-zone')) continue;
        
        // Der erste Finger, der nicht auf dem Joystick ist, steuert die Kamera
        if (cameraTouch.id === null) {
            cameraTouch.id = touch.identifier;
            cameraTouch.x = touch.clientX;
            cameraTouch.y = touch.clientY;
            cameraVelocity.set(0, 0); // Stoppe die Bewegung beim Berühren
        }
    }
    // Pinch-Zoom-Logik bleibt separat
    if (e.touches.length === 2) {
        pinchInitialDistance = getPinchDistance(e);
        zoomVelocity = 0;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        // Finde den Finger, der für die Kamera zuständig ist
        if (touch.identifier === cameraTouch.id) {
            const deltaX = touch.clientX - cameraTouch.x;
            const deltaY = touch.clientY - cameraTouch.y;
            cameraVelocity.x += deltaY * 0.0002;
            cameraVelocity.y -= deltaX * 0.0002;
            cameraTouch.x = touch.clientX;
            cameraTouch.y = touch.clientY;
        }
    }
    // Pinch-Zoom
    if (e.touches.length === 2) {
        const currentPinchDistance = getPinchDistance(e);
        zoomVelocity -= (currentPinchDistance - pinchInitialDistance) * 0.03;
        pinchInitialDistance = currentPinchDistance;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        // Wenn der Kamera-Finger losgelassen wird, setze ihn zurück
        if (touch.identifier === cameraTouch.id) {
            cameraTouch.id = null;
        }
    }
    // Wenn weniger als 2 Finger da sind, kann kein Pinch mehr stattfinden
    if (e.touches.length < 2) {
        pinchInitialDistance = 0;
    }
}, { passive: false });

function getPinchDistance(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// --- Die neue Animations-Schleife ---
function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
    }
    
    // --- KAMERAPHYSIK ---
    
    // Wenn kein Finger die Kamera steuert, kehre zur Mitte zurück
    if (cameraTouch.id === null) {
        cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
        cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
    }

    // Federung an den Rotationsgrenzen
    if (cameraHolder.rotation.x > ROTATION_LIMIT) {
        cameraVelocity.x -= (cameraHolder.rotation.x - ROTATION_LIMIT) * SPRING_STIFFNESS;
    } else if (cameraHolder.rotation.x < -ROTATION_LIMIT) {
        cameraVelocity.x -= (cameraHolder.rotation.x + ROTATION_LIMIT) * SPRING_STIFFNESS;
    }
    if (cameraPivot.rotation.y > ROTATION_LIMIT) {
        cameraVelocity.y -= (cameraPivot.rotation.y - ROTATION_LIMIT) * SPRING_STIFFNESS;
    } else if (cameraPivot.rotation.y < -ROTATION_LIMIT) {
        cameraVelocity.y -= (cameraPivot.rotation.y + ROTATION_LIMIT) * SPRING_STIFFNESS;
    }
    
    // Geschwindigkeiten anwenden und dämpfen
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    cameraVelocity.multiplyScalar(DAMPING);
    
    zoomDistance += zoomVelocity;
    zoomVelocity *= DAMPING; // Ausklang für den Zoom behalten

    // KORREKTUR 2: Harter Stopp für den Zoom mit clamp()
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    if (zoomDistance === minZoom || zoomDistance === maxZoom) {
        zoomVelocity = 0; // Stoppe die Geschwindigkeit, um "Kleben" zu verhindern
    }
    
    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);
    
    // Sternenbewegung
    stars1.position.z += stars1.userData.speed;
    if (stars1.position.z > 2000) stars1.position.z -= 4000;
    stars2.position.z += stars2.userData.speed;
    if (stars2.position.z > 2000) stars2.position.z -= 4000;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});```
