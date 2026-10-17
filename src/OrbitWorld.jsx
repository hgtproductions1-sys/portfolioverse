import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function OrbitWorld({ portfolio, theme = 'ember', selectedId, onSelect }) {
  const host = useRef(null);
  const callback = useRef(onSelect);
  const selected = useRef(selectedId);
  const [unavailable, setUnavailable] = useState(false);
  callback.current = onSelect;
  selected.current = selectedId;
  const signature = portfolio.projects.map(p => `${p.id}:${p.title}`).join('|');

  useEffect(() => {
    const element = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setUnavailable(true); return; }
    setUnavailable(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Interactive portfolio universe. Drag to rotate. Use the project list for keyboard access.');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 5.5, 11);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.25;
    const accent = { ember: '#ffad79', ocean: '#9bdfea', forest: '#a8d5a2' }[theme] || '#ffad79';
    scene.add(new THREE.AmbientLight('#ffffff', 1.8));
    const light = new THREE.DirectionalLight('#ffffff', 3);
    light.position.set(3, 6, 5);
    scene.add(light);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 2), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.32, metalness: 0.4, flatShading: true }));
    scene.add(core);
    const nodes = [];
    portfolio.projects.slice(0, 40).forEach((project, i) => {
      const radius = 2.3 + (i % 3) * 0.65;
      const angle = i * 2.399;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009, 5, 150), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.18 }));
      ring.rotation.x = Math.PI / 2 + (i % 3 - 1) * 0.25;
      scene.add(ring);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.19 + (i % 3) * 0.055, 24, 24), new THREE.MeshStandardMaterial({ color: i % 2 ? '#a9c6d2' : accent, roughness: 0.3, metalness: 0.45 }));
      node.position.set(Math.cos(angle) * radius, Math.sin(angle) * 0.55, Math.sin(angle) * radius);
      node.userData.id = project.id;
      nodes.push(node);
      scene.add(node);
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 640; labelCanvas.height = 96;
      const ctx = labelCanvas.getContext('2d');
      ctx.font = '500 30px system-ui'; ctx.fillStyle = '#edece7'; ctx.textAlign = 'center';
      ctx.fillText((project.title || 'Untitled project').slice(0, 28), 320, 60);
      const texture = new THREE.CanvasTexture(labelCanvas);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
      label.position.copy(node.position).add(new THREE.Vector3(0, -0.48, 0));
      label.scale.set(2.5, 0.375, 1);
      scene.add(label);
    });
    const ray = new THREE.Raycaster();
    let start;
    function down(event) { start = [event.clientX, event.clientY]; }
    function up(event) {
      if (!start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 6) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
      const hit = ray.intersectObjects(nodes)[0];
      if (hit) callback.current?.(hit.object.userData.id);
    }
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointerup', up);
    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1));
      camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
    });
    observer.observe(element);
    let visible = true;
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    intersection.observe(element);
    let frame;
    function render() {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden) return;
      controls.update();
      nodes.forEach(node => { node.scale.setScalar(selected.current === node.userData.id ? 1.5 : 1); });
      renderer.render(scene, camera);
    }
    render();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointerup', up);
      scene.traverse(object => {
        object.geometry?.dispose();
        if (object.material) { object.material.map?.dispose(); object.material.dispose(); }
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [signature, theme]);

  return <div ref={host} style={{ width: '100%', height: '100%', minHeight: 290 }}>
    {unavailable && <div className="world-fallback"><p>3D is unavailable on this device.</p><p>Your work is still accessible in the project list.</p></div>}
  </div>;
}
