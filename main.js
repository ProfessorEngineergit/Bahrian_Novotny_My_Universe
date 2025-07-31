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

// === UI und Beleuchtung ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// === Galaxie ===
let galaxy;
function createGalaxy() {
    const parameters = { count: 150000, size: 0.15, radius: 100, arms: 3, spin: 0.7, randomness: 0.5, randomnessPower: 3, insideColor: '#ffac89', outsideColor: '#54a1ff' };
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);
    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3; const radius = Math.random() * parameters.radius; const spinAngle = radius * parameters.spin; const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2; const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.1; const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius; positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX; positions[i3 + 1] = randomY; positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ; const mixedColor = colorInside.clone(); mixedColor.lerp(colorOutside, radius / parameters.radius); colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; const context = canvas.getContext('2d'); const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32); gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.2, 'rgba(255,255,255,1)'); gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gradient.addColorStop(1, 'rgba(255,255,255,0)'); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64); const particleTexture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({ size: parameters.size, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, map: particleTexture, transparent: true });
    galaxy = new THREE.Points(geometry, material);
    scene.add(galaxy);
}
createGalaxy();

// === NEU: Realistisches Schwarzes Loch "Interstellar"-Stil ===
const blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
scene.add(blackHoleCore);
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
scene.add(cubeCamera);
const lensingSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 64), new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.9, color: 0xffffff }));
scene.add(lensingSphere);

// Textur-Funktion für die staubige, horizontale Scheibe
function createDustTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext('2d');
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const radius = Math.random() * 3;
        const alpha = Math.random() * 0.2;
        context.fillStyle = `rgba(255, 180, 120, ${alpha})`;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

// Textur-Funktion für den leuchtenden Halo
function createHaloTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 60, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 160, 80, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 20, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

// Erstellung der Scheiben
const dustyDiskGeo = new THREE.TorusGeometry(4.5, 2, 16, 100);
const dustyDiskMat = new THREE.MeshBasicMaterial({ map: createDustTexture(), transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.8 });
const dustyDisk = new THREE.Mesh(dustyDiskGeo, dustyDiskMat);
dustyDisk.rotation.x = Math.PI / 2;
scene.add(dustyDisk);

const lensedHaloGeo = new THREE.TorusGeometry(4.5, 2, 16, 100);
const lensedHaloMat = new THREE.MeshBasicMaterial({ map: createHaloTexture(), transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const lensedHalo = new THREE.Mesh(lensedHaloGeo, lensedHaloMat);
lensedHalo.rotation.y = Math.PI / 2;
scene.add(lensedHalo);

// === Hauptobjekt-Setup ===
let ship;
let forcefield;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

// === KORREKTUR: Forcefield mit Sechsecken ===
function createForcefield(radius) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d');
    context.strokeStyle = 'rgba(120, 220, 255, 0.7)';
    context.lineWidth = 1.5;
    
    const hexRadius = 20;
    const hexHeight = hexRadius * Math.sqrt(3);
    const hexWidth = hexRadius * 2;

    for (let row = -2; row < (canvas.height / (hexHeight * 0.75)) + 2; row++) {
        for (let col = -2; col < (canvas.width / hexWidth) + 2; col++) {
            const xOffset = row % 2 === 0 ? 0 : hexWidth / 2;
            const cx = col * hexWidth + xOffset;
            const cy = row * hexHeight * 0.75;
            
            context.beginPath();
            for (let i = 0; i <= 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = cx + hexRadius * Math.cos(angle);
                const hy = cy + hexRadius * Math.sin(angle);
                if (i === 0) context.moveTo(hx, hy);
                else context.lineTo(hx, hy);
            }
            context.stroke();
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide
    });
    const ff = new THREE.Mesh(geometry, material);
    ff.visible = false;
    return ff;
}

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
    ship.position.set(0, 0, -30);
    forcefield = createForcefield(5.1);
    ship.add(forcefield);
    ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
    camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position);
    setTimeout(() => { loadingScreen.style.opacity = '0'; setTimeout(() => loadingScreen.style.display = 'none', 500); }, 300);
    animate();
}, (xhr) => { if (xhr.lengthComputable) progressBar.style.width = (xhr.loaded / xhr.total) * 100 + '%'; }, (error) => { console.error('Ladefehler:', error); loadingText.textContent = "Fehler!"; });


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

nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120 }).on('move', (evt, data) => {
    if (data.vector && ship) {
        shipMove.forward = data.vector.y * 0.1;
        shipMove.turn = -data.vector.x * 0.05;
    }
}).on('end', () => shipMove = { forward: 0, turn: 0 });

renderer.domElement.addEventListener('touchstart', (e) => {
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
            cameraFingerId = null;
        }
    }
    if (e.touches.length < 2) {
        initialPinchDistance = 0;
    }
});

function getPinchDistance(e) {
    if (e.touches.length < 2) return 0;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function animate() {
    requestAnimationFrame(animate);

    // Update für das Schwarze Loch
    dustyDisk.rotation.z += 0.001;
    lensedHalo.rotation.z -= 0.002;

    if (ship) {
        const shipRadius = 5;
        const previousPosition = ship.position.clone();
        ship.translateZ(shipMove.forward);
        ship.rotateY(shipMove.turn);
        const blackHoleRadius = blackHoleCore.geometry.parameters.radius;
        const collisionThreshold = shipRadius + blackHoleRadius;
        if (ship.position.distanceTo(blackHoleCore.position) < collisionThreshold) {
            ship.position.copy(previousPosition);
            if (forcefield) {
                forcefield.visible = true;
                forcefield.material.opacity = 1.0;
            }
        }
    }
    
    if (forcefield && forcefield.visible) {
        forcefield.material.opacity -= 0.04;
        if (forcefield.material.opacity <= 0) {
            forcefield.visible = false;
        }
    }

    // Kamera-Physik
    if (cameraFingerId === null) {
        cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
        cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
    }
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
    cameraHolder.rotation.x += cameraVelocity.x;
    cameraPivot.rotation.y += cameraVelocity.y;
    cameraVelocity.multiplyScalar(DAMPING);
    zoomDistance += zoomVelocity;
    zoomVelocity *= DAMPING;
    zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
    if (zoomDistance === minZoom || zoomDistance === maxZoom) {
        zoomVelocity = 0;
    }
    if (camera) camera.position.normalize().multiplyScalar(zoomDistance);

    // Gravitationslinsen-Update
    lensingSphere.visible = false;
    blackHoleCore.visible = false;
    dustyDisk.visible = false;
    lensedHalo.visible = false;
    cubeCamera.update(renderer, scene);
    lensingSphere.visible = true;
    blackHoleCore.visible = true;
    dustyDisk.visible = true;
    lensedHalo.visible = true;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
