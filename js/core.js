// Core: renderer, film pipeline, camera rig, tweens, assets, sound, HUD.
(() => {
const R = window.RC = { mode: 'boot', busy: false, speed: 1, t: 0, mx: 0, my: 0, sx: 0, sy: 0, hot: [], upd: [], panelOpen: false };
const $ = R.$ = s => document.querySelector(s);
const V = R.V = (x, y, z) => new THREE.Vector3(x, y, z);
R.phone = matchMedia('(max-width:700px), (pointer:coarse)').matches;
R.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- per-visitor state -------------------------------------------------------
const KEY = 'rc-v1', save = { coins: 0, opened: [], found: [], visited: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
R.save = save;
R.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
R.gradeName = ['Aprendiz', 'Compañero', 'Maestro'];
R.grade = () => save.found.length >= 3 ? 2 : save.opened.length >= 5 ? 1 : 0;
R.hud = () => { $('#coins').textContent = save.coins; $('#grade').textContent = R.gradeName[R.grade()]; };
R.coins = n => { save.coins = Math.max(0, save.coins + n); R.persist(); R.hud(); if (n > 0) R.sfx.coin(); };
R.checkGrade = before => { if (R.grade() > before) { R.toast('Grado: ' + R.gradeName[R.grade()]); R.sfx.ding(); } R.hud(); };
R.found = id => { if (save.found.includes(id)) return false; const g = R.grade(); save.found.push(id); R.persist(); R.checkGrade(g); return true; };

// ---- renderer + film pipeline --------------------------------------------------
const canvas = $('#gl');
const renderer = R.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R.phone ? 1.25 : 1.5));
const scene = R.scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = R.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 3000);
R.rig = { pos: V(0, 1.7, 150), look: V(0, 25, -300), fov: 50, shake: 0, par: 1 };

