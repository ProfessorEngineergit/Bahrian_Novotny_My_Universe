import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// === Grund-Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'label-container';
document.body.appendChild(labelRenderer.domElement);

// === UI Elemente ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
const infoElement = document.getElementById('info');
const joystickZone = document.getElementById('joystick-zone');
const muteButton = document.getElementById('mute-button');
const analyzeButton = document.getElementById('analyze-button');
const audio = document.getElementById('media-player');

// === Szenerie-Setup ===
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);
let galaxy; function createGalaxy() { /* ... */ } createGalaxy();

// === NEU: Klasse zur Verwaltung von Himmelskörpern ===
const celestialObjects = [];
const TRAIL_POINTS = 200; // Anzahl der Punkte in der Umlaufbahnspur

class CelestialObject {
    constructor({ name, isBlackHole = false, color = 0xffffff, orbitalRadius = 0, orbitalSpeed = 0 }) {
        this.name = name;
        this.isBlackHole = isBlackHole;
        this.orbitalRadius = orbitalRadius;
        this.orbitalSpeed = orbitalSpeed;
        this.angle = Math.random() * Math.PI * 2; // Zufällige Startposition in der Umlaufbahn

        if (isBlackHole) {
            this.core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
            // ... (Gravitationslinse und Akkretionsscheibe) ...
        } else {
            this.core = new THREE.Mesh(
                new THREE.SphereGeometry(2, 32, 32),
                new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })
            );
        }
        scene.add(this.core);

        // Label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = this.name;
        const lineDiv = document.createElement('div');
        lineDiv.className = 'label-line';
        labelDiv.appendChild(lineDiv);
        this.label = new CSS2DObject(labelDiv);
        this.label.position.set(0, 7, 0);
        this.core.add(this.label); // Heften das Label an den Kern

        // Grenzkreis
        this.boundary = new THREE.Mesh(new THREE.RingGeometry(12, 12.2, 64), new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
        this.boundary.rotation.x = Math.PI / 2;
        scene.add(this.boundary);

        // Orbitalspur
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(TRAIL_POINTS * 3);
        const trailColors = new Float32Array(TRAIL_POINTS * 3);
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
        const trailMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        scene.add(this.trail);
    }

    update(elapsedTime, shipPosition) {
        // Umlaufbahnbewegung
        this.angle += this.orbitalSpeed;
        this.core.position.x = Math.cos(this.angle) * this.orbitalRadius;
        this.core.position.z = Math.sin(this.angle) * this.orbitalRadius;

        // Grenzkreis-Update
        this.boundary.position.copy(this.core.position);
        const pulse = Math.sin(elapsedTime * 0.8 + this.angle) * 0.5 + 0.5;
        this.boundary.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
        this.boundary.material.opacity = 0.3 + pulse * 0.4;

        // Label-Ausrichtung
        const labelAngle = Math.atan2(shipPosition.x - this.core.position.x, shipPosition.z - this.core.position.z);
        this.label.element.style.transform = `rotate(${labelAngle}rad)`;

        // Orbitalspur-Update
        const positions = this.trail.geometry.attributes.position.array;
        const colors = this.trail.geometry.attributes.color.array;
        // Verschiebe alle Punkte um eine Position nach hinten
        for (let i = positions.length - 1; i > 2; i -= 3) {
            positions[i] = positions[i - 3];
            positions[i - 1] = positions[i - 4];
            positions[i - 2] = positions[i - 5];
        }
        // Setze den neuen Punkt am Anfang
        positions[0] = this.core.position.x;
        positions[1] = this.core.position.y;
        positions[2] = this.core.position.z;
        // Aktualisiere die Farben für den Fade-Effekt
        for (let i = 0; i < TRAIL_POINTS; i++) {
            const alpha = 1.0 - (i / TRAIL_POINTS); // Linearer Fade-out
            const color = new THREE.Color(0x00aaff);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b * alpha; // Fade-out über Blau-Kanal (oder anpassen)
        }
        this.trail.geometry.attributes.position.needsUpdate = true;
        this.trail.geometry.attributes.color.needsUpdate = true;
    }
}

