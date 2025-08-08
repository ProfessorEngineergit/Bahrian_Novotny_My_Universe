import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// === Grund-Setup ===
const mainScene = new THREE.Scene();
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

const renderScene = new RenderPass(mainScene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.9);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// === UI Referenzen ===
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingTitle = document.getElementById('loading-title');
const loadingPercentage = document.getElementById('loading-percentage');
const infoElement = document.getElementById('info');
const joystickZone = document.getElementById('joystick-zone');
const bottomBar = document.getElementById('bottom-bar');
const muteButton = document.getElementById('mute-button');
const analyzeButton = document.getElementById('analyze-button');
const audio = document.getElementById('media-player');

const analysisWindow = document.getElementById('analysis-window');
const analysisTitle = document.getElementById('analysis-title');
const analysisTextContent = document.getElementById('analysis-text-content');
const closeAnalysisButton = document.getElementById('close-analysis-button');

// Quick Warp UI
const quickWarpBtn = document.getElementById('quick-warp-btn');
const quickWarpOverlay = document.getElementById('quick-warp-overlay');
const warpList = document.getElementById('warp-list');
const warpHereBtn = document.getElementById('warp-here');
const warpCloseBtn = document.getElementById('warp-close');
const warpFlash = document.getElementById('warp-flash');

let chosenWarpTargetId = null;

// === Hyperspace-Loading ===
const loadingScene = new THREE.Scene();
const loadingCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let hyperspaceParticles;
const HYPERSPACE_LENGTH = 800;
let loadingProgress = 0;

function createHyperspaceEffect() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  for (let i = 0; i < 5000; i++) {
    vertices.push((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * HYPERSPACE_LENGTH);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, blending: THREE.AdditiveBlending });
  hyperspaceParticles = new THREE.Points(geometry, material);
  loadingScene.add(hyperspaceParticles);
}

// === Licht & Galaxy ===
mainScene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 15);
mainScene.add(directionalLight);

let galaxy;
function createGalaxy() {
  const parameters = { count: 150000, size: 0.15, radius: 100, arms: 3, spin: 0.7, randomness: 0.5, randomnessPower: 3, insideColor: '#ffac89', outsideColor: '#54a1ff' };
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);
  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2;
    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius * 0.1;
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    colors[i3] = mixedColor.r; colors[i3 + 1] = mixedColor.g; colors[i3 + 2] = mixedColor.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
  const particleTexture = new THREE.CanvasTexture(canvas);
  const material = new THREE.PointsMaterial({ size: parameters.size, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, map: particleTexture, transparent: true });
  galaxy = new THREE.Points(geometry, material);
  mainScene.add(galaxy);
}
createGalaxy();

// Schwarzes Loch + Lens
const blackHoleCore = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
blackHoleCore.name = 'Project_Mariner (This Site)';
mainScene.add(blackHoleCore);

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
mainScene.add(cubeCamera);
const lensingSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 64), new THREE.MeshBasicMaterial({ envMap: cubeRenderTarget.texture, refractionRatio: 0.9, color: 0xffffff }));
mainScene.add(lensingSphere);

function createAccretionDisk() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 80, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 180, 80, 1)');
  gradient.addColorStop(0.7, 'rgba(255, 100, 20, 0.5)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.RingGeometry(2.5, 5, 64);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending });
  const disk = new THREE.Mesh(geometry, material);
  disk.rotation.x = Math.PI / 2;
  mainScene.add(disk);
  return disk;
}
const accretionDisk = createAccretionDisk();

// Label Helper (DOM)
function makeLabel(text) {
  const root = document.createElement('div');
  root.className = 'label';
  root.textContent = text;
  const lineDiv = document.createElement('div');
  lineDiv.className = 'label-line';
  root.appendChild(lineDiv);
  return root;
}

// Blackhole Label
const blackHoleLabelDiv = makeLabel(blackHoleCore.name);
const blackHoleLabel = new CSS2DObject(blackHoleLabelDiv);
blackHoleLabel.position.set(0, 7, 0);
mainScene.add(blackHoleLabel);

