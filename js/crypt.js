// The crypt: a first-person corridor of thirty sealed niches. Silver opens them. Some are not for sale.
(() => {
const R = window.RC, V = R.V, W = R.W, HALF = Math.PI / 2;
const LEN = 72, HW = 2.5, HT = 4.4, PITCH = 4.2, Z0 = 8;
const ROMAN = n => { const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
const T = (i, price) => ({ type: 'tema', title: R.TRACKS[i][0], state: R.TRACKS[i][1], price });
const B = (title, by, url) => ({ type: 'libro', title, by, url, price: 2 });
const E = () => ({ type: 'vacio', price: 1 }), SEAL = (g, title) => ({ type: 'sello', grade: g, title, price: 0 });
const NICHES = [
  T(0, 2), B('El Kybalion', 'Tres Iniciados, 1908', 'https://www.gutenberg.org/ebooks/14209'), E(), T(1, 2), T(2, 2),
  B('Morals and Dogma', 'Albert Pike, 1871', 'https://www.gutenberg.org/ebooks/19447'), { type: 'ladron', price: 1 }, T(3, 2), SEAL(1, 'Las maquetas'), T(4, 2),
  B('El arte de la guerra', 'Sun Tzu, traducción de Lionel Giles', 'https://www.gutenberg.org/ebooks/132'), T(5, 2), E(), SEAL(1, 'Las notas de voz'), T(6, 2),
  { type: 'libro', title: 'Sala de lectura de la CIA', by: 'Documentos desclasificados. Son públicos.', url: 'https://www.cia.gov/readingroom/', price: 2 }, T(7, 2),
  B('El príncipe', 'Nicolás Maquiavelo, 1532', 'https://www.gutenberg.org/ebooks/1232'), SEAL(1, 'Las fotos del portal'), T(8, 3),
  E(), T(9, 3), { type: 'libro', title: '1 Corintios 3:2', by: 'Leche a los niños y carne a los hombres. Búscalo tú.', price: 2 }, SEAL(1, 'Las letras'), T(10, 3),
  E(), SEAL(2, 'La carne'), SEAL(2, 'Los cargos'), SEAL(2, 'El pacto'), SEAL(2, 'El nombre')
];
const C = R.rooms.cripta = {
  title: 'La cripta', sub: 'Treinta nichos. La plata abre casi todos.', cam: [[0, 1.65, 1.6], [0, 1.5, 8]], exposure: 0.88, bloom: 0.9, par: 6, fov: 58,
  fog: new THREE.FogExp2(0x050302, 0.06), amb: { drone: 0.2, fire: 0.3 }, z: 1.6, dir: 0, focus: -1, slabs: [], torches: []
};
let lights = [], g;

C.build = async function () {
  if (C.group) return;
  g = C.group = new THREE.Group(); g.position.set(0, 0, 1.3); g.visible = false; R.lift.group.add(g);
  const wall = R.pbr('castle_wall_slates', { color: 0x5c544c }), floor = R.pbr('slate_floor_02', { color: 0x55504a, roughness: 0.75, envMapIntensity: 0.5 });
  const inner = R.pbr('castle_wall_slates', { color: 0x3a342e }), slabM = R.pbr('medieval_blocks_05', { color: 0x6a645c, roughness: 0.9 });
  R.add(g, R.plane(HW * 2, LEN, floor, 2.2), 0, 0, LEN / 2, -HALF);
  R.add(g, R.plane(HW * 2, LEN, inner, 3), 0, HT, LEN / 2, HALF);
  R.add(g, R.plane(HW * 2, HT, wall, 3), 0, HT / 2, LEN, 0, Math.PI);
  for (const sd of [-1, 1]) { const sw = HW - 0.6; R.add(g, R.plane(sw, HT, wall, 3), sd * (0.6 + sw / 2), HT / 2, 0.02); }
  R.add(g, R.plane(1.2, HT - 2.2, wall, 3), 0, 2.2 + (HT - 2.2) / 2, 0.02);
  const ry = sd => sd < 0 ? HALF : -HALF;
  for (const sd of [-1, 1]) {
    const x = sd * HW; let prev = 0;
    for (let k = 0; k <= 15; k++) {
      const zc = Z0 + k * PITCH, a = prev, b = k < 15 ? zc - 0.75 : LEN;
      R.add(g, R.plane(b - a, HT, wall, 3), x, HT / 2, (a + b) / 2, 0, ry(sd)); prev = zc + 0.75;
      if (k === 15) break;
      R.add(g, R.plane(1.5, HT - 2.6, wall, 3), x, 2.6 + (HT - 2.6) / 2, zc, 0, ry(sd));
      R.add(g, R.plane(1.5, 0.5, wall, 3), x, 0.25, zc, 0, ry(sd));
      // recess
      R.add(g, R.plane(1.5, 2.1, inner, 2), x + sd * 0.85, 1.55, zc, 0, ry(sd));
      R.add(g, R.plane(0.85, 2.1, inner, 2), x + sd * 0.425, 1.55, zc - 0.75, 0, 0);
      R.add(g, R.plane(0.85, 2.1, inner, 2), x + sd * 0.425, 1.55, zc + 0.75, 0, Math.PI);
      R.add(g, R.plane(0.85, 1.5, inner, 2), x + sd * 0.425, 0.5, zc, -HALF);
      R.add(g, R.plane(0.85, 1.5, inner, 2), x + sd * 0.425, 2.6, zc, HALF);
      // slab with its numeral
      const i = k * 2 + (sd > 0 ? 1 : 0), slab = new THREE.Group(); slab.position.set(x + sd * 0.07, 1.55, zc); g.add(slab);
      R.add(slab, R.box(0.14, 2.1, 1.5, slabM, 1.6), 0, 0, 0);
      R.add(slab, R.plane(0.9, 0.5, new THREE.MeshBasicMaterial({ map: R.textTex(ROMAN(i + 1), { w: 256, h: 128, size: 78 }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.5, 0.95, 0.35), opacity: 0.8 })), -sd * 0.075, 0.55, 0, 0, ry(sd));
      C.slabs[i] = { slab, sd, zc, x };
      if (R.save.opened.includes(i)) { slab.position.y = -0.62; fill(i); }
      // torch between niches
      if (k < 15) { const tz = zc + PITCH / 2, f = R.fire(0.36); f.position.set(sd * (HW - 0.22), 2.55, tz); f.userData.lit = 0; g.add(f);
        R.add(g, R.box(0.08, 0.5, 0.08, slabM, 1), sd * (HW - 0.18), 2.25, tz);
        const halo = R.add(g, R.plane(3.6, 3.6, R.glowMat(new THREE.Color(1.0, 0.4, 0.1), 0)), sd * (HW - 0.02), 2.6, tz, 0, ry(sd));
        C.torches.push({ f, halo, z: tz, sd, on: false }); }
    }
  }
  for (let i = 0; i < 4; i++) { const L = new THREE.PointLight(0xff7a2a, 0, 12, 2); g.add(L); lights.push(L); }
  g.add(new THREE.AmbientLight(0x1c140e, 0.3));
  // the far end
  R.put(g, 'large_castle_door', 0.05, 1.3, LEN - 0.15, 1.15, Math.PI);
  for (const sd of [-1, 1]) R.put(g, 'gothic_statue', sd * 1.75, 1.75, LEN - 2.0, 1.1, Math.PI + sd * 0.5);
  // the pendulum by the entrance
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8903c, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
  const pend = new THREE.Group(); pend.position.set(1.5, 3.3, 3.6); g.add(pend);
  R.add(pend, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.7, 6), brass), 0, -0.85, 0);
  R.add(pend, new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), brass), 0, -1.75, 0);
  R.add(g, R.box(0.7, 1.0, 0.7, slabM, 1), 1.5, 0.5, 3.6);
  const pl = new THREE.PointLight(0xffc070, 1.2, 6, 2); pl.position.set(1.0, 2.2, 3.0); g.add(pl);

  R.upd.push((dt, t) => {
    if (!g.visible) return;
    pend.rotation.z = Math.sin(t * 1.7) * 0.5;
    if (R.mode === 'crypt' && !R.busy && !R.panelOpen && C.focus < 0 && C.dir) { C.z = Math.max(1.6, Math.min(LEN - 4.5, C.z + C.dir * 4.2 * dt)); R.rig.pos.z = 1.3 + C.z; R.rig.look.z = 1.3 + C.z + 6; }
    const near = [];
    for (const o of C.torches) {
      if (!o.on && R.mode === 'crypt' && o.z < C.z + 13) { o.on = true; R.num(o.f.userData, 'lit', 1, 0.7, 'out'); if (o.sd > 0) R.sfx.whoosh(); }
      const L = o.f.userData.lit; o.halo.material.opacity = L * (0.16 + 0.04 * Math.sin(t * 13 + o.z));
      if (o.on) near.push(o);
    }
    near.sort((a, b) => Math.abs(a.z - C.z - 2) - Math.abs(b.z - C.z - 2));
    lights.forEach((L, i) => { const o = near[i]; if (!o) { L.intensity = 0; return; } L.position.set(o.sd * (HW - 0.7), 2.6, o.z); L.intensity = o.f.userData.lit * (1.0 + 0.25 * Math.sin(t * 13 + i * 2) + 0.12 * Math.sin(t * 29 + i)); });
  });

  NICHES.forEach((n, i) => { const s = C.slabs[i]; R.addHot({ pos: W(s.x - s.sd * 0.25, 1.75, s.zc), label: ROMAN(i + 1), aria: 'Nicho ' + ROMAN(i + 1), when: () => R.mode === 'crypt' && C.focus < 0 && s.zc > C.z - 0.5 && s.zc < C.z + 9, on: () => look(i) }); });
  R.addHot({ pos: W(1.5, 1.6, 3.6), label: 'El péndulo', when: () => R.mode === 'crypt' && C.focus < 0 && C.z < 6, on: () => R.games.play('tres') });

  const hold = (el, d) => { const on = e => { e.preventDefault(); C.dir = d; }, off = () => { if (C.dir === d) C.dir = 0; }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') C.dir = d; }); el.addEventListener('keyup', off); };
  hold(R.$('#fwd'), 1); hold(R.$('#rev'), -1);
  window.addEventListener('keydown', e => { if (R.mode !== 'crypt' || (e.target && e.target.tagName === 'INPUT')) return; if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') C.dir = 1; if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') C.dir = -1; });
  window.addEventListener('keyup', e => { if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) C.dir = 0; });
  window.addEventListener('wheel', e => { if (R.mode !== 'crypt' || R.busy || R.panelOpen || C.focus >= 0) return; C.z = Math.max(1.6, Math.min(LEN - 4.5, C.z - e.deltaY * 0.006)); R.rig.pos.z = 1.3 + C.z; R.rig.look.z = 1.3 + C.z + 6; }, { passive: true });
};
C.enter = () => { C.z = 1.6; C.focus = -1; C.dir = 0; R.$('#move').hidden = false; };
C.leave = () => { R.$('#move').hidden = true; C.dir = 0; C.focus = -1; for (const o of C.torches) { o.on = false; o.f.userData.lit = 0; } };

