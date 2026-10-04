// The street: Castellana at night, the two leaning towers, and the pyramid that rises between them.
(() => {
const R = window.RC, V = R.V, O = new THREE.Group(), P = new THREE.Group();
const PZ = -300, H = 150, TIERS = 15, STEP = 3.1;
const S = R.outside = { group: O, built: false, knocks: 0, open: false };
let name, eye, eyeGlow, eyeLight, beam, doorLight, doorGlow, leaves = [], sweep, dust = [], dustEnv = 0, embers, camLight, topFire;

function winTex(cols, rows, lit, seed) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return R.ctex(R.cv(512, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) { const floor = rnd() < 0.08; for (let x = 0; x < cols; x++) if (floor || rnd() < lit) {
      const warm = rnd() < 0.8, a = 0.12 + rnd() * rnd() * 0.88;
      g.fillStyle = warm ? `rgba(255,${160 + rnd() * 50 | 0},${80 + rnd() * 60 | 0},${a})` : `rgba(160,200,255,${a})`;
      g.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.3, cw * 0.56, ch * 0.42);
    } }
  }));
}
function facadeTex(cols, rows) {
  return R.ctex(R.cv(512, 1024, (g, w, h) => {
    g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h); const cw = w / cols, ch = h / rows;
    g.fillStyle = '#0b0d10'; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.fillRect(x * cw + cw * 0.2, y * ch + ch * 0.28, cw * 0.6, ch * 0.46);
  }));
}

