// Core: renderer, film pass, sprung camera with real handheld shake, tweens, assets, sound, HUD.
(() => {
const R = window.RC = { mode: 'boot', busy: false, t: 0, mx: 0, my: 0, sx: 0, sy: 0, hot: [], upd: [], panelOpen: false };
const $ = R.$ = s => document.querySelector(s);
const V = R.V = (x, y, z) => new THREE.Vector3(x, y, z);
R.phone = matchMedia('(max-width:700px), (pointer:coarse)').matches;
R.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- per-visitor state -------------------------------------------------------
const KEY = 'rc-v2', save = { coins: 0, opened: [], visited: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
R.save = save;
R.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
R.hud = () => { $('#coins').textContent = save.coins; };
R.coins = n => { save.coins = Math.max(0, save.coins + n); R.persist(); R.hud(); if (n > 0) R.sfx.play('coins', 0.7); };

// ---- renderer + film pipeline --------------------------------------------------
const canvas = $('#gl');
const renderer = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R.phone ? 1.25 : 1.5));
const scene = R.scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = R.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);
// look = where the operator wants to point; cur = where the lens actually points (it arrives late)
const rig = R.rig = { pos: V(0, 1.6, 330), look: V(0, 12, -300), cur: V(0, 12, -300), vel: V(0, 0, 0), fov: 32, hand: 1, rumble: 0, kick: 0, par: 0.3, stiff: 26, damp: 6 };
R.snap = () => { rig.cur.copy(rig.look); rig.vel.set(0, 0, 0); };

