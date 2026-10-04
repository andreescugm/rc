// The floors: La Nuit, el piso, la sala de juntas and the club that has no button.
(() => {
const R = window.RC, V = R.V, W = R.W;
R.rooms = {};
R.TRACKS = [['giannis antetokounmpo', 'Catálogo'], ['super high', 'Catálogo'], ['racks from scu', 'Catálogo'], ['5cents 4free', 'Catálogo'], ['get my shit done', 'Catálogo'], ['futuro', 'Catálogo'], ['draco', 'Catálogo'], ['dinero feo', 'Catálogo'], ['Designer Fraud', 'En obra'], ['2x', 'En obra'], ['A la de tres', 'En obra']];
const HALF = Math.PI / 2;

function shell(w, d, h, floor, wall, ceil, tf = 2, tw = 2.5) {
  const g = new THREE.Group(); g.position.set(0, 0, 1.3); g.visible = false; R.lift.group.add(g);
  R.add(g, R.plane(w, d, floor, tf), 0, 0, d / 2, -HALF);
  R.add(g, R.plane(w, d, ceil, tw), 0, h, d / 2, HALF);
  R.add(g, R.plane(d, h, wall, tw), -w / 2, h / 2, d / 2, 0, HALF);
  R.add(g, R.plane(d, h, wall, tw), w / 2, h / 2, d / 2, 0, -HALF);
  R.add(g, R.plane(w, h, wall, tw), 0, h / 2, d, 0, Math.PI);
  const sw = (w - 1.2) / 2;
  R.add(g, R.plane(sw, h, wall, tw), -(0.6 + sw / 2), h / 2, 0.02);
  R.add(g, R.plane(sw, h, wall, tw), 0.6 + sw / 2, h / 2, 0.02);
  R.add(g, R.plane(1.2, h - 2.2, wall, tw), 0, 2.2 + (h - 2.2) / 2, 0.02);
  return g;
}
const lit = c => new THREE.MeshBasicMaterial({ color: c });
const tracksHtml = () => '<ul>' + R.TRACKS.map(t => '<li><b>' + t[0] + '</b><em>' + t[1] + '</em></li>').join('') + '</ul>';

// ---- La Nuit ---------------------------------------------------------------------
R.rooms.nuit = {
  title: 'La Nuit', sub: 'Jueves. La barra es tuya.', cam: [[0.6, 1.6, 1.2], [-0.6, 1.5, 12]], exposure: 1.0, bloom: 1.15, par: 0.55,
  fog: new THREE.FogExp2(0x02060c, 0.045), amb: { drone: 0.06, club: 0.5 },
  build: async function () {
    if (this.group) return;
    const velvet = R.pbr('velour_velvet', { color: 0x0c1830, envMapIntensity: 0.05 });
    const floor = R.pbr('granite_tile', { color: 0x3a3a3e, roughness: 0.22, envMapIntensity: 0.7 });
    const g = this.group = shell(12, 18, 4.1, floor, velvet, new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 1 }), 1.6, 2);
    const wood = R.pbr('dark_wood', { color: 0x4a3a30, roughness: 0.6, envMapIntensity: 0.6 }), top = R.pbr('granite_tile', { color: 0x222226, roughness: 0.15, envMapIntensity: 1 });
    // bar
    R.add(g, R.box(0.9, 1.08, 9.6, wood, 1.5), -4.1, 0.54, 8.4);
    R.add(g, R.box(1.1, 0.06, 9.8, top, 1.2), -4.05, 1.11, 8.4);
    R.add(g, R.box(0.03, 0.04, 9.6, lit(new THREE.Color(0.3, 3.2, 3.0))), -3.63, 0.98, 8.4);
    R.add(g, R.box(0.03, 0.04, 9.6, lit(new THREE.Color(0.3, 3.2, 3.0))), -3.63, 0.1, 8.4);
    R.add(g, R.box(0.06, 2.2, 9.6, lit(new THREE.Color(0.03, 0.28, 1.25))), -5.93, 2.0, 8.4);
    for (const y of [1.2, 1.85, 2.5]) R.add(g, R.box(0.36, 0.04, 9.6, top, 1), -5.72, y, 8.4);
    for (const y of [1.22, 1.87, 2.52]) for (let i = 0; i < 12; i++) R.put(g, 'wine_bottles_01', -5.72, y, 4.2 + i * 0.78, 1, HALF);
    for (let i = 0; i < 6; i++) R.put(g, 'bar_chair_round_01', -3.15, 0, 4.7 + i * 1.45, 1, i * 0.7);
    // lounge
    R.put(g, 'sofa_03', 5.2, 0, 6.2, 1, -HALF); R.put(g, 'sofa_03', 5.2, 0, 11.4, 1, -HALF);
    R.add(g, R.box(0.7, 0.4, 1.2, top, 1), 3.9, 0.2, 6.2); R.add(g, R.box(0.7, 0.4, 1.2, top, 1), 3.9, 0.2, 11.4);
    // screen
    const scr = R.ctex(R.cv(1024, 576, (c, w, h) => {
      c.fillStyle = '#01060a'; c.fillRect(0, 0, w, h);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#7ff6ee'; c.font = '900 210px Cinzel, Georgia, serif'; c.fillText('RC', w / 2, 230);
      c.font = '500 26px Cinzel, Georgia, serif'; c.fillStyle = '#3fb8c8';
      R.TRACKS.forEach((t, i) => c.fillText(t[0].toUpperCase(), 150 + (i % 4) * 242, 400 + (i / 4 | 0) * 52));
      c.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 2);
    }));
    const screen = R.add(g, R.plane(6.4, 3.6, new THREE.MeshBasicMaterial({ map: scr, color: new THREE.Color(1.7, 1.7, 1.7) })), 0, 2.15, 17.95, 0, Math.PI);
    for (const x of [-3, 0, 3]) R.add(g, R.box(0.04, 0.04, 15, lit(new THREE.Color(0.2, 2.6, 2.5))), x, 4.05, 9);
    const a = new THREE.PointLight(0x18d8e8, 1.5, 15, 2); a.position.set(-3, 3.2, 8); g.add(a);
    const b = new THREE.PointLight(0x2050ff, 1.3, 18, 2); b.position.set(3, 3.3, 13); g.add(b);
    const c = new THREE.PointLight(0x30a0ff, 1.0, 12, 2); c.position.set(0, 2.2, 16.6); g.add(c);
    g.add(new THREE.AmbientLight(0x0a1830, 0.4));
    const cloud = R.tex('cloud.png', { clamp: 1, srgb: 1 });
    for (let i = 0; i < 5; i++) { const s = R.sprite(cloud, new THREE.Color(0.1, 0.5, 0.6), 9, 5, 0.07, false); s.position.set(-3 + i * 1.6, 1.6 + (i % 2), 5 + i * 2.4); g.add(s); R.upd.push((dt, t) => { s.position.x += Math.sin(t * 0.2 + i) * dt * 0.2; }); }
    R.upd.push((dt, t) => { if (g.visible) { const k = 0.75 + 0.25 * Math.sin(t * 2.1 * Math.PI * 2 * 0.5); a.intensity = 1.5 * k; screen.material.color.setScalar(1.5 + 0.25 * Math.sin(t * 7)); } });
    R.addHot({ pos: W(0, 2.15, 17.6), label: 'La pantalla', when: () => R.mode === 'room:nuit', on: () => R.panel({ kick: 'La Nuit', title: 'Videoclips', body: '<p>Aquí se proyectan. Todavía no hay ninguno subido.</p>' + tracksHtml() }) });
    R.addHot({ pos: W(-3.9, 1.5, 8.4), label: 'La barra', when: () => R.mode === 'room:nuit', on: () => R.games.play('juega') });
  }
};