// === Erstelle die Himmelsobjekte ===
celestialObjects.push(new CelestialObject({ name: 'Project_Mariner', isBlackHole: true }));
for (let i = 2; i <= 7; i++) {
    celestialObjects.push(new CelestialObject({
        name: `Kopie ${i}`,
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
        orbitalRadius: 20 + i * 8,
        orbitalSpeed: 0.005 - i * 0.0005
    }));
}

let ship; let forcefield; const cameraPivot = new THREE.Object3D(); const cameraHolder = new THREE.Object3D();
function createForcefield(radius) { /* ... */ }

let isIntroAnimationPlaying = false;
let activeAnalyzeObject = null; // NEU

// === GLTF Modell-Lader ===
const loader = new GLTFLoader(); const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => {
    progressBar.style.width = '100%'; loadingText.textContent = 'Tippen zum Starten';
    ship = gltf.scene; scene.add(ship); ship.position.set(0, 0, -30);
    forcefield = createForcefield(5.1); ship.add(forcefield);
    ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
    camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position); cameraPivot.rotation.y = Math.PI;
    loadingScreen.addEventListener('click', () => {
        loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.style.display = 'none', 500);
        audio.play(); isIntroAnimationPlaying = true;
        infoElement.classList.add('ui-visible'); joystickZone.classList.add('ui-visible'); muteButton.classList.add('ui-visible');
        animate();
    }, { once: true });
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });


// === Steuerung und Animation ===
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8; const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0); let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03; const DAMPING = 0.90; const LERP_FACTOR = 0.05;
let cameraFingerId = null; let initialPinchDistance = 0; let previousTouch = { x: 0, y: 0 };
muteButton.addEventListener('click', () => { audio.muted = !audio.muted; muteButton.classList.toggle('muted'); });
nipplejs.create({ /* ... */ });
renderer.domElement.addEventListener('touchstart', (e) => { /* ... */ }, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { /* ... */ }, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => { /* ... */ });
function getPinchDistance(e) { /* ... */ }

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    let objectCurrentlyInRange = null;

    // Updates für alle Himmelsobjekte
    for (const obj of celestialObjects) {
        if (ship) {
            obj.update(elapsedTime, ship.position);
            // Prüfe, ob das Schiff im Grenzkreis dieses Objekts ist
            const distanceToCenter = ship.position.distanceTo(obj.core.position);
            const circleCurrentRadius = obj.boundary.geometry.parameters.outerRadius * obj.boundary.scale.x;
            if (distanceToCenter < circleCurrentRadius) {
                objectCurrentlyInRange = obj;
            }
        }
    }
    
    // Logik für den Analyze-Button
    if (objectCurrentlyInRange) {
        if (activeAnalyzeObject !== objectCurrentlyInRange) {
            activeAnalyzeObject = objectCurrentlyInRange;
            analyzeButton.textContent = `Analyze ${activeAnalyzeObject.name}`;
            analyzeButton.classList.add('ui-visible');
        }
    } else {
        if (activeAnalyzeObject !== null) {
            activeAnalyzeObject = null;
            analyzeButton.classList.remove('ui-visible');
        }
    }
    
    // Schiffsbewegung und Kollision
    if (ship) {
        const shipRadius = 5;
        const previousPosition = ship.position.clone();
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
        // Kollision mit allen Objekten prüfen
        for (const obj of celestialObjects) {
            const objectRadius = obj.core.geometry.parameters.radius;
            const collisionThreshold = shipRadius + objectRadius;
            if (ship.position.distanceTo(obj.core.position) < collisionThreshold) {
                ship.position.copy(previousPosition);
                if (forcefield) { forcefield.visible = true; forcefield.material.opacity = 1.0; }
                break; // Breche die Schleife nach der ersten Kollision ab
            }
        }
    }

    // Kamera-Steuerung
    if (isIntroAnimationPlaying) { /* ... */ } else { /* ... */ }
    
    // Allgemeine Logik
    if (forcefield && forcefield.visible) { /* ... */ }
    // ... (Gravitationslinse und Renderer-Aufrufe) ...
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

window.addEventListener('resize', () => { /* ... */ });
