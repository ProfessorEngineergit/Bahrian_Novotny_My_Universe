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

// === UI und Beleuchtung (unverändert) ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// === Galaxie und Schwarzes Loch ===
let galaxy;
function createGalaxy() { /* ... unverändert ... */ }
createGalaxy();
const blackHole = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
scene.add(blackHole);


// === Hauptobjekt und Kollisions-Setup ===
let ship;
// NEU: Die "Sicherheitsblase", die sich mit dem Schiff bewegt
let shipBoundingSphere = new THREE.Sphere(); 
let shipRadius = 0; // Wird nach dem Laden des Modells gesetzt

const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

// === GLTF Modell-Lader ===
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => {
    progressBar.style.width = '100%'; loadingText.textContent = 'Modell geladen!';
    ship = gltf.scene;
    scene.add(ship);
    
    // NEU: Berechne die Größe der Sicherheitsblase einmal
    const shipBox = new THREE.Box3().setFromObject(ship);
    shipBox.getBoundingSphere(shipBoundingSphere);
    shipRadius = shipBoundingSphere.radius;

    ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
    camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position);
    setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.style.display = 'none', 500); }, 300);
    animate();
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });


// === Steuerung und Animation ===
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
// (Joystick- und Touch-Handler sind unverändert)
nipplejs.create({ /*...*/ });
renderer.domElement.addEventListener('touchstart', (e) => { /*...*/ }, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { /*...*/ }, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => { /*...*/ });
function getPinchDistance(e) { /*...*/ }


// --- Die Animations-Schleife mit der neuen Kollisionslogik ---
function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        // Speichere die Position VOR der Bewegung
        const previousPosition = ship.position.clone();

        // Wende die Bewegung an
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);

        // --- KOLLISIONSLOGIK ---
        
        // 1. Aktualisiere die Position der unsichtbaren "Sicherheitsblase"
        shipBoundingSphere.center.copy(ship.position);
        
        // 2. Kollision mit dem Schwarzen Loch
        const blackHoleRadius = blackHole.geometry.parameters.radius;
        const collisionThreshold = shipRadius + blackHoleRadius + 1; // +1 Puffer
        const distanceToBlackHole = ship.position.distanceTo(blackHole.position);

        if (distanceToBlackHole < collisionThreshold) {
            // Wenn zu nah, setze die Position auf die von vor dem Frame zurück
            ship.position.copy(previousPosition);
        }

        // 3. Partikel-Verdrängung (performanter Trick)
        const particlePositions = galaxy.geometry.attributes.position;
        const repulsionRadius = shipRadius * 2.5; // Größerer Radius für die Verdrängung
        const particleVector = new THREE.Vector3();

        // HINWEIS: Dies ist eine rechenintensive Operation.
        // Wir prüfen nur jeden 10. Partikel, um die Performance zu wahren.
        for (let i = 0; i < particlePositions.count; i += 10) {
            particleVector.fromBufferAttribute(particlePositions, i);
            const distance = particleVector.distanceTo(ship.position);

            if (distance < repulsionRadius) {
                const repulsionForce = (repulsionRadius - distance) / repulsionRadius;
                const direction = particleVector.sub(ship.position).normalize();
                const displacement = direction.multiplyScalar(repulsionForce * 0.1);
                
                // Wende die Verschiebung an
                particlePositions.setXYZ(
                    i,
                    particlePositions.getX(i) + displacement.x,
                    particlePositions.getY(i) + displacement.y,
                    particlePositions.getZ(i) + displacement.z
                );
            }
        }
        // Wichtig: Sagt Three.js, dass die Partikelpositionen neu berechnet werden müssen
        particlePositions.needsUpdate = true;
    }
    
    // --- Restliche Animation (unverändert) ---
    if (cameraFingerId === null) { /* ... Kamera kehrt zurück ... */ }
    if (cameraHolder.rotation.x > ROTATION_LIMIT) { /* ... Federung ... */ }
    // ... (der Rest der Kamera-Physik und des Renderings bleibt gleich)
}