// ---- El piso -----------------------------------------------------------------------
R.rooms.piso = {
  title: 'El piso', sub: 'El silencio te conoce', cam: [[-0.3, 1.55, 1.1], [0.8, 1.25, 8]], exposure: 1.0, bloom: 0.7, par: 0.5,
  fog: new THREE.FogExp2(0x050403, 0.03), amb: { drone: 0.12 },
  build: async function () {
    if (this.group) return;
    const wall = R.pbr('concrete_wall_008', { color: 0x4a4744 }), floor = R.pbr('dark_wood', { color: 0x8a7a6a, roughness: 0.55, envMapIntensity: 0.5 });
    const g = this.group = shell(8, 10.5, 2.8, floor, wall, new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 1 }), 2, 3);
    const night = R.tex('sky/rooftop_night.jpg', { clamp: 1, srgb: 1 });
    const win = R.add(g, R.plane(4.4, 1.9, new THREE.MeshBasicMaterial({ map: night, color: new THREE.Color(0.55, 0.5, 0.75) })), 3.97, 1.55, 5.2, 0, -HALF);
    win.material.map.repeat.set(0.34, 0.15); win.material.map.offset.set(0.33, 0.475);
    const black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5, metalness: 0.6 });
    for (const z of [3.0, 4.47, 5.93, 7.4]) R.add(g, R.box(0.06, 1.9, 0.05, black), 3.94, 1.55, z);
    R.add(g, R.box(0.06, 0.05, 4.5, black), 3.94, 2.5, 5.2); R.add(g, R.box(0.06, 0.05, 4.5, black), 3.94, 0.6, 5.2);
    R.put(g, 'GothicCabinet_01', -3.4, 0.45, 3.6, 1, HALF);
    R.put(g, 'wooden_bookshelf_worn', -3.65, 0, 7.2, 1, HALF);
    R.put(g, 'sofa_03', 0.2, 0, 9.7, 1, Math.PI);
    R.put(g, 'ornate_mirror_01', 0.2, 1.95, 10.46, 1.8, Math.PI);
    // perfume console
    const wood = R.pbr('dark_wood', { color: 0x3a2e26, roughness: 0.5 });
    R.add(g, R.box(1.5, 0.85, 0.42, wood, 1.2), 1.7, 0.425, 5.4, 0, -0.5);
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.25, envMapIntensity: 1.4 });
    [[0x1a0d06, 0.28, -0.42], [0x0a0a0c, 0.34, 0], [0x8a6a90, 0.25, 0.42]].forEach(([col, h, o]) => {
      const p = new THREE.Group(); p.position.set(1.7 + o * Math.cos(0.5), 0.85, 5.4 + o * Math.sin(0.5)); p.rotation.y = -0.5; g.add(p);
      R.add(p, new THREE.Mesh(new THREE.BoxGeometry(0.13, h, 0.07), new THREE.MeshStandardMaterial({ color: col, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.88, envMapIntensity: 2.2 })), 0, h / 2, 0);
      R.add(p, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), gold), 0, h + 0.035, 0);
    });
    R.put(g, 'Lantern_01', 2.25, 0.85, 5.75, 1.3, 0.4);
    const warm = new THREE.PointLight(0xffa860, 1.5, 8, 2); warm.position.set(2.2, 1.25, 5.5); g.add(warm);
    const cold = new THREE.PointLight(0x5070d0, 0.8, 10, 2); cold.position.set(3.0, 1.8, 5.2); g.add(cold);
    g.add(new THREE.AmbientLight(0x1a1c26, 0.5));
    const lg = R.sprite(R.glowTex, new THREE.Color(2.2, 1.2, 0.4), 0.7, 0.7, 0.8); lg.position.set(2.25, 1.08, 5.75); g.add(lg);
    R.upd.push((dt, t) => { if (g.visible) warm.intensity = 1.4 + 0.2 * Math.sin(t * 11) + 0.1 * Math.sin(t * 23); });
    const on = () => R.mode === 'room:piso';
    R.addHot({ pos: W(1.7, 1.35, 5.4), label: 'Los perfumes', when: on, on: () => R.panel({ kick: 'El piso', title: 'Pirámide olfativa', body: '<p>Cada tema huele a algo.</p><ul><li><b>A la de tres</b><em>Iris Poudre, y el tabaco le da nota</em></li><li><b>2x, de día</b><em>Tom Ford Fucking Fabulous</em></li><li><b>2x, de noche</b><em>Louis Vuitton Ombré Nomade</em></li></ul>' }) });
    R.addHot({ pos: W(-3.2, 1.5, 3.6), label: 'El armario', when: on, on: () => R.panel({ kick: 'El piso', title: 'Nunca logos gritones', body: '<ul><li><b>Maison Margiela</b><em>Cuatro puntadas</em></li><li><b>Vetements</b><em>Vaquero</em></li><li><b>Saint Laurent</b><em>El de pelo</em></li><li><b>Cascos de cable</b><em>Cromados</em></li></ul>' }) });
    R.addHot({ pos: W(3.8, 1.6, 5.2), label: 'La ventana', when: on, on: () => { const d = new Date(), h = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); R.panel({ kick: 'Madrid, ' + h, title: 'Dos mundos', body: '<p>Abajo no saben hasta dónde ha llegado.</p><p>Arriba no saben de dónde viene.</p>' }); } });
  }
};

