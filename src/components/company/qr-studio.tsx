"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import qrcode from "qrcode-generator";
import { Button, buttonClass } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/icons";

/**
 * Studio QR : arbre procédural dont les feuilles se rassemblent en QR code.
 *
 * Reproduit fidèlement le concept tree.icqr.com (Magic Tree QR) : 3D réaliste,
 * saisons, pétales qui tombent, QR net et scannable, encres au choix. Le lien
 * encodé vient toujours du serveur (un QR imprimé est immuable, RG-01) et le
 * QR « complet » téléchargeable est généré module par module : il scanne.
 */

type SeasonId = "printemps" | "ete" | "automne" | "marque";

type Season = {
  label: string;
  leaf: string[];
  dark: string;
  bg: [string, string];
};

const SEASONS: Record<SeasonId, Season> = {
  printemps: {
    label: "Printemps",
    leaf: ["#f6c1d1", "#f3a6bf", "#fbd9e3", "#e98fad", "#a9cf8a"],
    dark: "#4a2236",
    bg: ["#fdeff3", "#f6d3df"],
  },
  ete: {
    label: "Été",
    leaf: ["#2f6b2f", "#3f8a3a", "#5aa046", "#7fb85a", "#9acb6e"],
    dark: "#17331c",
    bg: ["#eef7ea", "#cde6c3"],
  },
  automne: {
    label: "Automne",
    leaf: ["#d9622b", "#c2461f", "#e8963a", "#a63a1a", "#d4b03a"],
    dark: "#40200e",
    bg: ["#fbf0e1", "#f1cfa6"],
  },
  // Ambiance maison : les couleurs de la marque, déclinées en feuillage.
  marque: {
    label: "Marque",
    leaf: ["#a11218", "#c2181f", "#d71920", "#6f767e", "#a2a9b1"],
    dark: "#0a0a0a",
    bg: ["#fdf1f1", "#e4e5e8"],
  },
};

const INKS: { id: string; label: string; value: string }[] = [
  { id: "auto", label: "Couleur de la saison", value: "" },
  { id: "noir", label: "Noir", value: "#111111" },
  { id: "bleu", label: "Bleu nuit", value: "#1d3a8a" },
  { id: "bordeaux", label: "Bordeaux", value: "#6b1f3a" },
  { id: "rouge", label: "Rouge AvisTrack", value: "#d71920" },
];

type EngineApi = {
  setSeason: (season: SeasonId, ink: string) => void;
  setRevealed: (revealed: boolean) => void;
  setUrl: (url: string) => boolean;
};

const SUB = 4;
const CY = 2.9;

type ModuleArrays = {
  count: number;
  moduleCount: number;
  cellSize: number;
  isDark: (row: number, column: number) => boolean;
};

/** QR complet, net : chaque module est un carré plein (lisible à l'écran). */
function buildQr(url: string): ModuleArrays | null {
  let code;
  try {
    code = qrcode(0, "M");
    code.addData(url);
    code.make();
  } catch {
    return null;
  }
  const moduleCount = code.getModuleCount();
  return {
    count: moduleCount,
    moduleCount,
    cellSize: 4.6 / moduleCount,
    isDark: code.isDark,
  };
}

/** Image PNG du QR en version « propre », module par module (scanne à coup sûr). */
function qrCanvas(size: number, url: string, ink: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const code = qrcode(0, "M");
  code.addData(url);
  code.make();
  const count = code.getModuleCount();
  const quiet = 4;
  const pixel = size / (count + 2 * quiet);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size, size);
  context.fillStyle = ink;
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!code.isDark(row, column)) continue;
      const x0 = Math.round((column + quiet) * pixel);
      const x1 = Math.round((column + quiet + 1) * pixel);
      const y0 = Math.round((row + quiet) * pixel);
      const y1 = Math.round((row + quiet + 1) * pixel);
      context.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  return canvas;
}