const rt = new THREE.WebGLRenderTarget(4, 4, { type: renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const composer = new THREE.EffectComposer(renderer, rt);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloom = R.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.7, 0.9);
composer.addPass(bloom);
// order: aberration -> exposure -> vignette -> ACES -> saturation -> cool shadows / warm highlights -> contrast -> gamma -> grain
const film = R.film = new THREE.ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fade: { value: 0 }, bars: { value: 0.1 }, exposure: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, fade, bars, exposure; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+time*41.0)*43758.5453); }
    void main(){
      vec2 d=vUv-0.5; float r2=dot(d,d);
      vec3 c; c.r=texture2D(tDiffuse,vUv+d*r2*0.008).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*r2*0.008).b;
      c*=exposure; c*=mix(1.0,smoothstep(0.95,0.2,length(d*vec2(1.0,1.15))),0.85);
      c=aces(c);
      float l=dot(c,vec3(0.3,0.59,0.11)); c=mix(vec3(l),c,0.9);
      c=mix(c*vec3(0.9,0.98,1.1),c*vec3(1.08,1.0,0.9),smoothstep(0.05,0.6,l));
      c=mix(c,c*c*(3.0-2.0*c),0.35);
      c=pow(c,vec3(1.0/2.2));
      c+=(hash(floor(gl_FragCoord.xy/1.5))-0.5)*0.05*(1.2-l);
      c*=step(bars,vUv.y)*step(vUv.y,1.0-bars);
      gl_FragColor=vec4(c*fade,1.0);
    }`
});
composer.addPass(film);
R.fade = (to, dur = 0.8) => { const a = film.uniforms.fade.value; return R.tw(dur, k => { film.uniforms.fade.value = a + (to - a) * k; }, 'lin'); };
R.grade = o => { if (o.exposure != null) film.uniforms.exposure.value = o.exposure; if (o.bloom != null) bloom.strength = o.bloom; if (o.fog !== undefined) scene.fog = o.fog; };

function resize() {
  const w = window.innerWidth, h = window.innerHeight, a = w / h;
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = a; R.aspect = a;
  film.uniforms.bars.value = a > 1 ? Math.max(0, Math.min(0.13, (1 - a / 2.39) / 2)) : 0.05;
  if (R.onResize) R.onResize();
}
window.addEventListener('resize', resize); resize();

// ---- tweens --------------------------------------------------------------------------
const tweens = [];
R.ease = { io: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, out: x => 1 - Math.pow(1 - x, 3), in: x => x * x * x, lin: x => x };
R.tw = (dur, fn, ease = 'io') => new Promise(res => { if (dur <= 0 || R.skipping) { fn(1); res(); return; } tweens.push({ t: 0, dur, fn, e: R.ease[ease], res }); });
R.wait = s => R.tw(s, () => {}, 'lin');
R.to = (v, target, dur, ease) => { const a = v.clone(); return R.tw(dur, k => v.lerpVectors(a, target, k), ease); };
R.cam = (pos, look, dur, ease) => Promise.all([R.to(rig.pos, pos, dur, ease), R.to(rig.look, look, dur, ease)]);
R.num = (obj, key, to, dur, ease) => { const a = obj[key]; return R.tw(dur, k => { obj[key] = a + (to - a) * k; }, ease); };
R.skipAll = () => { for (const w of tweens.splice(0)) { w.fn(1); w.res(); } };

// ---- assets --------------------------------------------------------------------------
let idle = true;
THREE.DefaultLoadingManager.onStart = () => { idle = false; };
THREE.DefaultLoadingManager.onLoad = () => { idle = true; };
THREE.DefaultLoadingManager.onError = u => console.warn('No ha cargado', u);
R.loaded = (max = 40) => new Promise(res => { const t0 = performance.now(); (function poll() { if (idle || performance.now() - t0 > max * 1000) res(); else setTimeout(poll, 120); })(); });
const TL = new THREE.TextureLoader(), tcache = {};
R.tex = (path, o = {}) => {
  const k = path + (o.srgb ? '|s' : '') + (o.clamp ? '|c' : '');
  if (tcache[k]) return tcache[k];
  const t = TL.load('assets/' + path);
  if (!o.clamp) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (o.srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4; return tcache[k] = t;
};
// PBR set: diff (sRGB) + normal + arm (AO in R, roughness in G, metal in B)
R.pbr = (slug, mat = {}) => { const arm = R.tex('materials/' + slug + '_arm.jpg'); return new THREE.MeshStandardMaterial(Object.assign({
  map: R.tex('materials/' + slug + '_diff.jpg', { srgb: 1 }), normalMap: R.tex('materials/' + slug + '_nor.jpg'),
  roughnessMap: arm, metalnessMap: arm, aoMap: arm, aoMapIntensity: 1, roughness: 1, metalness: 1, envMapIntensity: 0.25 }, mat)); };
const GL = new THREE.GLTFLoader(), mcache = {};
R.model = slug => mcache[slug] || (mcache[slug] = new Promise(res => GL.load('assets/models/' + slug + '/' + slug + '.json',
  g => { g.scene.traverse(o => { if (o.isMesh && o.material) o.material.envMapIntensity = 0.3; }); res(g.scene); },
  undefined, () => { console.warn('Modelo sin cargar:', slug); res(new THREE.Group()); })));
R.put = async (parent, slug, x, y, z, s = 1, ry = 0) => { const m = (await R.model(slug)).clone(true); m.position.set(x, y, z); if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); m.rotation.y = ry; parent.add(m); return m; };

// geometry with world-scaled UVs (uv2 copies uv so the AO map works)
const uv2 = g => { g.setAttribute('uv2', g.attributes.uv); return g; };
R.box = (w, h, d, mat, tile = 4) => {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile); }
  return new THREE.Mesh(uv2(g), mat);
};
R.plane = (w, h, mat, tile) => {
  const g = new THREE.PlaneGeometry(w, h);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); }
  return new THREE.Mesh(uv2(g), mat);
};
// an irregular stone: a unit box whose corners are nudged, textured from its own patch of the rock
R.stone = (seed, patch = 0.5) => {
  let s = seed * 9301 + 49297; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), p = g.attributes.position, uv = g.attributes.uv, moved = {};
  for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(2) + p.getY(i).toFixed(2) + p.getZ(i).toFixed(2);
    if (!moved[k]) moved[k] = [(rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.05];
    p.setXYZ(i, p.getX(i) + moved[k][0], p.getY(i) + moved[k][1], p.getZ(i) + moved[k][2]); }
  const ox = rnd() * (1 - patch), oy = rnd() * (1 - patch);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * patch, oy + uv.getY(i) * patch);
  g.computeVertexNormals(); return uv2(g);
};
R.add = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; };

function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
R.cv = cv;
R.ctex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
R.textTex = (lines, o = {}) => {
  const w = o.w || 1024, h = o.h || 256;
  return R.ctex(cv(w, h, g => {
    if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.color || '#fff';
    const arr = [].concat(lines), size = o.size || 120, lh = size * (o.lh || 1.25);
    g.font = (o.weight || 900) + ' ' + size + 'px Cinzel, Georgia, serif';
    arr.forEach((s, i) => {
      const y = h / 2 + (i - (arr.length - 1) / 2) * lh, sp = (o.spacing || 0) * size;
      if (!sp) { g.fillText(s, w / 2, y); return; }
      const ws = [...s].map(c => g.measureText(c).width); let x = w / 2 - (ws.reduce((a, b) => a + b, 0) + sp * (s.length - 1)) / 2;
      g.textAlign = 'left'; [...s].forEach((c, k) => { g.fillText(c, x, y); x += ws[k] + sp; }); g.textAlign = 'center';
    });
  }));
};
R.sprite = (file, color, sx, sy, op = 1, add = true) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: R.tex('sprites/' + file + '.png', { clamp: 1 }), color, transparent: true, opacity: op, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }));
  s.scale.set(sx, sy, 1); return s;
};
R.glowMat = (color, op = 1) => new THREE.MeshBasicMaterial({ map: R.tex('sprites/glow_soft.png', { clamp: 1 }), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

// ---- hotspots: real buttons pinned to 3D points, optionally sized to a world rectangle ---
const P = new THREE.Vector3(), P2 = new THREE.Vector3();
R.addHot = h => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hs' + (h.area ? ' area' : ''); b.hidden = true;
  const i = document.createElement('i'), s = document.createElement('span'); b.append(i, s);
  h.txt = typeof h.label === 'function' ? h.label() : h.label; s.textContent = h.txt; b.setAttribute('aria-label', h.aria || h.txt);
  b.addEventListener('click', e => { e.stopPropagation(); if (!R.busy && !R.panelOpen) h.on(h); });
  if (h.hover) { b.addEventListener('pointerenter', () => h.hover(true)); b.addEventListener('pointerleave', () => h.hover(false)); b.addEventListener('focus', () => h.hover(true)); b.addEventListener('blur', () => h.hover(false)); }
  $('#hot').appendChild(b); h.el = b; h.shown = false; R.hot.push(h); return h;
};
function hotUpdate() {
  const w = window.innerWidth, hh = window.innerHeight;
  for (const s of R.hot) {
    let vis = !R.busy && !R.panelOpen && s.when();
    if (vis) {
      P.copy(s.pos).project(camera);
      if (P.z > 1 || P.z < -1 || Math.abs(P.x) > 1.02 || Math.abs(P.y) > 1.02) vis = false;
      else { s.el.style.left = ((P.x * 0.5 + 0.5) * w) + 'px'; s.el.style.top = ((-P.y * 0.5 + 0.5) * hh) + 'px';
        if (s.area) { P2.set(s.pos.x + s.area[0] / 2, s.pos.y + s.area[1] / 2, s.pos.z).project(camera); s.el.style.width = Math.abs(P2.x - P.x) * w + 'px'; s.el.style.height = Math.abs(P2.y - P.y) * hh + 'px'; } }
    }
    if (vis !== s.shown) { s.shown = vis; s.el.hidden = !vis; }
    if (vis && typeof s.label === 'function') { const t = s.label(); if (t !== s.txt) { s.txt = t; s.el.lastChild.textContent = t; } }
  }
}

// ---- HUD: caption, toast, panel ------------------------------------------------------
let toastT = 0, capKeep = ['', ''];
R.cap = (t = '', s = '') => { capKeep = [t, s]; if (!toastT) { $('#capT').textContent = t; $('#capS').textContent = s; } };
R.toast = (s, sec = 3.2) => { $('#capT').textContent = ''; $('#capS').textContent = s; clearTimeout(toastT); toastT = setTimeout(() => { toastT = 0; R.cap(capKeep[0], capKeep[1]); }, sec * 1000); };
R.panel = o => {
  R.panelOpen = true; $('#pK').textContent = o.kick || ''; $('#pT').textContent = o.title || '';
  const B = $('#pB'); B.innerHTML = ''; if (typeof o.body === 'string') B.innerHTML = o.body; else if (o.body) B.append(o.body);
  const A = $('#pA'); A.innerHTML = '';
  (o.acts || []).concat([{ label: o.closeLabel || 'Cerrar', on: null }]).forEach((a, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (a.main ? ' main' : ''); b.id = 'pa' + i; b.textContent = a.label;
    b.addEventListener('click', () => { R.closePanel(); if (a.on) a.on(); else if (o.onClose) o.onClose(); }); A.append(b); });
  $('#panel').className = o.side ? 'side' : ''; $('#panel').hidden = false; R.onEsc = o.onClose || null; const f = A.querySelector('button'); if (f) f.focus();
};
R.closePanel = () => { $('#panel').hidden = true; R.panelOpen = false; };
window.addEventListener('keydown', e => { if (e.key === 'Escape' && R.panelOpen && $('#game').hidden) { R.closePanel(); if (R.onEsc) R.onEsc(); } });

// ---- sound: recorded stone, coins and doors; drone and fire bed are synthesised ------------
let ac = null, master = null, noiseBuf = null, muted = false, amb = {}; const bufs = {};
const SFX = ['stone_drag_1', 'stone_drag_2', 'stone_stop', 'stones_hit', 'rock_hit', 'bell', 'coins', 'door_open', 'creak', 'book_open', 'thud'];
function A() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const n of SFX) fetch('assets/sfx/' + n + '.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(b => { bufs[n] = b; }).catch(() => {}); }
  if (ac.state === 'suspended') ac.resume(); return ac;
}
function sub(f0, f1, peak, dur) { if (!A()) return; const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime; o.frequency.setValueAtTime(f0, n); o.frequency.exponentialRampToValueAtTime(f1, n + dur); g.gain.setValueAtTime(peak, n); g.gain.exponentialRampToValueAtTime(0.0001, n + dur); o.connect(g).connect(master); o.start(n); o.stop(n + dur + 0.1); }
R.sfx = {
  play: (name, vol = 1, rate = 1, loop = false) => { if (!A() || !bufs[name]) return null; const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = bufs[name]; s.playbackRate.value = rate; s.loop = loop; g.gain.value = vol; s.connect(g).connect(master); s.start(); return { stop: (fade = 0.3) => { g.gain.setTargetAtTime(0, ac.currentTime, fade / 3); setTimeout(() => { try { s.stop(); } catch (e) {} }, fade * 1000 + 100); } }; },
  knock: () => { R.sfx.play('thud', 1, 0.7); R.sfx.play('rock_hit', 0.8, 0.6); sub(90, 34, 0.9, 0.5); },
  impact: v => { R.sfx.play('stone_stop', v, 0.6); R.sfx.play('stones_hit', v, 0.5); sub(64, 26, v, 1.6); },
  fail: () => { R.sfx.play('creak', 0.7, 0.7); },
  bell: () => { R.sfx.play('bell', 0.5, 0.5); }
};
function bed(name, build) { if (!amb[name]) { const g = ac.createGain(); g.gain.value = 0; g.connect(master); amb[name] = { g, x: build(g) }; } }
R.amb = levels => {
  if (!A()) return;
  bed('drone', g => [41.2, 61.7, 82.4].map((f, i) => { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = f; og.gain.value = [1, 0.5, 0.2][i]; o.connect(og).connect(g); o.start(); return o; }));
  bed('fire', g => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.6; const cg = ac.createGain(); cg.gain.value = 0.2; s.connect(f).connect(cg).connect(g); s.start(); return cg; });
  bed('rumble', g => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 90; s.connect(f).connect(g); s.start(); return s; });
  for (const k in amb) amb[k].g.gain.setTargetAtTime(levels[k] || 0, ac.currentTime, 0.5);
};
R.upd.push(() => { if (amb.fire && Math.random() < 0.18) amb.fire.x.gain.setTargetAtTime(0.1 + Math.random() * 0.9, ac.currentTime, 0.01); });
R.audio = A;
$('#mute').addEventListener('click', () => { muted = !muted; $('#mute').setAttribute('aria-pressed', muted); $('#mute').textContent = muted ? 'Sin sonido' : 'Sonido'; if (master) master.gain.value = muted ? 0 : 0.9; });

// ---- input + real handheld shake -------------------------------------------------------
window.addEventListener('pointermove', e => { R.mx = (e.clientX / window.innerWidth) * 2 - 1; R.my = (e.clientY / window.innerHeight) * 2 - 1; });
let shake = null;
fetch('assets/camera/shake.json').then(r => r.json()).then(d => { shake = d; }).catch(() => {});
function sh(axis, t, speed) { const a = shake[axis], f = t * shake.fps * speed, i = Math.floor(f) % a.length, j = (i + 1) % a.length, k = f - Math.floor(f); return a[i] * (1 - k) + a[j] * k; }

// ---- frame -----------------------------------------------------------------------------
const up = V(0, 1, 0), tmp = V(0, 0, 0), dir = V(0, 0, 0), right = V(0, 0, 0), acc = V(0, 0, 0);
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000) * (R.speed || 1); last = now; R.t += dt; const t = R.t;
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; if (!w) continue; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(w.e(k)); if (k >= 1) { const j = tweens.indexOf(w); if (j >= 0) tweens.splice(j, 1); w.res(); } }
  for (const u of R.upd) u(dt, t);
  R.sx += (R.mx - R.sx) * 0.05; R.sy += (R.my - R.sy) * 0.05;
  // the lens chases its target on a slightly under-damped spring
  const steps = 4, h = dt / steps;
  for (let i = 0; i < steps; i++) { acc.subVectors(rig.look, rig.cur).multiplyScalar(rig.stiff).addScaledVector(rig.vel, -rig.damp); rig.vel.addScaledVector(acc, h); rig.cur.addScaledVector(rig.vel, h); }
  camera.position.copy(rig.pos);
  dir.subVectors(rig.cur, rig.pos); const dist = dir.length(); dir.normalize(); right.crossVectors(dir, up).normalize();
  tmp.copy(rig.cur).addScaledVector(right, R.sx * dist * 0.06 * rig.par); tmp.y -= R.sy * dist * 0.03 * rig.par;
  camera.lookAt(tmp);
  rig.kick *= Math.exp(-3.8 * dt);
  if (shake && !R.reduced) {
    const a = 0.16 * rig.hand, b = rig.rumble + rig.kick;
    camera.rotateX(sh('x', t, 1) * a + sh('x', t, 3) * b); camera.rotateY(sh('y', t, 1) * a + sh('y', t, 3) * b); camera.rotateZ(sh('z', t, 1) * a + sh('z', t, 3) * b * 0.6);
  }
  const fov = rig.fov * (R.aspect < 1 ? 1.5 : 1); if (Math.abs(camera.fov - fov) > 0.01) camera.fov = fov;
  camera.updateProjectionMatrix();
  film.uniforms.time.value = t % 100;
  composer.render();
  hotUpdate();
}
R.start = () => requestAnimationFrame(frame);
})();