function fill(i) {   // what sits inside an opened niche
  const n = NICHES[i], s = C.slabs[i]; if (s.filled) return; s.filled = true;
  const x = s.x + s.sd * 0.6, ry = s.sd < 0 ? HALF : -HALF;
  if (n.type === 'vacio' || n.type === 'ladron') return;
  const col = n.type === 'tema' ? new THREE.Color(2.0, 1.25, 0.4) : n.type === 'libro' ? new THREE.Color(1.6, 0.5, 0.2) : new THREE.Color(0.5, 0.9, 1.3);
  const gl = R.sprite(R.glowTex, col, 1.7, 1.7, 0.5); gl.position.set(x, 1.5, s.zc); g.add(gl);
  if (n.type === 'libro') { const m = new THREE.MeshStandardMaterial({ color: 0x4a1a10, roughness: 0.7 }); R.add(g, R.box(0.3, 0.42, 0.09, m), x, 0.95, s.zc, 0, ry, 0.12); R.add(g, R.box(0.3, 0.07, 0.4, m), x, 0.54, s.zc + 0.3, 0, 0.3); }
  else { const words = (n.title || '').toUpperCase().split(' '), lines = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > 11 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } lines.push(cur);
    R.add(g, R.plane(1.2, 1.5, new THREE.MeshBasicMaterial({ map: R.textTex(lines, { w: 512, h: 640, size: 66, bg: '#0a0705', color: n.type === 'tema' ? '#f2cf7a' : '#9ad8ff' }), color: new THREE.Color(1.5, 1.5, 1.5) })), s.x + s.sd * 0.8, 1.55, s.zc, 0, ry); }
}

