import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type Pose = {
  lean: number; // tilt in the screen plane, radians, + = clockwise (flying right = near horizontal)
  turn: number; // spin about his own body axis (facing and barrel rolls)
  flip: number; // tumble head over heels
  thrust: number; // 0..1+, flame length
};

const HEIGHT = 2.33; // scene units, whatever the model's own scale

// Loads a hero model (glTF, meshopt + webp compressed with gltf-transform) into its
// own small transparent canvas, centred and scaled to the same height.
// `jets` are thruster nozzles in the model's units: [x, y, z, strength].
export async function createHero(canvas: HTMLCanvasElement, size: number, spec: { model: string; jets: number[][] }) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(spec.model);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(size, size, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // reflections for the metal
  const key = new THREE.DirectionalLight(0xfff1e0, 3); // warm key light for highlights
  key.position.set(2, 3, 5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 7.1);

  const body = new THREE.Group();
  body.rotation.order = "ZYX"; // lean in the screen plane, then spin about his own axis
  const figure = gltf.scene;
  const box = new THREE.Box3().setFromObject(figure);
  const c = box.getCenter(new THREE.Vector3());
  const k = HEIGHT / (box.max.y - box.min.y);
  figure.scale.setScalar(k);
  figure.position.set(-c.x * k, -c.y * k, -c.z * k); // pivot at his middle so rolls and flips spin in place
  body.add(figure);

  // Flames hang down from the nozzle so scaling y stretches them away from it,
  // with a soft glow sprite at the nozzle so they read as energy, not spikes.
  const outer = new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.45, depthWrite: false });
  const inner = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
  const dot = document.createElement("canvas");
  dot.width = dot.height = 64;
  const dctx = dot.getContext("2d")!;
  const grad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(140,220,255,0.8)");
  grad.addColorStop(1, "rgba(80,180,255,0)");
  dctx.fillStyle = grad;
  dctx.fillRect(0, 0, 64, 64);
  const glow = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false });
  const flames = spec.jets.map(([x, y, z, s]) => {
    const g = new THREE.Group();
    for (const [m, f] of [[outer, 1], [inner, 0.5]] as const) {
      const r = 0.07 * s * f, h = 0.7 * s * f;
      g.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 12, 1, true).rotateX(Math.PI).translate(0, -h / 2, 0), m));
    }
    const halo = new THREE.Sprite(glow);
    halo.scale.setScalar(0.4 * s);
    g.add(halo);
    g.position.set((x - c.x) * k, (y - c.y) * k, (z - c.z) * k);
    body.add(g);
    return g;
  });
  scene.add(body);

  return {
    render(p: Pose) {
      body.rotation.set(p.flip, p.turn, -p.lean);
      for (const f of flames) {
        f.visible = p.thrust > 0.02;
        f.scale.set(1, p.thrust * (0.75 + Math.random() * 0.5), 1);
      }
      renderer.render(scene, camera);
    },
    dispose() {
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
