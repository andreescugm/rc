// VFX: one GPU particle system, parametrised by cause. Position is a pure function of age,
// so a burst can be replayed and a fire can loop. Fire, dust, debris and embers are presets of it.
(() => {
const R = window.RC;
const VS = `
  attribute vec3 iPos; attribute vec3 iVel; attribute vec4 iData;   // birth, life, size, seed
  uniform float uTime, uLoop, uGravity, uDrag, uGrow, uSpin, uTurn, uLift, uFloor;
  varying vec2 vUv; varying float vK; varying float vSeed;
  void main(){
    float age = uTime - iData.x; if (uLoop > 0.5) age = mod(age, iData.y);
    float k = clamp(age / iData.y, 0.0, 1.0); vK = k; vSeed = iData.w; vUv = uv;
    float alive = step(0.0, age) * step(age, iData.y);
    float d = max(uDrag, 0.0001);
    vec3 p = iPos + iVel * (1.0 - exp(-d * age)) / d;          // drag slows it down
    p.y += uLift * age - 0.5 * uGravity * age * age;           // buoyancy up, gravity down
    p.y = max(p.y, uFloor);
    float size = iData.z * (1.0 + uGrow * k) * alive;
    float a = (iData.w - 0.5) * uTurn + uSpin * age * (fract(iData.w * 7.31) - 0.5);
    vec2 c = position.xy; c = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a));
    vec4 mv = modelViewMatrix * vec4(p, 1.0); mv.xy += c * size; mv.y += 0.17 * size;
    gl_Position = projectionMatrix * mv;
  }`;
const FS = `
  uniform sampler2D uMap; uniform vec3 uA, uB; uniform float uOpacity, uFadeIn, uGain;
  varying vec2 vUv; varying float vK; varying float vSeed;
  void main(){
    float a = texture2D(uMap, vUv).a;
    float f = smoothstep(0.0, uFadeIn, vK) * (1.0 - smoothstep(0.55, 1.0, vK));
    vec3 col = mix(uA, uB, vK) * (0.8 + 0.4 * fract(vSeed * 13.7));
    gl_FragColor = vec4(col, a * uOpacity * uGain * f);
  }`;

// o: sprite, count, add, loop, gravity, drag, grow, spin, turn, lift, floor, a, b, opacity, fadeIn
R.particles = (parent, o) => {
  const n = o.count, g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1);
  g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), dat = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) dat[i * 4] = 1e9;   // unborn
  const aP = new THREE.InstancedBufferAttribute(pos, 3), aV = new THREE.InstancedBufferAttribute(vel, 3), aD = new THREE.InstancedBufferAttribute(dat, 4);
  g.setAttribute('iPos', aP); g.setAttribute('iVel', aV); g.setAttribute('iData', aD); g.instanceCount = n;
  const u = { uMap: { value: R.tex('sprites/' + o.sprite + '.png', { clamp: 1 }) }, uTime: { value: 0 }, uLoop: { value: o.loop ? 1 : 0 }, uGravity: { value: o.gravity || 0 }, uDrag: { value: o.drag || 0 },
    uGrow: { value: o.grow || 0 }, uSpin: { value: o.spin || 0 }, uTurn: { value: o.turn == null ? 6.283 : o.turn }, uLift: { value: o.lift || 0 }, uFloor: { value: o.floor == null ? -1e6 : o.floor },
    uA: { value: new THREE.Color().setRGB(o.a[0], o.a[1], o.a[2]) }, uB: { value: new THREE.Color().setRGB(o.b[0], o.b[1], o.b[2]) }, uOpacity: { value: o.opacity == null ? 1 : o.opacity }, uFadeIn: { value: o.fadeIn || 0.12 }, uGain: { value: 1 } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.frustumCulled = false; m.renderOrder = o.add ? 3 : 2; parent.add(m);
  const sys = { mesh: m, u, t0: 0, n, next: 0,
    set(i, p, v, birth, life, size) { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; vel[i * 3] = v[0]; vel[i * 3 + 1] = v[1]; vel[i * 3 + 2] = v[2]; dat[i * 4] = birth; dat[i * 4 + 1] = life; dat[i * 4 + 2] = size; dat[i * 4 + 3] = Math.random(); },
    emit(p, v, birth, life, size) { sys.set(sys.next, p, v, birth, life, size); sys.next = (sys.next + 1) % n; },
    commit() { aP.needsUpdate = aV.needsUpdate = aD.needsUpdate = true; },
    restart() { sys.t0 = R.t; }, now() { return R.t - sys.t0; } };
  R.upd.push((dt, t) => { u.uTime.value = t - sys.t0; });
  return sys;
};

const rr = (a, b) => a + Math.random() * (b - a);