S.build = async () => {
  if (S.built) return; S.built = true;
  R.scene.add(O); O.add(P); P.position.set(0, -H - 1, PZ);
  const hr = new Date().getHours(), dusk = (hr >= 6 && hr < 9) || (hr >= 19 && hr < 22);
  S.dusk = dusk;

  // sky + reflections
  const skyTex = new THREE.TextureLoader().load('assets/sky/' + (dusk ? 'qwantani_dusk_2_puresky' : 'qwantani_night_puresky') + '.jpg', t => {
    const pm = new THREE.PMREMGenerator(R.renderer); R.scene.environment = pm.fromEquirectangular(t).texture; pm.dispose();
  });
  skyTex.encoding = THREE.sRGBEncoding;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 40, 20), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, color: dusk ? new THREE.Color(0.6, 0.48, 0.45) : new THREE.Color(0.3, 0.34, 0.5) }));
  sky.rotation.y = 2.2; O.add(sky);
  S.fog = new THREE.FogExp2(dusk ? 0x1a1214 : 0x05070c, 0.0024);

  O.add(new THREE.HemisphereLight(dusk ? 0x6a5560 : 0x26324e, 0x080604, dusk ? 0.7 : 0.42));
  const moon = new THREE.DirectionalLight(0x93aae0, 0.4); moon.position.set(-220, 320, -420); O.add(moon);
  const fill = new THREE.DirectionalLight(0x3a4666, 0.12); fill.position.set(120, 140, 320); O.add(fill);

  // ground: wet asphalt
  const asph = R.pbr('asphalt_04', { color: 0x777777, roughness: 0.5, envMapIntensity: 1.1 });
  R.add(O, R.plane(1800, 1800, asph, 7), 0, 0, -200, -Math.PI / 2);
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 4.2), new THREE.MeshBasicMaterial({ color: 0x8d8778 }), 6 * 30);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = V(1, 1, 1); let n = 0;
  for (const x of [-10.5, -7, -3.5, 3.5, 7, 10.5]) for (let k = 0; k < 30; k++) dash.setMatrixAt(n++, M.compose(V(x, 0.03, 170 - k * 12.5), Q, one));
  O.add(dash);
  const curb = R.pbr('concrete_wall_008', { color: 0x555555 });
  for (const x of [-15, 15]) R.add(O, R.box(2.2, 0.3, 400, curb, 3), x, 0.15, -20);

  // street lamps: real model near, glow + pool on the wet road
  const step = R.phone ? 56 : 34;
  for (let z = 128; z > -150; z -= step) for (const sd of [-1, 1]) {
    R.put(O, 'street_lamp_01', sd * 15, 0.3, z, 2.3, sd > 0 ? Math.PI : 0);
    const g = R.sprite(R.glowTex, new THREE.Color(2.0, 0.95, 0.25), 4.5, 4.5, 0.9); g.position.set(sd * 15, 8.6, z); O.add(g);
    R.add(O, R.plane(26, 26, R.glowMat(new THREE.Color(1.0, 0.45, 0.12), 0.32)), sd * 13.5, 0.05, z, -Math.PI / 2);
    R.add(O, R.plane(3.2, 40, R.glowMat(new THREE.Color(1.0, 0.5, 0.15), 0.2)), sd * 13, 0.06, z + 12, -Math.PI / 2);
  }
  camLight = new THREE.PointLight(0xffa050, 0.9, 46, 2); O.add(camLight);

  // the two leaning towers
  const tg = k => { const g = new THREE.BoxGeometry(36, 114, 36); g.translate(0, 57, 0); g.applyMatrix4(new THREE.Matrix4().set(1, k, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)); g.computeVertexNormals(); return g; };
  const tw = winTex(22, 60, 0.16, 77);
  const tm = new THREE.MeshStandardMaterial({ color: 0x2a3038, map: facadeTex(22, 60), roughness: 0.3, metalness: 0.6, emissive: 0xffffff, emissiveMap: tw, emissiveIntensity: 0.55, envMapIntensity: 0.5 });
  for (const sd of [-1, 1]) {
    R.add(O, new THREE.Mesh(tg(-sd * 0.268), tm), sd * 80, 0, PZ);
    const b = R.sprite(R.glowTex, new THREE.Color(3, 0.15, 0.1), 5, 5, 1); b.position.set(sd * 50, 116, PZ); O.add(b);
    R.upd.push((dt, t) => { b.material.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.4 + sd)); });
  }

  // the city: blocks along the avenue and a far ring
  const cm = new THREE.MeshStandardMaterial({ color: 0x2c2c30, map: facadeTex(14, 22), roughness: 0.85, metalness: 0.05, emissive: 0xffffff, emissiveMap: winTex(14, 22, 0.1, 5), emissiveIntensity: 0.4, envMapIntensity: 0.12 });
  const cg = new THREE.BoxGeometry(1, 1, 1); cg.translate(0, 0.5, 0);
  const city = new THREE.InstancedMesh(cg, cm, 300); let c = 0, sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const q0 = new THREE.Quaternion();
  for (let i = 0; i < 44; i++) { const side = i % 2 ? 1 : -1, z = 190 - (i >> 1) * 21, w = 16 + rnd() * 16, h = 20 + rnd() * 34; city.setMatrixAt(c++, M.compose(V(side * (38 + w / 2 + rnd() * 6), 0, z), q0, V(w, h, 18))); }
  while (c < 300) { const a = rnd() * Math.PI * 2, r = 330 + rnd() * 800, x = Math.cos(a) * r, z = PZ + Math.sin(a) * r; if (Math.abs(x) < 130 && z > PZ) continue; city.setMatrixAt(c++, M.compose(V(x, 0, z), q0, V(20 + rnd() * 40, 18 + rnd() * rnd() * 150, 20 + rnd() * 40))); }
  O.add(city);
  const haze = R.sprite(R.glowTex, new THREE.Color(1.0, 0.42, 0.14), 1500, 300, dusk ? 0.3 : 0.2); haze.position.set(0, 30, PZ - 500); O.add(haze);

  // ---- the pyramid ---------------------------------------------------------------
  const stone = R.pbr('medieval_blocks_05', { color: 0x6a625a, envMapIntensity: 0.5 });
  const dark = R.pbr('medieval_blocks_05', { color: 0x3a3632, envMapIntensity: 0.5 });
  for (let i = 0; i < TIERS; i++) {
    const hw = 50 - STEP * i;
    R.add(P, R.box(hw * 2, 10, hw * 2, stone, 9), 0, 5 + 10 * i, 0);
    if (i > 2) R.add(P, R.box(12, 10, 3, dark, 4), 0, 5 + 10 * i, hw + 0.4);
    if (i > 0 && i < TIERS - 1) for (const sx of [-1, 1]) { const t = R.sprite(R.glowTex, new THREE.Color(2.6, 0.9, 0.2), 2.6, 2.6, 0.0); t.position.set(sx * (hw - 2), 10 * i + 1.5, hw - 2); t.userData.torch = 1; P.add(t); }
  }
  R.add(P, R.box(18, 17, 4, dark, 5), 0, 8.5, 51.5);
  R.put(P, 'large_castle_door', 0.13, 3.39, 53.7, 3, 0).then(m => { m.traverse(o => { if (/_left$|_right$/.test(o.name)) leaves.push(o); }); if (S.open) setDoor(1); });
  doorGlow = R.add(P, R.plane(5.4, 11.4, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.2, 0.3) })), 0, 5.8, 53.58);
  doorLight = new THREE.PointLight(0xff6a20, 0, 150, 2); doorLight.position.set(0, 6, 60); P.add(doorLight);
  name = R.add(P, R.plane(46, 6.2, new THREE.MeshBasicMaterial({ map: R.textTex('RUMI CAÍN', { w: 2048, h: 280, size: 190, spacing: 0.22 }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2.2, 1.35, 0.45) })), 0, 25, 43.95);
  // apex: brazier, eye, beam
  R.put(P, 'stone_fire_pit', 0, H + 1.0, 0, 5);
  const topL = new THREE.PointLight(0xff7a2a, 1.0, 200, 2); topL.position.set(0, H + 8, 0); P.add(topL);
  topFire = R.fire(7, topL); topFire.position.set(0, H + 1.5, 0); P.add(topFire);
  const eyeTex = R.ctex(R.cv(512, 256, (g) => {
    g.translate(256, 128); g.shadowColor = 'rgba(255,200,90,1)'; g.shadowBlur = 26; g.fillStyle = '#fff3c4';
    g.beginPath(); g.moveTo(-190, 0); g.quadraticCurveTo(0, -150, 190, 0); g.quadraticCurveTo(0, 150, -190, 0); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#b8791a'; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, 16, 56, 0, 0, 7); g.fill();
  }));
  eye = R.sprite(eyeTex, new THREE.Color(2.4, 1.9, 1.0), 26, 0.01, 0, false); eye.position.set(0, H + 26, 0); P.add(eye);
  eyeGlow = R.sprite(R.glowTex, new THREE.Color(2.2, 1.3, 0.4), 90, 90, 0); eyeGlow.position.copy(eye.position); P.add(eyeGlow);
  beam = R.sprite(R.glowTex, new THREE.Color(1.6, 0.9, 0.35), 16, 520, 0); beam.position.set(0, H + 250, 0); P.add(beam);
  eyeLight = new THREE.PointLight(0xffc878, 0, 260, 2); eyeLight.position.set(0, H + 26, 40); P.add(eyeLight);
  // braziers at the foot
  for (const z of [62, 92, 122]) for (const sx of [-1, 1]) {
    R.put(P, 'stone_fire_pit', sx * 9.5, 0.45, z, 2.3);
    let L = null; if (z === 62) { L = new THREE.PointLight(0xff6a20, 1.8, 110, 2); L.position.set(sx * 9.5, 5, z); P.add(L); }
    const f = R.fire(3.2, L); f.position.set(sx * 9.5, 1.1, z); P.add(f);
  }
  sweep = new THREE.SpotLight(0xdfe8ff, 0, 400, 0.2, 0.6, 1); sweep.position.set(-80, 60, PZ + 170); sweep.target.position.set(-80, 26, PZ + 44); O.add(sweep, sweep.target);

  // dust at the base, embers in the air
  const cloud = R.tex('cloud.png', { clamp: 1, srgb: 1 });
  for (let i = 0; i < 34; i++) { const a = i / 34 * Math.PI * 2, r = 58 + (i % 3) * 7; const s = R.sprite(cloud, new THREE.Color(0.5, 0.4, 0.33), 40, 40, 0, false); s.position.set(Math.cos(a) * r * 1.1, 6 + (i % 4) * 5, PZ + Math.sin(a) * r * 1.1); s.userData.a = a; s.material.rotation = i; O.add(s); dust.push(s); }
  const EN = R.phone ? 250 : 520, ep = new Float32Array(EN * 3), ev = [];
  for (let i = 0; i < EN; i++) { ep[i * 3] = (Math.random() - 0.5) * 120; ep[i * 3 + 1] = Math.random() * 140; ep[i * 3 + 2] = PZ + 40 + Math.random() * 120; ev.push(2 + Math.random() * 5); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: R.tex('spark1.png', { clamp: 1, srgb: 1 }), color: new THREE.Color(3, 1.0, 0.22), size: 1.5, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); embers.frustumCulled = false; O.add(embers);

  R.upd.push((dt, t) => {
    if (!O.visible) return;
    camLight.position.set(0, 9, R.rig.pos.z - 14);
    for (let i = 0; i < EN; i++) { ep[i * 3 + 1] += ev[i] * dt; ep[i * 3] += Math.sin(t * 0.7 + i) * dt * 1.5; if (ep[i * 3 + 1] > 150) { ep[i * 3 + 1] = 0; ep[i * 3] = (Math.random() - 0.5) * 120; } }
    eg.attributes.position.needsUpdate = true;
    for (const s of dust) { s.material.opacity = dustEnv * 0.55; const k = 40 + dustEnv * 55 + 6 * Math.sin(t * 0.6 + s.userData.a * 3); s.scale.set(k, k, 1); s.material.rotation += dt * 0.05; }
    if (eye.material.opacity > 0) { eye.position.y = H + 26 + Math.sin(t * 0.8) * 0.8; eyeGlow.material.opacity = eye.material.opacity * (0.5 + 0.1 * Math.sin(t * 3)) * (R.mode === 'cima' ? 0.18 : 1); }
    P.children.forEach(o => { if (o.userData.torch) o.material.opacity = S.risen ? 0.55 + 0.25 * Math.sin(t * 9 + o.position.x) : 0; });
  });

  R.addHot({ pos: V(0, 5.5, PZ + 55), label: () => S.open ? 'Entrar' : 'Llamar · ' + S.knocks + ' de 3', when: () => R.mode === 'outside', on: knock });
  R.addHot({ pos: V(0, H + 26, PZ), label: 'El ojo', when: () => R.mode === 'cima', on: () => R.games.play('ojo') });
};

