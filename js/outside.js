// The street: Castellana at night, the two leaning towers, and a pyramid of loose stone that rises between them.
(() => {
const R = window.RC, V = R.V, O = new THREE.Group(), P = new THREE.Group();
const PZ = -300, TIERS = 11, H = TIERS * 10, STEP = 5, HW0 = 60, T_RISE = 8.5, RAMP = 0.35 * T_RISE, VMAX = (H + 1) / (0.825 * T_RISE);
const S = R.outside = { group: O, built: false, knocks: 0, open: false, risen: false };
const rr = (a, b) => a + Math.random() * (b - a);
let name, eye, eyeGlow, eyeLight, beam, doorLight, leaves = [], sweep, blocks = [], meshes = [], camLight, topFire, topLight, baseFire, rubble, haze, dust, burstN = 0, sand, debris, t0 = -1, settleT = -1, animating = false, drag = null;

// rise: slow start, constant speed, hard stop. Returns [height risen, speed 0..1]
function rise(tau) {
  if (tau <= 0) return [0, 0]; if (tau >= T_RISE) return [H + 1, 0];
  if (tau < RAMP) { const s = tau / RAMP; return [VMAX * RAMP * (s * s * s - s * s * s * s / 2), s * s * (3 - 2 * s)]; }
  return [VMAX * (RAMP / 2 + (tau - RAMP)), 1];
}
function winTex(cols, rows, lit, seed) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return R.ctex(R.cv(512, 1024, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (rnd() < lit) {
      const a = 0.1 + rnd() * rnd() * 0.8; g.fillStyle = `rgba(255,${150 + rnd() * 50 | 0},${70 + rnd() * 50 | 0},${a})`;
      g.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.3, cw * 0.56, ch * 0.42);
    }
  }));
}
function facadeTex(cols, rows) {
  return R.ctex(R.cv(512, 1024, (g, w, h) => {
    g.fillStyle = '#34322f'; g.fillRect(0, 0, w, h); const cw = w / cols, ch = h / rows;
    g.fillStyle = '#090909'; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.fillRect(x * cw + cw * 0.2, y * ch + ch * 0.28, cw * 0.6, ch * 0.46);
  }));
}

