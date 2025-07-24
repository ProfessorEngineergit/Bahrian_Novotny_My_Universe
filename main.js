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

// === UI, Beleuchtung ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// === HILFSFUNKTIONEN (waren vorher fehlerhaft/fehlend) ===
function createStarField(count, size, speed) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < count; i++) {
        vertices.push(
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ size, transparent: true, opacity: Math.random() * 0.5 + 0.3 });
    const stars = new THREE.Points(geometry, material);
    stars.userData.speed = speed;
    scene.add(stars);
    return stars;
}

function getPinchDistance(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// === Sterne erstellen ===
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
const INITIAL_ZOOM = 15;
let zoomDistance = INITIAL_ZOOM;
const minZoom = 8;
const maxZoom = 25;

let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const DAMPING = 0.92;

const SPRING_STRENGTH_RETURN = 0.0005;
const SPRING_STRENGTH_BOUNDARY = 0.01;
const SOFTZONE_THRESHOLD = 0.8;

// === Event Listener ===
let isDragging = false;
let isPinching = false;
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
        isPinching = false;
        cameraVelocity.set(0, 0);
        previousTouch.x = e.touches[0].clientX;
        previousTouch.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        isPinching = true;
        zoomVelocity = 0;
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
        isPinching = true;
        const currentPinchDistance = getPinchDistance(e);
        zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.01;
        initialPinchDistance = currentPinchDistance;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        isDragging = false;
        isPinching = false;
    } else if (e.touches.length === 1) {
        isPinching = false;
        // Wechsel von Pinch zu Drag vorbereiten
        isDragging = true;
        cameraVelocity.set(0, 0);
        previousTouch.x = e.touches[0].clientX;
        previousTouch.y = e.touches[0].clientY;
    }
});

// === Animations-Schleife mit korrekter Physik ===
function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
    }
    stars1.position.z += stars1.userData.speed;
    if (stars1.position.z > 2000) stars1.position.z -= 4000;
    stars2.position.z += stars2.userData.speed;
    if (stars2.position.z > 2000) stars2.position.z -= 4000;

    // --- Feder-Physik ---

    // Sanfte Rückkehr, wenn der Nutzer NICHT interagiert
    if (!isDragging && !isPinching) {
        cameraVelocity.x += (0 - cameraHolder.rotation.x) * SPRING_STRENGTH_RETURN;
        cameraVelocity.y += (0 - cameraPivot.rotation.y) * SPRING_STRENGTH_RETURN;
        zoomVelocity += (INITIAL_ZOOM - zoomDistance) * SPRING_STRENGTH_RETURN;
    }

    // Weiche Grenzen (Reverb/Soft-Zone)
    const softLimitX = ROTATION_LIMIT * SOFTZONE_THRESHOLD;
    if (cameraHolder.rotation.x > softLimitX) {
        cameraVelocity.x -= (cameraHolder.rotation.x - softLimitX) * SPRING_STRENGTH_BOUNDARY;
    } else if (cameraHolder.rotation.x < -softLimitX) {
        cameraVelocity.x -= (cameraHolder.rotation.x + softLimitX) * SPRING_STRENGTH_BOUNDARY;
    }

    const softLimitY = ROTATION_LIMIT * SOFTZONE_THRESHOLD;
    if (cameraPivot.rotation.y > softLimitY) {
        cameraVelocity.y -= (cameraPivot.rotation.y - softLimitY) * SPRING_STRENGTH_BOUNDARY;
    } else if (cameraPivot.rotation.y < -softLimitY) {
        cameraVelocity.y -= (cameraPivot.rotation.y + softLimitY) * SPRING_STRENGTH_BOUNDARY;
    }
    
    // Zoom-Grenzen
    if (zoomDistance > maxZoom) {
        zoomVelocity -= (zoomDistance - maxZoom) * SPRING_STRENGTH_BOUNDARY;
    } else if (zoomDistance < minZoom) {
        zoomVelocity -= (zoomDistance - minZoom) * SPRING_STRENGTH_BOUNDARY;
    }

    // Finale Bewegung und Dämpfung anwenden
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