export function QrStudio({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<EngineApi | null>(null);
  const [season, setSeason] = useState<SeasonId>("ete");
  const [ink, setInk] = useState<string>(INKS[0]!.value);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState(url);
  const [draft, setDraft] = useState(url);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.classList.add("no-webgl");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      touchAction: "none",
    });
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.85));
    const key = new THREE.DirectionalLight(0xfff3dc, 0.8);
    key.position.set(3, 6, 4);
    scene.add(key);

    /* ---- arbre procédural : tronc + branches effilées ---- */
    let seed = 20260;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    const trunkPositions: number[] = [];
    const trunkColors: number[] = [];
    const trunkIndices: number[] = [];
    const anchors: THREE.Vector3[] = [];

    const addTube = (path: THREE.Vector3[], radius: number[], depth: number) => {
      const sides = radius[0]! > 0.07 ? 8 : 5;
      const base = trunkPositions.length / 3;
      const n = path.length;
      for (let i = 0; i < n; i += 1) {
        const d =
          i < n - 1
            ? path[i + 1]!.clone().sub(path[i]!)
            : path[i]!.clone().sub(path[i - 1]!);
        d.normalize();
        const u = new THREE.Vector3()
          .crossVectors(d, Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0))
          .normalize();
        const wv = new THREE.Vector3().crossVectors(d, u);
        for (let s = 0; s < sides; s += 1) {
          const a = (s / sides) * 6.2832;
          const k = 1 + 0.12 * Math.sin(a * 3 + i * 1.7 + depth);
          trunkPositions.push(
            path[i]!.x + (u.x * Math.cos(a) + wv.x * Math.sin(a)) * radius[i]! * k,
            path[i]!.y + (u.y * Math.cos(a) + wv.y * Math.sin(a)) * radius[i]! * k,
            path[i]!.z + (u.z * Math.cos(a) + wv.z * Math.sin(a)) * radius[i]! * k,
          );
          const shade = 0.78 + 0.22 * Math.sin(a * 5 + i * 0.9) + (depth > 2 ? 0.12 : 0);
          trunkColors.push(0.34 * shade, 0.24 * shade, 0.17 * shade);
        }
      }
      for (let i = 0; i < n - 1; i += 1) {
        for (let s = 0; s < sides; s += 1) {
          const a0 = base + i * sides + s;
          const b0 = base + i * sides + ((s + 1) % sides);
          const c0 = a0 + sides;
          const d0 = b0 + sides;
          trunkIndices.push(a0, c0, b0, b0, c0, d0);
        }
      }
    };

    const grow = (
      start: THREE.Vector3,
      dir: THREE.Vector3,
      length: number,
      radius: number,
      depth: number,
    ) => {
      const n = depth === 0 ? 8 : 5;
      const path = [start.clone()];
      const R = [depth === 0 ? radius * 1.3 : radius];
      const d = dir.clone();
      for (let i = 1; i <= n; i += 1) {
        d.add(V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(depth === 0 ? 0.14 : 0.38));
        d.y += 0.05;
        d.normalize();
        path.push(path[i - 1]!.clone().addScaledVector(d, length / n));
        R.push(radius * (1 - (0.74 * i) / n) + 0.004);
      }
      addTube(path, R, depth);
      if (depth >= 2) {
        for (let i = 1; i <= n; i += 1) {
          anchors.push(path[i]!);
          if (depth >= 3) anchors.push(path[i]!);
        }
      }
      if (depth < 4) {
        const nb = depth === 0 ? 5 : depth === 1 ? 3 : 2;
        for (let b = 0; b < nb; b += 1) {
          const t = depth === 0 ? 0.55 + (0.4 * b) / nb : 0.4 + rnd() * 0.6;
          const idx = Math.min(n, Math.max(1, Math.round(t * n)));
          const parentDir = path[idx]!.clone().sub(path[idx - 1]!).normalize();
          let childDir: THREE.Vector3;
          if (depth === 0) {
            const az = (b * 6.2832) / nb + rnd() * 0.8;
            const an = 0.75 + rnd() * 0.35;
            childDir = V(
              Math.cos(az) * Math.sin(an),
              Math.cos(an),
              Math.sin(az) * Math.sin(an),
            );
          } else {
            const axis = new THREE.Vector3()
              .crossVectors(parentDir, V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5))
              .normalize();
            childDir = parentDir.clone().applyAxisAngle(axis, 0.45 + rnd() * 0.55);
            childDir.y += 0.15;
            childDir.normalize();
          }
          grow(path[idx]!, childDir, length * (0.66 + rnd() * 0.12), radius * 0.5, depth + 1);
        }
      }
    };

    grow(V(0, 0, 0), V(0, 1, 0), 1.8, 0.2, 0);

    const trunkGeometry = new THREE.BufferGeometry();
    trunkGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(trunkPositions), 3),
    );
    trunkGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(trunkColors), 3),
    );
    trunkGeometry.setIndex(trunkIndices);
    trunkGeometry.computeVertexNormals();
    const trunk = new THREE.Mesh(
      trunkGeometry,
      new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    );
    scene.add(trunk);

    const centre = V(0, 0, 0);
    anchors.forEach((a) => centre.add(a));
    centre.multiplyScalar(1 / anchors.length);
    let canopyRadius = 0;
    anchors.forEach((a) => {
      canopyRadius = Math.max(canopyRadius, a.distanceTo(centre));
    });

    /* ---- ombre douce au sol ---- */
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
      gradient.addColorStop(0, "rgba(20,30,15,.5)");
      gradient.addColorStop(1, "rgba(20,30,15,0)");
      shadowContext.fillStyle = gradient;
      shadowContext.fillRect(0, 0, 128, 128);
    }
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
        opacity: 0.4,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    scene.add(shadow);

    /* ---- feuilles / QR : un seul système de particules ---- */
    const leafMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMix: { value: 0 },
        uTime: { value: 0 },
        uPx: { value: 600 },
        uQs: { value: 0.03 },
        uTs: { value: 0.18 },
        uDark: { value: new THREE.Color("#17331c") },
        uInk: { value: 0 },
      },
      vertexShader: [
        "attribute vec3 aQR; attribute vec3 aCol; attribute vec3 aQc; attribute vec2 aR; attribute float aK; attribute float aSh;",
        "uniform float uMix,uTime,uPx,uQs,uTs,uInk; uniform vec3 uDark;",
        "varying vec3 vC; varying float vE,vAng,vSh;",
        "void main(){",
        " float e=clamp(uMix*1.7-aR.x*.7,0.,1.); e=e*e*(3.-2.*e);",
        " vec3 t=position; float h=max(t.y,0.);",
        " float w=sin(uTime*1.1+t.x*.7+t.y*.5)*.5+.5; float g=1.-aK;",
        " t.x+=(sin(uTime*1.3+t.y*1.2+aR.y*6.)*.014+w*.03)*h*g;",
        " t.z+=cos(uTime*1.1+t.y)*.014*h*g;",
        " t.y+=sin(uTime*2.+aR.y*40.)*.012*g;",
        " vec3 p=mix(t,aQR,e); float a=sin(3.14159*e);",
        " p.y+=a*(aR.y-.3)*1.8; p.x+=a*(aR.x-.5)*1.2; p.z+=e*aR.y*.012;",
        " vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;",
        " float base=aK>.5?uTs*.8:uTs*(.6+aR.y*.8);",
        " gl_PointSize=max(mix(base,uQs*1.3,e)*uPx/-mv.z,1.);",
        " vec3 qc=uInk>.5?uDark:aQc*(.85+.3*aR.y);",
        " vC=mix(aCol*aSh,qc,e); vE=e; vSh=aSh;",
        " vAng=fract(aR.y*13.7)*6.283*(1.-e)+sin(uTime*1.5+aR.x*10.)*.3*(1.-e)+(fract(aR.x*7.3)-.5)*.5*e;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vC; varying float vE,vAng,vSh;",
        "void main(){",
        " vec2 uv=gl_PointCoord-.5; uv.y=-uv.y; float cs=cos(vAng),sn=sin(vAng);",
        " vec2 q=vec2(cs*uv.x-sn*uv.y,sn*uv.x+cs*uv.y);",
        " float lx=q.x*2.; float w=mix(.34*pow(max(1.-lx*lx,0.),.7),.5,vE*.8);",
        " if(abs(q.x)>.5||abs(q.y)>w) discard;",
        " float rib=smoothstep(.03,.0,abs(q.y))*(1.-vE)*.16;",
        " vec3 c=vC*mix(.84+.3*(q.x+.5),1.,vE)*(1.-rib);",
        " c*=1.-.1*smoothstep(.55,1.,abs(q.y)/max(w,.01))*(1.-vE);",
        " c+=vec3(.08,.07,.0)*smoothstep(.8,1.,vSh)*(1.-vE);",
        " gl_FragColor=vec4(c,1.);",
        "}",
      ].join("\n"),
    });

    /* ---- pétales qui tombent (visibles à l'état arbre) ---- */
    const petalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uT: leafMaterial.uniforms.uTime,
        uMix: leafMaterial.uniforms.uMix,
        uPx: leafMaterial.uniforms.uPx,
        uC: { value: new THREE.Color("#5aa046") },
      },
      vertexShader: [
        "attribute vec4 aF; uniform float uT,uMix,uPx; varying float vAng;",
        "void main(){ float ph=aF.w; float y=mod(aF.y-uT*(.22+ph*.18),5.5);",
        " vec3 p=vec3(aF.x+sin(uT*.7+ph*20.)*.5+(5.5-y)*.15,y,aF.z+cos(uT*.6+ph*15.)*.4);",
        " vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;",
        " float f=(1.-smoothstep(0.,.6,uMix))*min(1.,y*2.)*min(1.,(5.5-y)*2.);",
        " gl_PointSize=.1*(.7+ph*.5)*uPx/-mv.z*f; vAng=uT*2.+ph*10.; }",
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 uC; varying float vAng;",
        "void main(){ vec2 u=gl_PointCoord-.5; float c=cos(vAng),s=sin(vAng); vec2 q=vec2(c*u.x-s*u.y,s*u.x+c*u.y);",
        " if(q.x*q.x/.2025+q.y*q.y/.04>1.) discard; gl_FragColor=vec4(uC,1.); }",
      ].join("\n"),
    });
    const petalCount = 28;
    const petalData = new Float32Array(petalCount * 4);
    const petalPositions = new Float32Array(petalCount * 3);
    for (let i = 0; i < petalCount; i += 1) {
      petalPositions[i * 3] = 0;
      petalPositions[i * 3 + 1] = 0;
      petalPositions[i * 3 + 2] = 0;
      petalData[i * 4] = (Math.random() * 2 - 1) * 3.2;
      petalData[i * 4 + 1] = Math.random() * 5.5;
      petalData[i * 4 + 2] = (Math.random() * 2 - 1) * 3.2;
      petalData[i * 4 + 3] = Math.random();
    }
    const petalGeometry = new THREE.BufferGeometry();
    petalGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(petalPositions, 3),
    );
    petalGeometry.setAttribute("aF", new THREE.BufferAttribute(petalData, 4));
    const petals = new THREE.Points(petalGeometry, petalMaterial);
    petals.frustumCulled = false;
    scene.add(petals);

    let points: THREE.Points | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let kind: Uint8Array | null = null;
    let aR: Float32Array | null = null;
    let modIdx: Int32Array | null = null;
    let aC: Float32Array | null = null;
    let aQc: Float32Array | null = null;
    let moduleCount = 0;
    let cellSize = 0.1;
    let leafCount = 0;
    let target = 0;
    let mixV = 0;
    let rotY = 0;
    let W = 1;
    let H = 1;
    let inkValue = "";
    let currentSeason: SeasonId = "ete";

    const recolor = () => {
      if (!points || !geometry || !kind || !aR || !modIdx || !aC || !aQc) return;
      const S = SEASONS[currentSeason];
      const L = S.leaf.map((hex) => new THREE.Color(hex));
      const aCol = geometry.getAttribute("aCol") as THREE.BufferAttribute;
      const aQcAttr = geometry.getAttribute("aQc") as THREE.BufferAttribute;
      for (let i = 0; i < aC.length / 3; i += 1) {
        const c = L[(((aR[i * 2] * 977) | 0) % L.length + L.length) % L.length]!;
        const tint = (kind[i] === 2 ? 0.72 : 1) * (0.88 + 0.24 * aR[i * 2 + 1]!);
        aC[i * 3] = c.r * tint;
        aC[i * 3 + 1] = c.g * tint;
        aC[i * 3 + 2] = c.b * tint;
        const q = L[(((modIdx[i] * 7919) | 0) % L.length + L.length) % L.length]!;
        aQc[i * 3] = q.r * 0.34;
        aQc[i * 3 + 1] = q.g * 0.34;
        aQc[i * 3 + 2] = q.b * 0.34;
      }
      aCol.needsUpdate = true;
      aQcAttr.needsUpdate = true;
      petalMaterial.uniforms.uC!.value = new THREE.Color(S.leaf[1]!);
      leafMaterial.uniforms.uDark!.value = new THREE.Color(inkValue || S.dark);
      leafMaterial.uniforms.uInk!.value = inkValue ? 1 : 0;
      host.style.background = `radial-gradient(ellipse at 70% 8%, rgba(255,255,255,.8), rgba(255,255,255,0) 55%), linear-gradient(180deg, ${S.bg[0]}, ${S.bg[1]})`;
    };

    const resize = () => {
      W = host.clientWidth || window.innerWidth;
      H = host.clientHeight || window.innerHeight;
      renderer.setSize(W, H);
      camera.aspect = W / Math.max(1, H);
      camera.updateProjectionMatrix();
      const size = new THREE.Vector2();
      renderer.getDrawingBufferSize(size);
      leafMaterial.uniforms.uPx!.value = size.y / (2 * Math.tan((20 * Math.PI) / 180));
    };

    const build = (value: string): boolean => {
      const qr = buildQr(value);
      if (!qr) return false;
      moduleCount = qr.moduleCount;
      cellSize = qr.cellSize;
      const dark: [number, number][] = [];
      for (let r = 0; r < moduleCount; r += 1) {
        for (let c = 0; c < moduleCount; c += 1) {
          if (qr.isDark(r, c)) dark.push([r, c]);
        }
      }
      const N = dark.length * SUB * SUB;
      const position = new Float32Array(N * 3);
      const q = new Float32Array(N * 3);
      const aK = new Float32Array(N);
      const aS = new Float32Array(N);
      aC = new Float32Array(N * 3);
      aQc = new Float32Array(N * 3);
      aR = new Float32Array(N * 2);
      kind = new Uint8Array(N);
      modIdx = new Int32Array(N);
      leafCount = 0;

      const lightDir = V(0.45, 0.72, 0.54);
      const tmp = V(0, 0, 0);
      let n = 0;
      for (let k = 0; k < dark.length; k += 1) {
        for (let i = 0; i < SUB; i += 1) {
          for (let j = 0; j < SUB; j += 1) {
            q[n * 3] = (dark[k]![1] + (i + 0.5) / SUB - moduleCount / 2) * cellSize;
            q[n * 3 + 1] = CY - (dark[k]![0] + (j + 0.5) / SUB - moduleCount / 2) * cellSize;
            q[n * 3 + 2] = 0;
            aR[n * 2] = Math.random();
            aR[n * 2 + 1] = Math.random();
            modIdx[n] = k;
            if (Math.random() < 0.12) {
              const angle = Math.random() * 6.283;
              const radius = 0.35 + Math.pow(Math.random(), 0.8) * 3.1;
              position[n * 3] = Math.cos(angle) * radius;
              position[n * 3 + 1] = 0.03;
              position[n * 3 + 2] = Math.sin(angle) * radius;
              kind[n] = 2;
              aK[n] = 1;
              aS[n] = 0.7 + 0.3 * Math.random();
            } else {
              const anchor = anchors[(Math.random() * anchors.length) | 0]!;
              const spread = 0.42;
              const px =
                anchor.x +
                (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.3;
              const py =
                anchor.y +
                (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.3 -
                0.06;
              const pz =
                anchor.z +
                (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.3;
              tmp.set(px - centre.x, py - centre.y, pz - centre.z);
              const len = tmp.length() || 1e-3;
              const dot = tmp.dot(lightDir) / len;
              const radial = Math.min(1, len / (canopyRadius * 1.05));
              position[n * 3] = px;
              position[n * 3 + 1] = py;
              position[n * 3 + 2] = pz;
              kind[n] = 1;
              leafCount += 1;
              aS[n] = Math.min(
                1.1,
                (0.38 + 0.62 * (0.5 + 0.5 * dot) * (0.4 + 0.6 * radial)) *
                  (0.85 + 0.15 * (py / 5)) +
                  Math.random() * 0.05,
              );
            }
            n += 1;
          }
        }
      }

      if (points) {
        scene.remove(points);
        points.geometry.dispose();
      }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
      geometry.setAttribute("aQR", new THREE.BufferAttribute(q, 3));
      geometry.setAttribute("aCol", new THREE.BufferAttribute(aC, 3));
      geometry.setAttribute("aQc", new THREE.BufferAttribute(aQc, 3));
      geometry.setAttribute("aR", new THREE.BufferAttribute(aR, 2));
      geometry.setAttribute("aK", new THREE.BufferAttribute(aK, 1));
      geometry.setAttribute("aSh", new THREE.BufferAttribute(aS, 1));
      points = new THREE.Points(geometry, leafMaterial);
      points.frustumCulled = false;
      scene.add(points);
      leafMaterial.uniforms.uQs!.value = cellSize / SUB;
      leafMaterial.uniforms.uTs!.value =
        0.18 * Math.min(1.5, Math.max(0.8, Math.sqrt(4300 / Math.max(leafCount, 1))));
      recolor();
      resize();
      return true;
    };

    const smooth = (x: number) => {
      const value = Math.min(1, Math.max(0, x));
      return value * value * (3 - 2 * value);
    };

    let frame = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (reduced.matches) {
        mixV = target;
      } else {
        mixV += (target - mixV) * Math.min(1, dt * 2.2);
        if (Math.abs(target - mixV) < 0.0005) mixV = target;
      }
      leafMaterial.uniforms.uMix!.value = mixV;
      leafMaterial.uniforms.uTime!.value += reduced.matches ? 0 : dt;

      if (target === 0 && mixV < 0.02) {
        rotY += dt * 0.25;
      } else {
        const snap = Math.round(rotY / 6.28318) * 6.28318;
        rotY += (snap - rotY) * Math.min(1, dt * 4);
      }
      if (points) points.rotation.y = rotY;
      trunk.rotation.y = rotY;

      const ts = 1 - smooth(mixV * 1.4);
      trunk.visible = ts > 0.01;
      trunk.scale.setScalar(Math.max(ts, 0.001));
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - smooth(mixV * 1.2));

      const e = smooth(mixV);
      const aspect = W / Math.max(1, H);
      const Pz = cellSize * (moduleCount + 4);
      const treeDistance = Math.max(10.5, 7.4 / (0.7279 * aspect));
      const qrDistance = Math.max(
        (Pz * 1.4) / 0.7279,
        (Pz * 1.4) / (0.7279 * aspect),
      );
      const lookY = 1.9 + (CY - Pz * 0.17 - 1.9) * e;
      camera.position.set(
        0,
        3.1 + (lookY - 3.1) * e,
        treeDistance + (qrDistance - treeDistance) * e,
      );
      camera.lookAt(0, lookY, 0);
      renderer.render(scene, camera);
    };

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    let pointerStart: [number, number] | null = null;
    const onPointerDown = (event: PointerEvent) => {
      pointerStart = [event.clientX, event.clientY];
    };
    const onPointerUp = (event: PointerEvent) => {
      if (
        pointerStart &&
        Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) < 8
      ) {
        setRevealed((value) => !value);
      }
      pointerStart = null;
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const built = build(url);
    if (built) {
      host.classList.add("webgl-ready");
    } else {
      renderer.domElement.style.display = "none";
      host.classList.add("no-webgl");
    }

    apiRef.current = {
      setSeason: (nextSeason, nextInk) => {
        currentSeason = nextSeason;
        inkValue = nextInk;
        if (built && points) recolor();
      },
      setRevealed: (nextRevealed) => {
        target = nextRevealed ? 1 : 0;
      },
      setUrl: (nextUrl) => {
        // Le QR s'efface tant que le nouveau lien n'est pas encodable.
        const ok = build(nextUrl);
        if (ok) target = 1;
        return ok;
      },
    };

    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      if (points) points.geometry.dispose();
      petalGeometry.dispose();
      trunkGeometry.dispose();
      leafMaterial.dispose();
      petalMaterial.dispose();
      (trunk.material as THREE.Material).dispose();
      (shadow.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      host.classList.remove("webgl-ready", "no-webgl");
      apiRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    apiRef.current?.setSeason(season, ink);
  }, [season, ink]);

  useEffect(() => {
    apiRef.current?.setRevealed(revealed);
  }, [revealed]);

  /** Repli sans WebGL : un QR client, encodé avec le lien en cours. */
  const fallback = useMemo(() => {
    try {
      return qrCanvas(512, link, ink || SEASONS[season].dark).toDataURL("image/png");
    } catch {
      return null;
    }
  }, [link, ink, season]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const loadLink = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setLinkError("Veuillez entrer un lien avant de charger le QR code.");
      return;
    }
    const normalized = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const loaded = apiRef.current?.setUrl(normalized);
    if (!loaded) {
      setLinkError("Ce lien est trop long ou invalide pour un QR code.");
      return;
    }
    setLink(normalized);
    setDraft(normalized);
    setLinkError(null);
    setRevealed(true);
  };

  const showPreview = () => {
    const inkValue = ink || SEASONS[season].dark;
    setPreview(qrCanvas(1024, link, inkValue).toDataURL("image/png"));
  };

  const downloadPreview = () => {
    const link = document.createElement("a");
    link.href = preview ?? "";
    link.download = "qr-code-avistrack.png";
    link.click();
  };

  const active = SEASONS[season];

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={hostRef}
        className="qr-studio relative h-[26rem] overflow-hidden rounded-lg border border-black/15 sm:h-[30rem] lg:h-[34rem]"
      >
        {/* Repli sans WebGL : un QR client, encodé avec le lien en cours. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fallback ?? "/api/company/qr?format=png"}
          alt="QR code menant à votre formulaire d'avis"
          className="qr-studio-fallback absolute inset-0 m-auto size-56 rounded-md bg-white p-3"
        />
        <p className="qr-studio-hint pointer-events-none absolute inset-x-0 top-5 px-4 text-center font-serif text-sm text-black/70 italic">
          {revealed
            ? "Touchez l'arbre pour revenir au paysage"
            : "Touchez l'arbre pour révéler le QR code"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => setRevealed((value) => !value)}>
          {revealed ? "Revenir à l'arbre" : "Afficher le QR code"}
        </Button>
        <Button type="button" variant="secondary" onClick={showPreview}>
          QR complet — imprimer
        </Button>
        <span role="status" className="text-sm text-gray-600">
          {copied ? "Lien copié" : null}
        </span>
      </div>

      <div className="flex flex-col gap-5 rounded-lg border border-black/15 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="studio-link" className="text-sm font-semibold">
            Lien à encoder dans le QR code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="studio-link"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setLinkError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadLink();
              }}
              placeholder="https://exemple.com/mon-lien"
              aria-invalid={linkError ? true : undefined}
              className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-black/30 bg-gray-100 px-3 font-mono text-sm text-black transition-colors placeholder:text-gray-500 focus:border-accent focus:bg-white focus:outline-none"
            />
            <Button type="button" onClick={loadLink}>
              Charger le lien
            </Button>
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={copy}
            >
              <CopyIcon />
              Copier
            </button>
          </div>
          {linkError ? (
            <p role="alert" className="text-sm text-red">
              {linkError}
            </p>
          ) : null}
          <p className="text-xs text-gray-600">
            Par défaut, le lien officiel de votre fiche d&apos;avis. Saisissez
            votre propre lien puis « Charger le lien » : il est encodé aussitôt
            dans le QR code. Le téléchargement est généré module par module et
            scanne à coup sûr.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Saison
            </span>
            <div className="flex flex-wrap gap-x-4" role="group" aria-label="Saison">
              {(Object.keys(SEASONS) as SeasonId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSeason(id)}
                  aria-pressed={season === id}
                  className={`border-b-[1.5px] pb-1.5 pt-0.5 text-sm transition-colors ${
                    season === id
                      ? "border-black font-semibold text-black"
                      : "border-transparent text-gray-500 hover:border-black/30 hover:text-black"
                  }`}
                >
                  {SEASONS[id].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Couleur du QR
            </span>
            <div className="flex gap-2" role="group" aria-label="Couleur du QR code">
              {INKS.map((option) => {
                const selected = ink === option.value;
                const swatch = option.value || active.dark;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setInk(option.value)}
                    aria-pressed={selected}
                    title={option.label}
                    aria-label={option.label}
                    className={`grid size-10 place-items-center rounded-full transition-colors ${
                      selected
                        ? "outline-2 outline-offset-2 outline-black"
                        : "border-2 border-black/20 hover:border-black/50"
                    }`}
                  >
                    <span
                      className="size-5 rounded-full"
                      style={{ background: swatch }}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR code à imprimer"
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-white p-5 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Image en data-URL : next/image n'apporterait rien ici. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="QR code à imprimer"
              className="max-h-[62vh] w-auto rounded-lg bg-white"
            />
            <p className="text-sm text-gray-600">
              Cliquez droit ou appui long pour enregistrer l&apos;image, ou
              téléchargez-la directement.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={downloadPreview}>
                Télécharger le PNG (1024 px)
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreview(null)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}