// Pacing Kreis
const pacingCircleGeometry = new THREE.TorusGeometry(12, 0.1, 16, 100);
const pacingCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pacingCircle = new THREE.Mesh(pacingCircleGeometry, pacingCircleMaterial);
pacingCircle.rotation.x = Math.PI / 2;
mainScene.add(pacingCircle);

// Planeten
const planets = [];
const planetData = [
  { name: 'Infos', radius: 1, orbit: 20, speed: 0.04 },
  { name: 'SURGE (The autonomous Robottaxi)', radius: 1.5, orbit: 35, speed: 0.025 },
  { name: 'OpenImageLabel (A website to label images for professional photography)', radius: 1.2, orbit: 50, speed: 0.015 },
  { name: 'Project Cablerack (A smarter way to cable-manage)', radius: 0.8, orbit: 65, speed: 0.03 },
  { name: 'Socials/Other Sites', radius: 2, orbit: 80, speed: 0.01 },
  { name: 'HA-Lightswitch (Making analog Lightswitches smart)', radius: 1.8, orbit: 95, speed: 0.012 },
  { name: 'My Creative Work (Filming, flying, photography)', radius: 1.4, orbit: 110, speed: 0.008 },
  { name: '3D-Printing (The ultimate engineering-tool)', radius: 1.6, orbit: 125, speed: 0.006 }
];

function createPlanetTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = `hsl(${color}, 70%, 50%)`; context.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 128; const y = Math.random() * 128; const r = Math.random() * 1.5;
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2);
    context.fillStyle = `hsla(${color + Math.random() * 40 - 20}, 70%, ${Math.random() * 50 + 25}%, 0.5)`;
    context.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function createPlanet(data, index) {
  const orbitPivot = new THREE.Object3D(); mainScene.add(orbitPivot);

  const texture = createPlanetTexture(Math.random() * 360);
  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const planetMesh = new THREE.Mesh(geometry, material);
  planetMesh.position.x = data.orbit;
  planetMesh.name = data.name;
  orbitPivot.add(planetMesh);

  const labelDiv = makeLabel(data.name);
  const planetLabel = new CSS2DObject(labelDiv);
  planetLabel.position.y = data.radius + 3;
  planetMesh.add(planetLabel);

  const boundaryRadius = data.radius + 6;
  const boundaryGeometry = new THREE.TorusGeometry(boundaryRadius, 0.1, 16, 100);
  const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const boundaryCircle = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
  boundaryCircle.rotation.x = Math.PI / 2;
  planetMesh.add(boundaryCircle);

  const initialRotation = (index / planetData.length) * Math.PI * 2;
  orbitPivot.rotation.y = initialRotation;

  planets.push({ pivot: orbitPivot, mesh: planetMesh, labelDiv, boundaryCircle, isFrozen: false, initialRotation });
}
planetData.forEach(createPlanet);

// Einheitliche Winkelgeschwindigkeit → konstante Phasenabstände
const GLOBAL_ANGULAR_SPEED = 0.02;

// Ship & Kamera
let ship; let forcefield;
const cameraPivot = new THREE.Object3D();
const cameraHolder = new THREE.Object3D();

function createForcefield(radius) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.strokeStyle = 'rgba(255,255,255,0.8)'; context.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const x = i * 18; context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 128); context.stroke();
    const y = i * 18; context.beginPath(); context.moveTo(0, y); context.lineTo(128, y); context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide });
  const ff = new THREE.Mesh(geometry, material);
  ff.visible = false;
  return ff;
}

