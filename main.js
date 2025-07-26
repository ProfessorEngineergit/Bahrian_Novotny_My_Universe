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

function createCircleTexture() { /* ... unverändert ... */ }

// === Die Funktion zum Erstellen der Galaxie (jetzt mit ShaderMaterial) ===
let galaxyMaterial; // Globale Variable für das Material, um es später zu aktualisieren

function createGalaxy() {
    const parameters = { /* ... unverändert ... */ };
    
    // (Geometrie- und Partikelpositions-Code bleibt unverändert)

    // NEU: ShaderMaterial anstelle von PointsMaterial
    const particleTexture = createCircleTexture();
    galaxyMaterial = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        uniforms: {
            uSize: { value: 0.15 * renderer.getPixelRatio() }, // Größe an Pixeldichte anpassen
            uTexture: { value: particleTexture },
            uShipPosition: { value: new THREE.Vector3(0, 0, 0) }, // Startposition des Schiffs
            uDisplacementRadius: { value: 8.0 } // Radius des "Kraftfelds" um das Schiff
        },
        vertexShader: `
            uniform float uSize;
            uniform vec3 uShipPosition;
            uniform float uDisplacementRadius;

            attribute vec3 color;
            varying vec3 vColor;

            void main() {
                vColor = color;
                vec3 pos = position;

                // Partikel-Verschiebung
                float distanceToShip = distance(pos, uShipPosition);
                if (distanceToShip < uDisplacementRadius) {
                    vec3 directionFromShip = normalize(pos - uShipPosition);
                    // smoothstep erzeugt einen weichen Übergang
                    float displacementFactor = smoothstep(uDisplacementRadius, 0.0, distanceToShip);
                    pos += directionFromShip * displacementFactor * (uDisplacementRadius * 0.5);
                }

                vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * modelViewPosition;
                gl_PointSize = uSize * (100.0 / -modelViewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            uniform sampler2D uTexture;

            void main() {
                float strength = distance(gl_PointCoord, vec2(0.5));
                if (strength > 0.5) {
                    discard;
                }
                gl_FragColor = vec4(vColor, 1.0) * texture2D(uTexture, gl_PointCoord);
            }
        `
    });

    const points = new THREE.Points(geometry, galaxyMaterial);
    scene.add(points);
}

createGalaxy();

// Galaxie-Kern (Schwarzes Loch)
const blackHoleGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
scene.add(blackHole);


// === Hauptobjekt und Kamera-Setup (unverändert) ===
let ship;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => { /* ... unverändert ... */ });


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

// (Joystick und Touch-Handler bleiben unverändert)


// --- Die neue Animations-Schleife mit Kollisions-Physik ---
function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        // Schiffsbewegung durch Benutzer
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);

        // NEU: Kollision mit dem Schwarzen Loch
        const distanceToBlackHole = ship.position.distanceTo(blackHole.position);
        const safeDistance = 5.0; // Sicherheitsabstand, größer als der Radius des Schwarzen Lochs
        
        if (distanceToBlackHole < safeDistance) {
            const penetrationDepth = safeDistance - distanceToBlackHole;
            const repulsionVector = new THREE.Vector3().subVectors(ship.position, blackHole.position).normalize();
            ship.position.add(repulsionVector.multiplyScalar(penetrationDepth));
        }

        // NEU: Schiffsposition an den Partikel-Shader senden
        if (galaxyMaterial) {
            galaxyMaterial.uniforms.uShipPosition.value.copy(ship.position);
        }
    }
    
    // (Restliche Kamera-Physik und -Steuerung bleibt unverändert)

    renderer.render(scene, camera);
}
// (Der Rest der animate-Funktion und die Event-Listener sind der Übersicht halber weggelassen, aber sie sind identisch zur vorherigen Version)
