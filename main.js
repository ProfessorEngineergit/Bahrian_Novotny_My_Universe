// --- main.js (DEBUGGING-VERSION) ---

import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/DRACOLoader.js';

// 1. Minimales Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20; // Kamera zurücksetzen, um etwas zu sehen
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

console.log("Debugging-Skript gestartet. Versuche, Modell zu laden...");

// 2. Lader-Setup
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
loader.setDRACOLoader(dracoLoader);

const modelURL = 'https://professorengineergit.github.io/Project_Mariner/downscaled_USS_Enterprise_D.glb';
console.log("Lade von URL:", modelURL);

// 3. Der Ladeversuch
loader.load(
    modelURL,
    // onLoad: Wird NUR bei Erfolg aufgerufen
    function (gltf) {
        console.log("%c ERFOLG! Das Modell wurde erfolgreich geladen.", "color: green; font-weight: bold;");
        const ship = gltf.scene;
        scene.add(ship);
        document.getElementById('loading-text').textContent = "Erfolgreich geladen!";
    },
    // onProgress: Wird während des Ladens aufgerufen
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% geladen');
    },
    // onError: Wird NUR bei einem Fehler aufgerufen
    function (error) {
        console.error("%c FEHLER! Das Modell konnte nicht geladen werden.", "color: red; font-weight: bold;");
        console.error("Das ist das Fehlerobjekt:", error);
        document.getElementById('loading-text').textContent = "Ladefehler! Bitte F12 drücken und die Konsole prüfen.";
    }
);

// 4. Einfache Render-Schleife
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