// === ✨ Inhalte für Analyse-Fenster (editierbar) ===
const OBJECT_CONTENT = {
  'Project_Mariner (This Site)': {
    title: 'Project Mariner',
    html: `<p>Hi, I’m Bahrian Novotny — a 15-year-old high school student with a deep fascination for science, technology, and the endless possibilities they open up.</p>
<p>From exploring the mechanics of the universe to experimenting with creative coding and engineering, I’m constantly looking for new ways to learn, build, and share ideas.</p>
<p>This website grew out of that passion. For over a year, I’d planned to build a portfolio site — but I wanted something different. Something exciting. Something interactive. Welcome to my universe.</p>
<h3>Project Mariner: How this site was born</h3>
<p>It began with a simple HTML prototype. Instead of the ship you see now, there was a pyramid you could steer using a basic joystick, along with very early camera rotation controls.</p>
<p>About a week later, I had refined both design and functionality. I realized that by limiting the controls, the site would feel more polished — so I made the camera snap back to a fixed position and only allowed persistent zoom adjustments.</p>
<p>Around that time, I replaced the pyramid with the USS Enterprise-D and introduced a loading screen.</p>
<p>Next came the planets. The tricky part was keeping them as far apart from each other as possible. Finally, I implemented a feature where, when the ship enters a planet’s inner sphere to analyze it, the planet stops — and as soon as the ship leaves, it accelerates to catch up to where it would have been if it had never stopped.</p>`,
    images: []
  },
  'Infos': {
    title: 'Infos',
    html: `<p>THIS IS <b>PROJECT_MARINER V1.0</b></p>
<h3>Upcoming releases</h3>
<p><b>Project Mariner V1.5 Pro</b></p>
<p>V1.5 Pro will include minor bug fixes as well as the following features:</p>
<ul>
  <li>Newsletter function</li>
  <li>Overview function</li>
  <li>Deep Space function</li>
  <li>New, beautiful planets crafted in Blender</li>
  <li>More controls</li>
  <li>Matte glass “1.5 Pro” material</li>
  <li>Enhanced button animations</li>
  <li>More fluid animations for Quick Warp</li>
</ul>
<p><b>V2.0 — scheduled for December 2025</b></p>`,
    images: []
  },
  'SURGE (The autonomous Robottaxi)': {
    title: 'SURGE – Autonomous Robotaxi',
    html: `<p><i>(SURGE: Smart Urban Robotic Guidance & Exploration Pod)</i></p>
<p>SURGE is my 8th-grade capstone project — a fully autonomous, electrically powered miniature robotaxi designed to navigate city streets on its own. The idea was born from two things I care deeply about: cutting CO₂ emissions and exploring how robotics can reshape everyday mobility.</p>
<p>At its core, SURGE runs on an NVIDIA Jetson Nano — a compact but powerful AI computer that processes live camera data for obstacle detection and navigation. The drive system allows precise, flexible movement in tight spaces, making it ideal for urban environments.</p>
<p>The design process began with sketches and CAD models, which I brought to life using 3D printing. The chassis is modular for easy upgrades, and I integrated LED accents for both style and functional feedback — such as indicating movement or charging status.</p>
<p>On the software side, SURGE uses AI-driven control logic for mapping, path planning, and real-time decision-making. While I initially planned to use an Intel RealSense D435 depth camera, I ultimately chose a Raspberry Pi camera — a simpler, lighter option that still enabled effective autonomous navigation.</p>
<p>From mechanical design to electronics and AI control, every aspect of SURGE was designed, built, and programmed by me. It’s a fusion of engineering, AI, and creative design — and a glimpse into how shared, smart mobility could work in the cities of tomorrow.</p>`,
    images: []
  },
  'OpenImageLabel (A website to label images for professional photography)': {
    title: 'OpenImageLabel',
    html: `<p>OpenImageLabel is my latest experiment in making metadata work for you, not against you. It started as a simple browser app, but the goal is bigger: to become the fastest way to tag and present your photos — on a laptop, iPhone, or Android device.</p>
<p>Drag a photo onto the page and OpenImageLabel pulls EXIF data straight from the file. Exposure time, aperture, and ISO appear along the top of the image, while the camera model shows at the bottom left. You can adjust font size, move and fade the text with a couple of sliders, and then copy that style to other images or apply it to everything at once. There’s also a checkbox under each card to choose which photos to download; “Download selection” or “Download all” produces finished JPEGs with your overlays baked in.</p>
<p>The interface stays out of your way: on first load you just see a big “Drag images here or click” area; only after you upload do the cards, tools, and download options appear. The same clean design will carry over to the iOS and Android versions I’m working on. By turning metadata into a flexible, customizable overlay, OpenImageLabel lets you present your shots professionally without fiddling with an editor — just load, label, and share.</p>`,
    images: []
  },
  'Project Cablerack (A smarter way to cable-manage)': {
    title: 'Project Cablerack',
    html: `<p>I’m building a custom rack made from precision-cut sheet metal, designed to hold all five of my laptops in perfectly fitted slots. The entire setup connects to my monitor through a single cable, keeping the workspace clean and simple.</p>
<p>Inside the rack, an HDMI switcher lets me change outputs at the press of a remote-control button. To keep everything cool — especially with the plexiglass door closed — I’m adding ARGB fans for both airflow and style. Everything integrates with Apple Home, so I can control cooling and lighting via a HomePod mini.</p>
<p>The result: tidier gear that’s easier — and cooler (literally) — to use.</p>`,
    images: []
  },
  'Socials/Other Sites': {
    title: 'Socials & Links',
    html: `<ul>
    <li><b>My GitHub profile:</b> <a href="https://github.com/ProfessorEngineergit" target="_blank" rel="noopener">github.com/ProfessorEngineergit</a></li>
    <li><b>GitHub profile (school):</b> <a href="https://github.com/makerLab314" target="_blank" rel="noopener">github.com/makerLab314</a></li>
    <li><b>YouTube:</b> <a href="https://www.youtube.com/@droneXplorer-t1n" target="_blank" rel="noopener">youtube.com/@droneXplorer-t1n</a></li>
    <li><b>Skypixel:</b> <a href="https://www.skypixel.com/users/till-bahrian" target="_blank" rel="noopener">skypixel.com/users/till-bahrian</a></li>
    <li><b>Book me as a drone pilot:</b> <a href="https://bahriannovotny.wixstudio.com/meinewebsite" target="_blank" rel="noopener">bahriannovotny.wixstudio.com/meinewebsite</a></li>
    <li><b>Book 3D print services:</b> <a href="https://lorenzobaymueller.wixstudio.com/3d-print-hub" target="_blank" rel="noopener">lorenzobaymueller.wixstudio.com/3d-print-hub</a></li>
  </ul>`,
    images: []
  },
  'HA-Lightswitch (Making analog Lightswitches smart)': {
    title: 'HA-Lightswitch',
    html: `<p>At my school there’s a small makerspace called the MakerLab. Over time, we automated the entire room to a high degree — but one thing remained: the lights. Since this is a school, we couldn’t just take apart the existing light switches.</p>
<p>Our solution was a custom 3D-printed case that lets a servo motor physically flip a standard analog light switch — with no permanent modification. The servo is controlled through Home Assistant via MQTT, running on an Arduino.</p>
<p>It’s a simple, inexpensive, and fully reversible way to add smart-light control wherever replacing the switch isn’t an option.</p>
<p>You can download the project files and read more on GitHub:<br>
<a href="https://github.com/makerLab314/OpenLightswitch-HA" target="_blank" rel="noopener">github.com/makerLab314/OpenLightswitch-HA</a></p>`,
    images: []
  },
  'My Creative Work (Filming, flying, photography)': {
    title: 'Creative Work',
    html: `<p>Flying a drone is more than capturing the view from above — it’s about telling a story in a way no ground-based camera can. With my DJI Mini 2, I enjoy creating videos that inspire and make people want to watch.</p>
<p>Under the name “DroneXplorer,” I produce cinematic footage for a variety of projects — from paid work (e.g., filming houses) to personal creative explorations.</p>
<p>Flying gives me a feeling of freedom and endless possibility. Skimming over our beautiful Earth at bird height is hard to describe — and unforgettable.</p>`,
    images: []
  },
  '3D-Printing (The ultimate engineering-tool)': {
    title: '3D Printing',
    html: `<p>3D printing has become an essential tool for me. Since I was very young, I’ve been inventing things. In kindergarten I already had concepts for self-landing rockets — without ever having heard of Falcon 9. I even sketched out ideas for climate-friendly power plants.</p>
<p>But I couldn’t take those ideas beyond my head and a sheet of paper — until three years ago, when I first saw a 3D printer at a library. I learned CAD that same week and printed a smart desk we had designed during a school project week. A year later, I bought my own 3D printer. It’s been a game-changer for turning ideas into reality.</p>`,
    images: []
  }
};
// === Ende Inhalte ===