function setDoor(k) {
  leaves.forEach(o => { o.rotation.y = (/_left$/.test(o.name) ? -1 : 1) * k * 1.75; });
  doorLight.intensity = k * 3.2;
}
function setState(done) {
  P.position.y = done ? 0 : -H - 1; S.risen = done; name.material.opacity = done ? 0.85 : 0;
  eye.material.opacity = done ? 1 : 0; eye.scale.y = done ? 13 : 0.01; beam.material.opacity = done ? 0.16 : 0; eyeLight.intensity = done ? 0.7 : 0;
  topFire.userData.lit = done ? 1 : 0;
}
S.zone = () => { R.outside.group.visible = true; R.lift.group.visible = false; R.look({ fog: S.fog, exposure: S.dusk ? 0.85 : 0.9, bloom: 0.6 }); R.rig.par = 0.35; R.rig.fov = 50; };

async function knock() {
  if (S.open) return enter();
  S.knocks++; R.sfx.knock(); R.rig.shake = 0.25; R.num(R.rig, 'shake', 0, 0.35, 'out');
  if (S.knocks < 3) return;
  R.busy = true; await R.wait(0.6); R.sfx.stone(1.4);
  S.open = true; await R.tw(2.2, setDoor, 'io'); R.busy = false; enter();
}
async function enter() {
  R.busy = true; R.sfx.whoosh();
  R.cam(V(0, 4, PZ + 60), V(0, 5.5, PZ), 2.6, 'in'); await R.wait(1.7); await R.fade(0, 0.9);
  R.busy = false; R.lift.arrive(!R.save.visited);
}

