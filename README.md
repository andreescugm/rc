# Rumi Caín

La web de Rumi Caín en 3D: una pirámide de piedra que sube en Plaza de Castilla y, dentro, una cripta con un muro de veinticuatro nichos.

Es un sitio estático. No hay build: `index.html` carga `js/` y `assets/` con rutas relativas.

## Verlo en local

```
python3 -m http.server 8000
```

y abrir `http://localhost:8000`. Abrir `index.html` con doble clic no funciona, porque el navegador bloquea la carga de modelos y texturas desde `file://`.

## Estructura

- `index.html`: página, estilos y la interfaz que flota sobre el 3D.
- `js/core.js`: render, pase de película, cámara con muelle y temblor real, sonido, monedas.
- `js/vfx.js`: un sistema de partículas en GPU y sus presets (fuego, polvo, cascotes).
- `js/outside.js`: la Castellana, las torres y la pirámide que sube.
- `js/crypt.js`: la cripta, el muro de nichos y lo que guardan.
- `js/games.js`: los tres juegos para ganar plata.
- `assets/`: modelos, materiales, sprites, cielos, sonido y temblor de cámara.

De dónde sale cada recurso y por qué se eligió: [ASSETS.md](ASSETS.md).
