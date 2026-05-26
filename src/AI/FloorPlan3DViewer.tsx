import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FloorPlan3D, Furniture3D, Room3D } from "./floorPlan3d";

type FloorPlan3DViewerProps = {
  plan: FloorPlan3D;
  baseImageUrl?: string;
  finalImageUrl?: string;
};

const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#dfe6ef",
  transparent: true,
  opacity: 0.74,
  roughness: 0.62,
  metalness: 0.04,
});

const edgeMaterial = new THREE.LineBasicMaterial({
  color: "#13202e",
  transparent: true,
  opacity: 0.76,
});

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
  group.add(mesh);
  addEdges(mesh, group);
}

function addFurniture(group: THREE.Group, room: Room3D, piece: Furniture3D) {
  const material = new THREE.MeshStandardMaterial({
    color: piece.color,
    transparent: true,
    opacity: 0.9,
    roughness: 0.58,
    metalness: 0.03,
  });
  const geometry = new THREE.BoxGeometry(piece.width, piece.height, piece.depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(room.x + piece.x, piece.height / 2 + 0.1, room.z + piece.z);
  mesh.rotation.y = piece.rotation ?? 0;
  group.add(mesh);
  addEdges(mesh, group);
}

function addRoomRelief(group: THREE.Group, room: Room3D, plan: FloorPlan3D) {
  const wall = plan.wallThickness;
  const wallHeight = Math.max(0.22, Math.min(plan.wallHeight * 0.22, 0.8));
  addWall(group, room.x, room.z - room.depth / 2, room.width + wall, wall, wallHeight);
  addWall(group, room.x, room.z + room.depth / 2, room.width + wall, wall, wallHeight);
  addWall(group, room.x - room.width / 2, room.z, wall, room.depth + wall, wallHeight);
  addWall(group, room.x + room.width / 2, room.z, wall, room.depth + wall, wallHeight);

  room.furniture.forEach((piece) => {
    const maxHeight = Math.max(0.12, Math.min(piece.height * 0.2, 0.45));
    addFurniture(group, room, { ...piece, height: maxHeight });
  });
}

export function FloorPlan3DViewer({ plan, baseImageUrl, finalImageUrl }: FloorPlan3DViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    host.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#060b12");

    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#ffffff", 1.28);
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.95);
    keyLight.position.set(6, 8, 4);
    scene.add(ambient, keyLight);

    const group = new THREE.Group();
    const planWidth = Math.max(4, plan.width);
    const planDepth = Math.max(4, plan.depth);

    let floorMaterial: THREE.Material = new THREE.MeshStandardMaterial({
      color: "#111723",
      roughness: 0.9,
      metalness: 0.01,
    });

    if (baseImageUrl) {
      const texture = new THREE.TextureLoader().load(baseImageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      floorMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.92,
        metalness: 0.01,
      });
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(planWidth, planDepth), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    group.add(floor);

    plan.rooms.forEach((room) => addRoomRelief(group, room, plan));
    scene.add(group);

    const fit = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(320, rect.width);
      const height = Math.max(320, rect.height);
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const margin = 1.2;
      const halfW = (planWidth * margin) / 2;
      const halfH = (planDepth * margin) / 2;

      if (aspect >= planWidth / planDepth) {
        camera.left = -halfH * aspect;
        camera.right = halfH * aspect;
        camera.top = halfH;
        camera.bottom = -halfH;
      } else {
        camera.left = -halfW;
        camera.right = halfW;
        camera.top = halfW / aspect;
        camera.bottom = -halfW / aspect;
      }

      camera.position.set(0, 9.4, 0.001);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(() => fit());
    observer.observe(host);
    fit();

    return () => {
      observer.disconnect();
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
  }, [plan, baseImageUrl]);

  function downloadSnapshot() {
    if (finalImageUrl) {
      const link = document.createElement("a");
      link.href = finalImageUrl;
      link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-rilievo-ai.jpg`;
      link.click();
      return;
    }
    if (baseImageUrl) {
      const link = document.createElement("a");
      link.href = baseImageUrl;
      link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-planimetria-originale.jpg`;
      link.click();
      return;
    }
    const renderer = rendererRef.current;
    if (!renderer) return;
    const link = document.createElement("a");
    link.href = renderer.domElement.toDataURL("image/jpeg", 0.92);
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-rilievo.jpg`;
    link.click();
  }

  return (
    <div className="plan-3d-viewer-shell plan-relief-viewer-shell">
      {finalImageUrl ? (
        <img className="plan-ai-final-image" src={finalImageUrl} alt="Rilievo AI su planimetria" />
      ) : baseImageUrl ? (
        <div className="plan-ai-fallback-image" aria-label="Anteprima planimetria caricata">
          <img src={baseImageUrl} alt="Planimetria caricata" />
          <span>Render AI non disponibile</span>
        </div>
      ) : (
        <div ref={hostRef} className="plan-3d-canvas plan-relief-canvas" aria-label="Rilievo 3D su planimetria 2D" />
      )}
      <button className="plan-3d-snapshot" type="button" onClick={downloadSnapshot}>
        Scarica JPG finale
      </button>
    </div>
  );
}