S.intro = async () => {
  const rig = R.rig; S.zone(); setState(false); setDoor(0); S.knocks = 0; S.open = false; R.mode = 'intro'; R.busy = true;
  rig.pos.set(0, 1.7, 150); rig.look.set(0, 30, PZ); R.amb({ drone: 0.14, fire: 0.05 });
  const d = new Date(); R.cap('', 'Paseo de la Castellana · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  $skip(true); R.fade(1, 2.2);
  const dolly = R.cam(V(0, 2.3, -40), V(0, 82, PZ), 14.5, 'io');
  await R.wait(2.4); R.sfx.rumble(7.5); R.num(rig, 'shake', 0.28, 1.6);
  await R.tw(7.6, k => { P.position.y = (-H - 1) * (1 - k); dustEnv = Math.sin(Math.PI * Math.min(1, k * 1.08)); }, 'io');
  S.risen = true; R.num(rig, 'shake', 0, 0.9); R.sfx.low(); R.amb({ drone: 0.16, fire: 0.3 }); R.tw(3, k => { dustEnv = 0.25 * (1 - k); }); R.num(topFire.userData, 'lit', 1, 1.5);
  sweep.intensity = 3.2; R.sfx.whoosh();
  await R.tw(2.8, k => { const x = -80 + 160 * k; sweep.position.x = x; sweep.target.position.x = x; name.material.opacity = 0.85 * Math.min(1, Math.max(0, k * 2.2 - 0.5)); }, 'lin');
  sweep.intensity = 0; R.sfx.ding();
  await R.tw(1.8, k => { eye.material.opacity = k; eye.scale.y = 0.01 + 13 * k; beam.material.opacity = 0.16 * k; eyeLight.intensity = 0.7 * k; }, 'out');
  await dolly;
  setState(true); $skip(false); R.skipping = false; R.busy = false; R.mode = 'outside'; R.cap('Rumi Caín', 'Llama a la puerta. Tres veces.');
};
S.show = async () => {   // back on the street from the lift
  const rig = R.rig; S.zone(); setState(true); setDoor(1); S.open = true; S.knocks = 3; dustEnv = 0;
  rig.pos.set(0, 2.3, -40); rig.look.set(0, 82, PZ); R.amb({ drone: 0.16, fire: 0.3 }); R.mode = 'outside'; R.cap('La calle', 'Plaza de Castilla'); await R.fade(1, 1);
};
S.cima = async () => {
  const rig = R.rig; S.zone(); setState(true); setDoor(1); dustEnv = 0; rig.par = 0.25;
  rig.pos.set(14, H + 4, PZ + 74); rig.look.set(0, H + 17, PZ); R.look({ exposure: 0.7, bloom: 0.45 }); R.amb({ drone: 0.2, fire: 0.4 }); R.mode = 'cima'; R.cap('La cima', 'El ojo que todo lo ve'); await R.fade(1, 1.2);
};
function $skip(on) { const b = R.$('#skip'); b.hidden = !on; }
R.$('#skip').addEventListener('click', () => { if (R.mode === 'intro') { R.skipping = true; R.skipAll(); } });
})();
