import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// === Grund-Setup (unverändert) ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// === UI, Beleuchtung, Sterne (unverändert) ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);
function createStarField(count, size, speed) { /* ... Code ... */ }
const stars1 = createStarField(6000, 0.5, 0.1);
const stars2 = createStarField(8000, 0.8, 0.05);

// === Hauptobjekt und Kamera-Setup ===
let ship;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

// === Steuerungs-Variablen (werden jetzt im Lader gesetzt) ===
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.3;
let zoomDistance;
let minZoom, maxZoom; // Werden dynamisch gesetzt
let cameraVelocity = new THREE.Vector2(0, 0);
let zoomVelocity = 0;
const DAMPING = 0.92;

// === GLTF Modell-Lader ===
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
        ship.scale.set(0.01, 0.01, 0.01);
        
        scene.add(ship);
        
        // KORREKTUR: Dynamische Zoom-Grenzen basierend auf dem Modell berechnen
        // 1. Erstelle eine "Box", die das Modell umschließt, um die Größe zu messen.
        const boundingBox = new THREE.Box3().setFromObject(ship);
        const boundingSphere = new THREE.Sphere();
        boundingBox.getBoundingSphere(boundingSphere);
        const modelRadius = boundingSphere.radius;

        // 2. Setze die Kamera basierend auf dieser Größe auf eine gute Startposition.
        const initialCameraOffset = modelRadius * 6; // Startabstand = 6x der Modellradius
        camera.position.set(0, modelRadius * 2, -initialCameraOffset);
        
        // 3. Setze die dynamischen Zoom-Grenzwerte
        zoomDistance = camera.position.length();
        minZoom = modelRadius * 1.1; // Minimaler Abstand: 110% des Radius (verhindert Clipping)
        maxZoom = zoomDistance * 1.5; // Maximaler Abstand

        // Kamera-Setup
        ship.add(cameraPivot);
        cameraPivot.add(cameraHolder);
        cameraHolder.add(camera);
        camera.lookAt(cameraHolder.position);
        
        const engineGlow = new THREE.PointLight(0x00aaff, modelRadius, modelRadius * 2);
        engineGlow.position.set(0, 0.5, -2); // Position anpassen falls nötig
        ship.add(engineGlow);

        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }, 300);
        
        animate();
    },
    function(xhr) { /* ... unverändert ... */ },
    function (error) { /* ... unverändert ... */ }
);


// === Steuerung und Animation ===
nipplejs.create({ /* ... unverändert ... */ }).on('move', (evt, data) => {
    if (data.vector) {
        shipMove.forward = data.vector.y * modelRadius * 0.05; // Bewegung an Modellgröße anpassen
        shipMove.turn = -data.vector.x * 0.05;
    }
}).on('end', () => shipMove = { forward: 0, turn: 0 });

// (Touch-Event-Listener sind unverändert)
let isDragging = false;
let previousTouch = { x: 0, y: 0 };
let initialPinchDistance = 0;
renderer.domElement.addEventListener('touchstart', (e) => { /* ... unverändert ... */ });
renderer.domElement.addEventListener('touchmove', (e) => { /* ... unverändert ... */ });
renderer.domElement.addEventListener('touchend', () => isDragging = false);
function getPinchDistance(e) { /* ... unverändert ... */ }


function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
    }

    // (Sternenbewegung unverändert)
    stars1.position.z += stars1.userData.speed;
    if (stars1.position.z > 2000) stars1.position.z -= 4000;
    stars2.position.z += stars2.userData.speed;
    if (stars2.position.z > 2000) stars2.position.z -= 4000;

    // (Kameradrehung mit Ausklang unverändert)
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    cameraVelocity.multiplyScalar(DAMPING);

    // (Zoom mit Ausklang unverändert)
    zoomDistance += zoomVelocity;
    zoomVelocity *= DAMPING;

    // KORREKTUR: Wende die neuen, dynamischen Zoom-Grenzen an
    cameraHolder.rotation.x = THREE.MathUtils.clamp(cameraHolder.rotation.x, -ROTATION_LIMIT, ROTATION_LIMIT);
    cameraPivot.rotation.y = THREE.MathUtils.clamp(cameraPivot.rotation.y, -ROTATION_LIMIT, ROTATION_LIMIT);
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    
    // Stoppe die Zoom-Geschwindigkeit an den Grenzen
    if (zoomDistance <= minZoom || zoomDistance >= maxZoom) {
        zoomVelocity = 0;
    }

    camera.position.normalize().multiplyScalar(zoomDistance);
    
    renderer.render(scene, camera);
}

// (Resize-Handler unverändert)
window.addEventListener('resize', () => { /* ... unverändert ... */ });
