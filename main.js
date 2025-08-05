import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// === Grund-Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

renderer.domElement.addEventListener('dragstart', (e) => e.preventDefault());
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = 'label-container';
document.body.appendChild(labelRenderer.domElement);

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.9);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// === UI Elemente ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage'); // NEU
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

// === NEU: Hyperspace-Setup ===
let hyperspace;
function createHyperspace() {
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 50;
        positions[i3 + 1] = (Math.random() - 0.5) * 50;
        positions[i3 + 2] = (Math.random() - 0.5) * 1000;
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.7
    });
    hyperspace = new THREE.Points(geometry, material);
    loadingScreen.prepend(renderer.domElement); // Canvas in den Ladebildschirm verschieben
}
createHyperspace();

// === Szenerie-Setup (unsichtbar am Anfang) ===
let galaxy; function createGalaxy() { /*...*/ }
let blackHoleCore; let lensingSphere; let accretionDisk; let blackHoleLabel;
let pacingCircle; let planets = []; const planetData = [/*...*/];
function createSceneElements() {
    createGalaxy();
    blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    scene.add(blackHoleCore);
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
    scene.add(cubeCamera);
    lensingSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 64), new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.9, color: 0xffffff }));
    scene.add(lensingSphere);
    accretionDisk = createAccretionDisk();
    const blackHoleLabelDiv = document.createElement('div'); blackHoleLabelDiv.className = 'label'; blackHoleLabelDiv.textContent = 'Project_Mariner'; const lineDiv = document.createElement('div'); lineDiv.className = 'label-line'; blackHoleLabelDiv.appendChild(lineDiv);
    blackHoleLabel = new CSS2DObject(blackHoleLabelDiv);
    blackHoleLabel.position.set(0, 7, 0);
    scene.add(blackHoleLabel);
    const pacingCircleGeometry = new THREE.TorusGeometry(12, 0.1, 16, 100);
    const pacingCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    pacingCircle = new THREE.Mesh(pacingCircleGeometry, pacingCircleMaterial);
    pacingCircle.rotation.x = Math.PI / 2;
    scene.add(pacingCircle);
    planetData.forEach((data, index) => createPlanet(data, index));
}

function createPlanet(data, index) { /*...*/ }
function createPlanetTexture(color) { /*...*/ }
function createForcefield(radius) { /*...*/ }
let ship; let forcefield; const cameraPivot = new THREE.Object3D(); const cameraHolder = new THREE.Object3D();
let isIntroAnimationPlaying = false; let isAnalyzeButtonVisible = false;

// === Lade-Animation ===
function loadingAnimate() {
    hyperspace.rotation.z += 0.001;
    hyperspace.position.z = (hyperspace.position.z + 2) % 500;
    renderer.render(scene, camera);
    requestAnimationFrame(loadingAnimate);
}
loadingAnimate();


// === GLTF Modell-Lader ===
const loader = new GLTFLoader(); const dracoLoader = new DRACOLoader(); dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(dracoLoader);
const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';
loader.load(modelURL, (gltf) => {
    progressBar.style.width = '100%';
    progressPercentage.textContent = '100%';
    loadingText.textContent = 'Tippen zum Starten';
    
    // Baue die Hauptszene, während der Ladebildschirm noch sichtbar ist
    document.body.prepend(renderer.domElement);
    scene.remove(hyperspace);
    createSceneElements();

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
}, (xhr) => { 
    if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        progressBar.style.width = percentComplete + '%';
        progressPercentage.textContent = Math.round(percentComplete) + '%';
    }
}, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });

// === Steuerung und Animation ===
const keyboard = {};
let joystickMove = { forward: 0, turn: 0 };
const ROTATION_LIMIT = Math.PI * 0.33;
let zoomDistance = 15;
const minZoom = 8; const maxZoom = 25;
let cameraVelocity = new THREE.Vector2(0, 0); let zoomVelocity = 0;
const SPRING_STIFFNESS = 0.03; const DAMPING = 0.90; const LERP_FACTOR = 0.05;

let cameraFingerId = null;
let isDraggingMouse = false;
let initialPinchDistance = 0;
let previousTouch = { x: 0, y: 0 };

muteButton.addEventListener('click', () => { audio.muted = !audio.muted; muteButton.classList.toggle('muted'); });
window.addEventListener('keydown', (e) => { keyboard[e.key.toLowerCase()] = true; if ((e.key === '=' || e.key === '-' || e.key === '+') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); } });
window.addEventListener('keyup', (e) => { keyboard[e.key.toLowerCase()] = false; });
nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120 }).on('move', (evt, data) => { if (data.vector && ship) { joystickMove.forward = data.vector.y * 0.1; joystickMove.turn = -data.vector.x * 0.05; } }).on('end', () => joystickMove = { forward: 0, turn: 0 });

renderer.domElement.addEventListener('touchstart', (e) => { const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone')); if (joystickTouch) return; e.preventDefault(); for (const touch of e.changedTouches) { if (cameraFingerId === null) { cameraFingerId = touch.identifier; cameraVelocity.set(0, 0); previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; } } if (e.touches.length >= 2) { initialPinchDistance = getPinchDistance(e); zoomVelocity = 0; } }, { passive: false });
renderer.domElement.addEventListener('touchmove', (e) => { const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone')); if (joystickTouch) return; e.preventDefault(); for (const touch of e.changedTouches) { if (touch.identifier === cameraFingerId) { const deltaX = touch.clientX - previousTouch.x; const deltaY = touch.clientY - previousTouch.y; cameraVelocity.x += deltaY * 0.0002; cameraVelocity.y -= deltaX * 0.0002; previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; } } if (e.touches.length >= 2) { const currentPinchDistance = getPinchDistance(e); zoomVelocity -= (currentPinchDistance - initialPinchDistance) * 0.03; initialPinchDistance = currentPinchDistance; } }, { passive: false });
renderer.domElement.addEventListener('touchend', (e) => { for (const touch of e.changedTouches) { if (touch.identifier === cameraFingerId) { cameraFingerId = null; } } if (e.touches.length < 2) { initialPinchDistance = 0; } });

renderer.domElement.addEventListener('mousedown', (e) => { if (e.target.closest('#joystick-zone')) return; isDraggingMouse = true; cameraVelocity.set(0, 0); previousTouch.x = e.clientX; previousTouch.y = e.clientY; });
window.addEventListener('mousemove', (e) => { if (isDraggingMouse) { const deltaX = e.clientX - previousTouch.x; const deltaY = e.clientY - previousTouch.y; cameraVelocity.x += deltaY * 0.0002; cameraVelocity.y -= deltaX * 0.0002; previousTouch.x = e.clientX; previousTouch.y = e.clientY; } });
window.addEventListener('mouseup', () => { isDraggingMouse = false; });
renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); if (e.ctrlKey) { zoomVelocity += e.deltaY * 0.01; } else { zoomVelocity += e.deltaY * 0.05; } }, { passive: false });

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
        const circleCurrentRadius = pacingCircle.geometry.parameters.radius * pacingCircle.scale.x;
        if (distanceToCenterSq < circleCurrentRadius * circleCurrentRadius) {
            activeObject = blackHoleCore;
        }
        for (const planet of planets) {
            planet.mesh.getWorldPosition(worldPosition);
            const distanceToPlanetSq = ship.position.distanceToSquared(worldPosition);
            const planetBoundaryRadius = planet.boundaryCircle.geometry.parameters.radius * planet.boundaryCircle.scale.x;
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
        if (cameraFingerId === null && !isDraggingMouse) {
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

    composer.render();
    labelRenderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
