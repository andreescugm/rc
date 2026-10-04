# Rumi Caín

La web de Rumi Caín como un edificio en 3D: la pirámide en Plaza de Castilla, el ascensor de símbolos, las plantas y una cripta de treinta nichos.

Es un sitio estático. No hay build: `index.html` carga `js/` y `assets/` con rutas relativas.

## Verlo en local

```
python3 -m http.server 8000
```

y abrir `http://localhost:8000`. Abrir `index.html` con doble clic no funciona, porque el navegador bloquea la carga de modelos y texturas desde `file://`.

## Estructura

- `index.html`: página, estilos y la interfaz que flota sobre el 3D.
- `js/core.js`: render, cámara, sonido, monedas y grados.
- `js/outside.js`: la Castellana, las torres y la pirámide.
- `js/lift.js`: el ascensor.
- `js/rooms.js`: La Nuit, el piso, la sala de juntas y el club.
- `js/crypt.js`: la cripta y el contenido de los nichos.
- `js/games.js`: los tres juegos.
- `assets/`: modelos, texturas y cielos.

## Créditos

- Modelos 3D, texturas y cielos: [Poly Haven](https://polyhaven.com), licencia CC0.
- Motor 3D: [three.js](https://threejs.org) r128, licencia MIT, cargado desde CDN. `assets/cloud.png` y `assets/spark1.png` vienen de sus ejemplos.
- Tipografías: Cinzel y Spectral, de Google Fonts.