S.build = async () => {
  if (S.built) return; S.built = true;
  R.scene.add(O); O.add(P); P.position.set(0, -H - 1, PZ);
  const hr = new Date().getHours(), dusk = (hr >= 6 && hr < 9) || (hr >= 19 && hr < 22); S.dusk = dusk;

  // sky and its reflections
  const skyTex = new THREE.TextureLoader().load('assets/sky/' + (dusk ? 'qwantani_dusk_2_puresky' : 'qwantani_night_puresky') + '.jpg', t => { const pm = new THREE.PMREMGenerator(R.renderer); R.scene.environment = pm.fromEquirectangular(t).texture; pm.dispose(); });
  skyTex.encoding = THREE.sRGBEncoding;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 40, 20), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false, color: dusk ? new THREE.Color(0.5, 0.36, 0.3) : new THREE.Color(0.2, 0.22, 0.3) }));
  sky.rotation.y = 2.2; O.add(sky);
  S.fog = new THREE.FogExp2(dusk ? 0x140d0b : 0x060607, 0.0017);
  O.add(new THREE.HemisphereLight(dusk ? 0x5a4640 : 0x1c2232, 0x070504, dusk ? 0.5 : 0.3));
  const moon = new THREE.DirectionalLight(0x8a9cc8, 0.3); moon.position.set(-300, 110, -520); O.add(moon);   // cold rim from behind
  const key = new THREE.DirectionalLight(0xff8a3c, 0.16); key.position.set(60, 40, 300); O.add(key);        // the city's fire glow, warm and low

  // ground: stony dirt broken up at three scales, a strip of wet asphalt down the middle
  const dirt = R.pbr('stony_dirt_path', { roughness: 0.95, envMapIntensity: 0.03 }); dirt.color.setRGB(0.95, 0.86, 0.78);
  dirt.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= (0.45 + 2.0 * texture2D(map, vUv * 0.04).g) * (0.6 + 1.5 * texture2D(map, vUv * 0.011).g);'); };
  R.add(O, R.plane(3000, 3000, dirt, 9), 0, 0, -200, -Math.PI / 2);
  R.add(O, R.plane(30, 800, R.pbr('asphalt_04', { color: 0x3a3733, roughness: 0.6, envMapIntensity: 0.12 }), 7), 0, 0.04, 0, -Math.PI / 2);
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 4.2), new THREE.MeshBasicMaterial({ color: 0x2e2c27 }), 6 * 46);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = V(1, 1, 1); let n = 0;
  for (const x of [-10.5, -7, -3.5, 3.5, 7, 10.5]) for (let k = 0; k < 46; k++) dash.setMatrixAt(n++, M.compose(V(x + rr(-0.05, 0.05), 0.07, 380 - k * 12.5), Q, V(1, rr(0.5, 1), 1)));
  O.add(dash);
  // the ground the pyramid breaks: rubble around its foot, appearing as it rises
  const mask = R.ctex(R.cv(256, 256, (g) => { const im = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = Math.abs(x - 128) / 128 * 180, dz = Math.abs(y - 128) / 128 * 180, d = Math.max(dx, dz) - HW0, a = d < -6 ? 0 : Math.max(0, 1 - Math.max(0, d) / 55); const v = 255 * a * a * (0.75 + 0.25 * Math.sin(x * 0.7) * Math.cos(y * 0.9)); im.data.set([v, v, v, 255], (y * 256 + x) * 4); } g.putImageData(im, 0, 0); }), false);
  rubble = R.add(O, R.plane(360, 360, R.pbr('rubble', { color: 0x3c3834, transparent: true, opacity: 0, alphaMap: mask, depthWrite: false, envMapIntensity: 0.1 }), 10), 0, 0.09, PZ, -Math.PI / 2);
  rubble.geometry.attributes.uv2 = new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2);
  rubble.material.alphaMap.wrapS = rubble.material.alphaMap.wrapT = THREE.ClampToEdgeWrapping; rubble.material.aoMap = null;
  rubble.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <alphamap_fragment>', 'diffuseColor.a *= texture2D(alphaMap, vUv2).g;'); sh.vertexShader = sh.vertexShader.replace('#include <uv2_pars_vertex>', 'attribute vec2 uv2; varying vec2 vUv2;').replace('#include <uv2_vertex>', 'vUv2 = uv2;'); sh.fragmentShader = sh.fragmentShader.replace('#include <uv2_pars_fragment>', 'varying vec2 vUv2;'); };

  // street lamps: real model, sodium glow, a pool and a streak on the wet road
  const step = R.phone ? 74 : 46;
  for (let z = 320; z > -150; z -= step) for (const sd of [-1, 1]) {
    R.put(O, 'street_lamp_01', sd * 16.5, 0, z, 2.3, sd > 0 ? Math.PI : 0);
    const g = R.sprite('glow_soft', new THREE.Color(1.7, 0.75, 0.18), 2.8, 2.8, 0.8); g.position.set(sd * 16.5, 8.3, z); O.add(g);
    R.add(O, R.plane(26, 26, R.glowMat(new THREE.Color(1.0, 0.42, 0.1), 0.18)), sd * 14.5, 0.1, z, -Math.PI / 2);
    R.add(O, R.plane(3, 44, R.glowMat(new THREE.Color(1.0, 0.45, 0.12), 0.1)), sd * 13, 0.11, z + 14, -Math.PI / 2);
  }
  camLight = new THREE.PointLight(0xff9a48, 0.8, 50, 2); O.add(camLight);

  // the two leaning towers and the city
  const tg = k => { const g = new THREE.BoxGeometry(36, 114, 36); g.translate(0, 57, 0); g.applyMatrix4(new THREE.Matrix4().set(1, k, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)); g.computeVertexNormals(); return g; };
  const tm = new THREE.MeshStandardMaterial({ color: 0x24262a, map: facadeTex(22, 60), roughness: 0.35, metalness: 0.55, emissive: 0xffffff, emissiveMap: winTex(22, 60, 0.12, 77), emissiveIntensity: 0.7, envMapIntensity: 0.1 });
  for (const sd of [-1, 1]) {
    R.add(O, new THREE.Mesh(tg(-sd * 0.268), tm), sd * 98, 0, PZ - 6);
    const b = R.sprite('glow_soft', new THREE.Color(3, 0.15, 0.1), 5, 5, 1); b.position.set(sd * 68, 116, PZ - 6); O.add(b);
    R.upd.push((dt, t) => { b.material.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.4 + sd)); });
  }
  const cm = new THREE.MeshStandardMaterial({ color: 0x26241f, map: facadeTex(14, 22), roughness: 0.9, metalness: 0.05, emissive: 0xffffff, emissiveMap: winTex(14, 22, 0.09, 5), emissiveIntensity: 0.6, envMapIntensity: 0.1 });
  const cg = new THREE.BoxGeometry(1, 1, 1); cg.translate(0, 0.5, 0);
  const city = new THREE.InstancedMesh(cg, cm, 320); let c = 0, sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, q0 = new THREE.Quaternion();
  for (let i = 0; i < 60; i++) { const side = i % 2 ? 1 : -1, z = 390 - (i >> 1) * 21, w = 16 + rnd() * 16, h = 20 + rnd() * 34; city.setMatrixAt(c++, M.compose(V(side * (40 + w / 2 + rnd() * 8), 0, z), q0, V(w, h, 18))); }
  while (c < 320) { const a = rnd() * Math.PI * 2, r = 340 + rnd() * 900, x = Math.cos(a) * r, z = PZ + Math.sin(a) * r; if (Math.abs(x) < 140 && z > PZ) continue; city.setMatrixAt(c++, M.compose(V(x, 0, z), q0, V(20 + rnd() * 40, 18 + rnd() * rnd() * 150, 20 + rnd() * 40))); }
  O.add(city);
  const glow = R.sprite('glow_soft', new THREE.Color(1.0, 0.36, 0.1), 1700, 340, dusk ? 0.3 : 0.2); glow.position.set(0, 20, PZ - 600); O.add(glow);

  // ---- the pyramid: every stone is its own block --------------------------------------
  const rock = R.pbr('Rock058', { envMapIntensity: 0.35, aoMapIntensity: 1.3 }); rock.color.setRGB(1.25, 1.12, 1.0);
  const core = R.pbr('Rock058', { color: 0x4a4540, envMapIntensity: 0.2 });
  const geos = [1, 2, 3, 4, 5].map(i => R.stone(i, 0.42)), lists = geos.map(() => []);
  for (let i = 0; i < TIERS; i++) {
    const hw = HW0 - STEP * i;
    R.add(P, R.box(hw * 2 - 9.6, 9.8, hw * 2 - 9.6, core, 9), 0, 4.9 + 10 * i, 0);
    for (let cs = 0; cs < 2; cs++) for (const side of [0, 1, 3]) {
      let u = -hw; const end = hw - 5; let first = true;
      while (u < end - 0.01) {
        let w = first && cs ? rr(2.6, 4) : rr(4.6, 7.4); first = false; if (end - (u + w) < 2.6) w = end - u;
        const uc = u + w / 2, off = hw - 2.5 + rr(-0.14, 0.14), y = 10 * i + 2.5 + 5 * cs;
        const pos = side === 0 ? [uc, y, off] : side === 1 ? [off, y, -uc] : [-off, y, uc], ry = [0, Math.PI / 2, 0, -Math.PI / 2][side] + rr(-0.012, 0.012);
        const v = Math.random() * 5 | 0, tint = rr(0.72, 1.08), warm = rr(-0.04, 0.05);
        lists[v].push({ v, i: lists[v].length, p: pos, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-0.008, 0.008), ry, rr(-0.008, 0.008))), s: V(w - rr(0.08, 0.2), 5 - rr(0.06, 0.16), 5), lvl: i * 2 + cs, ph: rr(0, 6.28), fr: rr(11, 19), amp: rr(0.07, 0.2), col: new THREE.Color().setRGB(tint + warm, tint, tint - warm) });
        u += w;
      }
    }
    if (i > 0 && i < TIERS - 1) for (const sx of [-1, 1]) { const t = R.sprite('glow_soft', new THREE.Color(2.6, 0.9, 0.2), 2.4, 2.4, 0); t.position.set(sx * (hw - 2), 10 * i + 1.5, hw - 2); t.userData.torch = 1; P.add(t); }
  }
  lists.forEach((L, v) => { const m = new THREE.InstancedMesh(geos[v], rock, L.length); L.forEach(b => { m.setMatrixAt(b.i, M.compose(V(b.p[0], b.p[1], b.p[2]), b.q, b.s)); m.setColorAt(b.i, b.col); blocks.push(b); }); m.instanceColor.needsUpdate = true; m.frustumCulled = false; P.add(m); meshes.push(m); });

  R.add(P, R.box(18, 17, 4, core, 6), 0, 8.5, HW0 + 1.5);
  R.put(P, 'large_castle_door', 0.13, 3.39, HW0 + 3.7, 3, 0).then(m => { m.traverse(o => { if (/_left$|_right$/.test(o.name)) leaves.push(o); }); if (S.open) setDoor(1); });
  R.add(P, R.plane(5.4, 11.4, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.75, 0.15) })), 0, 5.8, HW0 + 3.58);
  doorLight = new THREE.PointLight(0xff5a18, 0, 160, 2); doorLight.position.set(0, 6, HW0 + 12); P.add(doorLight);
  name = R.add(P, R.plane(46, 6.2, new THREE.MeshBasicMaterial({ map: R.textTex('RUMI CAÍN', { w: 2048, h: 280, size: 190, spacing: 0.22 }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2.2, 1.2, 0.35) })), 0, 25, HW0 - 2 * STEP + 0.3);
  // apex: brazier, eye, beam
  R.put(P, 'stone_fire_pit', 0, H + 1.0, 0, 5);
  topLight = R.flicker(new THREE.PointLight(0xff6a22, 0, 220, 2), 1.3); topLight.position.set(0, H + 9, 0); P.add(topLight); topLight.userData.on = 0;
  topFire = R.fires(P, [{ p: [0, H + 1.6, 0], s: 7 }]); topFire.lit(0);
  const eyeTex = R.ctex(R.cv(512, 256, (g) => {
    g.translate(256, 128); g.shadowColor = 'rgba(255,170,60,1)'; g.shadowBlur = 26; g.fillStyle = '#ffe9b0';
    g.beginPath(); g.moveTo(-190, 0); g.quadraticCurveTo(0, -150, 190, 0); g.quadraticCurveTo(0, 150, -190, 0); g.fill();
    g.shadowBlur = 0; g.fillStyle = '#a8560e'; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, 16, 56, 0, 0, 7); g.fill();
  }));
  eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeTex, color: new THREE.Color(2.2, 1.6, 0.8), transparent: true, opacity: 0, depthWrite: false })); eye.scale.set(26, 0.01, 1); eye.position.set(0, H + 28, 0); P.add(eye);
  eyeGlow = R.sprite('glow_soft', new THREE.Color(2.0, 1.0, 0.25), 80, 80, 0); eyeGlow.position.copy(eye.position); P.add(eyeGlow);
  beam = R.sprite('glow_soft', new THREE.Color(1.5, 0.75, 0.25), 14, 520, 0); beam.position.set(0, H + 260, 0); P.add(beam);
  eyeLight = new THREE.PointLight(0xffb860, 0, 240, 2); eyeLight.position.set(0, H + 28, 40); P.add(eyeLight);

  // braziers down the approach: fire, its light, and what it lights
  const fl = [];
  for (const z of [72, 96, 120]) for (const sx of [-1, 1]) {
    R.put(O, 'stone_fire_pit', sx * 9.5, 0.45, PZ + z, 2.3); fl.push({ p: [sx * 9.5, 1.2, PZ + z], s: 2.6 });
    const g = R.sprite('glow_soft', new THREE.Color(1.6, 0.6, 0.14), 11, 11, 0.16); g.position.set(sx * 9.5, 3, PZ + z); O.add(g);
    R.add(O, R.plane(34, 34, R.glowMat(new THREE.Color(1.0, 0.36, 0.08), 0.22)), sx * 9.5, 0.12, PZ + z, -Math.PI / 2);
    if (z !== 96) { const L = R.flicker(new THREE.PointLight(0xff5a18, 1, z === 72 ? 130 : 70, 2), z === 72 ? 2.4 : 1.2); L.position.set(sx * 9.5, 5, PZ + z); O.add(L); }
  }
  baseFire = R.fires(O, fl);
  sweep = new THREE.SpotLight(0xdfe6ff, 0, 600, 0.12, 0.6, 1); sweep.position.set(-80, 60, PZ + 260); sweep.target.position.set(-80, 26, PZ + 44); O.add(sweep, sweep.target);

  // boulders and loose rock: big behind, small in front, so the scale reads
  for (const [x, z, s, r] of [[-44, 80, 5, 0.4], [50, 72, 4.2, 2.1], [-72, 52, 6.5, 3.3], [78, 42, 5.5, 5], [-26, 118, 2.6, 1.2], [31, 132, 3, 4.1], [-21, 156, 1.8, 0.2], [24, 172, 2.2, 2.7]]) R.put(O, 'boulder_01', x, -0.2 * s, PZ + z, s, r);
  for (let i = 0; i < 16; i++) R.put(O, 'rock_07', rr(12, 48) * (i % 2 ? 1 : -1), -0.1, PZ + rr(64, 100), [rr(5, 11), rr(4, 8), rr(5, 11)], rr(0, 6.28));

  // dust, sand and debris: born where the stone scrapes the ground, in proportion to its speed
  const HW = HW0, per = (m) => { const s = Math.random(), side = s < 0.5 ? 0 : s < 0.72 ? 1 : s < 0.94 ? 3 : 2, u = rr(-HW, HW), o = HW + m; return [[[u, o], [o, -u], [-u, -o], [-o, u]][side], [[0, 1], [1, 0], [0, -1], [-1, 0]][side]]; };
  const DN = R.phone ? 420 : 760, BN = R.phone ? 130 : 240; burstN = BN;
  dust = R.dust(O, DN + BN, [0.3, 0.25, 0.2], 0.1);
  for (let i = 0; i < DN; i++) { let tau; do { tau = rr(0, T_RISE); } while (Math.random() > rise(tau)[1]); const [p, nn] = per(rr(0, 3)), sp = rr(6, 14), tg2 = rr(-3, 3);
    dust.set(i, [p[0], rr(0.5, 4), PZ + p[1]], [nn[0] * sp - nn[1] * tg2, rr(1.5, 5), nn[1] * sp + nn[0] * tg2], tau, rr(3.5, 6), rr(9, 16)); }
  for (let i = 0; i < BN; i++) { const [p, nn] = per(rr(0, 2)), sp = rr(18, 34); dust.set(DN + i, [p[0], rr(0.3, 2), PZ + p[1]], [nn[0] * sp, rr(0.4, 3), nn[1] * sp], T_RISE + rr(0, 0.2), rr(4, 7), rr(10, 19)); }
  dust.commit();
  sand = R.particles(O, { sprite: 'smoke_01', count: 170, gravity: 7, drag: 0.6, grow: 1.6, spin: 0.4, a: [0.26, 0.22, 0.18], b: [0.3, 0.26, 0.22], opacity: 0.1 });
  for (let i = 0; i < 170; i++) { const lv = Math.floor(Math.pow(Math.random(), 1.6) * (TIERS - 1)), hw = HW0 - STEP * lv, side = Math.random() < 0.6 ? 0 : (Math.random() < 0.5 ? 1 : 3), u = rr(-hw, hw), o = hw + 0.6;
    const p = side === 0 ? [u, o] : side === 1 ? [o, u] : [-o, u], nn = side === 0 ? [0, 1] : side === 1 ? [1, 0] : [-1, 0];
    sand.set(i, [p[0], 10 * lv + rr(2, 9.5), PZ + p[1]], [nn[0] * rr(1, 3), rr(-1, 1), nn[1] * rr(1, 3)], T_RISE + 0.028 * lv * 2 + rr(0, 1.5), rr(1.6, 2.8), rr(3, 6)); }
  sand.commit();
  debris = R.debris(O, 150, 0.2);
  for (let i = 0; i < 150; i++) { let tau; if (i < 60) tau = T_RISE + rr(0, 0.12); else do { tau = rr(0, T_RISE); } while (Math.random() > rise(tau)[1]); const [p, nn] = per(0), sp = rr(6, 17);
    debris.set(i, [p[0], 0.5, PZ + p[1]], [nn[0] * sp + rr(-3, 3), rr(8, 21), nn[1] * sp + rr(-3, 3)], tau, rr(2.4, 3.4), rr(0.5, 1.3)); }
  debris.commit();
  [dust, sand, debris].forEach(s => { s.t0 = 1e9; });
  // what stays in the air afterwards
  haze = R.particles(O, { sprite: 'smoke_04', count: 16, loop: true, grow: 0.6, spin: 0.1, a: [0.2, 0.15, 0.11], b: [0.24, 0.18, 0.13], opacity: 0.07, fadeIn: 0.3 });
  for (let i = 0; i < 16; i++) haze.set(i, [rr(-90, 90), rr(4, 22), PZ + rr(40, 110)], [rr(-1.5, 1.5), rr(0, 0.4), rr(-0.5, 0.5)], rr(0, 20), rr(16, 24), rr(40, 70));
  haze.commit(); haze.u.uGain.value = 0;
  const embers = R.particles(O, { sprite: 'glow_soft', count: R.phone ? 90 : 200, add: true, loop: true, lift: 0.3, drag: 0.1, a: [3, 1.1, 0.25], b: [1.4, 0.25, 0.04], opacity: 0.9, fadeIn: 0.1 });
  for (let i = 0; i < embers.n; i++) embers.set(i, [rr(-70, 70), rr(0, 30), PZ + rr(40, 240)], [rr(-1.5, 1.5), rr(2, 6), rr(-1, 1)], rr(0, 12), rr(7, 12), rr(0.25, 0.6));
  embers.commit();

  const m4 = new THREE.Matrix4(), pv = V(0, 0, 0);
  R.upd.push((dt, t) => {
    if (!O.visible) return;
    camLight.position.set(0, 9, R.rig.pos.z - 16);
    if (t0 >= 0 && !S.risen) {                     // the rise itself, driven by one clock
      const tau = t - t0, [y, sp] = rise(tau); P.position.y = -H - 1 + y; R.rig.rumble = 0.05 * sp;
      R.rig.look.set(0, Math.max(14, y * 0.55), PZ); rubble.material.opacity = Math.min(1, y / 40);
      if (tau >= T_RISE) { S.risen = true; settleT = t; R.rig.rumble = 0; R.rig.kick = 0.28; R.sfx.impact(1); if (drag) { drag.stop(0.4); drag = null; } R.amb({ drone: 0.16, fire: 0.3 }); }
    }
    if (animating) {                               // vibration while it moves, then each stone settles on its own
      const moving = !S.risen, sp = moving ? rise(t - t0)[1] : 0, st = t - settleT;
      for (const b of blocks) { let off = 0; if (moving) off = 0.035 * sp * Math.sin(t * b.fr * 2.2 + b.ph); else { const x = st - 0.028 * b.lvl; if (x > 0) off = -b.amp * Math.exp(-6.5 * x) * Math.sin(15 * x + b.ph * 0.2); }
        meshes[b.v].setMatrixAt(b.i, m4.compose(pv.set(b.p[0], b.p[1] + off, b.p[2]), b.q, b.s)); }
      meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
      if (S.risen) { P.position.y = 0.5 * Math.exp(-6.5 * st) * Math.sin(15 * st); if (st > 2.2) { animating = false; P.position.y = 0; } }
    }
    if (eye.material.opacity > 0) { eye.position.y = H + 28 + Math.sin(t * 0.8) * 0.8; eyeGlow.material.opacity = eye.material.opacity * (0.42 + 0.08 * Math.sin(t * 3)); }
    P.children.forEach(o => { if (o.userData.torch) o.material.opacity = S.risen ? 0.5 + 0.25 * Math.sin(t * 9 + o.position.x) : 0; });
  });

  R.addHot({ pos: V(0, 6, PZ + HW0 + 5), label: () => S.open ? 'Entrar' : 'Llamar · ' + S.knocks + ' de 3', when: () => R.mode === 'outside', on: knock });
};

