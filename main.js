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

// === NEUE SHADER FÜR DIE PARTIKEL-INTERAKTION ===
const vertexShader = `
  uniform float uSize;
  uniform vec3 uShipPosition; // Die Position des Schiffs
  
  attribute vec3 color;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec3 pos = position;

    // Berechne den Abstand vom Partikel zum Schiff
    float distanceToShip = distance(pos, uShipPosition);
    float repulsionRadius = 10.0; // Der "Blasen"-Radius um das Schiff
    float repulsionStrength = 15.0; // Wie stark die Partikel weggeschoben werden

    // Berechne den Abstoßungs-Faktor (1.0 im Zentrum der Blase, 0.0 am Rand)
    float repulsionFactor = 1.0 - smoothstep(0.0, repulsionRadius, distanceToShip);
    
    // Berechne die Richtung, in die der Partikel weggeschoben wird
    vec3 directionFromShip = normalize(pos - uShipPosition);

    // Wende die Verschiebung an
    pos += directionFromShip * repulsionFactor * repulsionStrength;
    
    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = uSize * (1.0 / -modelViewPosition.z);
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    // Erzeugt runde, weiche Partikel
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = 1.0 - (strength * 2.0); // Invertieren und härtere Kante
    strength = pow(strength, 3.0); // Kontrast erhöhen

    if (strength < 0.1) discard; // Harte Kante, macht es sauberer

    gl_FragColor = vec4(vColor, strength);
  }
`;

// === Die Funktion zum Erstellen der Galaxie ===
let galaxyMaterial; // Material global machen, um es im Loop upzudaten
function createGalaxy() {
    const parameters = {
        count: 150000, size: 0.15, radius: 100, arms: 3,
        spin: 0.7, randomness: 0.5, randomnessPower: 3,
        insideColor: '#ffac89', outsideColor: '#54a1ff'
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
        // ... (Positions- und Farb-Berechnung bleibt unverändert) ...
        const i3 = i * 3; const radius = Math.random() * parameters.radius; const spinAngle = radius * parameters.spin; const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2; const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.1; const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ; const mixedColor = colorInside.clone(); mixedColor.lerp(colorOutside, radius / parameters.radius); colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // KORREKTUR: Verwende das neue ShaderMaterial
    galaxyMaterial = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            uSize: { value: parameters.size * renderer.getPixelRatio() },
            uShipPosition: { value: new THREE.Vector3() } // Initialisiere mit einem leeren Vektor
        }
    });

    const points = new THREE.Points(geometry, galaxyMaterial);
    scene.add(points);
}

createGalaxy();

const blackHoleGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
scene.add(blackHole);


// === Hauptobjekt und Kamera-Setup (unverändert) ===
let ship;
const cameraPivot = new THREE.Object3D(); const cameraHolder = new THREE.Object3D();
const loader = new GLTFLoader(); const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => { progressBar.style.width = '100%'; loadingText.textContent = 'Modell geladen!'; ship = gltf.scene; scene.add(ship); ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera); camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position); setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.style.display = 'none', 500); }, 300); animate(); }, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });


// === Steuerung und Animation ===
let shipMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.33; let zoomDistance = 15; const minZoom = 8; const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0); let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03; const DAMPING = 0.90; const LERP_FACTOR = 0.05;
let cameraFingerId = null; let initialPinchDistance = 0; let previousTouch = { x: 10, y: 10 };
// ... (Der gesamte Block der Event-Listener bleibt unverändert) ...
nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120 }).on('move', (evt, data) => { if (data.vector && ship) { shipMove.forward = data.vector.y * 0.1; shipMove.turn = -data.vector.x * 0.05; } }).on('end', () => shipMove = { forward: 0, turn: 0 }); renderer.domElement.addEventListener('touchstart', (e) => { const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone')); if (joystickTouch) return; e.preventDefault(); for (const touch of e.changedTouches) { if (cameraFingerId === null) { cameraFingerId = touch.identifier; cameraVelocity.set(0, 0); previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; } } if (e.touches.length >= 2) { initialPinchDistance = getPinchDistance(e); zoomVelocity = 0; } }, { passive: false }); renderer.domElement.addEventListener('touchmove', (e) => { const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone')); if (joystickTouch) return; e.preventDefault(); for (const touch of e.changedTouches) { if (touch.identifier === cameraFingerId) { const deltaX = touch.clientX - previousTouch.x; const deltaY = touch.clientY - previousTouch.y; cameraVelocity.x += deltaY * 0.0002; cameraVelocity.y -= deltaX * 0.0002; previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; } } if (e.touches.length >= 2) { const currentPinchDistance = getPinchDistance(e); zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03; initialPinchDistance = currentPinchDistance; } }, { passive: false }); renderer.domElement.addEventListener('touchend', (e) => { for (const touch of e.changedTouches) { if (touch.identifier === cameraFingerId) { cameraFingerId = null; } } if (e.touches.length < 2) { initialPinchDistance = 0; } }); function getPinchDistance(e) { const touch1 = e.touches[0]; const touch2 = e.touches[1]; const dx = touch1.clientX - touch2.clientX; const dy = touch1.clientY - touch2.clientY; return Math.sqrt(dx * dx + dy * dy); }


function animate() {
    requestAnimationFrame(animate);

    if (ship) {
        // KORREKTUR: "Bremszone" vor dem Schwarzen Loch
        const blackHoleRadius = 7; // Sicherheitsabstand um das schwarze Loch
        const distanceToCenter = ship.position.length();
        let brakingFactor = 1.0;

        if (distanceToCenter < blackHoleRadius) {
            brakingFactor = (distanceToCenter - (blackHoleRadius * 0.5)) / (blackHoleRadius * 0.5);
            brakingFactor = Math.max(0, brakingFactor); // Verhindert negative Geschwindigkeit
        }

        // Schiffsbewegung mit Bremsfaktor
        ship.translateZ(shipMove.forward * brakingFactor);
        ship.rotateY(shipMove.turn);

        // KORREKTUR: Update die Schiffsposition im Partikel-Shader
        if (galaxyMaterial) {
            galaxyMaterial.uniforms.uShipPosition.value.copy(ship.position);
        }
    }
    
    // (Der Rest der Animations-Schleife mit Kamera-Physik bleibt unverändert)
    if (cameraFingerId === null) { cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR); cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR); }
    if (cameraHolder.rotation.x > ROTATION_LIMIT) { cameraVelocity.x -= (cameraHolder.rotation.x - ROTATION_LIMIT) * SPRING_STIFFNESS; } else if (cameraHolder.rotation.x < -ROTATION_LIMIT) { cameraVelocity.x -= (cameraHolder.rotation.x + ROTATION_LIMIT) * SPRING_STIFFNESS; }
    if (cameraPivot.rotation.y > ROTATION_LIMIT) { cameraVelocity.y -= (cameraPivot.rotation.y - ROTATION_LIMIT) * SPRING_STIFFNESS; } else if (cameraPivot.rotation.y < -ROTATION_LIMIT) { cameraVelocity.y -= (cameraPivot.rotation.y + ROTATION_LIMIT) * SPRING_STIFFNESS; }
    cameraHolder.rotation.x += cameraVelocity.x; cameraPivot.rotation.y += cameraVelocity.y; cameraVelocity.multiplyScalar(DAMPING);
    zoomDistance += zoomVelocity; zoomVelocity *= DAMPING;
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    if (zoomDistance === minZoom || zoomDistance === maxZoom) { zoomVelocity = 0; }
    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);
    
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
