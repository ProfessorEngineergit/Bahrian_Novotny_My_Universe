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
let galaxy; function createGalaxy() { const parameters = { count: 150000, size: 0.15, radius: 100, arms: 3, spin: 0.7, randomness: 0.5, randomnessPower: 3, insideColor: '#ffac89', outsideColor: '#54a1ff' }; const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(parameters.count * 3); const colors = new Float32Array(parameters.count * 3); const colorInside = new THREE.Color(parameters.insideColor); const colorOutside = new THREE.Color(parameters.outsideColor); for (let i = 0; i < parameters.count; i++) { const i3 = i * 3; const radius = Math.random() * parameters.radius; const spinAngle = radius * parameters.spin; const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2; const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.1; const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ; const mixedColor = colorInside.clone(); mixedColor.lerp(colorOutside, radius / parameters.radius); colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b; } geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32); gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.2, 'rgba(255,255,255,1)'); gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gradient.addColorStop(1, 'rgba(255,255,255,0)'); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); const particleTexture = new THREE.CanvasTexture(canvas); const material = new THREE.PointsMaterial({ size: parameters.size, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, map: particleTexture, transparent: true }); galaxy = new THREE.Points(geometry, material); scene.add(galaxy); }
createGalaxy();
const blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
scene.add(blackHoleCore);
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
scene.add(cubeCamera);
const lensingSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 64), new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.9, color: 0xffffff }));
scene.add(lensingSphere);
function createAccretionDisk() { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(128, 128, 80, 128, 128, 128); gradient.addColorStop(0, 'rgba(255, 180, 80, 1)'); gradient.addColorStop(0.7, 'rgba(255, 100, 20, 0.5)'); gradient.addColorStop(1, 'rgba(0,0,0,0)'); context.fillStyle = gradient; context.fillRect(0, 0, 256, 256); const texture = new THREE.CanvasTexture(canvas); const geometry = new THREE.RingGeometry(2.5, 5, 64); const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending }); const disk = new THREE.Mesh(geometry, material); disk.rotation.x = Math.PI / 2; scene.add(disk); return disk; }
const accretionDisk = createAccretionDisk();
const blackHoleLabelDiv = document.createElement('div'); blackHoleLabelDiv.className = 'label'; blackHoleLabelDiv.textContent = 'Project_Mariner'; const lineDiv = document.createElement('div'); lineDiv.className = 'label-line'; blackHoleLabelDiv.appendChild(lineDiv); const blackHoleLabel = new CSS2DObject(blackHoleLabelDiv); blackHoleLabel.position.set(0, 7, 0); scene.add(blackHoleLabel);
const pacingCircleGeometry = new THREE.RingGeometry(12, 12.2, 64); const pacingCircleMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }); const pacingCircle = new THREE.Mesh(pacingCircleGeometry, pacingCircleMaterial); pacingCircle.rotation.x = Math.PI / 2; scene.add(pacingCircle);

const planets = [];
const planetData = [
    { name: 'Xylos', radius: 1, orbit: 20, speed: 0.04 }, { name: 'Cygnus X-1a', radius: 1.5, orbit: 35, speed: 0.025 }, { name: 'Veridia', radius: 1.2, orbit: 50, speed: 0.015 }, { name: 'Klendathu', radius: 0.8, orbit: 65, speed: 0.03 }, { name: 'Terminus', radius: 2, orbit: 80, speed: 0.01 }, { name: 'Helion Prime', radius: 1.8, orbit: 95, speed: 0.012 }
];
function createPlanetTexture(color) { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const context = canvas.getContext('2d'); context.fillStyle = `hsl(${color}, 70%, 50%)`; context.fillRect(0, 0, 128, 128); for (let i = 0; i < 3000; i++) { const x = Math.random() * 128; const y = Math.random() * 128; const radius = Math.random() * 1.5; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fillStyle = `hsla(${color + Math.random() * 40 - 20}, 70%, ${Math.random() * 50 + 25}%, 0.5)`; context.fill(); } return new THREE.CanvasTexture(canvas); }
function createPlanet(data, index) { const orbitPivot = new THREE.Object3D(); scene.add(orbitPivot); const texture = createPlanetTexture(Math.random() * 360); const geometry = new THREE.SphereGeometry(data.radius, 32, 32); const material = new THREE.MeshStandardMaterial({ map: texture }); const planetMesh = new THREE.Mesh(geometry, material); planetMesh.position.x = data.orbit; orbitPivot.add(planetMesh); const orbitPathGeometry = new THREE.RingGeometry(data.orbit - 0.1, data.orbit + 0.1, 128); const orbitPathMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.15 }); const orbitPath = new THREE.Mesh(orbitPathGeometry, orbitPathMaterial); orbitPath.rotation.x = Math.PI / 2; scene.add(orbitPath); const labelDiv = document.createElement('div'); labelDiv.className = 'label'; labelDiv.textContent = data.name; const planetLabel = new CSS2DObject(labelDiv); planetLabel.position.y = data.radius + 2; planetMesh.add(planetLabel); const boundaryRadius = data.radius + 6; const boundaryGeometry = new THREE.RingGeometry(boundaryRadius, boundaryRadius + 0.2, 64); const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }); const boundaryCircle = new THREE.Mesh(boundaryGeometry, boundaryMaterial); boundaryCircle.rotation.x = Math.PI / 2; planetMesh.add(boundaryCircle); const initialRotation = (index / planetData.length) * Math.PI * 2; orbitPivot.rotation.y = initialRotation; planets.push({ pivot: orbitPivot, mesh: planetMesh, speed: data.speed, labelDiv: labelDiv, boundaryCircle: boundaryCircle, isFrozen: false, initialRotation: initialRotation }); }
planetData.forEach(createPlanet);