// FIRE. Cause: a bowl of burning fuel. Core and body rise and thin out in under a second, tongues lick
// higher, dark smoke takes over above the flame and widens for seconds, embers leave on their own arcs.
// All the fires of a place share four draw calls. fires: [{p:[x,y,z], s:size}]
R.fires = (parent, fires) => {
  const n = fires.length;
  const body = R.particles(parent, { sprite: 'fire_01', count: n * 12, add: true, loop: true, grow: -0.55, turn: 1.2, spin: 2, a: [1.4, 0.62, 0.13], b: [0.8, 0.09, 0.012], opacity: 0.36, fadeIn: 0.2 });
  const tong = R.particles(parent, { sprite: 'flame_05', count: n * 6, add: true, loop: true, grow: -0.3, turn: 0.5, a: [1.8, 1.05, 0.32], b: [1.0, 0.15, 0.02], opacity: 0.5, fadeIn: 0.25 });
  const smoke = R.particles(parent, { sprite: 'smoke_07', count: n * 8, loop: true, grow: 2.4, spin: 0.6, drag: 0.25, a: [0.09, 0.06, 0.045], b: [0.03, 0.03, 0.03], opacity: 0.26, fadeIn: 0.3 });
  const ember = R.particles(parent, { sprite: 'glow_soft', count: n * 10, add: true, loop: true, drag: 0.5, lift: 0.6, a: [3.0, 1.3, 0.3], b: [1.6, 0.3, 0.05], opacity: 0.9, fadeIn: 0.05 });
  fires.forEach((f, k) => { const [x, y, z] = f.p, s = f.s;
    for (let i = 0; i < 12; i++) body.set(k * 12 + i, [x + rr(-0.22, 0.22) * s, y + rr(0, 0.15) * s, z + rr(-0.22, 0.22) * s], [rr(-0.2, 0.2) * s, rr(1.5, 2.3) * s, rr(-0.2, 0.2) * s], rr(0, 1), rr(0.55, 0.95), rr(0.9, 1.3) * s);
    for (let i = 0; i < 6; i++) tong.set(k * 6 + i, [x + rr(-0.2, 0.2) * s, y + rr(0.2, 0.5) * s, z + rr(-0.2, 0.2) * s], [rr(-0.15, 0.15) * s, rr(2.2, 3.2) * s, rr(-0.15, 0.15) * s], rr(0, 1), rr(0.4, 0.7), rr(0.8, 1.2) * s);
    for (let i = 0; i < 8; i++) smoke.set(k * 8 + i, [x + rr(-0.2, 0.2) * s, y + rr(1.4, 1.9) * s, z + rr(-0.2, 0.2) * s], [rr(-0.5, 0.5) * s, rr(1.4, 2.2) * s, rr(-0.5, 0.5) * s], rr(0, 4), rr(3, 4.5), rr(1.0, 1.5) * s);
    for (let i = 0; i < 10; i++) ember.set(k * 10 + i, [x + rr(-0.3, 0.3) * s, y + rr(0.3, 0.8) * s, z + rr(-0.3, 0.3) * s], [rr(-1.2, 1.2) * s, rr(2, 5) * s, rr(-1.2, 1.2) * s], rr(0, 3), rr(1.4, 3), rr(0.05, 0.11) * s);
  });
  const all = [body, tong, smoke, ember]; all.forEach(s => s.commit());
  return { lit(v) { all.forEach(s => { s.u.uGain.value = v; }); } };
};
// a light that breathes with its fire
R.flicker = (light, base) => { light.userData.base = base; light.userData.on = 1; R.upd.push((dt, t) => { light.intensity = base * light.userData.on * (0.82 + 0.18 * Math.sin(t * 13 + base) + 0.1 * Math.sin(t * 31.7 + base * 3)); }); return light; };

// DUST. Cause: something heavy scraping the ground. It leaves the contact line, is thrown outward,
// loses speed to drag, swells and thins over seconds. Tinted with the ground it came from.
R.dust = (parent, count, tint = [0.3, 0.25, 0.2], opacity = 0.11) => R.particles(parent, { sprite: 'smoke_04', count, grow: 2.3, spin: 0.5, drag: 1.2, lift: 0.5, a: [tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.7], b: tint, opacity, fadeIn: 0.1 });
// DEBRIS. Small, dark, thrown up and out, falls under gravity and stays on the floor.
R.debris = (parent, count, floor = 0.15) => R.particles(parent, { sprite: 'dirt_02', count, gravity: 22, drag: 0.15, spin: 5, floor, a: [0.07, 0.06, 0.05], b: [0.05, 0.045, 0.04], opacity: 0.95, fadeIn: 0.02 });
})();
