# AURA VISION 9.8 — Rostros en los partidos

Los modelos de Lamine Yamal, Lionel Messi, Kylian Mbappé, Vinícius Júnior y Erling Haaland reciben una textura de rostro obtenida del retrato de FC 27 y ajustes acotados de mandíbula, nariz y separación ocular. La fotografía se deforma por puntos de referencia sobre la cabeza animada; no se muestra una imagen plana delante del jugador. Los ojos usan la misma proyección para mantenerlos alineados. Lamine usa las puntas rubias de su retrato de referencia.

Las identidades numéricas y `originalId` conservan la cara en fichajes, cartas de eventos y sustituciones. Los nombres completos y sus variantes conocidas permiten resolver los planteles anteriores. Las identidades numéricas contradictorias no reciben la foto de otro jugador.

El modo WebGL reutiliza la malla de 17 huesos, añade un material al frente de la cabeza y comparte la textura de cada estrella. Las fotografías se cargan desde el mismo repositorio, sin depender de proveedores externos al jugar. Son cinco PNG de unos 108 KB en total y texturas de 256 × 256 por jugador presente. Si la carga falla, se conserva el color de piel y el partido continúa. La liberación del partido cancela actualizaciones pendientes.

El modo compatible aplica las mismas texturas a mapas UV proyectados en las 22 animaciones y 16 direcciones, con profundidad para ocultarlas detrás de brazos/cuerpo. Estos cuatro mapas añaden aproximadamente 230 KB y no cambian los atlas de los demás jugadores. La silueta de cabeza del modo compatible continúa siendo la de su atlas; los ajustes geométricos individuales se aplican en WebGL.

Las entradas de teléfono y escritorio usan rutas nuevas para evitar la mezcla de scripts de 9.7 y 9.8. El enlace, el origen del sitio y las claves de guardado se conservan.

## Alcance y validación

**No son las cabezas 3D escaneadas, peinados originales ni materiales de EA SPORTS FC 27.** El parecido es aproximado, especialmente de perfil. El resto de futbolistas conserva los perfiles procedurales previos.

Las imágenes originales y sus hashes se registran en `assets/faces/sources.json`. No se les atribuye una licencia libre ni se ha extraído ningún modelo del juego.

Se comprobaron en navegador la carga de cinco texturas y las caras ampliadas del motor compatible. El navegador disponible tiene WebGL desactivado: no se pudo verificar la imagen final ni el rendimiento de GPU en iPhone. La construcción de la escena WebGL, sus geometrías finitas, materiales, huesos, sustituciones y recursos compartidos se prueban en Node. La suite completa y la construcción de producción se ejecutan antes de publicar.

Para regenerar únicamente los mapas del modo compatible: `python scripts/bake-face-uv-98.py` (NumPy, Pillow y compilador C++). Las fotos originales no se alteran.
