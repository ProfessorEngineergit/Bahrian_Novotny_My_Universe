import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// === Grund-Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === UI Elemente ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');

// === Beleuchtung und Sterne ===
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 7);
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
const stars1 = createStarField(6000, 0.5, 0.1);
const stars2 = createStarField(8000, 0.8, 0.05);

// === Hauptobjekt und Kamera-Setup ===
let ship;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

// === GLTF Modell-Lader mit Draco ===
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

const modelURL = 'https://professorengineergit.github.io/Project_Mariner/downscaled_USS_Enterprise_D.glb';

loader.load(
    modelURL,
    function (gltf) {
        progressBar.style.width = '100%';
        loadingText.textContent = 'Modell geladen!';

        ship = gltf.scene;

        // KORREKTUR 1: Das Modell drastisch verkleinern.
        ship.scale.set(0.01, 0.01, 0.01);

        const engineGlow = new THREE.PointLight(0x00aaff, 3, 20);
        engineGlow.position.set(0, 0.5, -2);
        ship.add(engineGlow);
        scene.add(ship);
        
        ship.add(cameraPivot);
        cameraPivot.add(cameraHolder);
        cameraHolder.add(camera);

        // KORREKTUR 2: Die Kamera VIEL weiter weg positionieren.
        camera.position.set(0, 30, -80);
        camera.lookAt(cameraHolder.position);
        
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }, 300);
        
        animate();
    },
    function(xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            progressBar.style.width = percentComplete + '%';
        }
    },
    function (error) {
        console.error('Ein Fehler ist aufgetreten', error);
        loadingText.textContent = "Fehler! Prüfe die Browser-Konsole (F12).";
    }
);


// === Steuerung und Animation ===

// KORREKTUR 3: Die Zoom-Parameter an den neuen Abstand anpassen.
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.3;
let zoomDistance = Math.sqrt(30*30 + 80*80); // Exakter Startabstand der Kamera
const INITIAL_ZOOM = zoomDistance;
const ZOOM_LIMIT = INITIAL_ZOOM * 0.5; // Erlaube 50% Zoom
let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const DAMPING = 0.92;

nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120
}).on('move', (evt, data) => {
    if (data.vector) {
        shipMove.forward = data.vector.y * 0.5;
        shipMove.turn = -data.vector.x * 0.05;
    }
}).on('end', () => shipMove = { forward: 0, turn: 0 });

let isDragging = false;
let previousTouch = { x: 0, y: 0 };
let initialPinchDistance = 0;

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
        zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03; // Zoomempfindlichkeit angepasst
        initialPinchDistance = currentPinchDistance;
    }
}, { passive: false });

renderer.domElement.addEventListener('touchend', () => isDragging = false);

function getPinchDistance(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

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

    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    cameraVelocity.multiplyScalar(DAMPING);

    zoomDistance += zoomVelocity;
    zoomVelocity *= DAMPING;

    cameraHolder.rotation.x = THREE.MathUtils.clamp(cameraHolder.rotation.x, -ROTATION_LIMIT, ROTATION_LIMIT);
    cameraPivot.rotation.y = THREE.MathUtils.clamp(cameraPivot.rotation.y, -ROTATION_LIMIT, ROTATION_LIMIT);
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, INITIAL_ZOOM - ZOOM_LIMIT, INITIAL_ZOOM + ZOOM_LIMIT);
    
    if (zoomDistance <= (INITIAL_ZOOM - ZOOM_LIMIT) || zoomDistance >= (INITIAL_ZOOM + ZOOM_LIMIT)) {
        zoomVelocity = 0;
    }

    camera.position.normalize().multiplyScalar(zoomDistance);
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