// States
let appState = 'loading';
let isAnalyzeButtonVisible = false;
let currentlyAnalyzedObject = null;

createHyperspaceEffect();
animate();

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

const modelURL = 'https://professorengineergit.github.io/Project_Mariner/enterprise-V2.0.glb';

loader.load(modelURL, (gltf) => {
  loadingProgress = 1;
  progressBar.style.width = '100%';
  loadingPercentage.textContent = '100%';
  loadingTitle.textContent = 'Drop out of Warp-Speed';
  loadingScreen.classList.add('clickable');

  ship = gltf.scene;
  ship.rotation.y = Math.PI;
  mainScene.add(ship);
  ship.position.set(0, 0, 30);
  forcefield = createForcefield(5.1); ship.add(forcefield);
  ship.add(cameraPivot); cameraPivot.add(cameraHolder); cameraHolder.add(camera);
  camera.position.set(0, 4, -15); camera.lookAt(cameraHolder.position);
  cameraPivot.rotation.y = Math.PI;

  loadingScreen.addEventListener('click', () => {
    loadingScreen.style.opacity = '0';
    setTimeout(() => loadingScreen.style.display = 'none', 500);
    audio.play();
    appState = 'intro';
    infoElement.classList.add('ui-visible');
    bottomBar.classList.add('ui-visible');
    joystickZone.classList.add('ui-visible');
  }, { once: true });

  // Quick Warp Liste aufbauen, wenn Modell da ist
  buildWarpList();
}, (xhr) => {
  if (xhr.lengthComputable) {
    loadingProgress = Math.min(1, xhr.loaded / xhr.total);
    const percentComplete = Math.round(loadingProgress * 100);
    progressBar.style.width = percentComplete + '%';
    loadingPercentage.textContent = percentComplete + '%';
  }
}, (error) => { console.error('Ladefehler:', error); loadingTitle.textContent = 'Fehler!'; });