// ---- La sala de juntas ----------------------------------------------------------------
R.rooms.juntas = {
  title: 'Sala de juntas', sub: 'Hay una silla vacía', cam: [[0, 1.65, 1.2], [0, 1.1, 12]], exposure: 1.15, bloom: 0.8, par: 0.45,
  fog: new THREE.FogExp2(0x050302, 0.035), amb: { drone: 0.14 },
  build: async function () {
    if (this.group) return;
    const wall = R.pbr('dark_wood', { color: 0x4a3426, roughness: 0.6, envMapIntensity: 0.4 }), floor = R.pbr('granite_tile', { color: 0x2e2e30, roughness: 0.2, envMapIntensity: 0.8 });
    const g = this.group = shell(8.5, 15.5, 3.5, floor, wall, new THREE.MeshStandardMaterial({ color: 0x0a0806, roughness: 1 }), 1.4, 2.2);
    for (const z of [5.4, 7.65, 9.9]) R.put(g, 'dining_table', 0, 0, z, 1, HALF).then(m => m.traverse(o => { if (/cloth/.test(o.name)) o.visible = false; else if (o.isMesh && !o.material.userData.dk) { o.material.color.setScalar(0.32); o.material.roughness = 0.45; o.material.userData.dk = 1; } }));
    for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) R.put(g, 'dining_chair_02', sd * 1.15, 0, 4.9 + i * 1.3, 1, sd * HALF);
    R.put(g, 'dining_chair_02', 0.25, 0, 11.75, 1, Math.PI + 0.45);
    const spot = new THREE.SpotLight(0xffe0b0, 3.2, 9, 0.42, 0.6, 1.5); spot.position.set(0, 3.45, 11.2); spot.target.position.set(0.25, 0.5, 11.8); g.add(spot, spot.target);
    for (const z of [5.4, 9.0]) { R.put(g, 'Chandelier_03', 0, 3.5, z, 1.25); const p = new THREE.PointLight(0xffb870, 0.75, 9, 2); p.position.set(0, 2.5, z); g.add(p); const s = R.sprite(R.glowTex, new THREE.Color(2.0, 1.2, 0.5), 1.6, 1.6, 0.7); s.position.set(0, 2.55, z); g.add(s); }
    const night = R.tex('sky/rooftop_night.jpg', { clamp: 1, srgb: 1 });
    R.add(g, R.plane(6.4, 2.0, new THREE.MeshBasicMaterial({ map: night, color: new THREE.Color(0.5, 0.45, 0.7) })), 0, 1.85, 15.47, 0, Math.PI);
    const black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.4, metalness: 0.7 });
    for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) R.add(g, R.box(0.06, 2.0, 0.06, black), x, 1.85, 15.43);
    const marble = R.pbr('marble_01', { color: 0x9a9a9a, roughness: 0.35, envMapIntensity: 0.8 });
    R.add(g, R.box(0.5, 1.15, 0.5, marble, 1), 3.4, 0.575, 12.6); R.put(g, 'marble_bust_01', 3.4, 1.18, 12.6, 1.5, -2.2);
    R.add(g, R.box(0.5, 1.15, 0.5, marble, 1), -3.4, 0.575, 12.6); R.put(g, 'marble_bust_01', -3.4, 1.18, 12.6, 1.5, 2.2);
    g.add(new THREE.AmbientLight(0x1c1612, 0.4));
    R.addHot({ pos: W(0.25, 1.15, 11.75), label: 'La silla', when: () => R.mode === 'room:juntas', on: chair });
  }
};
function chair() {
  const f = document.createElement('form'); f.innerHTML = '<label for="who">Tu nombre</label><input id="who" autocomplete="off" maxlength="40"><p id="verdict" aria-live="polite"></p>';
  const sit = () => {
    const n = f.querySelector('#who').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), v = f.querySelector('#verdict');
    if (!n) { v.textContent = 'Sin nombre no hay silla.'; return; }
    if (n === 'nod') { const first = R.found('nod'); v.textContent = first ? 'Tierra de Nod. Pasa. Cinco monedas.' : 'Tierra de Nod. Ya pasaste.'; if (first) R.coins(5); return; }
    if (['cain', 'rumi cain', 'rumi', 'rc'].includes(n)) { v.textContent = 'El único aquí soy yo.'; R.sfx.low(); return; }
    v.textContent = 'No figuras como socio.'; R.sfx.fail();
  };
  f.addEventListener('submit', e => { e.preventDefault(); sit(); });
  R.panel({ kick: 'Sala de juntas', title: 'La silla vacía', body: f, acts: [{ label: 'Sentarse', main: true, keep: true, on: sit }] });
}

