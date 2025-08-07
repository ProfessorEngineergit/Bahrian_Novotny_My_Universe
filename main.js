import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Szene & Kamera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0, 100, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
document.body.appendChild(labelRenderer.domElement);

const planets = [];
let ship = new THREE.Object3D();

// Beispiel-Planeten
function addPlanet(name, pos) {
  const geometry = new THREE.SphereGeometry(10, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x44aa88 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(pos);
  scene.add(mesh);

  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = name;
  const label = new CSS2DObject(div);
  label.position.set(0, 15, 0);
  mesh.add(label);

  planets.push({ name, mesh, label });
}

addPlanet("Earth", new THREE.Vector3(100, 0, 0));
addPlanet("Mars", new THREE.Vector3(-150, 0, 100));

// Quick Warp
const warpBtn = document.getElementById('quick-warp-button');
const warpWin = document.getElementById('quick-warp-window');
const warpList = document.getElementById('warp-list');
const warpHereBtn = document.getElementById('warp-here');
let selectedWarpTarget = null;

warpBtn.addEventListener('click', () => {
  warpWin.classList.add('visible');
  warpList.innerHTML = '';
  planets.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.addEventListener('click', () => {
      selectedWarpTarget = p;
    });
    warpList.appendChild(li);
  });
});

warpHereBtn.addEventListener('click', () => {
  if (selectedWarpTarget) {
    warpTo(selectedWarpTarget.mesh.position);
    warpWin.classList.remove('visible');
  }
});

function warpTo(targetPos) {
  ship.position.copy(targetPos);
  camera.position.set(targetPos.x + 50, targetPos.y + 30, targetPos.z + 50);
  camera.lookAt(targetPos);
}

// Labels: konstanter Maßstab
function updateLabels() {
  planets.forEach(p => {
    p.label.quaternion.copy(camera.quaternion);
  });
}

// Lade-Ende → UI anzeigen
function onLoadComplete() {
  document.getElementById('info').classList.add('ui-visible');
  document.getElementById('joystick-zone').classList.add('ui-visible');
  document.getElementById('bottom-bar').classList.add('ui-visible');
  warpBtn.classList.add('ui-visible');
  document.getElementById('loading-screen').style.display = 'none';
}

// Simuliere Lade-Ende nach 2s
setTimeout(onLoadComplete, 2000);

function animate() {
  requestAnimationFrame(animate);
  updateLabels();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
