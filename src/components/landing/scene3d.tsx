"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import qrcode from "qrcode-generator";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

const ACCENT = 0xd71920;
const SHELL = 0x111113;

type Keyframe = [number, number, number, number, number, number, number];

// [position x,y,z · lookAt x,y,z · fov] pour les 6 chapitres.
  const CAMERA_KEYS: Keyframe[] = [
    [-2.6, 0.35, 13.8, 0.45, 0.1, 0, 36],
    [-1.9, 0.6, 9.3, 0.45, 0.4, 0, 37],
    [-1.8, 0.5, -7.2, 1.8, 0.85, -16, 36],
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

  // Mise en page en deux colonnes (lg) : la scène se décale à droite de la
  // colonne texte. Sous 1024 px, l'affichage est mono-colonne et les écrans
  // produits sont rendus en HTML (lisibles et nets) : la scène reste centrée.
  const isSceneWide = window.innerWidth >= 1024;
  const screenShift = isSceneWide ? 1.8 : 0;
  const maxPixelRatio = isSceneWide ? 1.7 : 1.35;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (isSceneWide) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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
  new HDRLoader()
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
  if (isSceneWide) {
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

  // Décalage horizontal : colonne texte à gauche sur deux colonnes (lg),
  // centrage plein sur les plus petites fenêtres.
  let sceneX = window.innerWidth >= 1024 ? 2.15 : 0.1;
  let basePhoneX = sceneX + screenShift + 0.4;
  let baseDashboardX = sceneX + screenShift;

  // --- Plaque QR sur socle ---
  const plaque = new THREE.Group();
  plaque.position.set(sceneX + screenShift, 0, 0);
  scene.add(plaque);
  const plaqueShell = new THREE.Mesh(extrudedRounded(4.3, 5.55, 0.32, 0.23), shellMaterial);
  plaqueShell.castShadow = isSceneWide;
  plaque.add(plaqueShell);

  const board = makeCanvas(512, 670);
  const boardContext = board.getContext("2d");
  if (boardContext) {
    const ctx = boardContext;
    // Carte imprimée : blanche, marque en haut, QR encadré au centre.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 670);

    // Marque.
    ctx.fillStyle = "#d71920";
    roundRectPath(ctx, 44, 38, 22, 22, 7);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 21px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("AVISTRACK", 78, 55);

    // Accroche.
    ctx.textAlign = "center";
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 38px Inter, Arial, sans-serif";
    ctx.fillText("Votre avis compte.", 256, 124);
    ctx.fillStyle = "#555555";
    ctx.font = "400 18px Inter, Arial, sans-serif";
    ctx.fillText("Scannez le QR code et notez", 256, 160);
    ctx.fillText("votre visite en 30 secondes.", 256, 184);

    // Encart du code.
    ctx.fillStyle = "#f4f4f4";
    roundRectPath(ctx, 44, 210, 424, 354, 18);
    ctx.fill();

    // QR code réel : l'image de marque fournie, repli sur un QR généré.
    const qrSize = 314;
    const qrX = 256 - qrSize / 2;
    const qrY = 210 + (354 - qrSize) / 2;
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = qrSize / Math.max(1, img.width, img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, qrX + (qrSize - w) / 2, qrY + (qrSize - h) / 2, w, h);
        resolve();
      };
      img.onerror = () => {
        try {
          const code = qrcode(0, "M");
          code.addData("https://avistrack.fr/avis/demo-avistrack");
          code.make();
          const count = code.getModuleCount();
          const cell = qrSize / count;
          for (let row = 0; row < count; row += 1) {
            for (let col = 0; col < count; col += 1) {
              if (!code.isDark(row, col)) continue;
              ctx.fillStyle = "#0a0a0a";
              ctx.fillRect(
                Math.round(qrX + col * cell),
                Math.round(qrY + row * cell),
                Math.ceil(cell),
                Math.ceil(cell),
              );
            }
          }
        } catch {
          ctx.fillStyle = "#101012";
          for (let row = 0; row < 27; row += 1) {
            for (let col = 0; col < 27; col += 1) {
              if (((row * 11 + col * 7 + row * col) % 5) < 2) {
                ctx.fillRect(qrX + col * 12, qrY + row * 12, 10, 10);
              }
            }
          }
        }
        resolve();
      };
      img.src = "/assets/landing/qr-code-avistrack.png";
    });

    // Commerce + réassurance.
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 24px Inter, Arial, sans-serif";
    ctx.fillText("Pharmacie du Centre", 256, 612);
    ctx.fillStyle = "#555555";
    ctx.font = "400 16px Inter, Arial, sans-serif";
    ctx.fillText("Sans compte · sans application", 256, 644);
  }
  const boardTexture = new THREE.CanvasTexture(board);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  boardTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const plaqueFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.02, 5.22),
    new THREE.MeshBasicMaterial({ map: boardTexture }),
  );
  // La coque (extrusion biseautée) a sa surface avant la plus avancée à
  // z = 0.16 : la carte doit être devant elle, sinon seule la coque sombre
  // s'affiche et la plaque paraît vide.
  plaqueFace.position.z = 0.185;
  plaque.add(plaqueFace);

  const scanBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 0.035),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  scanBeam.position.set(0, 0.45, 0.205);
  plaque.add(scanBeam);
  const scanGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 0.48),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.08, depthWrite: false }),
  );
  scanGlow.position.set(0, 0.45, 0.2);
  plaque.add(scanGlow);

  // --- Smartphone posé sur un socle, chassis métal, vrai écran ---
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x191a1c,
    roughness: 0.32,
    metalness: 0.92,
    envMapIntensity: 1.1,
  });
  const phone = new THREE.Group();
  basePhoneX = sceneX + screenShift + 0.4;
  phone.position.set(basePhoneX, 0.26, -17);
  scene.add(phone);
  const phoneFrame = new THREE.Mesh(extrudedRounded(2.66, 5.24, 0.48, 0.36), frameMaterial);
  phoneFrame.castShadow = isSceneWide;
  phone.add(phoneFrame);
  const phonePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.75, 32),
    shellMaterial,
  );
  phonePlinth.position.set(0, -2.7, 0); // relatif au groupe phone
  phonePlinth.castShadow = isSceneWide;
  phone.add(phonePlinth); // ajouté au groupe phone pour bouger ensemble

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
  island.position.set(0, 2.14, 0.256);
  phone.add(island);
  const homeBar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x111113, transparent: true, opacity: 0.8 }),
  );
  homeBar.position.set(0, -2.2, 0.256);
  phone.add(homeBar);

  // Écran : UI du formulaire, réaliste et vivante.
  const phoneScreen = makeCanvas(512, 1070);
  const phoneContext = phoneScreen.getContext("2d");
  if (phoneContext) {
    const ctx = phoneContext;
    ctx.fillStyle = "#f6f7f8";
    ctx.fillRect(0, 0, 512, 1070);

    const MARGIN = 64; // marges internes confortables
    const WIDTH = 512 - MARGIN * 2;

    // Barre de statut.
    ctx.textAlign = "left";
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 22px Inter, Arial, sans-serif";
    ctx.fillText("9:41", MARGIN, 60);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(512 - MARGIN - 70, 44, 5, 10);
    ctx.fillRect(512 - MARGIN - 60, 40, 5, 14);
    ctx.fillRect(512 - MARGIN - 50, 36, 5, 18);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 3;
    roundRectPath(ctx, 512 - MARGIN - 84, 38, 40, 18, 4);
    ctx.stroke();
    ctx.fillRect(512 - MARGIN - 79, 43, 26, 8);

    // En-tête commerce.
    ctx.fillStyle = "#d71920";
    roundRectPath(ctx, MARGIN, 108, 46, 46, 13);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("P", MARGIN + 23, 141);
    ctx.textAlign = "left";
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 27px Inter, Arial, sans-serif";
    ctx.fillText("Pharmacie du Centre", MARGIN + 62, 132);
    ctx.fillStyle = "#555555";
    ctx.font = "500 16px Inter, Arial, sans-serif";
    ctx.fillText("Notez votre visite", MARGIN + 62, 156);

    // Titre + note sélectionnée.
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 34px Inter, Arial, sans-serif";
    ctx.fillText("Comment s'est passée", MARGIN, 232);
    ctx.fillText("votre visite ?", MARGIN, 272);
    for (let i = 0; i < 5; i += 1) {
      drawStar(ctx, MARGIN + 22 + i * 52, 330, 22, i < 4 ? "#d71920" : "#d7d9dc");
    }
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 22px Inter, Arial, sans-serif";
    ctx.fillText("Très bien", MARGIN + 252, 338);

    // Date de visite.
    ctx.fillStyle = "#555555";
    ctx.font = "600 16px Inter, Arial, sans-serif";
    ctx.fillText("Date de visite", MARGIN, 404);
    ctx.fillStyle = "#eceef0";
    roundRectPath(ctx, MARGIN, 418, WIDTH, 64, 14);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "500 23px Inter, Arial, sans-serif";
    ctx.fillText("Aujourd'hui", MARGIN + 22, 458);

    // Commentaire.
    ctx.fillStyle = "#555555";
    ctx.font = "600 16px Inter, Arial, sans-serif";
    ctx.fillText("Votre commentaire", MARGIN, 532);
    ctx.fillStyle = "#eceef0";
    roundRectPath(ctx, MARGIN, 546, WIDTH, 150, 14);
    ctx.fill();
    ctx.fillStyle = "#8b8d90";
    ctx.font = "400 23px Inter, Arial, sans-serif";
    ctx.fillText("Dites-nous en plus (facultatif)", MARGIN + 22, 592);

    // Bouton d'envoi.
    ctx.shadowColor = "rgba(215, 25, 32, 0.35)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#d71920";
    roundRectPath(ctx, MARGIN, 780, WIDTH, 88, 44);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 27px Inter, Arial, sans-serif";
    ctx.fillText("Envoyer mon avis", 256, 836);

    // Note de réassurance.
    ctx.fillStyle = "#8b8d90";
    ctx.font = "500 17px Inter, Arial, sans-serif";
    ctx.fillText("Confidentiel · sans compte, sans application", 256, 952);
  }
  const phoneTexture = new THREE.CanvasTexture(phoneScreen);
  phoneTexture.colorSpace = THREE.SRGBColorSpace;
  const phoneFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.46, 4.96),
    new THREE.MeshBasicMaterial({ map: phoneTexture }),
  );
  // Le cadre biseauté monte jusqu'à z = 0.225 : la dalle doit passer devant
  // cette surface, sinon le formulaire reste caché derrière la coque.
  phoneFace.position.z = 0.25;
  phone.add(phoneFace);

  // --- Tableau de bord : écran sur pied, comme un bornier de cuisine. ---
  const dashboard = new THREE.Group();
  baseDashboardX = sceneX + screenShift;
  dashboard.position.set(baseDashboardX, 0, -34);
  scene.add(dashboard);
  const dashStand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.9, 12), shellMaterial);
  dashStand.position.set(-0.2, -2.1, -1.4);
  dashStand.castShadow = isSceneWide;
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
    const ctx = dashboardContext;
    // Le vrai dashboard, en clair : le moniteur affiche l'application.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1024, 576);

    // Entête - marges augmentées.
    ctx.textAlign = "left";
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 30px Inter, Arial, sans-serif";
    ctx.fillText("Tableau de bord", 60, 60);
    ctx.fillStyle = "#555555";
    ctx.font = "400 15px Inter, Arial, sans-serif";
    ctx.fillText("Votre QR code, la satisfaction de vos clients et leurs avis.", 60, 86);

    // Quatre cartes d'indicateurs : mêmes libellés et valeurs que l'app.
    const statCards = [
      { label: "NOTE MOYENNE", value: "4,6", suffix: " / 5", hint: "Sur l'ensemble de vos avis" },
      { label: "AVIS REÇUS", value: "128", suffix: "", hint: "Depuis la création du compte" },
      { label: "AVIS SUR 30 JOURS", value: "42", suffix: "", hint: "Déposés ces 30 derniers jours" },
      { label: "CLIENTS SATISFAITS", value: "97 %", suffix: "", hint: "Part des avis à 4 ou 5 étoiles" },
    ] as const;
    const cardTop = 116;
    const cardH = 128;
    const cardW = 220;
    const cardGap = 16;
    statCards.forEach((card, i) => {
      const x = 60 + i * (cardW + cardGap);
      ctx.fillStyle = "#f4f4f4";
      roundRectPath(ctx, x, cardTop, cardW, cardH, 14);
      ctx.fill();
      ctx.fillStyle = "#555555";
      ctx.font = "600 12px Inter, Arial, sans-serif";
      ctx.fillText(card.label, x + 20, cardTop + 32);
      ctx.fillStyle = "#0a0a0a";
      ctx.font = "700 38px Inter, Arial, sans-serif";
      ctx.fillText(card.value, x + 20, cardTop + 82);
      if (card.suffix) {
        const valueWidth = ctx.measureText(card.value).width;
        ctx.fillStyle = "#555555";
        ctx.font = "400 18px Inter, Arial, sans-serif";
        ctx.fillText(card.suffix, x + 22 + valueWidth, cardTop + 82);
      }
      ctx.fillStyle = "#555555";
      ctx.font = "400 11px Inter, Arial, sans-serif";
      ctx.fillText(card.hint, x + 20, cardTop + 108);
    });

    // Répartition des notes (colonne gauche), comme RatingHistogram.
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 20px Inter, Arial, sans-serif";
    ctx.fillText("Répartition des notes", 60, 292);
    ctx.fillStyle = "#555555";
    ctx.font = "400 14px Inter, Arial, sans-serif";
    ctx.fillText("4,6 / 5 · 128 avis", 60, 314);

    // Cohérent avec la moyenne 4,6 / 5 (128 avis, 97 % à 4-5 étoiles).
    const counts = [1, 1, 2, 42, 82];
    const maxCount = 82;
    const barLeft = 120;
    const barWidth = 270;
    const barTop = 340;
    const barStep = 40;
    counts.forEach((count, i) => {
      const y = barTop + i * barStep;
      ctx.fillStyle = "#0a0a0a";
      ctx.font = "600 18px Inter, Arial, sans-serif";
      ctx.fillText(String(i + 1), 60, y + 15);
      drawStar(ctx, 86, y + 9, 10, "#d71920");
      ctx.fillStyle = "#f4f4f4";
      roundRectPath(ctx, barLeft, y, barWidth, 18, 9);
      ctx.fill();
      const filled = Math.max(22, (count / maxCount) * barWidth);
      ctx.fillStyle = "#d71920";
      roundRectPath(ctx, barLeft, y, filled, 18, 9);
      ctx.fill();
      ctx.fillStyle = "#555555";
      ctx.font = "500 15px Inter, Arial, sans-serif";
      ctx.fillText(String(count), barLeft + barWidth + 14, y + 15);
    });

    // Derniers avis (colonne droite).
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 20px Inter, Arial, sans-serif";
    ctx.fillText("Derniers avis", 580, 292);
    ctx.fillStyle = "#555555";
    ctx.font = "400 14px Inter, Arial, sans-serif";
    ctx.fillText("Du plus récent au plus ancien", 580, 314);

    const recentReviews = [
      { rating: 5, date: "08/10/2026", comment: "Accueil très professionnel, je recommande." },
      { rating: 5, date: "06/10/2026", comment: "Conseils clairs et précis, merci." },
      { rating: 4, date: "05/10/2026", comment: "Rapide et efficace." },
      { rating: 2, date: "03/10/2026", comment: "Beaucoup d'attente en caisse." },
    ] as const;
    recentReviews.forEach((review, i) => {
      const y = 340 + i * 52;
      for (let star = 0; star < 5; star += 1) {
        drawStar(ctx, 588 + star * 24, y + 8, 9, star < review.rating ? "#d71920" : "#d7d9dc");
      }
      ctx.textAlign = "right";
      ctx.fillStyle = "#555555";
      ctx.font = "500 13px Inter, Arial, sans-serif";
      ctx.fillText(review.date, 964, y + 13);
      ctx.textAlign = "left";
      ctx.fillStyle = "#0a0a0a";
      ctx.font = "400 16px Inter, Arial, sans-serif";
      ctx.fillText(review.comment, 580, y + 36);
      if (i < recentReviews.length - 1) {
        ctx.fillStyle = "#e6e6e6";
        ctx.fillRect(580, y + 44, 410, 1);
      }
    });
  }
  const dashboardTexture = new THREE.CanvasTexture(dashboardCanvas);
  dashboardTexture.colorSpace = THREE.SRGBColorSpace;
  const dashboardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 4.61),
    new THREE.MeshBasicMaterial({ map: dashboardTexture }),
  );
  // Le panneau arrière (boîte) va jusqu'à z = 0.03 : la dalle du tableau de
  // bord doit être devant, sinon l'écran disparaît derrière la coque.
  dashboardFace.position.z = 0.09;
  dashboard.add(dashboardFace);
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
  floor.position.set(sceneX + screenShift, -3.05, -27);
  floor.receiveShadow = isSceneWide;
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
  backdrop.position.set(sceneX + screenShift, 6, -64);
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
  const shadowAnchors = [
    [sceneX + screenShift, 0],
    [basePhoneX, -17],
    [sceneX + screenShift, -34],
  ];
  const shadowMeshes: THREE.Mesh[] = [];
  shadowAnchors.forEach(([x, z], index) => {
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
    shadowMeshes.push(shadow);
  });

  const followLight = new THREE.PointLight(0xffeee8, 0.5, 23);
  scene.add(followLight);

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
  let phoneSlideX = 0;
  let dashSlideX = 0;

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
    // La caméra suit le décalage complet des écrans : le cadrage de chaque
    // chapitre reste identique à celui d'origine, simplement translaté.
    camera.position.set(
      interpolate(0) + screenShift + easedPointerX * 0.16,
      interpolate(1) - easedPointerY * 0.12,
      interpolate(2),
    );
    camera.lookAt(
      interpolate(3) + screenShift + easedPointerX * 0.07,
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

    // Animation latérale téléphone (segment 2) et dashboard (segment 3) :
    // ils glissent vers la GAUCHE (négatif) quand on arrive à leur section
    // pour s'éloigner de la zone de texte.
    const phoneTargetX = segment === 2 ? -1.2 : 0;
    const dashTargetX = segment === 3 ? -1.0 : 0;
    const slideDamping = Math.min(1, dt * 3);
    phoneSlideX += (phoneTargetX - phoneSlideX) * slideDamping;
    dashSlideX += (dashTargetX - dashSlideX) * slideDamping;

    // Perpétuel (mouvement « vide », signature de rendu amateur).
    if (!reducedMotion.matches) {
      plaque.rotation.y = -0.24 + easedPointerX * 0.1;
      plaque.rotation.x = easedPointerY * 0.04;
      phone.rotation.y = 0.08 + easedPointerX * 0.05;
      phone.position.x = basePhoneX + phoneSlideX;
      // Mettre à jour l'ombre du téléphone (index 1) pour qu'elle suive
      shadowMeshes[1].position.x = basePhoneX + phoneSlideX;
      dashboard.rotation.y = -0.02 + easedPointerX * 0.02;
      dashboard.position.x = baseDashboardX + dashSlideX;
    }

    followLight.position.set(
      camera.position.x + 1.5,
      camera.position.y + 3,
      camera.position.z - 4,
    );

    renderer.render(scene, camera);
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
    sceneX = width >= 1024 ? 2.15 : 0.1;
    basePhoneX = sceneX + screenShift + 0.4;
    baseDashboardX = sceneX + screenShift;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width >= 1024 ? 1.7 : 1.35));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.fov = width < 1024 ? 45 : 37;
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