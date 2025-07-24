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
function createStarField(count, size, speed) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < count; i++) {
        vertices.push(
            (Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ size: size, transparent: true, opacity: Math.random() * 0.5 + 0.3 });
    const stars = new THREE.Points(geometry, material);
    stars.userData.speed = speed;
    scene.add(stars);
    return stars;
}
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
const ROTATION_LIMIT = Math.PI * 0.33; // Größeres Limit
let zoomDistance = 15;
const minZoom = 8;
const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03;
const DAMPING = 0.90;
const LERP_FACTOR = 0.05;

// --- ROBUSTE MULTITOUCH-STEUERUNG ---
let cameraFingerId = null;
let initialPinchDistance = 0;

// Joystick bleibt unverändert
nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120
}).on('move', (evt, data) => {
    if (data.vector && ship) {
        shipMove.forward = data.vector.y * 0.1;
        shipMove.turn = -data.vector.x * 0.05;
    }
}).on('end', () => shipMove = { forward: 0, turn: 0 });

// Die neuen, sichereren Touch-Handler
renderer.domElement.addEventListener('touchstart', (e) => {
    // Zuerst prüfen, ob der Touch auf dem Joystick ist. Wenn ja, nichts tun.
    const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone'));
    if (joystickTouch) return;
    
    e.preventDefault();

    for (const touch of e.changedTouches) {
        if (cameraFingerId === null) {
            cameraFingerId = touch.identifier;
            cameraVelocity.set(0, 0);
            previousTouch.x = touch.clientX;
            previousTouch.y = touch.clientY;
        }
    }
    if (e.touches.length >= 2) {
        initialPinchDistance = getPinchDistance(e);
        zoomVelocity = 0;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
    const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone'));
    if (joystickTouch) return;
    
    e.preventDefault();

    for (const touch of e.changedTouches) {
        if (touch.identifier === cameraFingerId) {
            const deltaX = touch.clientX - previousTouch.x;
            const deltaY = touch.clientY - previousTouch.y;
            cameraVelocity.x += deltaY * 0.0002;
            cameraVelocity.y -= deltaX * 0.0002;
            previousTouch.x = touch.clientX;
            previousTouch.y = touch.clientY;
        }
    }
    if (e.touches.length >= 2) {
        const currentPinchDistance = getPinchDistance(e);
        zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03;
        initialPinchDistance = currentPinchDistance;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
        if (touch.identifier === cameraFingerId) {
            cameraFingerId = null; // Finger ist weg, Kamera kann zur Mitte zurückkehren
        }
    }
    if (e.touches.length < 2) {
        initialPinchDistance = 0;
    }
});

function getPinchDistance(e) {
    // Greift auf die ersten beiden Finger im allgemeinen Touches-Array zu
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// --- Die Animations-Schleife ---
let previousTouch = { x: 0, y: 0 };
function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
    }
    
    // Wenn kein Finger die Kamera steuert, kehre zur Mitte zurück
    if (cameraFingerId === null) {
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
    zoomVelocity *= DAMPING;

    // Harter Stopp für den Zoom
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    if (zoomDistance === minZoom || zoomDistance === maxZoom) {
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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
