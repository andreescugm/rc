// Boot: load the street, then wait for the first touch.
(() => {
const R = window.RC, $ = R.$;
const d = new Date(); $('#hour').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
console.log('%cL no es tan listo.', 'font:700 22px Georgia;color:#e8c06a;background:#0b0907;padding:10px 16px');
R.hud(); R.start();
(async () => {
  try { if (document.fonts) await Promise.all([document.fonts.load('900 60px Cinzel'), document.fonts.load('700 20px Cinzel')]); } catch (e) {}
  await R.outside.build(); await R.loaded(45);
  const b = $('#enter'); b.disabled = false; b.textContent = 'Toca'; b.focus();
  b.addEventListener('click', () => { R.audio(); $('#veil').classList.add('off'); $('#hud').hidden = false; if (R.save.visited) R.outside.show(); else R.outside.intro(); }, { once: true });
})();
})();