const rt = new THREE.WebGLRenderTarget(4, 4, { type: renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const composer = new THREE.EffectComposer(renderer, rt);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloom = R.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.75, 0.82);
composer.addPass(bloom);
const film = R.film = new THREE.ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fade: { value: 0 }, bars: { value: 0.1 }, exposure: { value: 1 }, aberr: { value: 0.3 }, tint: { value: new THREE.Vector3(1.05, 1.0, 0.93) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, fade, bars, exposure, aberr; uniform vec3 tint; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+time*41.0)*43758.5453); }
    void main(){
      vec2 d=vUv-0.5; float r2=dot(d,d);
      vec3 c; c.r=texture2D(tDiffuse,vUv+d*aberr*r2*0.03).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*aberr*r2*0.03).b;
      c=aces(c*exposure)*tint; c=pow(c,vec3(1.0/2.2));
      float lum=dot(c,vec3(0.3,0.59,0.11)); c=mix(vec3(lum),c,1.12);
      c*=mix(1.0,smoothstep(0.92,0.18,length(d*vec2(1.0,1.12))),0.9);
      c+=(hash(gl_FragCoord.xy)-0.5)*0.055;
      c*=step(bars,vUv.y)*step(vUv.y,1.0-bars);
      gl_FragColor=vec4(c*fade,1.0);
    }`
});
composer.addPass(film);
R.fade = (to, dur = 0.8) => { const a = film.uniforms.fade.value; return R.tw(dur, k => { film.uniforms.fade.value = a + (to - a) * k; }, 'lin'); };
R.look = o => { if (o.exposure != null) film.uniforms.exposure.value = o.exposure; if (o.bloom != null) bloom.strength = o.bloom; if (o.fog !== undefined) scene.fog = o.fog; };

function resize() {
  const w = window.innerWidth, h = window.innerHeight, a = w / h;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  camera.aspect = a; R.aspect = a;
  film.uniforms.bars.value = a > 1 ? Math.max(0, Math.min(0.13, (1 - a / 2.39) / 2)) : 0.055;
}
window.addEventListener('resize', resize); resize();

// ---- time: tweens ------------------------------------------------------------------
const tweens = [];
R.ease = { io: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, out: x => 1 - Math.pow(1 - x, 3), in: x => x * x * x, lin: x => x };
R.tw = (dur, fn, ease = 'io') => new Promise(res => { if (dur <= 0 || R.skipping) { fn(1); res(); return; } tweens.push({ t: 0, dur, fn, e: R.ease[ease], res }); });
R.wait = s => R.tw(s, () => {}, 'lin');
R.to = (v, target, dur, ease) => { const a = v.clone(); return R.tw(dur, k => v.lerpVectors(a, target, k), ease); };
R.cam = (pos, look, dur, ease) => Promise.all([R.to(R.rig.pos, pos, dur, ease), R.to(R.rig.look, look, dur, ease)]);
R.num = (obj, key, to, dur, ease) => { const a = obj[key]; return R.tw(dur, k => { obj[key] = a + (to - a) * k; }, ease); };
R.skipAll = () => { for (const w of tweens.splice(0)) { w.fn(1); w.res(); } };

// ---- assets ------------------------------------------------------------------------
let idle = true;
THREE.DefaultLoadingManager.onStart = () => { idle = false; };
THREE.DefaultLoadingManager.onLoad = () => { idle = true; };
THREE.DefaultLoadingManager.onError = u => console.warn('No ha cargado', u);
R.loaded = (max = 30) => new Promise(res => { const t0 = performance.now(); (function poll() { if (idle || performance.now() - t0 > max * 1000) res(); else setTimeout(poll, 120); })(); });
const TL = new THREE.TextureLoader(), tcache = {};
R.tex = (path, o = {}) => {
  const k = path + (o.srgb ? '|s' : '') + (o.clamp ? '|c' : '');
  if (tcache[k]) return tcache[k];
  const t = TL.load('assets/' + path);
  if (!o.clamp) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (o.srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4; return tcache[k] = t;
};
R.pbr = (slug, mat = {}) => new THREE.MeshStandardMaterial(Object.assign({
  map: R.tex('t/' + slug + '_diff.jpg', { srgb: 1 }), normalMap: R.tex('t/' + slug + '_nor.jpg'),
  roughnessMap: R.tex('t/' + slug + '_arm.jpg'), metalnessMap: R.tex('t/' + slug + '_arm.jpg'),
  roughness: 1, metalness: 1, envMapIntensity: 0.3 }, mat));
const GL = new THREE.GLTFLoader(), mcache = {};
R.model = slug => mcache[slug] || (mcache[slug] = new Promise(res => GL.load('assets/m/' + slug + '/' + slug + '.json',
  g => { g.scene.traverse(o => { if (o.isMesh && o.material) o.material.envMapIntensity = 0.4; }); res(g.scene); },
  undefined, e => { console.warn('Modelo sin cargar:', slug); res(new THREE.Group()); })));
R.put = async (parent, slug, x, y, z, s = 1, ry = 0) => { const m = (await R.model(slug)).clone(true); m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = ry; parent.add(m); return m; };

// geometry helpers with world-scaled UVs
R.box = (w, h, d, mat, tile = 4) => {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile); }
  return new THREE.Mesh(g, mat);
};
R.plane = (w, h, mat, tile) => {
  const g = new THREE.PlaneGeometry(w, h);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); }
  return new THREE.Mesh(g, mat);
};
R.add = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; };

// procedural sprites
function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
R.cv = cv;
R.ctex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
R.glowTex = R.ctex(cv(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }));
R.flameTex = R.ctex(cv(64, 128, (g) => { g.translate(32, 86); g.scale(1, 1.9); const r = g.createRadialGradient(0, 0, 0, 0, 0, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-32, -60, 64, 120); }));
R.textTex = (lines, o = {}) => {
  const w = o.w || 1024, h = o.h || 256;
  return R.ctex(cv(w, h, g => {
    if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
    if (o.mirror) { g.translate(w, 0); g.scale(-1, 1); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = o.color || '#fff';
    const arr = [].concat(lines), size = o.size || 120, lh = size * (o.lh || 1.25);
    g.font = (o.weight || 900) + ' ' + size + 'px ' + (o.font || 'Cinzel, Georgia, serif');
    arr.forEach((s, i) => {
      const y = h / 2 + (i - (arr.length - 1) / 2) * lh, sp = (o.spacing || 0) * size;
      if (!sp) { g.fillText(s, w / 2, y); return; }
      const ws = [...s].map(c => g.measureText(c).width); let x = w / 2 - (ws.reduce((a, b) => a + b, 0) + sp * (s.length - 1)) / 2;
      g.textAlign = 'left'; [...s].forEach((c, k) => { g.fillText(c, x, y); x += ws[k] + sp; }); g.textAlign = 'center';
    });
  }));
};
R.sprite = (tex, color, sx, sy, op = 1, add = true) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: op, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }));
  s.scale.set(sx, sy, 1); return s;
};
R.glowMat = (color, op = 1) => new THREE.MeshBasicMaterial({ map: R.glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

// fire: a stack of rising additive sprites, optional flickering light
R.fire = (size = 1, light) => {
  const g = new THREE.Group(), sp = [], n = 7;
  for (let i = 0; i < n; i++) { const s = R.sprite(R.flameTex, 0xff6a1a, size, size * 1.7, 0.9); s.userData.ph = i / n; g.add(s); sp.push(s); }
  const core = R.sprite(R.glowTex, 0xff8a30, size * 3.4, size * 3.4, 0.5); core.position.y = size * 0.5; g.add(core);
  g.userData.lit = 1; if (light) light.userData.base = light.intensity;
  R.upd.push((dt, t) => {
    const L = g.userData.lit;
    for (const s of sp) {
      const ph = s.userData.ph, k = (t * 0.85 + ph) % 1;
      s.position.set(Math.sin((k + ph) * 12) * size * 0.13 * k, k * size * 1.5, Math.cos(k * 9 + ph * 5) * size * 0.1 * k);
      const sc = size * (1 - k * 0.75); s.scale.set(sc, sc * 1.7, 1);
      s.material.opacity = L * (1 - k) * 0.75; s.material.color.setRGB(1.7, 0.32 + 0.5 * (1 - k), 0.05 + 0.22 * (1 - k) * (1 - k));
    }
    core.material.opacity = L * (0.24 + 0.06 * Math.sin(t * 17) + 0.04 * Math.sin(t * 29.3));
    if (light) light.intensity = light.userData.base * L * (0.8 + 0.2 * Math.sin(t * 13) + 0.12 * Math.sin(t * 31));
  });
  return g;
};

// ---- hotspots (real buttons pinned to 3D points) -------------------------------------
const P = new THREE.Vector3();
R.addHot = h => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hs' + (h.quiet ? ' quiet' : ''); b.hidden = true;
  const i = document.createElement('i'), s = document.createElement('span'); b.append(i, s);
  h.txt = typeof h.label === 'function' ? h.label() : h.label; s.textContent = h.txt; b.setAttribute('aria-label', h.aria || h.txt);
  b.addEventListener('click', e => { e.stopPropagation(); if (!R.busy && !R.panelOpen) h.on(h); });
  $('#hot').appendChild(b); h.el = b; h.shown = false; R.hot.push(h); return h;
};
function hotUpdate() {
  const w = window.innerWidth, hh = window.innerHeight;
  for (const s of R.hot) {
    let vis = !R.busy && !R.panelOpen && s.when();
    if (vis) {
      P.copy(s.pos).project(camera);
      if (P.z > 1 || P.z < -1 || Math.abs(P.x) > 0.96 || Math.abs(P.y) > 0.9) vis = false;
      else { s.el.style.left = ((P.x * 0.5 + 0.5) * w) + 'px'; s.el.style.top = ((-P.y * 0.5 + 0.5) * hh) + 'px'; }
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
  const acts = (o.acts || []).concat([{ label: o.closeLabel || 'Cerrar', on: null }]);
  acts.forEach((a, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (a.main ? ' main' : ''); b.id = 'pa' + i; b.textContent = a.label;
    b.addEventListener('click', () => { if (a.keep) { a.on(); return; } R.closePanel(); if (a.on) a.on(); else if (o.onClose) o.onClose(); }); A.append(b); });
  $('#panel').hidden = false; R.sfx.stone(0.35); const f = B.querySelector('input') || A.querySelector('button'); if (f) f.focus();
};
R.closePanel = () => { $('#panel').hidden = true; R.panelOpen = false; };
window.addEventListener('keydown', e => { if (e.key === 'Escape' && R.panelOpen) { R.closePanel(); if (R.onEsc) R.onEsc(); } });

// ---- sound: everything synthesised -------------------------------------------------
let ac = null, master = null, noiseBuf = null, muted = false, amb = {};
function A() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  if (ac.state === 'suspended') ac.resume(); return ac;
}
function env(g, peak, a, d) { const n = ac.currentTime; g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(peak, n + a); g.gain.exponentialRampToValueAtTime(0.0001, n + a + d); }
function osc(f0, f1, peak, dur, type = 'sine') { if (!A()) return; const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime; o.type = type; o.frequency.setValueAtTime(f0, n); if (f1) o.frequency.exponentialRampToValueAtTime(f1, n + dur); env(g, peak, 0.005, dur); o.connect(g).connect(master); o.start(n); o.stop(n + dur + 0.1); }
function noise(freq, q, peak, a, d, type = 'lowpass') { if (!A()) return; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, peak, a, d); s.connect(f).connect(g).connect(master); s.start(); s.stop(ac.currentTime + a + d + 0.1); }
R.sfx = {
  knock: () => { osc(98, 34, 1.0, 0.5); noise(220, 1, 0.5, 0.004, 0.18); },
  stone: (v = 1) => { noise(260, 0.8, 0.7 * v, 0.08, 1.1 * v + 0.2); osc(52, 38, 0.5 * v, 0.9); },
  coin: () => { osc(1760, 0, 0.16, 0.5); setTimeout(() => osc(2640, 0, 0.12, 0.7), 70); },
  ding: () => { osc(880, 0, 0.2, 1.4); osc(1318.5, 0, 0.12, 1.6); },
  low: () => { osc(60, 28, 0.9, 1.6); },
  whoosh: () => { noise(700, 0.7, 0.3, 0.5, 0.9, 'bandpass'); },
  fail: () => { osc(196, 92, 0.3, 0.7, 'sawtooth'); },
  rumble: s => { noise(120, 0.5, 0.8, 1.2, s); osc(34, 30, 0.5, s); }
};
function loop(name, build) { if (!amb[name]) { const g = ac.createGain(); g.gain.value = 0; g.connect(master); amb[name] = { g, x: build(g) }; } return amb[name]; }
R.amb = levels => {
  if (!A()) return;
  loop('drone', g => [41.2, 61.7, 82.4].map((f, i) => { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = f; og.gain.value = [1, 0.5, 0.2][i]; o.connect(og).connect(g); o.start(); return o; }));
  loop('fire', g => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.6; const cg = ac.createGain(); cg.gain.value = 0.2; s.connect(f).connect(cg).connect(g); s.start(); return cg; });
  loop('hum', g => { const o = ac.createOscillator(), f = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 55; f.type = 'lowpass'; f.frequency.value = 180; o.connect(f).connect(g); o.start(); return o; });
  loop('club', g => { const o = ac.createOscillator(), f = ac.createBiquadFilter(), lf = ac.createOscillator(), lg = ac.createGain(); o.type = 'sine'; o.frequency.value = 49; f.type = 'lowpass'; f.frequency.value = 120; lf.type = 'square'; lf.frequency.value = 2.1; lg.gain.value = 0.5; lf.connect(lg).connect(g.gain); o.connect(f).connect(g); o.start(); lf.start(); return o; });
  for (const k in amb) amb[k].g.gain.setTargetAtTime(levels[k] || 0, ac.currentTime, 0.6);
};
R.upd.push(() => { if (amb.fire && Math.random() < 0.18) amb.fire.x.gain.setTargetAtTime(0.1 + Math.random() * 0.9, ac.currentTime, 0.01); });
R.audio = A;
$('#mute').addEventListener('click', () => { muted = !muted; $('#mute').setAttribute('aria-pressed', muted); $('#mute').textContent = muted ? 'Sin sonido' : 'Sonido'; if (master) master.gain.value = muted ? 0 : 0.8; });

// ---- input ---------------------------------------------------------------------------
window.addEventListener('pointermove', e => { R.mx = (e.clientX / window.innerWidth) * 2 - 1; R.my = (e.clientY / window.innerHeight) * 2 - 1; });
let twoHeld = 0;
window.addEventListener('keydown', e => { if (e.key === '2' && !e.repeat && !(e.target && e.target.tagName === 'INPUT')) { R.speed = 2; R.toast('2x', 1); } });
window.addEventListener('keyup', e => { if (e.key === '2') R.speed = 1; });
R.upd.push(dt => { if (R.speed === 2) { twoHeld += dt; if (twoHeld > 6 && R.found('2x')) { R.coins(3); R.toast('A 2x se ve lo que a velocidad normal no. +3'); } } });

// ---- frame ---------------------------------------------------------------------------
const up = V(0, 1, 0), tmp = V(0, 0, 0), dir = V(0, 0, 0), right = V(0, 0, 0);
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000) * R.speed; last = now; R.t += dt;
  for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(w.e(k)); if (k >= 1) { const j = tweens.indexOf(w); if (j >= 0) tweens.splice(j, 1); w.res(); } }
  for (const u of R.upd) u(dt, R.t);
  R.sx += (R.mx - R.sx) * 0.05; R.sy += (R.my - R.sy) * 0.05;
  const rig = R.rig, t = R.t;
  camera.position.copy(rig.pos);
  if (rig.shake > 0 && !R.reduced) { camera.position.x += (Math.sin(t * 47) * 0.6 + Math.sin(t * 31) * 0.4) * rig.shake; camera.position.y += Math.cos(t * 53) * rig.shake; }
  dir.subVectors(rig.look, rig.pos); const dist = dir.length(); dir.normalize(); right.crossVectors(dir, up).normalize();
  tmp.copy(rig.look).addScaledVector(right, R.sx * dist * 0.12 * rig.par); tmp.y -= R.sy * dist * 0.06 * rig.par;
  camera.lookAt(tmp);
  const fov = rig.fov * (R.aspect < 1 ? 1.32 : 1); if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; }
  camera.updateProjectionMatrix();
  film.uniforms.time.value = t % 100;
  composer.render();
  hotUpdate();
}
R.start = () => requestAnimationFrame(frame);
})();