function setDoor(k) { leaves.forEach(o => { o.rotation.y = (/_left$/.test(o.name) ? -1 : 1) * k * 1.75; }); doorLight.intensity = k * 3; }
function setState(done) {
  P.position.y = done ? 0 : -H - 1; S.risen = done; t0 = -1; animating = false; name.material.opacity = done ? 0.85 : 0; rubble.material.opacity = done ? 1 : 0;
  eye.material.opacity = done ? 1 : 0; eye.scale.y = done ? 13 : 0.01; beam.material.opacity = done ? 0.14 : 0; eyeLight.intensity = done ? 0.6 : 0;
  topFire.lit(done ? 1 : 0); topLight.userData.on = done ? 1 : 0; haze.u.uGain.value = done ? 1 : 0; [dust, sand, debris].forEach(s => { s.t0 = 1e9; });
  const m4 = new THREE.Matrix4(), pv = V(0, 0, 0); for (const b of blocks) meshes[b.v].setMatrixAt(b.i, m4.compose(pv.set(b.p[0], b.p[1], b.p[2]), b.q, b.s)); meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
}
S.zone = () => { O.visible = true; if (R.crypt.group) R.crypt.group.visible = false; R.grade({ fog: S.fog, exposure: S.dusk ? 0.95 : 1.05, bloom: 0.5 }); R.rig.par = 0.3; R.rig.hand = 1; R.rig.stiff = 26; R.rig.damp = 6; R.$('#exit').hidden = true; R.$('#earn').hidden = true; };
const DOOR_POS = V(0, 2.2, PZ + 190), DOOR_LOOK = V(0, 30, PZ + 50);

