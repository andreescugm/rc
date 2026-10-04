// The crypt: one wall of twenty-four sealed niches. Silver opens them and you take out what is inside.
(() => {
const R = window.RC, V = R.V, HALF = Math.PI / 2;
const NW = 1.9, NH = 2.3, PX = 2.75, PY = 3.05, DEPTH = 1.25, N = 24;
const rr = (a, b) => a + Math.random() * (b - a);
const ROMAN = n => { const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; };
const TRACKS = [['giannis antetokounmpo', 'Catálogo'], ['super high', 'Catálogo'], ['racks from scu', 'Catálogo'], ['5cents 4free', 'Catálogo'], ['get my shit done', 'Catálogo'], ['futuro', 'Catálogo'], ['draco', 'Catálogo'], ['dinero feo', 'Catálogo'], ['Designer Fraud', 'En obra'], ['2x', 'En obra'], ['A la de tres', 'En obra']];
const T = (i, price) => ({ type: 'tema', title: TRACKS[i][0], state: TRACKS[i][1], price });
const B = (title, by, url) => ({ type: 'libro', title, by, url, price: 2 });
const E = () => ({ type: 'vacio', price: 1 }), SEAL = (need, title) => ({ type: 'sello', need, title, price: 0 });
const NICHES = [
  T(0, 2), B('El Kybalion', 'Tres Iniciados, 1908', 'https://www.gutenberg.org/ebooks/14209'), T(1, 2), E(), T(2, 2), B('Morals and Dogma', 'Albert Pike, 1871', 'https://www.gutenberg.org/ebooks/19447'),
  T(3, 2), { type: 'ladron', price: 1 }, T(4, 2), B('El arte de la guerra', 'Sun Tzu, traducción de Lionel Giles', 'https://www.gutenberg.org/ebooks/132'), SEAL(6, 'Las maquetas'), T(5, 2),
  B('Sala de lectura de la CIA', 'Documentos desclasificados. Son públicos.', 'https://www.cia.gov/readingroom/'), T(6, 2), E(), T(7, 2), B('El príncipe', 'Nicolás Maquiavelo, 1532', 'https://www.gutenberg.org/ebooks/1232'), SEAL(12, 'Las letras'),
  T(8, 3), E(), T(9, 3), B('1 Corintios 3:2', 'Leche a los niños y carne a los hombres. Búscalo tú.'), T(10, 3), SEAL(18, 'La carne')
];
const TINT = { tema: [2.2, 1.25, 0.35], libro: [2.2, 0.5, 0.15], sello: [0.5, 2.0, 0.7], vacio: [0.5, 0.4, 0.3], ladron: [2.4, 0.2, 0.1] };
const C = R.crypt = { group: null, focus: -1, cells: [] };
let g, cols, rows, Wd, HT, falling, puff, inner, home = [V(0, 0, 0), V(0, 0, 0)], out = null;

C.build = async () => {
  if (C.group) return;
  g = C.group = new THREE.Group(); g.position.set(6000, 0, 0); g.visible = false; R.scene.add(g);
  cols = R.aspect < 1 ? 4 : 6; rows = N / cols; Wd = cols * PX + 5; HT = rows * PY + 2.7;
  const wall = R.pbr('stone_block_wall', { envMapIntensity: 0.12, aoMapIntensity: 1.3 }); wall.color.setRGB(1.9, 1.7, 1.5);
  const deep = R.pbr('stone_block_wall', { envMapIntensity: 0.05 }); deep.color.setRGB(0.7, 0.62, 0.55);
  const rock = R.pbr('Rock058', { envMapIntensity: 0.3, aoMapIntensity: 1.3 }); rock.color.setRGB(1.1, 1.0, 0.92);
  const floor = R.pbr('slate_floor_02', { color: 0x8a8278, roughness: 0.8, envMapIntensity: 0.4 });
  const cx = c => (c - (cols - 1) / 2) * PX, cy = r => 2.15 + (rows - 1 - r) * PY;

  // the wall, built around its openings
  const band = (y0, y1) => R.add(g, R.plane(Wd, y1 - y0, wall, 3), 0, (y0 + y1) / 2, 0);
  band(0, cy(rows - 1) - NH / 2); band(cy(0) + NH / 2, HT);
  for (let r = 0; r < rows - 1; r++) band(cy(r + 1) + NH / 2, cy(r) - NH / 2);
  for (let r = 0; r < rows; r++) {
    const endW = (Wd - (cols * PX - (PX - NW))) / 2;
    for (const sd of [-1, 1]) R.add(g, R.plane(endW, NH, wall, 3), sd * (Wd / 2 - endW / 2), cy(r), 0);
    for (let c = 0; c < cols - 1; c++) R.add(g, R.plane(PX - NW, NH, wall, 3), cx(c) + PX / 2, cy(r), 0);
  }
  const slabGeo = [11, 12, 13, 14].map(s => R.stone(s, 0.5)), sand = R.pbr('old_sandstone_02', { envMapIntensity: 0.2 });
  for (let i = 0; i < N; i++) {
    const c = i % cols, r = (i / cols) | 0, x = cx(c), y = cy(r);
    R.add(g, R.plane(NW, NH, deep, 3), x, y, -DEPTH);
    R.add(g, R.plane(DEPTH, NH, deep, 3), x - NW / 2, y, -DEPTH / 2, 0, HALF); R.add(g, R.plane(DEPTH, NH, deep, 3), x + NW / 2, y, -DEPTH / 2, 0, -HALF);
    R.add(g, R.plane(NW, DEPTH, deep, 3), x, y - NH / 2, -DEPTH / 2, -HALF); R.add(g, R.plane(NW, DEPTH, deep, 3), x, y + NH / 2, -DEPTH / 2, HALF);
    // slab: each one its own stone, a little crooked, a little differently worn
    const m = sand.clone(), t = rr(0.5, 0.78), w = rr(-0.03, 0.04); m.color.setRGB(t + w, t, t - w);
    const slab = new THREE.Group(); slab.position.set(x + rr(-0.012, 0.012), y, 0.02); slab.rotation.z = rr(-0.008, 0.008); g.add(slab);
    const st = new THREE.Mesh(slabGeo[i % 4], m); st.scale.set(NW + 0.05, NH + 0.05, 0.3); slab.add(st);
    const num = R.add(slab, R.plane(1.1, 0.6, new THREE.MeshBasicMaterial({ map: R.textTex(ROMAN(i + 1), { w: 256, h: 128, size: 74 }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.3, 0.7, 0.2), opacity: 0.5 })), 0, 0.2, 0.17);
    const glow = R.sprite('glow_soft', new THREE.Color().setRGB(...TINT[NICHES[i].type]), 2.0, 2.0, 0); glow.position.set(x, y, -1.1); g.add(glow);
    const cell = C.cells[i] = { i, x, y, slab, num, glow, item: null, open: false };
    if (R.save.opened.includes(i)) { cell.open = true; slab.position.set(x, y - NH - 0.6, -0.5); slab.visible = false; glow.material.opacity = 0.1; cell.item = makeItem(i); }
    R.addHot({ pos: V(6000 + x, y, 0.2), area: [NW, NH], label: ROMAN(i + 1), aria: 'Nicho ' + ROMAN(i + 1), when: () => R.mode === 'crypt' && C.focus < 0, on: () => look(i), hover: on => { num.material.opacity = on ? 1 : 0.5; } });
  }
  // monumental frame: pilasters, cornice, plinth
  for (const sd of [-1, 1]) R.add(g, R.box(2, HT, 1.5, rock, 4), sd * (Wd / 2 - 0.6), HT / 2, 0.75);
  R.add(g, R.box(Wd + 1.2, 1.3, 2, rock, 4), 0, HT - 0.65, 1); R.add(g, R.box(Wd + 1.2, 0.5, 2.4, rock, 4), 0, 0.25, 1.2);
  R.add(g, R.plane(Wd + 30, 44, floor, 2.6), 0, 0, 20, -HALF);
  for (const sd of [-1, 1]) R.add(g, R.plane(46, HT + 6, wall, 3), sd * (Wd / 2 + 7), (HT + 6) / 2, 21, 0, -sd * HALF);
  R.add(g, R.plane(Wd + 30, 46, deep, 3), 0, HT + 3, 21, HALF);
  // statues on plinths, braziers that light the wall from below and the side
  const fl = [];
  for (const sd of [-1, 1]) {
    R.add(g, R.box(2.2, 1.7, 2.2, rock, 3), sd * (Wd / 2 + 3.2), 0.85, 3);
    R.put(g, 'gothic_statue', sd * (Wd / 2 + 3.2), 1.7 + 1.21 * 1.7, 3.6, 1.7, sd > 0 ? -0.9 : 0.9);
    const bx = sd * (Wd / 2 + 0.2); R.put(g, 'stone_fire_pit', bx, 0.72, 4.2, 1.5); fl.push({ p: [bx, 1.2, 4.2], s: 1.9 });
    const L = R.flicker(new THREE.PointLight(0xff6418, 1, 34, 2), 2.6); L.position.set(sd * Wd * 0.3, 1.6, 4.6); g.add(L);
    const s = R.sprite('glow_soft', new THREE.Color(1.6, 0.55, 0.12), 6, 6, 0.1); s.position.set(bx, 2.2, 4.2); g.add(s);
    R.add(g, R.plane(16, 16, R.glowMat(new THREE.Color(1.0, 0.34, 0.07), 0.22)), bx, 0.03, 4.4, -HALF);
  }
  R.fires(g, fl);
  const rim = new THREE.DirectionalLight(0x7088c0, 0.22); rim.position.set(0, HT * 2, 8); rim.target.position.set(0, HT / 2, 0); g.add(rim, rim.target);
  g.add(new THREE.AmbientLight(0x140e0a, 0.5));
  inner = new THREE.PointLight(0xffa040, 0, 9, 2); g.add(inner);
  // rock on the floor: one big, many small
  R.put(g, 'boulder_01', -Wd / 2 - 1.5, -0.2, 7.5, 1.6, 0.6); R.put(g, 'boulder_01', Wd / 2 + 2.2, -0.15, 9, 1.1, 2.4);
  for (let i = 0; i < 12; i++) R.put(g, 'rock_07', rr(-Wd / 2, Wd / 2), -0.02, rr(2.5, 4.2), [rr(1.5, 4), rr(1.2, 3), rr(1.5, 4)], rr(0, 6.28));
  // dust: what falls from a moving slab, what jumps when it stops, and what always hangs in the firelight
  falling = R.particles(g, { sprite: 'smoke_04', count: 70, gravity: 1.7, drag: 1.5, grow: 2.2, spin: 0.6, a: [0.3, 0.25, 0.2], b: [0.36, 0.31, 0.26], opacity: 0.15 });
  puff = R.debris(g, 26, -100); puff.u.uGravity.value = 9;
  falling.t0 = puff.t0 = 1e9;
  const motes = R.particles(g, { sprite: 'glow_soft', count: R.phone ? 60 : 130, add: true, loop: true, drag: 0.05, a: [1.4, 0.7, 0.25], b: [1.0, 0.4, 0.12], opacity: 0.5, fadeIn: 0.3 });
  for (let i = 0; i < motes.n; i++) motes.set(i, [rr(-Wd / 2, Wd / 2), rr(0.3, HT), rr(1, 12)], [rr(-0.15, 0.15), rr(-0.05, 0.12), rr(-0.1, 0.1)], rr(0, 14), rr(9, 14), rr(0.03, 0.08));
  motes.commit();
  C.fog = new THREE.FogExp2(0x050302, 0.024);

  // the thing you took out floats in front of its niche on a spring
  R.upd.push((dt, t) => {
    if (!g.visible) return;
    for (const c of C.cells) if (c.item) { const it = c.item, target = out === c ? 1.7 : -0.72; for (let s = Math.ceil(dt / 0.016), h = dt / s, q = 0; q < s; q++) { it.v += ((target - it.z) * 30 - it.v * 6.5) * h; it.z += it.v * h; }
      it.g.position.z = it.z; const k = Math.max(0, Math.min(1, (it.z + 0.72) / 2.4)); it.g.position.y = c.y + k * (0.06 * Math.sin(t * 1.3 + c.i) - 0.05); it.g.rotation.y = k * 0.22 * Math.sin(t * 0.7 + c.i); it.ring.material.opacity = 0.16 * k; it.ring.material.rotation = t * 0.3; }
  });
  R.onResize = () => { if (R.mode === 'crypt' && C.focus < 0) frame(true); };
  await R.loaded(30);
};

function makeItem(i) {
  const n = NICHES[i], c = C.cells[i]; if (n.type === 'vacio' || n.type === 'ladron') return null;
  const grp = new THREE.Group(); grp.position.set(c.x, c.y, -0.72); g.add(grp);
  const m = R.pbr('Rock058', { envMapIntensity: 0.4 }); m.color.setRGB(0.55, 0.5, 0.46);
  const tab = new THREE.Mesh(R.stone(40 + i, 0.4), m); tab.scale.set(1.2, 1.55, 0.14); grp.add(tab);
  const words = (n.title || '').toUpperCase().split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 10 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } lines.push(cur);
  const col = TINT[n.type];
  R.add(grp, R.plane(1.08, 1.4, new THREE.MeshBasicMaterial({ map: R.textTex(lines, { w: 512, h: 660, size: lines.some(l => l.length > 9) ? 54 : 66 }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color().setRGB(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55) })), 0, 0, 0.085);
  const ring = R.sprite('magic_03', new THREE.Color().setRGB(col[0] * 0.5, col[1] * 0.5, col[2] * 0.5), 3.0, 3.0, 0); ring.position.z = -0.25; grp.add(ring);
  return { g: grp, ring, z: -0.72, v: 0 };
}

// camera: fit the whole wall, whatever the screen
function frame(snap) {
  const rig = R.rig, vf = THREE.MathUtils.degToRad(40 * (R.aspect < 1 ? 1.5 : 1)) / 2, bars = R.film.uniforms.bars.value;
  const d = Math.max((HT / 2 + 0.3) / (Math.tan(vf) * (1 - 2 * bars)), (Wd / 2 + 1.4) / (Math.tan(vf) * R.aspect));
  home = [V(6000, HT * 0.4, d), V(6000, HT * 0.5, 0)];
  if (snap) { rig.pos.copy(home[0]); rig.look.copy(home[1]); R.snap(); }
}
C.enter = async () => {
  await C.build(); R.outside.group.visible = false; g.visible = true; R.grade({ fog: C.fog, exposure: 1.1, bloom: 0.4 });
  const rig = R.rig; rig.fov = 40; rig.par = 0.25; rig.hand = 0.6; rig.rumble = 0; rig.stiff = 30; rig.damp = 8; C.focus = -1; out = null; frame(true);
  rig.pos.z += 5; R.to(rig.pos, home[0], 3.5, 'out');
  R.mode = 'crypt'; R.cap('La cripta', 'Veinticuatro nichos. La plata abre casi todos.'); R.amb({ drone: 0.2, fire: 0.3 });
  R.$('#exit').hidden = false; R.$('#earn').hidden = false; R.hud();
  await R.fade(1, 1.1);
  if (!R.save.visited) { R.save.visited = true; R.persist(); R.coins(6); R.toast('Seis monedas de plata por entrar.'); }
  seals();
};
R.$('#exit').addEventListener('click', async () => { if (R.busy || R.mode !== 'crypt') return; R.busy = true; R.closePanel(); await R.fade(0, 0.6); R.busy = false; R.outside.show(); });
R.$('#earn').addEventListener('click', () => { if (R.busy || R.panelOpen) return; R.panel({ kick: 'La plata se gana', title: 'Tres juegos', body: '<p>Los tres se ganan sin hacer: aguantando, escondiéndose, esperando.</p>', acts: [{ label: 'Juega', main: true, on: () => R.games.play('juega') }, { label: 'El ojo', main: true, on: () => R.games.play('ojo') }, { label: 'A la de tres', main: true, on: () => R.games.play('tres') }] }); });

function seals() { NICHES.forEach((n, i) => { if (n.type === 'sello') C.cells[i].num.material.color.setRGB(0.4, 1.3, 0.5); }); }

async function look(i) {
  const c = C.cells[i], rig = R.rig, side = R.aspect < 1 ? 0 : 1.8; R.busy = true; C.focus = i;
  rig.par = 0.12; await R.cam(V(6000 + c.x * 0.86 + side * 0.4, c.y - 0.25, 6.4), V(6000 + c.x + side, c.y - (R.aspect < 1 ? 0.7 : 0), 0), 1.1, 'io'); R.busy = false;
  if (c.open) return take(i);
  const n = NICHES[i], num = 'Nicho ' + ROMAN(i + 1);
  if (n.type === 'sello') {
    const left = n.need - R.save.opened.length;
    if (left > 0) return R.panel({ side: true, kick: num, title: 'Sellado', body: '<p>Este no se compra.</p><p>Se abre cuando hayas abierto ' + n.need + ' nichos. Te faltan ' + left + '.</p>', onClose: back });
    return R.panel({ side: true, kick: num, title: 'Sellado', body: '<p>Ya has abierto bastantes. No cuesta nada.</p>', acts: [{ label: 'Abrir', main: true, on: () => open(i) }], onClose: back });
  }
  const can = R.save.coins >= n.price;
  R.panel({ side: true, kick: num, title: n.price + (n.price === 1 ? ' moneda' : ' monedas'), body: '<p>Tienes ' + R.save.coins + '.</p>' + (can ? '' : '<p>No te llega. Gana plata jugando.</p>'), acts: can ? [{ label: 'Abrir', main: true, on: () => open(i) }] : [], onClose: back });
}
async function back() {
  if (C.focus < 0) return; R.busy = true; out = null; R.num(inner, 'intensity', 0, 0.5);
  await R.cam(home[0], home[1], 1.2, 'io'); R.rig.par = 0.25; C.focus = -1; R.busy = false;
}

// SLAB. Cause: the seal gives. It is heavy stone on stone: it pulls back into the wall, then drops
// into its slot - slow start, steady, dead stop. Dust falls from the lintel while it moves and jumps at the stop.
async function open(i) {
  const n = NICHES[i], c = C.cells[i], s = c.slab; R.busy = true;
  if (n.price) R.coins(-n.price); R.save.opened.push(i); R.persist();
  const col = TINT[n.type]; inner.color.setRGB(col[0], col[1], col[2]); inner.position.set(c.x, c.y, -0.3);
  const snd = R.sfx.play('stone_drag_1', 0.9, 0.7, true); R.rig.rumble = 0.01;
  await R.tw(0.7, k => { s.position.z = 0.02 - 0.52 * k; }, 'io');
  for (let k = 0; k < 44; k++) falling.set(k, [c.x + rr(-NW / 2, NW / 2), c.y + NH / 2 - rr(0, 0.15), rr(-0.1, 0.2)], [rr(-0.2, 0.2), rr(-0.6, 0), rr(0.2, 0.9)], rr(0, 1.5), rr(1.3, 2.4), rr(0.3, 0.6));
  for (let k = 44; k < 70; k++) falling.set(k, [c.x + rr(-NW / 2, NW / 2), c.y - NH / 2 + rr(0, 0.2), rr(-0.1, 0.1)], [rr(-0.5, 0.5), rr(0.3, 1.2), rr(1.2, 2.8)], 1.6 + rr(0, 0.08), rr(1.6, 2.6), rr(0.45, 0.9));
  for (let k = 0; k < 26; k++) puff.set(k, [c.x + rr(-NW / 2, NW / 2), c.y - NH / 2 + 0.05, 0.05], [rr(-1, 1), rr(1, 3), rr(1, 3.2)], 1.6 + rr(0, 0.05), rr(0.9, 1.5), rr(0.04, 0.1));
  falling.commit(); puff.commit(); falling.restart(); puff.restart();
  R.num(c.glow.material, 'opacity', 0.1, 1.6); R.num(inner, 'intensity', 0.9, 1.6);
  const y0 = s.position.y, drop = NH + 0.6;
  await R.tw(1.6, k => { const a = 0.3, d = k < a ? (k * k) / (2 * a) : k - a / 2; s.position.y = y0 - drop * d / (1 - a / 2); }, 'lin');
  if (snd) snd.stop(0.1); R.rig.rumble = 0; R.rig.kick = 0.07; R.sfx.impact(0.6); s.visible = false; c.open = true;
  if (n.type === 'ladron') { R.coins(-2); R.sfx.fail(); }
  if (n.type === 'vacio') R.sfx.fail();
  c.item = makeItem(i); await R.wait(0.5); R.busy = false; take(i);
}
// take it out: it comes forward, the panel says what it is, closing puts it back
function take(i) {
  const n = NICHES[i], c = C.cells[i], num = 'Nicho ' + ROMAN(i + 1); let o;
  if (c.item) { out = c; R.sfx.play('book_open', 0.8, 0.7); const col = TINT[n.type]; inner.color.setRGB(col[0], col[1], col[2]); inner.position.set(c.x - 0.6, c.y + 0.4, 2.6); R.num(inner, 'intensity', 0.9, 0.6); }
  if (n.type === 'tema') o = { kick: num + ' · Tema', title: n.title, body: '<p>' + n.state + '.</p><p>El audio todavía no está subido aquí.</p>' };
  else if (n.type === 'libro') o = { kick: num + ' · Biblioteca', title: n.title, body: '<p>' + n.by + '</p>' + (n.url ? '<p><a href="' + n.url + '" target="_blank" rel="noopener">Abrir la fuente</a></p>' : '') };
  else if (n.type === 'vacio') o = { kick: num, title: 'Vacío', body: '<p>Polvo. Y una risa al fondo.</p>' };
  else if (n.type === 'ladron') o = { kick: num, title: 'Te ha cobrado', body: '<p>Este nicho no guarda nada. Se ha quedado con dos monedas más.</p>' };
  else o = { kick: num + ' · Sellado', title: n.title, body: '<p>Abierto. Rumi Caín todavía no ha dejado nada dentro.</p>' };
  o.side = true; o.onClose = back; o.closeLabel = c.item ? 'Guardar' : 'Cerrar'; R.panel(o);
}
})();
