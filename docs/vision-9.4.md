# AURA VISION 9.4 — jugadores y estadio

## Cambios jugables del renderizado

- El modo compatible usa imágenes de la malla humana a 128 × 224 píxeles por pose, frente a 96 × 176. Son aproximadamente un 70 % más de píxeles por imagen, sin aumentar la escala de los futbolistas en el campo.
- La carrera pasa de seis a doce poses y comparte la fase de la animación con WebGL. Se separan la preparación y golpeo, recepción del portero, lanzada, atajada alta, entrada, recogida baja, celebración y control. El conjunto tiene 22 estados y 16 orientaciones.
- Los bordes combinan cobertura y material dominante, evitando mezclar colores de piel y uniforme. Hay pupilas, tono de labios y variantes aproximadas de barba en los sprites. No son rostros escaneados ni semejanzas exactas de los jugadores reales.
- El esqueleto WebGL añade contrarrotación de cadera y pecho, pequeños movimientos de cabeza y respiración en reposo. El tiempo de partido gobierna estas animaciones, incluidos los movimientos de las banderas, para que se detengan durante la pausa.
- Cuatro u ocho banderas de los colores de ambos equipos ondean en las gradas según la calidad elegida. Las mallas WebGL comparten el movimiento con las banderas del modo compatible. Los pasillos cortan visualmente el público en secciones.

## Recursos y memoria

Los cuatro archivos `assets/models/human-motion-94-*.png` distribuyen las poses en páginas de seis filas como máximo. Se cargan una sola vez y cada partido mantiene una caché limitada de imágenes recoloreadas: 64 en Rendimiento, 144 en Equilibrado y 224 en Alto/Ultra. La caché se libera al salir del partido. Las versiones anteriores del atlas se conservan para las entradas antiguas de la caché de GitHack.

Los archivos se generan con `python3 scripts/bake-motion-94.py`. El programa lee la malla vestida ya existente y su esqueleto; utiliza los mismos recursos CC0 y su licencia `assets/licenses/makehuman-cc0.txt`. No necesita descargar datos externos. El atlas codifica materiales e iluminación; no sustituye la escena jugable por una fotografía.

## Compatibilidad y verificación

Se conservan la cámara Estadio, todos los perfiles previos, los controles, los ajustes del navegador y los guardados de Ultimate Team. Las entradas de escritorio y móvil cargan las nuevas rutas de la versión 9.4.

La suite completa pasa **518 pruebas**. Las pruebas cubren dimensiones e integridad de las cuatro páginas PNG, incluida la descompresión de todas sus filas, selección y límites de poses, recoloración y caché, matrices de los personajes y banderas finitas en todas las calidades, pausa de las banderas, controles y encuadres. Se revisó el partido en navegador con el renderizador compatible, también en una pantalla móvil de 390 × 844. El empaquetado comprueba 775 archivos de ejecución. Este navegador no permite crear un contexto WebGL; el acabado y el rendimiento con GPU siguen sin revisión visual aquí.
