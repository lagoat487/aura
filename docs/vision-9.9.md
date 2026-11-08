# AURA VISION 9.9 — Máscaras fotográficas y cabezas grandes

Lamine usa el recorte de la fotografía que adjuntó el usuario: pelo oscuro, sonrisa y píxeles originales del rostro. El archivo de juego excluye el resto de la captura del teléfono. El recorte, el proceso y los hashes están documentados en `assets/faces/reference-99.json` y `scripts/build-reference-mask-99.cjs`.

Las máscaras son imágenes planas transparentes colocadas delante de la cabeza. Conservan ojos, nariz y expresión de la foto sin el mapeado facial deformable de 9.8. Se mueven con el hueso de la cabeza, tienen perspectiva al girar y no aparecen al mirar al jugador de espaldas. La cabeza genérica se oculta mientras se ve la fotografía, evitando duplicaciones; vuelve al girar de espaldas o si falla la carga. No son modelos de cabeza escaneados ni reconstrucciones fotorrealistas desde todas las vistas.

El sistema se extiende a todos los futbolistas con una identidad numérica o un retrato reconocido en AURA. Carga la fotografía del jugador presente en el partido, no solo las cinco estrellas de 9.8. Reutiliza los proveedores del catálogo, con CORS y alternativas ante errores. Los cinco retratos locales anteriores siguen sirviendo de respaldo; Lamine prioriza la imagen del usuario. Los demás necesitan conexión y un retrato disponible. Si no hay foto o falla la carga, continúa la cabeza procedimental ampliada: nunca se inventa una fotografía ni se toma la de otra persona.

Todas las cabezas aumentan un 40 %. En WebGL crece el hueso de la cabeza; el resto del cuerpo y sus articulaciones conserva la escala. En el modo compatible se extrae la silueta de la cabeza del atlas y se amplía alrededor del mismo pivote. Las máscaras usan cuadriláteros proyectados para las 22 animaciones y 16 orientaciones. La vista básica que se muestra mientras cargan los atlas también amplía la cabeza.

El motor conserva `originalId`, `real` y `photo` desde el once y en las sustituciones. Al entrar un canterano se elimina la identidad fotográfica del jugador anterior. Las cartas especiales y los fichajes mantienen su fotografía. La caché por partido tiene un límite de 64 identidades y se descartan actualizaciones de imágenes al salir del partido.

Las rutas de motor, máscaras y presentación se publican como 9.9 para evitar la mezcla de versiones en el teléfono. El enlace habitual y las claves de las partidas se conservan.

## Validación

Pruebas de identidades de todo el catálogo, máscara de la foto adjunta, proveedores alternativos, caché/liberación, metadatos en sustituciones, escala y máscaras de los 22 modelos, matrices del esqueleto, las 352 proyecciones del modo compatible y ocultación desde atrás. Se ejecutan también la suite completa de AURA y la construcción de producción.

La comprobación visual utiliza los mismos sprites y máscaras del partido. El navegador remoto tiene WebGL desactivado; la imagen final con aceleración y el rendimiento de iPhone requieren comprobación en ese dispositivo.
