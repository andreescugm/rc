// The lift: a mirrored cabin with a panel of symbols. It is the only menu.
(() => {
const R = window.RC, V = R.V, LX = 3000, L = new THREE.Group();
const S = R.lift = { group: L, x: LX, built: false, wall: 0 };
R.W = (x, y, z) => V(LX + x, y, 1.3 + z);          // room-local to world
let doors = [], lamp, figure, travelling = false, current = null;
const FLOORS = [
  ['cima', 'La cima', '<path d="M12 3 21 20H3Z"/><path d="M8 14.5q4-4 8 0q-4 4-8 0Z"/><circle cx="12" cy="14.5" r=".9"/>'],
  ['juntas', 'Sala de juntas', '<path d="M3 10h18M5 10v9M19 10v9"/><path d="M8 5v3M12 5v3M16 5v3"/>'],
  ['piso', 'El piso', '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M21 12v3"/>'],
  ['nuit', 'La Nuit', '<path d="M16 3a9 9 0 1 0 5 13A7.5 7.5 0 0 1 16 3Z"/>'],
  ['calle', 'La calle', '<path d="M3 21 6 5l5 2-3 14ZM21 21 18 5l-5 2 3 14Z"/>'],
  ['cripta', 'La cripta', '<path d="M12 21 3 5h18Z"/><path d="M8 10h8"/>']
];

S.build = async () => {
  if (S.built) return; S.built = true;
  R.scene.add(L); L.position.set(LX, 0, 0); L.visible = false;
  const metal = R.pbr('dark_wood', { color: 0x7a5a40, roughness: 0.5, envMapIntensity: 0.6 });
  const dmetal = R.pbr('metal_plate', { color: 0x4a3a28, envMapIntensity: 0.9 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8903c, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
  const floor = R.pbr('granite_tile', { color: 0x777777, roughness: 0.4 });
  R.add(L, R.plane(2.4, 2.6, floor, 1.2), 0, 0, 0, -Math.PI / 2);
  R.add(L, R.plane(2.4, 2.6, dmetal, 1.2), 0, 2.7, 0, Math.PI / 2);
  R.add(L, R.plane(2.6, 2.7, metal, 1.3), -1.2, 1.35, 0, 0, Math.PI / 2);
  R.add(L, R.plane(2.6, 2.7, metal, 1.3), 1.2, 1.35, 0, 0, -Math.PI / 2);
  R.add(L, R.plane(2.4, 2.7, metal, 1.3), 0, 1.35, -1.3);
  R.add(L, R.plane(0.6, 2.7, metal, 1.3), -0.9, 1.35, 1.3, 0, Math.PI);
  R.add(L, R.plane(0.6, 2.7, metal, 1.3), 0.9, 1.35, 1.3, 0, Math.PI);
  R.add(L, R.plane(1.2, 0.5, metal, 1.3), 0, 2.45, 1.3, 0, Math.PI);
  for (const sd of [-1, 1]) { doors.push(R.add(L, R.box(0.6, 2.2, 0.04, dmetal, 1.1), sd * 0.3, 1.1, 1.325)); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.2, 10), brass); R.add(L, r, sd * 1.13, 0.95, 0, Math.PI / 2); }
  R.add(L, R.plane(1.3, 0.45, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.1) })), 0, 2.695, 0, Math.PI / 2);
  lamp = new THREE.PointLight(0xffd2a0, 1.15, 8, 2); lamp.position.set(0, 2.3, 0); L.add(lamp);
  L.add(new THREE.AmbientLight(0x2a2018, 0.7));
  // mirror
  const mir = new THREE.Reflector(new THREE.PlaneGeometry(1.9, 1.9), { textureWidth: R.phone ? 384 : 640, textureHeight: R.phone ? 384 : 640, color: 0x9a968e, clipBias: 0.003 });
  mir.position.set(0, 1.45, -1.285); L.add(mir);
  for (const [w, h, x, y] of [[2.02, 0.06, 0, 2.43], [2.02, 0.06, 0, 0.47], [0.06, 2.02, -0.98, 1.45], [0.06, 2.02, 0.98, 1.45]]) R.add(L, R.box(w, h, 0.04, brass), x, y, -1.27);
  // written backwards on the door wall: it only reads in the mirror
  R.add(L, R.plane(1.1, 0.3, new THREE.MeshBasicMaterial({ map: R.textTex(['COMO ES ARRIBA', 'ES ABAJO'], { w: 1024, h: 280, size: 92, mirror: true, spacing: 0.12 }), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.6, 1.1, 0.45) })), 0, 2.45, 1.29, 0, Math.PI);
  // the one who is behind you
  figure = new THREE.Group(); const bm = new THREE.MeshBasicMaterial({ color: 0x020202 });
  figure.add(R.add(figure, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.45, 14), bm), 0, 0.73, 0), R.add(figure, new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), bm), 0, 1.63, 0), R.add(figure, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.26), bm), 0, 1.37, 0));
  figure.position.set(0.5, 0, 0.95); figure.visible = false; L.add(figure);

  // panel of symbols
  const box = R.$('#lift');
  FLOORS.forEach(([id, label, svg]) => { const b = document.createElement('button'); b.type = 'button'; b.id = 'f-' + id; b.title = label; b.setAttribute('aria-label', label); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + svg + '</svg>'; b.addEventListener('click', () => S.go(id, b)); b.addEventListener('pointerenter', () => { if (R.mode === 'lift') R.cap('El ascensor', label); }); b.addEventListener('focus', () => { if (R.mode === 'lift') R.cap('El ascensor', label); }); box.append(b); });
  if (new Date().getHours() === 3) { const b = document.createElement('button'); b.type = 'button'; b.id = 'f-tres'; b.title = 'Las tres'; b.setAttribute('aria-label', 'Las tres'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M12 5v14M17 5v14M5 5h14M5 19h14"/></svg>'; b.addEventListener('click', tres); box.append(b); }

  R.addHot({ pos: V(LX, 1.05, -1.28), label: 'El espejo', when: () => R.mode === 'lift', on: mirror });
  R.addHot({ pos: V(LX - 1.19, 1.25, -0.55), label: 'La pared', quiet: true, aria: 'Golpear la pared', when: () => R.mode === 'lift', on: wall });
  R.upd.push((dt, t) => { if (L.visible) lamp.intensity = travelling ? 0.45 + 0.75 * (Math.sin(t * 23) > 0.2 ? 1 : 0.25) : 1.15; });
};

function setDoors(k) { doors[0].position.x = -0.3 - 0.62 * k; doors[1].position.x = 0.3 + 0.62 * k; }
function face(a0, a1, z0, z1, dur) { const p = R.rig.pos, l = R.rig.look; return R.tw(dur, k => { const a = a0 + (a1 - a0) * k; p.set(LX, 1.55, z0 + (z1 - z0) * k); l.set(LX + Math.sin(a) * 2, 1.5, p.z + Math.cos(a) * 2); }); }
function hideRooms() { for (const k in R.rooms) if (R.rooms[k].group) R.rooms[k].group.visible = false; if (current && current.leave) current.leave(); current = null; }
S.zone = () => { R.outside.group.visible = false; L.visible = true; R.look({ fog: null, exposure: 1.0, bloom: 0.7 }); R.rig.par = 0.45; R.rig.fov = 52; };

S.arrive = async first => {
  await S.build(); await R.loaded(20);
  S.zone(); hideRooms(); setDoors(0); travelling = false; R.rig.shake = 0;
  R.rig.pos.set(LX, 1.55, 0.55); R.rig.look.set(LX, 1.5, -1.45);
  R.mode = 'lift'; R.cap('El ascensor', 'Sin números. Solo símbolos.'); R.amb({ drone: 0.1, hum: 0.04 });
  R.$('#lift').hidden = false; R.$('#back').hidden = true; R.$('#move').hidden = true; R.$('#hud').hidden = false; R.hud();
  figure.visible = !!first; await R.fade(1, 0.9);
  if (first) { R.save.visited = true; R.persist(); await R.wait(2.1); travelling = true; R.sfx.low(); await R.wait(0.35); figure.visible = false; travelling = false; R.coins(5); R.toast('Cinco monedas de plata por entrar.'); }
};

S.go = async (id, btn) => {
  if (R.busy || R.mode !== 'lift') return;
  if (id === 'cima' && R.grade() < 2) { if (btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); } R.sfx.fail(); R.toast('No figuras. La cima es para el tercer grado.'); return; }
  const room = R.rooms[id]; R.busy = true; R.$('#lift').hidden = true; R.cap('', '');
  await face(Math.PI, 0, 0.55, -0.4, 1.5);
  travelling = true; R.rig.shake = 0.012; R.amb({ drone: 0.1, hum: 0.2 }); R.sfx.stone(0.5);
  if (id === 'calle' || id === 'cima') await R.outside.build(); else await room.build();
  await Promise.all([R.wait(id === 'cripta' ? 5.2 : 2.6), R.loaded(25)]);
  travelling = false; R.rig.shake = 0; R.sfx.ding();
  if (id === 'calle' || id === 'cima') { await R.fade(0, 0.6); R.busy = false; R.$('#back').hidden = false; return id === 'calle' ? R.outside.show() : R.outside.cima(); }
  room.group.visible = true; current = room; R.look({ fog: room.fog || null, exposure: room.exposure || 1, bloom: room.bloom || 0.8 }); R.amb(room.amb || { drone: 0.1 });
  R.sfx.whoosh(); await R.tw(1.2, setDoors, 'io');
  R.rig.par = room.par || 0.5; R.rig.fov = room.fov || 52;
  await R.cam(R.W(...room.cam[0]), R.W(...room.cam[1]), 2.8, 'io');
  R.mode = id === 'cripta' ? 'crypt' : 'room:' + id; R.cap(room.title, room.sub); R.$('#back').hidden = false; R.busy = false;
  if (room.enter) room.enter();
};
S.back = async () => {
  if (R.busy || R.mode === 'lift' || R.mode === 'intro') return;
  R.busy = true; R.closePanel(); await R.fade(0, 0.5); R.busy = false; S.arrive(false);
};
R.$('#back').addEventListener('click', S.back);

function mirror() {
  const first = R.found('espejo');
  R.panel({ kick: 'El espejo', title: 'Como es arriba es abajo', body: '<p>Está escrito al revés en la pared de la puerta. Solo se lee aquí.</p><p>En el espejo no sales tú.</p>' + (first ? '<p>Primer mensaje oculto. Tres monedas.</p>' : ''), onClose: null });
  if (first) R.coins(3);
}
function wall() {
  S.wall++; R.sfx.knock(); R.rig.shake = 0.03; R.num(R.rig, 'shake', 0, 0.3, 'out');
  if (S.wall >= 3) { S.wall = 0; S.go('club'); }
}
function tres() {
  const first = R.found('tres');
  R.panel({ kick: 'Las tres', title: 'A la de tres', body: '<p>Este botón solo existe a esta hora.</p><p>Uno. Dos. Despierta.</p>' + (first ? '<p>Tres monedas.</p>' : '') });
  if (first) R.coins(3);
}
})();