// Steuerung
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
window.addEventListener('keydown', (e) => { keyboard[e.key.toLowerCase()] = true; if ((e.key === '=' || e.key === '-' || e.key === '+') && (e.ctrlKey || e.metaKey)) e.preventDefault(); });
window.addEventListener('keyup', (e) => { keyboard[e.key.toLowerCase()] = false; });
nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white', size: 120 })
  .on('move', (evt, data) => { if (data.vector && ship) { joystickMove.forward = data.vector.y * 0.1; joystickMove.turn = -data.vector.x * 0.05; } })
  .on('end', () => joystickMove = { forward: 0, turn: 0 });

renderer.domElement.addEventListener('touchstart', (e) => {
  const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone'));
  if (joystickTouch) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (cameraFingerId === null) { cameraFingerId = touch.identifier; cameraVelocity.set(0, 0); previousTouch.x = touch.clientX; previousTouch.y = touch.clientY; }
  }
  if (e.touches.length >= 2) { initialPinchDistance = getPinchDistance(e); zoomVelocity = 0; }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (e) => {
  const joystickTouch = Array.from(e.changedTouches).some(t => t.target.closest('#joystick-zone'));
  if (joystickTouch) return;
  e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.identifier === cameraFingerId) {
      const dx = touch.clientX - previousTouch.x; const dy = touch.clientY - previousTouch.y;
      cameraVelocity.x += dy * 0.0002; cameraVelocity.y -= dx * 0.0002;
      previousTouch.x = touch.clientX; previousTouch.y = touch.clientY;
    }
  }
  if (e.touches.length >= 2) {
    const current = getPinchDistance(e);
    zoomVelocity -= (current - initialPinchDistance) * 0.03;
    initialPinchDistance = current;
  }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (e) => {
  for (const touch of e.changedTouches) if (touch.identifier === cameraFingerId) cameraFingerId = null;
  if (e.touches.length < 2) initialPinchDistance = 0;
});

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.target.closest('#joystick-zone')) return;
  isDraggingMouse = true; cameraVelocity.set(0, 0); previousTouch.x = e.clientX; previousTouch.y = e.clientY;
});
window.addEventListener('mousemove', (e) => {
  if (isDraggingMouse) {
    const dx = e.clientX - previousTouch.x; const dy = e.clientY - previousTouch.y;
    cameraVelocity.x += dy * 0.0002; cameraVelocity.y -= dx * 0.0002;
    previousTouch.x = e.clientX; previousTouch.y = e.clientY;
  }
});
window.addEventListener('mouseup', () => { isDraggingMouse = false; });
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomVelocity += e.deltaY * (e.ctrlKey ? 0.01 : 0.05);
}, { passive: false });