async function knock() {
  if (S.open) return enter();
  S.knocks++; R.sfx.knock(); R.rig.kick = 0.1;
  if (S.knocks < 3) return;
  R.busy = true; await R.wait(0.7); R.sfx.play('door_open', 1, 0.45); R.sfx.play('stone_drag_2', 0.8, 0.6); R.rig.rumble = 0.012;
  S.open = true; await R.tw(2.6, setDoor, 'io'); R.rig.rumble = 0; R.rig.kick = 0.08; R.busy = false; enter();
}
async function enter() {
  R.busy = true;
  R.cam(V(0, 4, PZ + HW0 + 12), V(0, 5.5, PZ), 3, 'in'); R.num(R.rig, 'fov', 46, 3, 'in'); await R.wait(2.1); await R.fade(0, 0.9);
  R.busy = false; R.crypt.enter();
}

S.intro = async () => {
  const rig = R.rig; S.zone(); setState(false); setDoor(0); S.knocks = 0; S.open = false; R.mode = 'intro'; R.busy = true;
  rig.pos.set(0, 1.6, 300); rig.look.set(0, 14, PZ); rig.fov = 32; R.snap(); R.amb({ drone: 0.14, fire: 0.06 });
  const d = new Date(); R.cap('', 'Paseo de la Castellana · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  R.$('#skip').hidden = false; R.fade(1, 2.4);
  const dolly = R.to(rig.pos, V(0, 1.9, 130), 15, 'io');
  await R.wait(2.6);
  if (!R.skipping) { t0 = R.t; animating = true; [dust, sand, debris].forEach(s => { s.t0 = t0; }); R.amb({ drone: 0.16, fire: 0.1, rumble: 0.5 }); drag = R.sfx.play('stone_drag_1', 0.9, 0.35, true); }
  await R.wait(T_RISE + 0.05);
  if (!S.risen) { S.risen = true; settleT = R.t; }   // skipped
  if (drag) { drag.stop(0.2); drag = null; } rig.rumble = 0; rubble.material.opacity = 1; rig.look.set(0, 68, PZ);
  topFire.lit(1); topLight.userData.on = 1; R.num(haze.u.uGain, 'value', 1, 4);
  await R.wait(1.5);
  sweep.intensity = 3; R.sfx.play('stone_drag_2', 0.25, 1.4);
  await R.tw(2.8, k => { const x = -80 + 160 * k; sweep.position.x = x; sweep.target.position.x = x; name.material.opacity = 0.85 * Math.min(1, Math.max(0, k * 2.2 - 0.5)); }, 'lin');
  sweep.intensity = 0; R.sfx.bell();
  await R.tw(1.8, k => { eye.material.opacity = k; eye.scale.y = 0.01 + 13 * k; beam.material.opacity = 0.14 * k; eyeLight.intensity = 0.6 * k; }, 'out');
  await dolly; await R.wait(0.8);
  R.cap('Rumi Caín', ''); R.num(rig, 'fov', 40, 5.5); await R.cam(DOOR_POS, DOOR_LOOK, 5.5, 'io');
  const sk = R.skipping; R.skipping = false; setState(true); if (sk) { R.snap(); R.amb({ drone: 0.16, fire: 0.3 }); }
  R.$('#skip').hidden = true; R.busy = false; R.mode = 'outside'; R.cap('Rumi Caín', 'Llama a la puerta. Tres veces.');
};
S.show = async () => {   // back at the foot of the pyramid
  const rig = R.rig; S.zone(); setState(true); setDoor(1); S.open = true; S.knocks = 3;
  rig.pos.copy(DOOR_POS); rig.look.copy(DOOR_LOOK); rig.fov = 40; R.snap(); R.amb({ drone: 0.16, fire: 0.3 }); R.mode = 'outside'; R.cap('Rumi Caín', 'Plaza de Castilla'); await R.fade(1, 1);
};
R.$('#skip').addEventListener('click', () => { if (R.mode === 'intro') { R.skipping = true; R.skipAll(); } });
})();
