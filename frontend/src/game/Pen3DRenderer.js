import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CFG, CANVAS_DIM } from "./constants";

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

    // 2. Camera (Centered Top-down Orthographic aligned with expanded canvas buffer)
    this.camera = new THREE.OrthographicCamera(
      -CANVAS_DIM.w / 2,
      CANVAS_DIM.w / 2,
      -CANVAS_DIM.h / 2,
      CANVAS_DIM.h / 2,
      1,
      1500
    );
    this.camera.position.set(CFG.W / 2, CFG.H / 2, 600);
    this.camera.lookAt(CFG.W / 2, CFG.H / 2, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(CANVAS_DIM.w, CANVAS_DIM.h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    // 4. Enhanced Multi-source Studio Lighting (Eliminates all dark spots)
    // 4a. Bright 360-degree Hemisphere Sky/Ground Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0e0ff, 2.2);
    this.scene.add(hemiLight);

    // 4b. Key Sunlight from Top-Left (Casting crisp soft shadows)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(CFG.W * 0.35, CFG.H * 0.2, 550);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.left = -CANVAS_DIM.w / 2;
    keyLight.shadow.camera.right = CANVAS_DIM.w * 1.2;
    keyLight.shadow.camera.top = -CANVAS_DIM.h / 2;
    keyLight.shadow.camera.bottom = CANVAS_DIM.h * 1.2;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 1000;
    keyLight.shadow.bias = -0.0004;
    this.scene.add(keyLight);

    // 4c. Direct Overhead Studio Light (Bright top specular glint on the pen bodies)
    const topLight = new THREE.DirectionalLight(0xffffff, 1.8);
    topLight.position.set(CFG.W * 0.5, CFG.H * 0.5, 600);
    this.scene.add(topLight);

    // 4d. Warm Fill Light from Bottom-Right (Illuminates bottom flanks)
    const fillLight = new THREE.DirectionalLight(0xfff2e0, 1.4);
    fillLight.position.set(CFG.W * 0.85, CFG.H * 0.85, 450);
    this.scene.add(fillLight);

    // 5. Shadow Receiver Plane for the Desk Surface
    const shadowGeo = new THREE.PlaneGeometry(CANVAS_DIM.w * 2, CANVAS_DIM.h * 2);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.32 });
    this.shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowPlane.position.set(CFG.W / 2, CFG.H / 2, 0);
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // 6. Load both 3D Pen Models (Classic & Ocean Gel)
    this.models = {
      classic: { loaded: false, geoP1: null, geoP2: null, mat: null, scale: CFG.penLen / 1.8992 },
      ocean_gel: { loaded: false, geo: null, matP1: null, matP2: null, scale: CFG.penLen / 1.8996 },
    };
    this.loadModels();
  }

  loadModels() {
    const loader = new GLTFLoader();

    // 1. Classic Reynolds 045 Ballpoint (pen.glb)
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

        const penScale = CFG.penLen / 1.8992;
        const p1TemplateGeo = this.createTeamGeometry(geo, "#1473E6");
        const p2TemplateGeo = this.createTeamGeometry(geo, "#E02424");

        const material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.18,
          metalness: 0.02,
        });

        this.models.classic = {
          loaded: true,
          geoP1: p1TemplateGeo,
          geoP2: p2TemplateGeo,
          mat: material,
          scale: penScale,
        };
        this.loaded = true;
      },
      undefined,
      (err) => {
        console.error("Failed to load /models/pen.glb:", err);
      }
    );

    // 2. Ocean Gel 0.5 (pen2.glb)
    loader.load(
      "/models/pen2.glb",
      (gltf) => {
        let baseMesh = null;
        gltf.scene.traverse((child) => {
          if (child.isMesh && !baseMesh) baseMesh = child;
        });

        if (!baseMesh) {
          console.warn("No mesh found in pen2.glb");
          return;
        }

        const geo = baseMesh.geometry.clone();
        geo.center();
        geo.computeVertexNormals();

        // pen2.glb has length along Y axis (+Y is nib, -Y is cap).
        // Rotate -90° around Z so +Y becomes +X (nib) and -Y becomes -X (cap)
        geo.rotateZ(-Math.PI / 2);

        const penScale = CFG.penLen / 1.8996;
        const baseMat = baseMesh.material || new THREE.MeshStandardMaterial();

        // P1: Electric Ocean Blue tint
        const matP1 = baseMat.clone();
        matP1.color = new THREE.Color("#CBE6FA");
        matP1.roughness = 0.22;
        matP1.metalness = 0.12;

        // P2: Crimson Red tint
        const matP2 = baseMat.clone();
        matP2.color = new THREE.Color("#FFD2D2");
        matP2.roughness = 0.22;
        matP2.metalness = 0.12;

        this.models.ocean_gel = {
          loaded: true,
          geo,
          matP1,
          matP2,
          scale: penScale,
        };
        this.loaded = true;
      },
      undefined,
      (err) => {
        console.error("Failed to load /models/pen2.glb:", err);
      }
    );
  }

  createTeamGeometry(baseGeo, capHex) {
    const geo = baseGeo.clone();
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const capColor = new THREE.Color(capHex);
    const collarColor = new THREE.Color("#E8E8E8"); // Polished chrome collar
    const barrelColor = new THREE.Color("#FFFFFF"); // Crisp, brilliant white barrel
    const nibColor = new THREE.Color("#A8A8A8"); // Polished steel nib

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
        c = barrelColor; // Brilliant white barrel
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  update(pens, viewAngle = 0, viewScale = 1.0) {
    if (!this.loaded) return;

    // Synchronize 360-degree table rotation around board center (450, 300)
    this.camera.rotation.z = -viewAngle;
    if (this.camera.zoom !== viewScale) {
      this.camera.zoom = viewScale;
      this.camera.updateProjectionMatrix();
    }

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

      const penType = pen.penData.type || "classic";
      const isP1 = pen.penData.owner === "p1";

      if (!mesh) {
        if (penType === "ocean_gel" && this.models.ocean_gel?.loaded) {
          const model = this.models.ocean_gel;
          mesh = new THREE.Mesh(model.geo, isP1 ? model.matP1 : model.matP2);
          mesh.penScale = model.scale;
          mesh.scale.set(model.scale, model.scale, model.scale);
        } else if (this.models.classic?.loaded) {
          const model = this.models.classic;
          const geo = isP1 ? model.geoP1 : model.geoP2;
          mesh = new THREE.Mesh(geo, model.mat);
          mesh.penScale = model.scale;
          mesh.scale.set(model.scale, model.scale, model.scale);
        } else {
          continue;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = false;
        this.scene.add(mesh);
        this.meshes.set(id, mesh);
      }

      const penScale = mesh.penScale || (CFG.penLen / 1.8992);
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
        const s = penScale * Math.max(0.05, 1 - fallProgress * 0.45);
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
        mesh.scale.set(penScale, penScale, penScale);

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
