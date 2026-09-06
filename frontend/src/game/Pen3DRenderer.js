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

    // 3. WebGL Renderer
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

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(CFG.W * 0.35, CFG.H * 0.2, 500);
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

    // Subtle blue rim light from bottom right
    const rimLight = new THREE.DirectionalLight(0xa0c4ff, 0.45);
    rimLight.position.set(CFG.W * 0.8, CFG.H * 0.8, 400);
    this.scene.add(rimLight);

    // 5. Shadow Receiver Plane for the Desk Surface
    const shadowGeo = new THREE.PlaneGeometry(CFG.W + 200, CFG.H + 200);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.42 });
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

        // Length of base mesh along X is ~1.899
        this.penScale = CFG.penLen / 1.8992;

        // Build vertex colors for P1 (Blue cap) and P2 (Red cap)
        this.p1TemplateGeo = this.createTeamGeometry(geo, "#0A65C2");
        this.p2TemplateGeo = this.createTeamGeometry(geo, "#D11A38");

        this.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.32,
          metalness: 0.22,
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
    const collarColor = new THREE.Color("#D4D4D4");
    const barrelColor = new THREE.Color("#F2EFEB");
    const nibColor = new THREE.Color("#888888");

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      let c;
      if (x < -0.24) {
        c = capColor; // Iconic cap & clip
      } else if (x < -0.19) {
        c = collarColor; // Metallic chrome ring
      } else if (x > 0.88) {
        c = nibColor; // Metallic pen tip
      } else {
        c = barrelColor; // Reynolds ivory barrel
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
        mesh.scale.set(this.penScale, this.penScale, this.penScale);
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
        const s = this.penScale * Math.max(0.05, 1 - fallProgress * 0.45);
        mesh.scale.set(s, s, s);

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
        // Normal active pen on table
        mesh.position.set(pen.position.x, pen.position.y, 6.5 + zElevation);
        mesh.scale.set(this.penScale, this.penScale, this.penScale);

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
