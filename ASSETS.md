# Assets

Todo lo que se ve o se oye y no es código propio. Todo es CC0.

| Elemento | Recurso | Fuente | Por qué este | Licencia |
|---|---|---|---|---|
| Piedra de los bloques de la pirámide, pilastras y tablillas | `Rock058` (color, normal, roughness, AO) | petroulacl/fps-asset-kit (ambientCG) | Roca gris agrietada: cada bloque usa su propio recorte, así no se repite | CC0 |
| Muro de la cripta | `stone_block_wall` | Poly Haven, vía cc0-asset-index | Sillar oscuro y grande, sin musgo | CC0 |
| Losas de los nichos | `old_sandstone_02` | Poly Haven | Arenisca estratificada: se lee como losa tallada, distinta del muro | CC0 |
| Suelo de la cripta | `slate_floor_02` | Poly Haven | Pizarra irregular | CC0 |
| Tierra de la avenida | `stony_dirt_path` | Poly Haven | Tierra oscura con piedra suelta | CC0 |
| Cascote al pie de la pirámide | `rubble` | Poly Haven | Es el suelo que la pirámide rompe al subir | CC0 |
| Calzada | `asphalt_04` | Poly Haven | Asfalto gastado | CC0 |
| Rocas grandes y cascotes | `boulder_01`, `rock_07` | Poly Haven | Grande detrás y pequeño delante, para dar escala | CC0 |
| Braseros | `stone_fire_pit` | Poly Haven | Cuenco de piedra para el fuego | CC0 |
| Puerta | `large_castle_door` | Poly Haven | Dos hojas separadas que se pueden abrir | CC0 |
| Farolas | `street_lamp_01` | Poly Haven | Farola clásica | CC0 |
| Estatuas | `gothic_statue` | Poly Haven | Guardianes de la cripta | CC0 |
| Cielo | `qwantani_night_puresky`, `qwantani_dusk_2_puresky` | Poly Haven | Cielo sin horizonte propio, para no chocar con la ciudad | CC0 |
| Fuego, humo, polvo, cascotes, brasas, sello | `fire_01`, `flame_05`, `smoke_01/04/07`, `dirt_02`, `glow_soft`, `magic_03` | SkyeShark/eidoverse-video (Kenney Particle Pack) | Una textura por capa del efecto | CC0 |
| Piedra que arrastra, golpes, monedas, puerta, campana | `assets/sfx/*.mp3` | eturner58/game-assets (Kenney Foley, Impact y RPG Audio), convertidos de .ogg a .mp3 | Sonido grabado de piedra contra piedra | CC0 |
| Temblor de cámara | `assets/camera/shake.json` | EatTheFuture/camera_shakify, grabación "Investigation" | Pulso de una cámara real | CC0 |

Hecho desde cero, y qué se buscó antes:

- **Geometría de la pirámide, el muro y los nichos.** No existe un modelo de pirámide ni de muro de nichos en las fuentes: se construyen con bloques y se visten con los materiales de arriba.
- **Fachadas y ventanas de las torres y la ciudad.** Se buscó `facade` y `window` en el índice: solo hay azulejos de fachada, no edificios de noche. Son texturas generadas por código.
- **El ojo, el nombre tallado y los números romanos.** Son texto y dibujo propios.
- **Zumbido grave, lecho de fuego y subgraves de los impactos.** Sintetizados en el navegador; no hay equivalente en las bibliotecas de audio.

El motor 3D es three.js r128 (MIT), cargado desde CDN. Las tipografías son Cinzel y Spectral, de Google Fonts.
