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
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({
        size: size,
        transparent: true,
        opacity: Math.random() * 0.5 + 0.3
    });
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

loader.load(
    modelURL,
    function (gltf) {
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

// === Steuerung und Animation ===
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.3;
let zoomDistance = 15;
const minZoom = 8;
const maxZoom = 25;

let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;

// NEUE PHYSIK-KONSTANTEN
const SPRING_STIFFNESS = 0.03; // Wie stark die Feder zurückzieht
const DAMPING = 0.90; // Wie viel Reibung es gibt (verhindert endloses Wackeln)
const LERP_FACTOR = 0.05; // Wie schnell die Kamera zur Mitte zurückkehrt

// --- Event Listener (unverändert) ---
let isDragging = false;
let previousTouch = { x: 0, y: 0 };
let initialPinchDistance = 0;
// ... (Die kompletten Event-Listener für 'nipplejs', 'touchstart', 'touchmove', 'touchend' bleiben exakt gleich wie zuvor)
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
        cameraVelocity.set(0, 0);
        previousTouch.x = e.touches[0].clientX;
        previousTouch.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        isDragging = false;
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
        const currentPinchDistance = getPinchDistance(e);
        zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03;
        initialPinchDistance = currentPinchDistance;
    }
}, { passive: false });
renderer.domElement.addEventListener('touchend', () => isDragging = false);
function getPinchDistance(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}


// --- Die neue Animations-Schleife mit der Physik-Logik ---
function animate() {
    requestAnimationFrame(animate);

    // 1. Schiffsbewegung bleibt gleich
    if (ship) {
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
    }
    
    // --- NEUE KAMERAPHYSIK ---

    // A. LOGIK FÜR DIE KAMERA-ROTATION
    if (!isDragging) {
        // Wenn nicht berührt, kehre sanft zur Mitte zurück (Interpolation)
        cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
        cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
    }

    // B. LOGIK FÜR DIE FEDERUNG AN DEN GRENZEN
    // Rotation X (Hoch/Runter)
    if (cameraHolder.rotation.x > ROTATION_LIMIT) {
        const overshoot = cameraHolder.rotation.x - ROTATION_LIMIT;
        cameraVelocity.x -= overshoot * SPRING_STIFFNESS;
    } else if (cameraHolder.rotation.x < -ROTATION_LIMIT) {
        const overshoot = cameraHolder.rotation.x + ROTATION_LIMIT;
        cameraVelocity.x -= overshoot * SPRING_STIFFNESS;
    }

    // Rotation Y (Links/Rechts)
    if (cameraPivot.rotation.y > ROTATION_LIMIT) {
        const overshoot = cameraPivot.rotation.y - ROTATION_LIMIT;
        cameraVelocity.y -= overshoot * SPRING_STIFFNESS;
    } else if (cameraPivot.rotation.y < -ROTATION_LIMIT) {
        const overshoot = cameraPivot.rotation.y + ROTATION_LIMIT;
        cameraVelocity.y -= overshoot * SPRING_STIFFNESS;
    }
    
    // Zoom
    if (zoomDistance < minZoom) {
        const overshoot = zoomDistance - minZoom;
        zoomVelocity -= overshoot * SPRING_STIFFNESS;
    } else if (zoomDistance > maxZoom) {
        const overshoot = zoomDistance - maxZoom;
        zoomVelocity -= overshoot * SPRING_STIFFNESS;
    }

    // C. WENDE GESCHWINDIGKEITEN AN UND DÄMPFE SIE
    // Rotation: Wende die durch Nutzereingabe & Federung erzeugte Geschwindigkeit an
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    // Zoom: Wende die durch Nutzereingabe & Federung erzeugte Geschwindigkeit an
    zoomDistance += zoomVelocity;
    
    // Dämpfe alle Geschwindigkeiten, um einen sanften Stopp zu erzeugen
    cameraVelocity.multiplyScalar(DAMPING);
    zoomVelocity *= DAMPING;

    // --- PHYSIK-ENDE ---

    // Position der Kamera basierend auf dem (permanenten) Zoom setzen
    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);
    
    // Sternenbewegung
    stars1.position.z += stars1.userData.speed;
    if (stars1.position.z > 2000) stars1.position.z -= 4000;
    stars2.position.z += stars2.userData.speed;
    if (stars2.position.z > 2000) stars2.position.z -= 4000;

    renderer.render(scene, camera);
}

// (Resize-Handler unverändert)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