let ship; let forcefield; const cameraPivot = new THREE.Object3D(); const cameraHolder = new THREE.Object3D();
function createForcefield(radius) { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const context = canvas.getContext('2d'); context.strokeStyle = 'rgba(100, 200, 255, 0.8)'; context.lineWidth = 3; for (let i = 0; i < 8; i++) { const x = i * 18; context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 128); context.stroke(); const y = i * 18; context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke(); } const texture = new THREE.CanvasTexture(canvas); const geometry = new THREE.SphereGeometry(radius, 32, 32); const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide }); const ff = new THREE.Mesh(geometry, material); ff.visible = false; return ff; }

let isIntroAnimationPlaying = false; let isAnalyzeButtonVisible = false;

// === GLTF Modell-Lader ===
const loader = new GLTFLoader(); const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => {
    progressBar.style.width = '100%'; loadingText.textContent = 'Tippen zum Starten';
    ship = gltf.scene;
    ship.rotation.y = Math.PI;
    scene.add(ship);
    ship.position.set(0, 0, 30);
    forcefield = createForcefield(5.1); ship.add(forcefield);
    ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
    camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position);
    cameraPivot.rotation.y = Math.PI;
    loadingScreen.addEventListener('click', () => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
        audio.play();
        isIntroAnimationPlaying = true;
        infoElement.classList.add('ui-visible');
        joystickZone.classList.add('ui-visible');
        muteButton.classList.add('ui-visible');
        animate();
    }, { once: true });
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });

// === Steuerung und Animation ===
const keyboard = {}; // NEU: Objekt für Tastaturstatus
let joystickMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8; const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0); let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03; const DAMPING = 0.90; const LERP_FACTOR = 0.05;
let cameraFingerId = null; let initialPinchDistance = 0; let previousTouch = { x: 0, y: 0 };

muteButton.addEventListener('click', () => { audio.muted = !audio.muted; muteButton.classList.toggle('muted'); });

// NEU: Event Listener für die Tastatur
window.addEventListener('keydown', (e) => { keyboard[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keyboard[e.key.toLowerCase()] = false; });

nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120 }).on('move', (evt, data) => { if (data.vector && ship) { joystickMove.forward = data.vector.y * 0.1; joystickMove.turn = -data.vector.x * 0.05; } }).on('end', () => joystickMove = { forward: 0, turn: 0 });
renderer.domElement.addEventListener('touchstart', (e) => { const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone')); if (joystickTouch) return; e.preventDefault(); for (const touch of e.changedTouches) { if (cameraFingerId === null) { cameraFingerId = touch.identifier; cameraVelocity.set(0, 0); previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; } } if (e.touches.length >= 2) { initialPinchDistance = getPinchDistance(e); zoomVelocity = 0; } }, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone')); if (joystickTouch) return; e.preventDefault(); for (const touch of e.changedTouches) { if (touch.identifier === cameraFingerId) { const deltaX = touch.clientX - previousTouch.x; const deltaY = touch.clientY - previousTouch.y; cameraVelocity.x += deltaY * 0.0002; cameraVelocity.y -= deltaX * 0.0002; previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; } } if (e.touches.length >= 2) { const currentPinchDistance = getPinchDistance(e); zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03; initialPinchDistance = currentPinchDistance; } }, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => { for (const touch of e.changedTouches) { if (touch.identifier === cameraFingerId) { cameraFingerId = null; } } if (e.touches.length < 2) { initialPinchDistance = 0; } });
function getPinchDistance(e) { if (e.touches.length < 2) return 0; const touch1 = e.touches[0]; const touch2 = e.touches[1]; const dx = touch1.clientX - touch2.clientX; const dy = touch1.clientY - touch2.clientY; return Math.sqrt(dx * dx + dy * dy); }

