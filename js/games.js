// Three games. All of them are won by not doing: holding, hiding, waiting.
(() => {
const R = window.RC, $ = R.$, cv = $('#gc'), c = cv.getContext('2d'), W = 960, H = 540;
const P = { down: false, x: W / 2, y: H / 2 };
let raf = 0, live = null, cur = null;
const pos = e => { const r = cv.getBoundingClientRect(); P.x = (e.clientX - r.left) / r.width * W; P.y = (e.clientY - r.top) / r.height * H; };
cv.addEventListener('pointerdown', e => { e.preventDefault(); pos(e); P.down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (live && live.tap) live.tap(); });
cv.addEventListener('pointermove', pos);
for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { P.down = false; });
cv.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { P.down = true; if (live && live.tap) live.tap(); } } });
cv.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') P.down = false; });
cv.tabIndex = 0;

const gold = '#e8c06a', ember = '#ff5a1f';
function bg(a, b) { const g = c.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 620); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function label(s, y, size = 30, col = gold) { c.font = '700 ' + size + 'px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, W / 2, y); }

const GAMES = {
  juega: {
    title: 'Juega', prize: 3,
    how: 'Ella te sostiene la mirada. Mantén pulsado sobre sus ojos y síguelos. Si sueltas o apartas la vista antes de que parpadee, pierdes.',
    make: () => {
      const blinkAt = 7 + Math.random() * 5; let t = 0, held = false, off = 0, lid = 0;
      return { step(dt) {
        t += dt; const ex = W / 2 + Math.sin(t * 0.7) * 150 + Math.sin(t * 1.9) * 40, ey = H / 2 - 20 + Math.cos(t * 0.9) * 60;
        if (P.down) held = true;
        const feint = Math.max(0, Math.sin(t * 1.3 + 1) - 0.9) * 6; lid = t > blinkAt ? Math.min(1, (t - blinkAt) * 6) : Math.min(0.75, feint);
        bg('#07182a', '#01040a');
        for (const s of [-1, 1]) { const x = ex + s * 92; c.save(); c.translate(x, ey);
          c.fillStyle = '#e9f2f4'; c.beginPath(); c.moveTo(-62, 0); c.quadraticCurveTo(0, -46 * (1 - lid), 62, 0); c.quadraticCurveTo(0, 46 * (1 - lid), -62, 0); c.fill(); c.clip();
          c.fillStyle = '#2aa7c9'; c.beginPath(); c.arc((P.x - x) * 0.02, (P.y - ey) * 0.02, 25, 0, 7); c.fill(); c.fillStyle = '#02060a'; c.beginPath(); c.arc((P.x - x) * 0.02, (P.y - ey) * 0.02, 11, 0, 7); c.fill(); c.restore(); }
        const d = Math.hypot(P.x - ex, P.y - ey), ok = P.down && d < 150;
        c.strokeStyle = ok ? gold : ember; c.lineWidth = 2; c.setLineDash([6, 10]); c.beginPath(); c.arc(ex, ey, 150, 0, 7); c.stroke(); c.setLineDash([]);
        if (!held) { label('Pulsa y no sueltes', H - 46, 22); if (t > 6) return 'lose:No has mirado.'; return; }
        if (t > blinkAt + 0.25) return 'win:Parpadeó ella.';
        if (!ok) { off += dt; if (off > 0.45) return P.down ? 'lose:Apartaste la vista.' : 'lose:Soltaste antes.'; } else off = Math.max(0, off - dt);
        c.fillStyle = gold; c.fillRect(W / 2 - 200, H - 40, 400 * Math.min(1, t / 12), 3);
      } };
    }
  },
  ojo: {
    title: 'El ojo', prize: 4,
    how: 'El ojo te busca. Mueve el puntero por la sombra y aguanta veinte segundos sin que la luz te encuentre.',
    make: () => {
      let t = 0, lx = W / 2, ly = 80, vx = 0, vy = 0, hit = 0; P.x = W / 2; P.y = H - 60;
      return { step(dt) {
        t += dt; const sp = 520 + t * 38, lag = 0.55 - Math.min(0.3, t * 0.012);
        const tx = P.x + Math.sin(t * 2.3) * 120 * (1 - t / 30), ty = P.y + Math.cos(t * 1.7) * 90 * (1 - t / 30);
        vx += ((tx - lx) / lag - vx) * dt * 3; vy += ((ty - ly) / lag - vy) * dt * 3; const v = Math.hypot(vx, vy); if (v > sp) { vx *= sp / v; vy *= sp / v; }
        lx += vx * dt; ly += vy * dt; const rad = 78 + t * 1.5;
        bg('#0a0806', '#000');
        const g = c.createRadialGradient(lx, ly, 0, lx, ly, rad * 1.5); g.addColorStop(0, 'rgba(255,225,160,.95)'); g.addColorStop(0.6, 'rgba(255,170,70,.35)'); g.addColorStop(1, 'rgba(255,120,30,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, ly, rad * 1.5, 0, 7); c.fill();
        c.fillStyle = '#02060a'; c.beginPath(); c.ellipse(lx, ly, 9, 30, 0, 0, 7); c.fill();
        const inside = Math.hypot(P.x - lx, P.y - ly) < rad; c.fillStyle = inside ? ember : '#cfd6da'; c.beginPath(); c.arc(P.x, P.y, 7, 0, 7); c.fill();
        if (inside) { hit += dt; if (hit > 0.4) return 'lose:L no es tan listo, pero tú tampoco.'; } else hit = Math.max(0, hit - dt * 0.5);
        c.fillStyle = gold; c.fillRect(W / 2 - 200, H - 26, 400 * Math.min(1, t / 20), 3);
        if (t >= 20) return 'win:El ojo te ha perdido el rastro.';
      } };
    }
  },
  tres: {
    title: 'A la de tres', prize: 3,
    how: 'El péndulo cuenta cada vez que pasa por el centro: uno, dos, tres. Toca solo en el tres. Tres rondas, cada una más rápida. El que se precipita pierde.',
    make: () => {
      let round = 0, t = 0, count = 0, last = 1, flash = 0, word = '', okUntil = -1, done = false, wait = 0.8; const half = [1.05, 0.8, 0.6], names = ['Uno', 'Dos', 'Tres'];
      const o = { tap() { if (done || wait > 0) return; if (t <= okUntil) { round++; count = 0; wait = 1.0; word = round < 3 ? 'Bien' : ''; flash = 1; okUntil = -1; R.sfx.bell(); if (round >= 3) done = 'win:Despierta.'; } else done = count === 2 ? 'lose:Tarde.' : 'lose:Te has precipitado.'; },
        step(dt) {
          if (done) return done; if (wait > 0) { wait -= dt; t = 0; last = 1; }
          t += dt; const hp = half[Math.min(2, round)], a = Math.cos(t * Math.PI / hp), s = Math.sign(a) || 1;
          if (wait <= 0 && s !== last) { last = s; if (count === 3) return 'lose:Se te ha pasado el tres.'; word = names[count]; flash = 1; count++; if (count === 3) okUntil = t + 0.16; R.sfx.knock(); }
          if (count === 3 && t > okUntil + 0.25 && okUntil > 0) return 'lose:Se te ha pasado el tres.';
          flash = Math.max(0, flash - dt * 1.6);
          bg('#140d07', '#000'); const px = W / 2, py = 40, len = 330, ang = a * 0.75, bx = px + Math.sin(ang) * len, by = py + Math.cos(ang) * len;
          c.strokeStyle = '#6b4a22'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
          c.strokeStyle = 'rgba(232,192,106,.25)'; c.setLineDash([4, 8]); c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + len + 60); c.stroke(); c.setLineDash([]);
          const g = c.createRadialGradient(bx - 8, by - 8, 2, bx, by, 30); g.addColorStop(0, '#fff0b8'); g.addColorStop(0.5, gold); g.addColorStop(1, '#6b4a22'); c.fillStyle = g; c.beginPath(); c.arc(bx, by, 28, 0, 7); c.fill();
          c.globalAlpha = flash; label(word, H - 90, 64); c.globalAlpha = 1; label('Ronda ' + Math.min(3, round + 1) + ' de 3', H - 28, 16, '#6b4a22');
        } };
      return o;
    }
  }
};

function loop(ts) {
  if (!live) return; const now = ts / 1000, dt = Math.min(0.05, now - (loop.last || now)); loop.last = now;
  const r = live.step(dt);
  if (r) { const [res, msg] = r.split(':'); live = null; end(res === 'win', msg); return; }
  raf = requestAnimationFrame(loop);
}
function end(win, msg) {
  const G = GAMES[cur];
  if (win) { R.coins(G.prize); $('#gP').textContent = msg + ' Te llevas ' + G.prize + ' monedas.'; } else { R.sfx.fail(); $('#gP').textContent = msg; }
  $('#gGo').textContent = 'Otra vez'; $('#gGo').hidden = false; $('#gGo').focus();
}
function idle() { bg('#120c07', '#000'); label(GAMES[cur].title.toUpperCase(), H / 2, 54); }
R.games = {
  play(id) { cur = id; const G = GAMES[id]; R.panelOpen = true; $('#game').hidden = false; $('#gT').textContent = G.title; $('#gP').textContent = G.how; $('#gGo').textContent = 'Empezar'; $('#gGo').hidden = false; idle(); $('#gGo').focus(); },
  close() { live = null; cancelAnimationFrame(raf); $('#game').hidden = true; R.panelOpen = false; }
};
$('#gGo').addEventListener('click', () => { R.audio(); P.down = false; live = GAMES[cur].make(); loop.last = 0; $('#gGo').hidden = true; $('#gP').textContent = GAMES[cur].how; cv.focus(); raf = requestAnimationFrame(loop); });
$('#gX').addEventListener('click', R.games.close);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#game').hidden) R.games.close(); });
})();
