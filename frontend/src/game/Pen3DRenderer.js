import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CFG } from "./constants";

export class Pen3DRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.loaded = false;
    this.meshes = new Map(); // id -> THREE.Mesh
    this.p1TemplateGeo = null;
    this.p2TemplateGeo = null;
    this.material = null;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera (Top-down Orthographic aligned with 900x600 canvas)
    this.camera = new THREE.OrthographicCamera(0, CFG.W, 0, CFG.H, 1, 1500);
    this.camera.position.set(0, 0, 600);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer with High-Vibrancy Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(CFG.W, CFG.H, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    // 4. Studio Lighting Rig for Crisp, Highly Visible 3D Models
    // Overhead Sky/Ground Hemisphere Ambient Fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcad8ea, 2.4);
    this.scene.add(hemiLight);

    // Main Overhead Key Light (casts soft shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight.position.set(CFG.W * 0.4, CFG.H * 0.25, 600);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = CFG.W + 50;
    dirLight.shadow.camera.top = -50;
    dirLight.shadow.camera.bottom = CFG.H + 50;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.bias = -0.0004;
    this.scene.add(dirLight);

    // Warm Front-Left Fill Light (eliminates dark under-shading)
    const fillLight = new THREE.DirectionalLight(0xfff3e6, 1.5);
    fillLight.position.set(CFG.W * 0.1, CFG.H * 0.85, 450);
    this.scene.add(fillLight);

    // Cool Specular Rim Light from bottom-right (adds crisp edge highlights)
    const rimLight = new THREE.DirectionalLight(0xbadfff, 1.2);
    rimLight.position.set(CFG.W * 0.85, CFG.H * 0.7, 500);
    this.scene.add(rimLight);

    // 5. Shadow Receiver Plane for the Desk Surface
    const shadowGeo = new THREE.PlaneGeometry(CFG.W + 200, CFG.H + 200);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.position.set(CFG.W / 2, CFG.H / 2, 0);
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // 6. Load the 3D Pen Model
    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      "/models/pen.glb",
      (gltf) => {
        let baseMesh = null;
        gltf.scene.traverse((child) => {
          if (child.isMesh && !baseMesh) baseMesh = child;
        });

        if (!baseMesh) {
          console.warn("No mesh found in pen.glb");
          return;
        }

        const geo = baseMesh.geometry.clone();
        geo.center();
        geo.computeVertexNormals();

        // Enhanced Scale: Bolder, chunkier, easily visible on the table
        // Length along X: ~114px, Diameter along Y/Z: ~17.5px (distinct and prominently visible)
        this.scaleX = (CFG.penLen * 1.08) / 1.8992;
        this.scaleY = 17.5 / 0.1445;
        this.scaleZ = 17.5 / 0.1445;

        // Build bright, vibrant vertex colors
        this.p1TemplateGeo = this.createTeamGeometry(geo, "#1E88E5"); // Radiant French Royal Blue
        this.p2TemplateGeo = this.createTeamGeometry(geo, "#FF2A4D"); // Vivid Punchy Crimson Red

        // Glossy, vibrant material with high reflectance and low absorption
        this.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.18, // Glossy plastic catches bright specular reflections
          metalness: 0.08, // Low metalness ensures pure vibrant diffuse colors
        });

        this.loaded = true;
      },
      undefined,
      (err) => {
        console.error("Failed to load /models/pen.glb:", err);
      }
    );
  }

  createTeamGeometry(baseGeo, capHex) {
    const geo = baseGeo.clone();
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const capColor = new THREE.Color(capHex);
    const collarColor = new THREE.Color("#EAEAEA"); // Radiant chrome ring
    const barrelColor = new THREE.Color("#FFFFFF"); // Pure glossy white plastic
    const nibColor = new THREE.Color("#9E9E9E"); // Steel tip

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      let c;
      if (x < -0.24) {
        c = capColor; // Iconic vibrant cap & clip
      } else if (x < -0.19) {
        c = collarColor; // Metallic chrome ring
      } else if (x > 0.88) {
        c = nibColor; // Metallic pen tip
      } else {
        c = barrelColor; // Brilliant glossy white barrel
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  update(pens) {
    if (!this.loaded) return;

    const currentIds = new Set(pens.map((p) => p.penData.id));

    // Remove meshes for eliminated pens
    for (const [id, mesh] of this.meshes.entries()) {
      if (!currentIds.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }

    // Update or create meshes for active pens
    for (const pen of pens) {
      const id = pen.penData.id;
      let mesh = this.meshes.get(id);

      if (!mesh) {
        const isP1 = pen.penData.owner === "p1";
        const geo = isP1 ? this.p1TemplateGeo : this.p2TemplateGeo;
        mesh = new THREE.Mesh(geo, this.material);
        mesh.scale.set(this.scaleX, this.scaleY, this.scaleZ);
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        this.scene.add(mesh);
        this.meshes.set(id, mesh);
      }

      const zElevation = (pen.penData.z || 0) * 1.5;
      const isFalling = pen.penData.falling;
      const fallProgress = pen.penData.fallProgress || 0;

      if (isFalling) {
        // 3D Tumble off the table edge into the abyss
        mesh.position.set(
          pen.position.x,
          pen.position.y,
          -fallProgress * 280
        );
        const fade = Math.max(0.05, 1 - fallProgress * 0.45);
        mesh.scale.set(this.scaleX * fade, this.scaleY * fade, this.scaleZ * fade);

        const qYaw = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          pen.angle + fallProgress * 3
        );
        const qTumble = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 1, 0).normalize(),
          fallProgress * 5
        );
        mesh.quaternion.copy(qYaw).multiply(qTumble);
      } else {
        // Normal active pen on table: rests cleanly on desk with elevation
        mesh.position.set(pen.position.x, pen.position.y, 8.5 + zElevation);
        mesh.scale.set(this.scaleX, this.scaleY, this.scaleZ);

        // Yaw orientation (Matter.js 2D angle) + Roll around pen length (X-axis)
        const qYaw = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          pen.angle
        );
        const qRoll = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          pen.penData.rollAngle || 0
        );
        mesh.quaternion.copy(qYaw).multiply(qRoll);
      }
    }

    // Render 3D WebGL scene
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    for (const [, mesh] of this.meshes.entries()) {
      this.scene.remove(mesh);
    }
    this.meshes.clear();
    this.renderer.dispose();
  }
}
