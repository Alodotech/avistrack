"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import qrcode from "qrcode-generator";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const RED = 0xd71920;
const SHELL = 0x111113;

type Keyframe = [number, number, number, number, number, number, number];

// [position x,y,z · lookAt x,y,z · fov] pour les 6 chapitres.
const CAMERA_KEYS: Keyframe[] = [
  [-2.6, 0.35, 13.8, 0.45, 0.1, 0, 36],
  [-1.9, 0.6, 9.3, 0.45, 0.4, 0, 37],
  [-2.3, 0.4, -7.6, 2.4, 0.9, -17, 39],
  [-2.4, 0.15, -24.6, 1.9, -0.3, -34.4, 42],
  [-4.2, 5.2, -30.5, 1.9, 0.1, -35.5, 50],
  [-5.6, 7.2, 4.8, 2.1, 0.2, -30, 64],
];

// Brume par chapitre : le plan final se déploie et doit montrer les trois
// écrans (QR, téléphone, tableau) jusqu'au mur du fond, sans les noyer.
const FOG_FAR: number[] = [85, 85, 85, 85, 85, 190];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function hexColor(value: string | null, fallback: string) {
  const clean = (value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? clean : fallback;
}

function roundedShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function extrudedRounded(width: number, height: number, radius: number, depth: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function makeCanvas(width: number, height: number) {
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  return surface;
}

/** Décor studio : disque radial doux, réutilisé pour sol et mur de fond. */
function makeStudioTexture(
  width: number,
  height: number,
  center: string,
  edge: string,
) {
  const surface = makeCanvas(width, height);
  const context = surface.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, center);
    gradient.addColorStop(1, edge);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  return new THREE.CanvasTexture(surface);
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string) {
  context.fillStyle = fill;
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 ? radius * 0.43 : radius;
    context.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  context.closePath();
  context.fill();
}

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

type Cleanup = () => void;

/**
 * Scène WebGL fixe derrière le contenu : la caméra suit les 6 chapitres au
 * défilement (plaque QR + faisceau de scan, téléphone, tableau de bord,
 * isolation A/B). Chargée en différé, rendue aux événements uniquement.
 */
export function Scene3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = document.documentElement;
    if (!canvas || !document.getElementById("hero")) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    let cleanup: Cleanup | undefined;

    const scheduled = window.setTimeout(() => {
      void initScene(canvas, root, reducedMotion, prefersDark).then((done) => {
        cleanup = done;
      });
    }, 40);

    return () => {
      window.clearTimeout(scheduled);
      cleanup?.();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="scene-canvas" />;
}

async function initScene(
  canvas: HTMLCanvasElement,
  root: HTMLElement,
  reducedMotion: MediaQueryList,
  prefersDark: MediaQueryList,
): Promise<Cleanup> {
  const getColors = () => {
    const style = getComputedStyle(root);
    const bg = hexColor(style.getPropertyValue("--scene-bg"), "#ffffff");
    const dark = bg.toLowerCase() !== "#ffffff";
    return { bg, dark };
  };

  const colors = getColors();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.innerWidth > 700,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    root.classList.add("no-webgl");
    return () => undefined;
  }

  root.classList.add("webgl-ready");

  const isDesktop = window.innerWidth >= 700;
  const maxPixelRatio = isDesktop ? 1.7 : 1.35;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (isDesktop) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  // Les textures 3D (QR, formulaire, dashboard) utilisent la vraie Inter :
  // garantir qu'elle est rastérisée avant de dessiner les canvas.
  if (document.fonts?.ready) await document.fonts.ready;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.bg);
  scene.fog = new THREE.Fog(colors.bg, 22, 85);

  // Éclairage d'environnement : vraie HDRI photostudio (PMREM) pour des
  // réflexions réalistes. Démarrage immédiat sur RoomEnvironment, puis
  // amélioration en arrière-plan quand la HDRI arrive — jamais bloquant.
  const hdriUrl = "/assets/landing/studio_small_09_1k.hdr";
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  new RGBELoader()
    .loadAsync(hdriUrl)
    .then((equirectangular) => {
      scene.environment = pmrem.fromEquirectangular(equirectangular).texture;
      equirectangular.dispose();
      queueRender();
    })
    .catch(() => {
      queueRender();
    });

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 130);
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9d9da0, 1.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(3, 8, 9);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
  rimLight.position.set(-7, 3, -5);
  scene.add(rimLight);
  if (isDesktop) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 40;
  }

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: SHELL,
    roughness: 0.28,
    metalness: 0.18,
    envMapIntensity: 0.9,
  });

  // Décalage horizontal : colonne texte à gauche sur desktop, centrage mobile.
  let sceneX = window.innerWidth < 700 ? 0.1 : 2.15;

  // --- Plaque QR sur socle ---
  const plaque = new THREE.Group();
  plaque.position.set(sceneX, 0, 0);
  scene.add(plaque);
  const plaqueShell = new THREE.Mesh(extrudedRounded(4.3, 5.55, 0.32, 0.23), shellMaterial);
  plaqueShell.castShadow = isDesktop;
  plaque.add(plaqueShell);

  const board = makeCanvas(512, 670);
  const boardContext = board.getContext("2d");
  if (boardContext) {
    // Carte fidèle : blanc, marque en haut, QR noir standard à gauche.
    boardContext.fillStyle = "#ffffff";
    boardContext.fillRect(0, 0, board.width, board.height);

    // Marque.
    boardContext.fillStyle = "#0a0a0a";
    boardContext.font = "600 22px Inter, Arial, sans-serif";
    boardContext.textAlign = "left";
    boardContext.fillText("AVISTRACK", 44, 58);
    boardContext.fillStyle = "#d71920";
    boardContext.beginPath();
    boardContext.arc(204, 52, 7, 0, Math.PI * 2);
    boardContext.fill();

    // QR code réel (modules noirs, cadres de détection noirs).
    try {
      const code = qrcode(0, "M");
      code.addData("https://avistrack.fr/avis/demo-avistrack");
      code.make();
      const count = code.getModuleCount();
      const size = 330;
      const cell = size / count;
      const left = 44;
      const top = 108;
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          if (!code.isDark(row, col)) continue;
          boardContext.fillStyle = "#0a0a0a";
          boardContext.fillRect(
            Math.round(left + col * cell),
            Math.round(top + row * cell),
            Math.ceil(cell),
            Math.ceil(cell),
          );
        }
      }
    } catch {
      boardContext.fillStyle = "#101012";
      for (let row = 0; row < 27; row += 1) {
        for (let col = 0; col < 27; col += 1) {
          if (((row * 11 + col * 7 + row * col) % 5) < 2) {
            boardContext.fillRect(59 + col * 12, 125 + row * 12, 10, 10);
          }
        }
      }
    }

    // Sous-titre + CTA.
    boardContext.textAlign = "center";
    boardContext.fillStyle = "#111113";
    boardContext.font = "600 37px Inter, Arial, sans-serif";
    boardContext.fillText("Donnez votre avis", 256, 516);
    boardContext.fillStyle = "#d71920";
    roundRectPath(boardContext, 146, 548, 220, 66, 12);
    boardContext.fill();
    boardContext.textAlign = "center";
    boardContext.fillStyle = "#ffffff";
    boardContext.font = "600 23px Inter, Arial, sans-serif";
    boardContext.fillText("31 secondes", 256, 591);
    boardContext.fillStyle = "#8b8d90";
    boardContext.font = "400 19px Inter, Arial, sans-serif";
    boardContext.fillText("sans compte · vous repartez avec mon avis", 256, 646);
  }
  const boardTexture = new THREE.CanvasTexture(board);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  boardTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const plaqueFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.02, 5.22),
    new THREE.MeshBasicMaterial({ map: boardTexture }),
  );
  plaqueFace.position.z = 0.15;
  plaque.add(plaqueFace);

  const scanBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 0.035),
    new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  scanBeam.position.set(0, 0.45, 0.18);
  plaque.add(scanBeam);
  const scanGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 0.48),
    new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.08, depthWrite: false }),
  );
  scanGlow.position.set(0, 0.45, 0.175);
  plaque.add(scanGlow);

  // --- Smartphone posé sur un socle, chassis métal, vrai écran ---
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x191a1c,
    roughness: 0.32,
    metalness: 0.92,
    envMapIntensity: 1.1,
  });
  const phone = new THREE.Group();
  phone.position.set(sceneX + 0.4, 0.26, -17);
  scene.add(phone);
  const phoneFrame = new THREE.Mesh(extrudedRounded(2.66, 5.24, 0.48, 0.36), frameMaterial);
  phoneFrame.castShadow = isDesktop;
  phone.add(phoneFrame);
  const phonePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.75, 32),
    shellMaterial,
  );
  phonePlinth.position.set(sceneX + 0.4, -2.7, -17);
  phonePlinth.castShadow = isDesktop;
  scene.add(phonePlinth);

  // Boutons de volume / veille sur les tranches.
  const buttonGeometry = new THREE.BoxGeometry(0.07, 0.36, 0.16);
  const rightButtonA = new THREE.Mesh(buttonGeometry, frameMaterial);
  rightButtonA.position.set(1.29, 0.65, 0);
  phone.add(rightButtonA);
  const rightButtonB = new THREE.Mesh(buttonGeometry, frameMaterial);
  rightButtonB.position.set(1.29, -0.5, 0);
  phone.add(rightButtonB);
  const leftButton = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.16), frameMaterial);
  leftButton.position.set(-1.29, 0.15, 0);
  phone.add(leftButton);

  // Écran : dalle sombre + îlot caméra + barre d'accueil.
  const screenGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.46, 4.96),
    new THREE.MeshBasicMaterial({ color: 0x050506 }),
  );
  screenGlass.position.z = 0.17;
  phone.add(screenGlass);
  const island = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.17),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  island.position.set(0, 2.14, 0.19);
  phone.add(island);
  const homeBar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x111113, transparent: true, opacity: 0.8 }),
  );
  homeBar.position.set(0, -2.2, 0.19);
  phone.add(homeBar);

  // Écran : UI du formulaire, réaliste et vivante.
  const phoneScreen = makeCanvas(512, 1070);
  const phoneContext = phoneScreen.getContext("2d");
  if (phoneContext) {
    phoneContext.fillStyle = "#f6f7f8";
    phoneContext.fillRect(0, 0, 512, 1070);

    // Barre de statut.
    phoneContext.textAlign = "center";
    phoneContext.fillStyle = "#111113";
    phoneContext.font = "600 24px Inter, Arial, sans-serif";
    phoneContext.fillText("9:41", 256, 52);
    phoneContext.fillStyle = "#111113";
    phoneContext.fillRect(368, 36, 18, 12);
    phoneContext.clearRect(370, 38, 14, 8);

    // Marque + commerce.
    phoneContext.textAlign = "left";
    phoneContext.fillStyle = "#d71920";
    phoneContext.fillRect(44, 156, 26, 26);
    phoneContext.fillStyle = "#111113";
    phoneContext.font = "600 29px Inter, Arial, sans-serif";
    phoneContext.fillText("Pharmacie du Centre", 84, 177);
    phoneContext.fillStyle = "#8b8d90";
    phoneContext.font = "500 17px Inter, Arial, sans-serif";
    phoneContext.fillText("Notez votre visite", 86, 205);

    // Titre.
    phoneContext.fillStyle = "#111113";
    phoneContext.font = "650 52px Inter, Arial, sans-serif";
    phoneContext.fillText("Votre avis compte.", 44, 282);
    phoneContext.fillStyle = "#d71920";
    phoneContext.fillRect(44, 300, 62, 5);

    // Étoiles.
    for (let i = 0; i < 5; i += 1) {
      drawStar(phoneContext, 76 + i * 86, 388, 34, i < 4 ? "#d71920" : "#d7d9dc");
    }
    phoneContext.fillStyle = "#8b8d90";
    phoneContext.font = "500 19px Inter, Arial, sans-serif";
    phoneContext.fillText("Comment s'est passée votre visite ?", 44, 462);

    // Champ date.
    phoneContext.fillStyle = "#eceef0";
    roundRectPath(phoneContext, 44, 500, 424, 64, 16);
    phoneContext.fill();
    phoneContext.fillStyle = "#111113";
    phoneContext.font = "500 25px Inter, Arial, sans-serif";
    phoneContext.fillText("Aujourd'hui", 66, 540);

    // Zone commentaire.
    phoneContext.fillStyle = "#eceef0";
    roundRectPath(phoneContext, 44, 620, 424, 148, 16);
    phoneContext.fill();
    phoneContext.fillStyle = "#9a9ca0";
    phoneContext.font = "400 23px Inter, Arial, sans-serif";
    phoneContext.fillText("Dites-nous en plus (facultatif)", 66, 686);

    // Bouton d'envoi.
    phoneContext.shadowColor = "rgba(215, 25, 32, 0.35)";
    phoneContext.shadowBlur = 22;
    phoneContext.fillStyle = "#d71920";
    roundRectPath(phoneContext, 44, 830, 424, 88, 20);
    phoneContext.fill();
    phoneContext.shadowBlur = 0;
    phoneContext.textAlign = "center";
    phoneContext.fillStyle = "#ffffff";
    phoneContext.font = "600 28px Inter, Arial, sans-serif";
    phoneContext.fillText("Envoyer mon avis", 256, 887);

    // Note de réassurance.
    phoneContext.fillStyle = "#8b8d90";
    phoneContext.font = "500 18px Inter, Arial, sans-serif";
    phoneContext.fillText("Confidentiel · sans compte, sans appli", 256, 966);
  }
  const phoneTexture = new THREE.CanvasTexture(phoneScreen);
  phoneTexture.colorSpace = THREE.SRGBColorSpace;
  const phoneFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.46, 4.96),
    new THREE.MeshBasicMaterial({ map: phoneTexture }),
  );
  phoneFace.position.z = 0.185;
  phone.add(phoneFace);

  // --- Tableau de bord : écran sur pied, comme un bornier de cuisine. ---
  const dashboard = new THREE.Group();
  dashboard.position.set(sceneX, 0, -34);
  scene.add(dashboard);
  const dashStand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.9, 12), shellMaterial);
  dashStand.position.set(-0.2, -2.1, -1.4);
  dashStand.castShadow = isDesktop;
  dashboard.add(dashStand);
  const dashBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.14, 1.3),
    shellMaterial,
  );
  dashBase.position.set(-0.2, -3.0, -1.4);
  dashboard.add(dashBase);
  // Panneau reliquat d'écran derrière la face, pour épaissir l'objet.
  const dashBack = new THREE.Mesh(
    new THREE.BoxGeometry(8.6, 4.85, 0.16),
    shellMaterial,
  );
  dashBack.position.z = -0.05;
  dashboard.add(dashBack);
  const dashboardCanvas = makeCanvas(1024, 576);
  const dashboardContext = dashboardCanvas.getContext("2d");
  if (dashboardContext) {
    dashboardContext.fillStyle = "#101012";
    dashboardContext.fillRect(0, 0, 1024, 576);
    dashboardContext.fillStyle = "#d71920";
    dashboardContext.fillRect(0, 0, 1024, 8);
    dashboardContext.fillStyle = "#96979b";
    dashboardContext.font = "500 22px Inter, Arial, sans-serif";
    dashboardContext.fillText("AVISTRACK  ·  TABLEAU DE BORD", 46, 63);
    dashboardContext.fillStyle = "#ffffff";
    dashboardContext.font = "600 204px Inter, Arial, sans-serif";
    dashboardContext.fillText("4,6", 43, 320);
    dashboardContext.fillStyle = "#96979b";
    dashboardContext.font = "500 40px Inter, Arial, sans-serif";
    dashboardContext.fillText("/ 5", 390, 316);
    dashboardContext.font = "500 30px Inter, Arial, sans-serif";
    dashboardContext.fillText("128 avis reçus", 49, 381);
    for (let i = 0; i < 5; i += 1) {
      drawStar(dashboardContext, 68 + i * 62, 455, 25, i < 4 ? "#d71920" : "#55282a");
    }
  }
  const dashboardTexture = new THREE.CanvasTexture(dashboardCanvas);
  dashboardTexture.colorSpace = THREE.SRGBColorSpace;
  const dashboardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 4.61),
    new THREE.MeshBasicMaterial({ map: dashboardTexture }),
  );
  dashboardFace.position.z = 0.01;
  dashboard.add(dashboardFace);
  const bars: { mesh: THREE.Mesh; targetHeight: number; current: number }[] = [
    0.55, 0.9, 1.35, 2.05, 3.0, 2.4,
  ].map((targetHeight, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: index === 5 ? RED : 0xc7c7c9,
      fog: false,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1, 0.32), material);
    bar.position.set(1.15 + index * 0.57, -1.83, 0.25);
    dashboard.add(bar);
    return { mesh: bar, targetHeight, current: 0.001 };
  });

  // --- Sol studio : disque de lumière doux, pas un pavé uniforme. ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
      map: makeStudioTexture(512, 512, "#f4f4f6", "#d9d9de"),
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0.5,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(sceneX, -3.05, -27);
  floor.receiveShadow = isDesktop;
  scene.add(floor);

  // --- Mur de fond : plan clair photostudio, éloigne le vide. ---
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 30),
    new THREE.MeshBasicMaterial({
      map: makeStudioTexture(512, 512, "#ffffff", "#ececef"),
      transparent: true,
      opacity: 0.96,
    }),
  );
  backdrop.position.set(sceneX, 6, -64);
  scene.add(backdrop);

  const makeSoftTexture = () => {
    const softCanvas = makeCanvas(128, 128);
    const context = softCanvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(0,0,0,.22)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(softCanvas);
  };
  const shadowTexture = makeSoftTexture();
  const groundShadows: THREE.MeshBasicMaterial[] = [];
  [
    [sceneX, 0],
    [sceneX, -17],
    [sceneX, -34],
    [sceneX - 0.05, -52],
  ].forEach(([x, z], index) => {
    const material = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: index === 1 ? 0.55 : 0.78,
    });
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(index === 2 ? 9 : 6, index === 2 ? 6 : 5),
      material,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x as number, -3.025, z as number);
    scene.add(shadow);
    groundShadows.push(material);
  });

  const followLight = new THREE.PointLight(0xffeee8, 0.5, 23);
  scene.add(followLight);

  // Post-traitement : bloom discret sur la lumière rouge (scan, halos).
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  if (!reducedMotion.matches) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45,
      0.55,
      0.72,
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  // --- Pilotage ---
  let width = window.innerWidth;
  let height = window.innerHeight;
  let targetProgress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedPointerX = 0;
  let easedPointerY = 0;
  let time = 0;
  let previousTime = performance.now();
  let scrollVelocity = 0;
  let lastScroll = window.scrollY;
  let previousScrollTime = performance.now();

  const sections = ["hero", "s1", "s2", "s3", "s4", "s5"]
    .map((id) => document.getElementById(id))
    .filter((section): section is HTMLElement => Boolean(section));

  const getScrollProgress = () => {
    if (sections.length < 2) return 0;
    const positions = sections.map(
      (section) => section.getBoundingClientRect().top + window.scrollY,
    );
    let index = 0;
    for (let i = 1; i < positions.length; i += 1) {
      if (window.scrollY >= (positions[i] ?? 0)) index = i;
    }
    if (index >= positions.length - 1) return positions.length - 1;
    const span = Math.max(1, (positions[index + 1] ?? 0) - (positions[index] ?? 0));
    return index + clamp((window.scrollY - (positions[index] ?? 0)) / span, 0, 1);
  };

  let renderScheduled = false;
  const queueRender = () => {
    if (renderScheduled) return;
    renderScheduled = true;
    window.requestAnimationFrame((frameTime) => {
      renderScheduled = false;
      render(frameTime);
    });
  };

  const render = (frameTime: number) => {
    const dt = Math.min((frameTime - previousTime) / 1000, 0.05);
    previousTime = frameTime;
    const motionTime = reducedMotion.matches ? 0 : frameTime / 1000;
    time = motionTime;

    const currentProgress = targetProgress;
    const segment = Math.min(Math.floor(currentProgress), CAMERA_KEYS.length - 2);
    const local = smoothstep(clamp(currentProgress - segment, 0, 1));
    const from = CAMERA_KEYS[segment];
    const to = CAMERA_KEYS[segment + 1];
    if (!from || !to) return;
    const interpolate = (index: number) =>
      from[index] + (to[index] - from[index]) * local;

    const damping = Math.min(1, dt * 2.6);
    easedPointerX += (pointerX - easedPointerX) * damping;
    easedPointerY += (pointerY - easedPointerY) * damping;

    const drift = reducedMotion.matches ? 0 : clamp(scrollVelocity, -1, 1);
    camera.position.set(
      interpolate(0) + easedPointerX * 0.16,
      interpolate(1) - easedPointerY * 0.12,
      interpolate(2),
    );
    camera.lookAt(
      interpolate(3) + easedPointerX * 0.07,
      interpolate(4),
      interpolate(5),
    );
    camera.fov = interpolate(6) + Math.abs(drift) * 1.2;
    camera.updateProjectionMatrix();
    camera.rotation.z = drift * 0.007;

    // La brume suit le parcours : bien visible au fil des chapitres, elle se
    // retire sur le plan final pour que les trois écrans restent nets.
    const fromFog = FOG_FAR[segment] ?? 85;
    const toFog = FOG_FAR[segment + 1] ?? 190;
    const fog = scene.fog as THREE.Fog;
    if (fog) {
      fog.near = THREE.MathUtils.lerp(22, 26, Math.min(1, currentProgress * 1.2));
      fog.far = THREE.MathUtils.lerp(fromFog, toFog, local);
    }

    const scan = reducedMotion.matches ? 0.5 : (1 - Math.cos(time * 0.9)) / 2;
    scanBeam.position.y = 1.5 - scan * 3;
    scanGlow.position.y = scanBeam.position.y;

    // Objets fixes : la caméra seule raconte le parcours. Pas de balancement
    // perpétuel (mouvement « vide », signature de rendu amateur).
    if (!reducedMotion.matches) {
      plaque.rotation.y = -0.24 + easedPointerX * 0.1;
      plaque.rotation.x = easedPointerY * 0.04;
      phone.rotation.y = 0.22 + easedPointerX * 0.07;
      dashboard.rotation.y = -0.09 + easedPointerX * 0.035;
    }

    bars.forEach((bar, index) => {
      const threshold = 2.72 + index * 0.035;
      const target =
        currentProgress > threshold ? bar.targetHeight : 0.001;
      bar.current = THREE.MathUtils.lerp(bar.current, target, reducedMotion.matches ? 1 : Math.min(1, dt * 2.8));
      bar.mesh.scale.y = bar.current;
      bar.mesh.position.y = -1.83 + bar.current / 2;
    });

    followLight.position.set(
      camera.position.x + 1.5,
      camera.position.y + 3,
      camera.position.z - 4,
    );

    if (composer) composer.render();
    else renderer.render(scene, camera);
  };

  const applyTheme = () => {
    const next = getColors();
    scene.background = new THREE.Color(next.bg);
    if (scene.fog) scene.fog.color.copy(scene.background);
    floor.material.color.set(next.dark ? 0x121214 : 0xffffff);
    backdrop.material.color.set(next.dark ? 0x151517 : 0xffffff);
    groundShadows.forEach((material) => {
      material.opacity = next.dark ? 0.06 : 0.78;
    });
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    sceneX = width < 700 ? 0.1 : 2.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.35 : 1.7));
    renderer.setSize(width, height, false);
    if (composer) {
      composer.setSize(width, height);
      bloomPass?.setSize(width, height);
    }
    camera.aspect = width / Math.max(1, height);
    camera.fov = width < 700 ? 45 : 37;
    camera.updateProjectionMatrix();
    targetProgress = getScrollProgress();
    queueRender();
  };

  const onScroll = () => {
    const now = performance.now();
    const elapsed = Math.max(16, now - previousScrollTime) / 1000;
    scrollVelocity = (window.scrollY - lastScroll) / elapsed / 1800;
    lastScroll = window.scrollY;
    previousScrollTime = now;
    targetProgress = getScrollProgress();
    queueRender();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || width < 700 || reducedMotion.matches) return;
    pointerX = (event.clientX / width) * 2 - 1;
    pointerY = (event.clientY / height) * 2 - 1;
    queueRender();
  };

  const onPointerStart = () => queueRender();

  const onDarkChange = () => {
    window.setTimeout(() => {
      applyTheme();
      queueRender();
    }, 60);
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerStart, { passive: true });
  prefersDark.addEventListener?.("change", onDarkChange);

  applyTheme();
  resize();
  queueRender();

  return () => {
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerStart);
    prefersDark.removeEventListener?.("change", onDarkChange);
    renderer.dispose();
    root.classList.remove("webgl-ready");
  };
}