async function look(i) {
  const s = C.slabs[i]; R.busy = true; C.focus = i; C.dir = 0; R.rig.par = 0.25;
  await R.cam(W(-s.sd * 0.95, 1.6, s.zc), W(s.x, 1.55, s.zc), 0.9); R.busy = false; show(i);
}
async function unlook() {
  if (C.focus < 0) return; const s = C.slabs[C.focus]; R.busy = true; C.z = Math.max(1.6, s.zc - 2.5);
  await R.cam(W(0, 1.65, C.z), W(0, 1.5, C.z + 6), 0.8); R.rig.par = 6; C.focus = -1; R.busy = false; R.onEsc = null;
}
function show(i) {
  const n = NICHES[i], num = 'Nicho ' + ROMAN(i + 1), opened = R.save.opened.includes(i); R.onEsc = unlook;
  if (opened) return content(i);
  if (n.type === 'sello') {
    if (R.grade() < n.grade) return R.panel({ kick: num, title: 'Sellado', body: '<p>Este no se compra.</p><p>Se abre con el grado de ' + R.gradeName[n.grade] + '.</p>', onClose: unlook });
    return R.panel({ kick: num, title: 'Sellado', body: '<p>Tu grado lo abre. No cuesta nada.</p>', acts: [{ label: 'Abrir', main: true, on: () => open(i) }], onClose: unlook });
  }
  const can = R.save.coins >= n.price;
  R.panel({ kick: num, title: n.price + (n.price === 1 ? ' moneda' : ' monedas'), body: '<p>Tienes ' + R.save.coins + '.</p>' + (can ? '' : '<p>No te llega. La plata se gana jugando: la barra de La Nuit, el péndulo de la entrada, el ojo de la cima.</p>'), acts: can ? [{ label: 'Abrir', main: true, on: () => open(i) }] : [], onClose: unlook });
}
async function open(i) {
  const n = NICHES[i], s = C.slabs[i], g0 = R.grade(); R.busy = true; R.onEsc = null;
  if (n.price) R.coins(-n.price); R.save.opened.push(i); R.persist();
  R.sfx.stone(1.3); R.rig.shake = 0.012; fill(i);
  await R.num(s.slab.position, 'y', -0.62, 1.7, 'io'); R.rig.shake = 0; R.busy = false;
  if (n.type === 'ladron') R.coins(-2);
  if (n.type === 'vacio' || n.type === 'ladron') R.sfx.fail();
  content(i); R.checkGrade(g0);
}
function content(i) {
  const n = NICHES[i], num = 'Nicho ' + ROMAN(i + 1); let o;
  if (n.type === 'tema') o = { kick: num + ' · Tema', title: n.title, body: '<p>' + n.state + '.</p><p>El audio todavía no está subido aquí.</p>' };
  else if (n.type === 'libro') o = { kick: num + ' · Biblioteca', title: n.title, body: '<p>' + n.by + '</p>' + (n.url ? '<p><a href="' + n.url + '" target="_blank" rel="noopener">Abrir la fuente</a></p>' : '') };
  else if (n.type === 'vacio') o = { kick: num, title: 'Vacío', body: '<p>Polvo. Y una risa al fondo del pasillo.</p>' };
  else if (n.type === 'ladron') o = { kick: num, title: 'Te ha cobrado', body: '<p>Este nicho no guarda nada. Se queda con dos monedas más.</p>' };
  else o = { kick: num + ' · ' + R.gradeName[n.grade], title: n.title, body: '<p>Abierto. Rumi Caín todavía no ha dejado nada dentro.</p>' };
  o.onClose = unlook; R.onEsc = unlook; R.panel(o);
}
})();
