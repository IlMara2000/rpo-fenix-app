import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FloorPlan3D, Furniture3D, Room3D } from "./floorPlan3d";

type FloorPlan3DViewerProps = {
  plan: FloorPlan3D;
};

const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#d9dde2",
  roughness: 0.82,
  metalness: 0.02,
});

const edgeMaterial = new THREE.LineBasicMaterial({
  color: "#111318",
  transparent: true,
  opacity: 0.46,
});

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(6, 7, 10, 0.78)";
    context.roundRect(10, 18, 492, 92, 22);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 42px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text.toUpperCase(), 256, 64, 430);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.2, 0.55, 1);
  return sprite;
}

function addEdges(mesh: THREE.Mesh, group: THREE.Group) {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMaterial);
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  group.add(edges);
}

function addWall(group: THREE.Group, x: number, z: number, width: number, depth: number, height: number) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, wallMaterial);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  addEdges(mesh, group);
}

function addFurniture(group: THREE.Group, room: Room3D, piece: Furniture3D) {
  const material = new THREE.MeshStandardMaterial({
    color: piece.color,
    roughness: 0.68,
    metalness: 0.06,
  });
  const geometry = new THREE.BoxGeometry(piece.width, piece.height, piece.depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(room.x + piece.x, piece.height / 2 + 0.08, room.z + piece.z);
  mesh.rotation.y = piece.rotation ?? 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  addEdges(mesh, group);
}

function addRoom(group: THREE.Group, room: Room3D, plan: FloorPlan3D) {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: room.color,
    roughness: 0.92,
    metalness: 0.02,
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(room.width, room.height, room.depth), floorMaterial);
  floor.position.set(room.x, room.height / 2, room.z);
  floor.receiveShadow = true;
  group.add(floor);
  addEdges(floor, group);

  const wall = plan.wallThickness;
  addWall(group, room.x, room.z - room.depth / 2, room.width + wall, wall, plan.wallHeight);
  addWall(group, room.x, room.z + room.depth / 2, room.width + wall, wall, plan.wallHeight);
  addWall(group, room.x - room.width / 2, room.z, wall, room.depth + wall, plan.wallHeight);
  addWall(group, room.x + room.width / 2, room.z, wall, room.depth + wall, plan.wallHeight);

  room.furniture.forEach((piece) => addFurniture(group, room, piece));

  const label = makeLabel(room.name);
  label.position.set(room.x, 0.14, room.z);
  label.rotation.x = -Math.PI / 2;
  group.add(label);
}

export function FloorPlan3DViewer({ plan }: FloorPlan3DViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    host.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07080b");
    scene.fog = new THREE.Fog("#07080b", 18, 42);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(plan.width * 0.72, Math.max(plan.width, plan.depth) * 0.72, plan.depth * 0.95);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#ffffff", 1.2);
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.4);
    keyLight.position.set(6, 12, 8);
    keyLight.castShadow = true;
    scene.add(ambient, keyLight);

    const group = new THREE.Group();
    plan.rooms.forEach((room) => addRoom(group, room, plan));
    group.rotation.x = -0.04;
    scene.add(group);

    const baseGrid = new THREE.GridHelper(Math.max(plan.width, plan.depth) + 4, 24, "#3b3f48", "#1b1d24");
    baseGrid.position.y = -0.02;
    scene.add(baseGrid);

    const state = {
      dragging: false,
      lastX: 0,
      lastY: 0,
      rotateY: -0.58,
      rotateX: 0,
      zoom: 1,
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(320, rect.width);
      const height = Math.max(360, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const render = () => {
      group.rotation.y = state.rotateY;
      group.rotation.x = -0.04 + state.rotateX;
      camera.zoom = state.zoom;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const animate = () => {
      render();
      frame = window.requestAnimationFrame(animate);
    };

    const onPointerDown = (event: PointerEvent) => {
      state.dragging = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.rotateY += dx * 0.008;
      state.rotateX = THREE.MathUtils.clamp(state.rotateX + dy * 0.003, -0.32, 0.18);
      state.lastX = event.clientX;
      state.lastY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      state.dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      state.zoom = THREE.MathUtils.clamp(state.zoom - event.deltaY * 0.001, 0.72, 1.8);
    };

    const observer = new ResizeObserver(() => resize());
    let frame = 0;

    observer.observe(host);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    resize();
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      scene.traverse((item) => {
        if (item instanceof THREE.Mesh) {
          item.geometry.dispose();
          if (Array.isArray(item.material)) {
            item.material.forEach((material) => material.dispose());
          } else {
            item.material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
    };
  }, [plan]);

  function downloadSnapshot() {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const link = document.createElement("a");
    link.href = renderer.domElement.toDataURL("image/jpeg", 0.92);
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-planimetria.jpg`;
    link.click();
  }

  return (
    <div className="plan-3d-viewer-shell">
      <div ref={hostRef} className="plan-3d-canvas" aria-label="Anteprima planimetria 3D" />
      <button className="plan-3d-snapshot" type="button" onClick={downloadSnapshot}>
        Scarica JPG finale
      </button>
    </div>
  );
}