// ---- El club (no button: three knocks on the lift wall) ---------------------------------
R.rooms.club = {
  title: 'El club', sub: 'Muy querido hermano', cam: [[0, 1.7, 1.2], [0, 2.2, 12]], exposure: 0.9, bloom: 1.0, par: 0.5,
  fog: new THREE.FogExp2(0x070403, 0.04), amb: { drone: 0.2, fire: 0.25 },
  build: async function () {
    if (this.group) return;
    const wall = R.pbr('castle_wall_slates', { color: 0x5a524a }), floor = R.pbr('checkered_pavement_tiles', { color: 0xa0a0a0, roughness: 0.5, envMapIntensity: 0.6 });
    const g = this.group = shell(10, 16, 5.6, floor, wall, new THREE.MeshStandardMaterial({ color: 0x050403, roughness: 1 }), 2.4, 3);
    const marble = R.pbr('marble_01', { color: 0xb0aaa0, roughness: 0.4, envMapIntensity: 0.7 });
    for (const sd of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 4.6, 28), marble); c.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 2.2 : 1.5); });
      R.add(g, c, sd * 2.3, 2.6, 5.6); R.add(g, R.box(1.2, 0.3, 1.2, marble, 1), sd * 2.3, 0.15, 5.6); R.add(g, R.box(1.15, 0.35, 1.15, marble, 1), sd * 2.3, 5.05, 5.6);
      R.put(g, 'gothic_statue', sd * 3.9, 2.3, 11.5, 1.35, sd > 0 ? -1.2 : 1.2);
      R.add(g, R.box(1.6, 0.7, 1.9, marble, 1), sd * 3.9, 0.35, 11.2);
    }
    R.add(g, R.box(2.0, 1.0, 0.9, marble, 1), 0, 0.5, 12.6);
    const hood = new THREE.MeshStandardMaterial({ color: 0x050404, roughness: 0.95 });
    for (const [x, z] of [[-1.5, 10.6], [1.5, 10.6], [-2.7, 9.2], [2.7, 9.2]]) { R.add(g, new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.9, 16), hood), x, 0.95, z); R.add(g, new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), hood), x, 1.72, z); }
    const eye = R.ctex(R.cv(512, 512, c => { c.translate(256, 270); c.strokeStyle = '#ffd98a'; c.lineWidth = 9; c.lineJoin = 'round'; c.beginPath(); c.moveTo(0, -200); c.lineTo(200, 150); c.lineTo(-200, 150); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-95, 40); c.quadraticCurveTo(0, -40, 95, 40); c.quadraticCurveTo(0, 120, -95, 40); c.stroke(); c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(0, 40, 22, 0, 7); c.fill(); }));
    R.add(g, R.plane(2.6, 2.6, new THREE.MeshBasicMaterial({ map: eye, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.8, 1.2, 0.5) })), 0, 3.4, 15.95, 0, Math.PI);
    R.put(g, 'Chandelier_03', 0, 5.6, 8.5, 2);
    const ch = new THREE.PointLight(0xffb060, 0.9, 14, 2); ch.position.set(0, 3.6, 8.5); g.add(ch);
    for (const sd of [-1, 1]) { R.put(g, 'stone_fire_pit', sd * 0.62, 1.1, 12.6, 0.42); const L = new THREE.PointLight(0xff7a2a, 1.6, 12, 2); L.position.set(sd * 0.62, 1.8, 12.4); g.add(L); const f = R.fire(0.5, L); f.position.set(sd * 0.62, 1.2, 12.6); g.add(f); }
    g.add(new THREE.AmbientLight(0x1a120c, 0.3));
  },
  enter: async function () {
    await R.wait(2.2); if (R.mode !== 'room:club') return;
    const first = R.found('club');
    R.panel({ kick: 'El club', title: 'Muy querido hermano', body: '<p>Han venido preguntando por ti y no figuras como socio.</p><p>El ojo que todo lo ve te ha perdido el rastro.</p>' + (first ? '<p>Has encontrado la puerta que no tiene botón. Cinco monedas.</p>' : '') });
    if (first) R.coins(5);
  }
};
})();
