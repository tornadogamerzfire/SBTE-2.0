/* three-background.js — the ambient "blueprint void" behind every page.
   Deliberately restrained: slow rotation, low opacity, no interaction
   requirement. If Three.js failed to load from the CDN, this simply
   no-ops and the page still works fine against the flat ink background. */

(function () {
  if (typeof THREE === "undefined") return;
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const BLUEPRINT = 0x3fa9f5;
  const MARKER = 0xffb020;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 13);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // WebGL unavailable — fail silently, page still works
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const group = new THREE.Group();
  scene.add(group);

  // Five wireframe solids — one per engineering discipline the site
  // covers. Rendered with EdgesGeometry rather than a wireframe material,
  // so only the true edges show (a clean, drafting-table line quality
  // rather than triangulated mesh clutter).
  const geometries = [
    new THREE.IcosahedronGeometry(1.7, 0),
    new THREE.TorusGeometry(1.3, 0.42, 8, 24),
    new THREE.OctahedronGeometry(1.6, 0),
    new THREE.TorusKnotGeometry(1, 0.3, 64, 8),
    new THREE.BoxGeometry(2.1, 2.1, 2.1),
  ];
  const positions = [
    [-5.6, 2.6, -3], [5.4, -1.8, -4.5], [-4.2, -2.8, -6.5], [4.9, 3.1, -7.5], [0.2, -0.6, -9.5],
  ];

  const shapes = geometries.map((geo, i) => {
    const edges = new THREE.EdgesGeometry(geo);
    const color = i % 2 === 0 ? BLUEPRINT : MARKER;
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.32 });
    const mesh = new THREE.LineSegments(edges, material);
    mesh.position.set(...positions[i]);
    mesh.userData.axis = new THREE.Vector3(Math.random(), Math.random() * 0.6 + 0.2, Math.random()).normalize();
    mesh.userData.speed = 0.15 + Math.random() * 0.15;
    group.add(mesh);
    return mesh;
  });

  // Faint particle field for depth
  const isSmallScreen = window.innerWidth < 720;
  const particleCount = isSmallScreen ? 90 : 260;
  const particleGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 42;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 6;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particleMat = new THREE.PointsMaterial({ color: BLUEPRINT, size: 0.045, transparent: true, opacity: 0.45 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Faint drafting-table grid floor
  const grid = new THREE.GridHelper(70, 36, BLUEPRINT, BLUEPRINT);
  grid.position.y = -8.5;
  grid.material.transparent = true;
  grid.material.opacity = 0.05;
  scene.add(grid);

  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  let running = !prefersReducedMotion;
  document.addEventListener("visibilitychange", () => {
    if (prefersReducedMotion) return;
    running = document.visibilityState === "visible";
    if (running) requestAnimationFrame(animate);
  });

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    shapes.forEach((mesh) => mesh.rotateOnAxis(mesh.userData.axis, mesh.userData.speed * 0.01));
    particles.rotation.y += 0.0007;

    camera.position.x += (mouseX * 1.1 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 0.7 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, -5);

    renderer.render(scene, camera);
  }

  renderer.render(scene, camera);
  if (!prefersReducedMotion) requestAnimationFrame(animate);
})();