function getPinchDistance(e) {
  if (e.touches.length < 2) return 0;
  const t1 = e.touches[0], t2 = e.touches[1];
  const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// === Analyse-Fenster (Inhalte aus OBJECT_CONTENT) ===
analyzeButton.addEventListener('click', () => {
  if (!currentlyAnalyzedObject) return;

  const objName = currentlyAnalyzedObject.name;
  const content = OBJECT_CONTENT[objName];

  analysisTitle.textContent = (content && content.title) ? content.title : objName;

  if (content && (content.html || (content.images && content.images.length))) {
    let html = content.html ? content.html : '';
    if (content.images && content.images.length) {
      const imgs = content.images.map(src => `<img src="${src}" alt="">`).join('');
      html += `<div class="analysis-gallery">${imgs}</div>`;
    }
    analysisTextContent.innerHTML = html;
  } else {
    analysisTextContent.innerHTML = `<p>Für <em>${objName}</em> ist noch kein Text/Bild hinterlegt. Trage Inhalte im <code>OBJECT_CONTENT</code>-Block ein.</p>`;
  }

  analysisWindow.classList.add('visible');
  appState = 'paused';
});
closeAnalysisButton.addEventListener('click', () => {
  analysisWindow.classList.remove('visible');
  appState = 'playing';
});

// Quick Warp Interaktion
quickWarpBtn.addEventListener('click', () => {
  quickWarpOverlay.classList.add('visible');
  quickWarpOverlay.setAttribute('aria-hidden', 'false');
});
warpCloseBtn.addEventListener('click', closeWarpOverlay);

function closeWarpOverlay() {
  quickWarpOverlay.classList.remove('visible');
  quickWarpOverlay.setAttribute('aria-hidden', 'true');
  chosenWarpTargetId = null;
  warpHereBtn.disabled = true;
  [...warpList.children].forEach(li => li.classList.remove('active'));
}

function buildWarpList() {
  warpList.innerHTML = '';
  const entries = [
    { id: 'blackhole', name: blackHoleCore.name },
    ...planets.map((p, i) => ({ id: 'planet-' + i, name: p.mesh.name }))
  ];
  for (const entry of entries) {
    const li = document.createElement('li');
    li.textContent = entry.name;
    li.dataset.targetId = entry.id;
    li.addEventListener('click', () => {
      [...warpList.children].forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      chosenWarpTargetId = entry.id;
      warpHereBtn.disabled = false;
    });
    warpList.appendChild(li);
  }
}

warpHereBtn.addEventListener('click', () => {
  if (!chosenWarpTargetId || !ship) return;
  if (warpFlash) {
    warpFlash.classList.add('active');
    setTimeout(() => warpFlash.classList.remove('active'), 180);
  }

  appState = 'paused';
  setTimeout(() => {
    performWarp(chosenWarpTargetId);
    appState = 'playing';
  }, 160);

  closeWarpOverlay();
});

function performWarp(targetId) {
  if (targetId === 'blackhole') {
    const target = new THREE.Vector3(0, 0, 0);
    ship.position.copy(target.clone().add(new THREE.Vector3(0, 0, 30)));
    ship.lookAt(target);
  } else {
    const idx = parseInt(targetId.split('-')[1], 10);
    const p = planets[idx];
    const worldPos = new THREE.Vector3();
    p.mesh.getWorldPosition(worldPos);

    const dir = new THREE.Vector3().subVectors(ship.position, worldPos).normalize();
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    ship.position.copy(worldPos.clone().add(dir.multiplyScalar(12 + p.mesh.geometry.parameters.radius)));
    ship.lookAt(worldPos);
  }
  cameraPivot.rotation.y = 0;
}

// === Animation ===
const clock = new THREE.Clock();
const worldPosition = new THREE.Vector3();

// ======= NEU: Speed-Settings (doppelt + Turbo) =======
let baseSpeedMultiplier = 2;       // doppelt so schnell
let thrustHoldTimer = 0;           // wie lange vorwärts gehalten wird
const THRUST_HOLD_THRESHOLD = 3;   // nach 3s beginnt Turbo
const EXTRA_ACCEL_PER_SEC = 0.5;   // zusätzlicher Faktor pro Sekunde nach 3s
const MAX_EXTRA_MULT = 4;          // Deckel für Extra-Multiplikator

// ======= NEU: Picking für Tap-to-Warp =======
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let _downPos = null;
let _downTime = 0;

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#joystick-zone') || quickWarpOverlay.classList.contains('visible')) return;
  _downPos = { x: e.clientX, y: e.clientY };
  _downTime = performance.now();
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!_downPos) return;
  const moved = Math.hypot(e.clientX - _downPos.x, e.clientY - _downPos.y);
  const dt = performance.now() - _downTime;
  const isTap = moved < 6 && dt < 300;
  _downPos = null;
  if (!isTap) return;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const planetMeshes = planets.map(p => p.mesh);
  const intersects = raycaster.intersectObjects(planetMeshes, true);

  if (intersects.length) {
    let obj = intersects[0].object;
    let idx = -1;
    while (obj) {
      idx = planets.findIndex(p => p.mesh === obj);
      if (idx !== -1) break;
      obj = obj.parent;
    }
    if (idx !== -1) performWarp('planet-' + idx);
  }
});

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta(); // NEU: Zeitbasierte Turbo-Berechnung

  if (appState === 'loading') {
    hyperspaceParticles.position.z += (loadingProgress * 0.05 + 0.01) * 20;
    if (hyperspaceParticles.position.z > HYPERSPACE_LENGTH / 2) hyperspaceParticles.position.z = -HYPERSPACE_LENGTH / 2;
    renderer.render(loadingScene, loadingCamera);
    return;
  }
  if (appState === 'paused') return;

  const elapsedTime = clock.getElapsedTime();
  const pulse = Math.sin(elapsedTime * 0.8) * 0.5 + 0.5;
  pacingCircle.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
  pacingCircle.material.opacity = 0.3 + pulse * 0.4;

  // Planeten: konstante Winkelgeschwindigkeit → konstante Phasenabstände
  planets.forEach(planet => {
    planet.boundaryCircle.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1);
    planet.boundaryCircle.material.opacity = 0.3 + pulse * 0.4;

    const targetRotation = planet.initialRotation + elapsedTime * GLOBAL_ANGULAR_SPEED;
    if (!planet.isFrozen) planet.pivot.rotation.y = THREE.MathUtils.lerp(planet.pivot.rotation.y, targetRotation, 0.02);
  });

  if (ship) {
    const keyForward = (keyboard['w'] ? 0.1 : 0) + (keyboard['s'] ? -0.1 : 0);
    const keyTurn = (keyboard['a'] ? 0.05 : 0) + (keyboard['d'] ? -0.05 : 0);
    const finalForward = joystickMove.forward + keyForward;
    const finalTurn = joystickMove.turn + keyTurn;

    // --- Turbo-Logik ---
    const isThrustingForward = finalForward > 0;
    if (isThrustingForward) {
      thrustHoldTimer += delta;
    } else {
      thrustHoldTimer = 0;
    }

    let extraMult = 1;
    if (thrustHoldTimer > THRUST_HOLD_THRESHOLD) {
      const over = thrustHoldTimer - THRUST_HOLD_THRESHOLD;
      extraMult = Math.min(MAX_EXTRA_MULT, 1 + over * EXTRA_ACCEL_PER_SEC);
    }

    const moveForward = finalForward * baseSpeedMultiplier * extraMult;
    const turnAmount = finalTurn;

    const shipRadius = 5;
    const previousPosition = ship.position.clone();
    ship.translateZ(moveForward);
    ship.rotateY(turnAmount);

    // Kollisionsschutz zum Zentrum
    const blackHoleRadius = blackHoleCore.geometry.parameters.radius;
    const collisionThreshold = shipRadius + blackHoleRadius;
    if (ship.position.distanceTo(blackHoleCore.position) < collisionThreshold) {
      ship.position.copy(previousPosition);
      if (forcefield) { forcefield.visible = true; forcefield.material.opacity = 1.0; }
    }

    // Aktives Objekt bestimmen
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
      if (distanceToPlanetSq < planetBoundaryRadius * planetBoundaryRadius) { activeObject = planet.mesh; break; }
    }
    planets.forEach(p => p.isFrozen = (activeObject === p.mesh));
    currentlyAnalyzedObject = activeObject;

    if (activeObject && !isAnalyzeButtonVisible) {
      analyzeButton.classList.add('ui-visible'); isAnalyzeButtonVisible = true;
    } else if (!activeObject && isAnalyzeButtonVisible) {
      analyzeButton.classList.remove('ui-visible'); isAnalyzeButtonVisible = false;
    }
  }

  // Intro → danach Quick Warp-Button zeigen
  if (appState === 'intro') {
    cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, 0.02);
    if (Math.abs(cameraPivot.rotation.y) < 0.01) {
      cameraPivot.rotation.y = 0;
      appState = 'playing';
      quickWarpBtn.classList.remove('hidden');
    }
  } else if (appState === 'playing') {
    if (ship) {
      if (cameraFingerId === null && !isDraggingMouse) {
        cameraHolder.rotation.x = THREE.MathUtils.lerp(cameraHolder.rotation.x, 0, LERP_FACTOR);
        cameraPivot.rotation.y = THREE.MathUtils.lerp(cameraPivot.rotation.y, 0, LERP_FACTOR);
      }
      if (cameraHolder.rotation.x > ROTATION_LIMIT) cameraVelocity.x -= (cameraHolder.rotation.x - ROTATION_LIMIT) * SPRING_STIFFNESS;
      else if (cameraHolder.rotation.x < -ROTATION_LIMIT) cameraVelocity.x -= (cameraHolder.rotation.x + ROTATION_LIMIT) * SPRING_STIFFNESS;
      if (cameraPivot.rotation.y > ROTATION_LIMIT) cameraVelocity.y -= (cameraPivot.rotation.y - ROTATION_LIMIT) * SPRING_STIFFNESS;
      else if (cameraPivot.rotation.y < -ROTATION_LIMIT) cameraVelocity.y -= (cameraPivot.rotation.y + ROTATION_LIMIT) * SPRING_STIFFNESS;
      cameraHolder.rotation.x += cameraVelocity.x;
      cameraPivot.rotation.y += cameraVelocity.y;
    }
  }

  cameraVelocity.multiplyScalar(0.90);
  zoomDistance += zoomVelocity;
  zoomVelocity *= 0.90;
  zoomDistance = THREE.MathUtils.clamp(zoomDistance, minZoom, maxZoom);
  if (zoomDistance === minZoom || zoomDistance === maxZoom) zoomVelocity = 0;
  if (camera) camera.position.normalize().multiplyScalar(zoomDistance);

  accretionDisk.rotation.z += 0.005;

  if (forcefield && forcefield.visible) {
    forcefield.material.opacity -= 0.04;
    if (forcefield.material.opacity <= 0) forcefield.visible = false;
  }

  // Refraction Capture
  lensingSphere.visible = false; blackHoleCore.visible = false; accretionDisk.visible = false;
  cubeCamera.update(renderer, mainScene);
  lensingSphere.visible = true; blackHoleCore.visible = true; accretionDisk.visible = true;

  composer.render();
  labelRenderer.render(mainScene, camera);
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  loadingCamera.aspect = window.innerWidth / window.innerHeight;
  loadingCamera.updateProjectionMatrix();
});
