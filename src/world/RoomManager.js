import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MazeGenerator } from './MazeGenerator.js';

function createProceduralTexture(baseColor, repeat, variance) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 1200; i++) {
    const v = Math.random() * variance;
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${v / 255})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class RoomManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.mazeData = null;
    this.group = new THREE.Group();
    this.group.name = 'ProceduralMaze';
    this.scene.add(this.group);
    this.lamps = [];
  }

  build(seed) {
    this.clear();

    const gen = new MazeGenerator(seed);
    this.mazeData = gen.generate();
    const m = this.mazeData;
    const W = m.W * m.C;
    const H = m.H * m.C;
    const wallH = CONFIG.MAZE.WALL_HEIGHT;

    // Floor
    const floorTexture = createProceduralTexture('#202020', m.W * 2, 40);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, 0, H / 2);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling
    const ceilTexture = createProceduralTexture('#151515', m.W, 30);
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ map: ceilTexture, roughness: 0.95 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(W / 2, wallH, H / 2);
    this.group.add(ceil);

    // Instanced walls for low draw-calls and high performance
    const wallTexture = createProceduralTexture('#363430', 1, 50);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.85 });
    const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, wallH, 1), wallMat, m.boxes.length);

    const dummy = new THREE.Object3D();
    m.boxes.forEach((b, i) => {
      dummy.position.set(b.cx, wallH / 2, b.cz);
      dummy.scale.set(b.sx, 1, b.sz);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
    });
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    this.group.add(wallMesh);

    // Fluorescent lamps
    this.lamps = m.lights.map(l => {
      const pl = new THREE.PointLight(0xdde5cf, 3.5, 12, 1.8);
      pl.position.set(l.x, wallH - 0.25, l.z);
      this.group.add(pl);

      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.45),
        new THREE.MeshBasicMaterial({ color: 0xe0e8d5 })
      );
      panel.rotation.x = Math.PI / 2;
      panel.position.set(l.x, wallH - 0.02, l.z);
      this.group.add(panel);

      return { light: pl, baseIntensity: 3.5, x: l.x, z: l.z };
    });

    // Exit portal: green glowing sign + beacon
    const exitCanvas = document.createElement('canvas');
    exitCanvas.width = 256;
    exitCanvas.height = 96;
    const eCtx = exitCanvas.getContext('2d');
    eCtx.fillStyle = '#0a3318';
    eCtx.fillRect(0, 0, 256, 96);
    eCtx.fillStyle = '#9affaa';
    eCtx.font = 'bold 58px monospace';
    eCtx.textAlign = 'center';
    eCtx.fillText('EXIT', 128, 68);

    const exitSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.45),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(exitCanvas) })
    );
    exitSign.position.set(m.exit.x, wallH - 0.9, m.exit.z);
    this.group.add(exitSign);

    const exitLight = new THREE.PointLight(0x22ee77, 4.0, 10, 2);
    exitLight.position.set(m.exit.x, 1.4, m.exit.z);
    this.group.add(exitLight);

    // Spawn Pickups in the maze (Batteries, Ammo, Saxophone)
    this.spawnPickups(m.items);

    return this.mazeData;
  }

  spawnPickups(itemsList) {
    this.pickupObjects = new Map();
    const batteryGeo = new THREE.BoxGeometry(0.2, 0.35, 0.2);
    const batteryMat = new THREE.MeshStandardMaterial({ color: 0xc8a96e, emissive: 0x443311, roughness: 0.5 });

    const ammoGeo = new THREE.BoxGeometry(0.25, 0.15, 0.25);
    const ammoMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2a, emissive: 0x331108, roughness: 0.6 });

    itemsList.forEach((it, idx) => {
      let mesh;
      if (idx === 0) {
        // Saxophone novelty pickup in one alcove
        mesh = new THREE.Group();
        mesh.position.set(it.x, 0.4, it.z);
        this.game.assetManager.loadGLB('assets/models/items/Saxophone.glb').then(gltf => {
          const m = gltf.scene;
          m.scale.set(0.6, 0.6, 0.6);
          mesh.add(m);
        }).catch(() => mesh.add(new THREE.Mesh(batteryGeo, batteryMat)));
        mesh.userData = { id: it.id, type: 'saxophone', interactable: true };
      } else if (it.type === 'ammo') {
        mesh = new THREE.Mesh(ammoGeo, ammoMat);
        mesh.position.set(it.x, 0.2, it.z);
        mesh.userData = { id: it.id, type: 'ammo', interactable: true };
      } else {
        mesh = new THREE.Mesh(batteryGeo, batteryMat);
        mesh.position.set(it.x, 0.25, it.z);
        mesh.userData = { id: it.id, type: 'battery', interactable: true };
      }

      mesh.castShadow = true;
      this.group.add(mesh);
      this.pickupObjects.set(it.id, mesh);
    });
  }

  removePickup(id) {
    if (this.pickupObjects && this.pickupObjects.has(id)) {
      const mesh = this.pickupObjects.get(id);
      this.group.remove(mesh);
      this.pickupObjects.delete(id);
    }
  }

  update(delta) {
    // Subtle fluorescent flicker
    for (const lamp of this.lamps) {
      if (Math.random() < 0.005) {
        lamp.light.intensity = lamp.baseIntensity * 0.2;
      } else {
        lamp.light.intensity = lamp.baseIntensity;
      }
    }

    // Gentle floating rotation for pickups
    if (this.pickupObjects) {
      for (const [, mesh] of this.pickupObjects) {
        mesh.rotation.y += delta * 1.5;
      }
    }
  }

  getCollisionBoxes() {
    return this.mazeData ? this.mazeData.boxes : [];
  }

  clear() {
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    this.lamps = [];
    this.mazeData = null;
  }
}