const clock = new THREE.Clock();
const worldPosition = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    const pulse = Math.sin(elapsedTime * 0.8) * 0.5 + 0.5;
    pacingCircle.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
    pacingCircle.material.opacity = 0.3 + pulse * 0.4;

    planets.forEach(planet => {
        planet.boundaryCircle.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
        planet.boundaryCircle.material.opacity = 0.3 + pulse * 0.4;
        const targetRotation = planet.initialRotation + elapsedTime * planet.speed;
        if (!planet.isFrozen) {
            planet.pivot.rotation.y = THREE.MathUtils.lerp(planet.pivot.rotation.y, targetRotation, 0.02);
        }
    });
    
    if (ship) {
        // NEU: Tastatur-Input verarbeiten
        const keyForward = (keyboard['w'] ? 0.1 : 0) + (keyboard['s'] ? -0.1 : 0);
        const keyTurn = (keyboard['a'] ? 0.05 : 0) + (keyboard['d'] ? -0.05 : 0);

        const finalForward = joystickMove.forward + keyForward;
        const finalTurn = joystickMove.turn + keyTurn;
        
        const shipRadius = 5;
        const previousPosition = ship.position.clone();
        ship.translateZ(finalForward);
        ship.rotateY(finalTurn);
        const blackHoleRadius = blackHoleCore.geometry.parameters.radius;
        const collisionThreshold = shipRadius + blackHoleRadius;
        if (ship.position.distanceTo(blackHoleCore.position) < collisionThreshold) {
            ship.position.copy(previousPosition);
            if (forcefield) { forcefield.visible = true; forcefield.material.opacity = 1.0; }
        }

        let activeObject = null;
        const distanceToCenterSq = ship.position.lengthSq();
        const circleCurrentRadius = pacingCircle.geometry.parameters.outerRadius * pacingCircle.scale.x;
        if (distanceToCenterSq < circleCurrentRadius * circleCurrentRadius) {
            activeObject = blackHoleCore;
        }
        for (const planet of planets) {
            planet.mesh.getWorldPosition(worldPosition);
            const distanceToPlanetSq = ship.position.distanceToSquared(worldPosition);
            const planetBoundaryRadius = planet.boundaryCircle.geometry.parameters.outerRadius * planet.boundaryCircle.scale.x;
            if (distanceToPlanetSq < planetBoundaryRadius * planetBoundaryRadius) {
                activeObject = planet;
                break;
            }
        }
        planets.forEach(p => p.isFrozen = (activeObject === p));
        if (activeObject && !isAnalyzeButtonVisible) {
            analyzeButton.classList.add('ui-visible');
            isAnalyzeButtonVisible = true;
        } else if (!activeObject && isAnalyzeButtonVisible) {
            analyzeButton.classList.remove('ui-visible');
            isAnalyzeButtonVisible = false;
        }
    }

    // NEU: Tastatur-Kamerasteuerung
    if (keyboard['arrowup']) cameraVelocity.x += 0.0005;
    if (keyboard['arrowdown']) cameraVelocity.x -= 0.0005;
    if (keyboard['arrowleft']) cameraVelocity.y += 0.0005;
    if (keyboard['arrowright']) cameraVelocity.y -= 0.0005;
    if (keyboard['-']) zoomVelocity += 0.1;
    if (keyboard['+'] || keyboard['=']) zoomVelocity -= 0.1;

    if (isIntroAnimationPlaying) {
        cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, 0.02);
        if (Math.abs(cameraPivot.rotation.y) < 0.01) {
            cameraPivot.rotation.y = 0;
            isIntroAnimationPlaying = false;
        }
    } else {
        if (ship) {
            const getAngleToShip = (targetPosition) => Math.atan2(ship.position.x - targetPosition.x, ship.position.z - targetPosition.z);
            blackHoleLabelDiv.style.transform = `rotate(${getAngleToShip(blackHoleCore.position)}rad)`;
            planets.forEach(p => {
                p.mesh.getWorldPosition(worldPosition);
                p.labelDiv.style.transform = `rotate(${getAngleToShip(worldPosition)}rad)`;
            });
        }
        if (cameraFingerId === null) {
            cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
            cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
        }
        if (cameraHolder.rotation.x > ROTATION_LIMIT) { cameraVelocity.x -= (cameraHolder.rotation.x - ROTATION_LIMIT) * SPRING_STIFFNESS; } else if (cameraHolder.rotation.x < -ROTATION_LIMIT) { cameraVelocity.x -= (cameraHolder.rotation.x + ROTATION_LIMIT) * SPRING_STIFFNESS; }
        if (cameraPivot.rotation.y > ROTATION_LIMIT) { cameraVelocity.y -= (cameraPivot.rotation.y - ROTATION_LIMIT) * SPRING_STIFFNESS; } else if (cameraPivot.rotation.y < -ROTATION_LIMIT) { cameraVelocity.y -= (cameraPivot.rotation.y + ROTATION_LIMIT) * SPRING_STIFFNESS; }
        cameraHolder.rotation.x += cameraVelocity.x;
        cameraPivot.rotation.y += cameraVelocity.y;
    }
    
    cameraVelocity.multiplyScalar(DAMPING);
    zoomDistance += zoomVelocity;
    zoomVelocity *= DAMPING;
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    if (zoomDistance === minZoom || zoomDistance === maxZoom) { zoomVelocity = 0; }
    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);
    
    accretionDisk.rotation.z += 0.005;

    if (forcefield && forcefield.visible) {
        forcefield.material.opacity -= 0.04;
        if (forcefield.material.opacity <= 0) { forcefield.visible = false; }
    }

    lensingSphere.visible = false;
    blackHoleCore.visible = false;
    accretionDisk.visible = false;
    cubeCamera.update(renderer, scene);
    lensingSphere.visible = true;
    blackHoleCore.visible = true;
    accretionDisk.visible = true;

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
