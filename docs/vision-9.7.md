# AURA VISION 9.7 — Identidad facial (primera fase)

Esta versión se aplica a todos los jugadores presentes en el catálogo de AURA, incluidos los clubes disponibles de Premier League, LaLiga, Serie A, Bundesliga, Ligue 1 e Inter Miami. No importa si pertenecen a una liga u otra: la apariencia se selecciona por identidad estable del jugador al entrar en el partido.

## Qué cambia de verdad
- Siete geometrías faciales compartidas que modifican levemente mandíbula, anchura del cráneo y relieve nasal en la malla humana 3D con Three.js/WebGL.
- Ojos alineados con las variantes de cara, conservando la estructura y animación de 17 huesos.
- Más combinaciones deterministas de cabello, barba y forma facial para todos los futbolistas.
- Perfiles artísticos aproximados para estrellas (Messi, Lamine, Vini, Mbappé, Haaland, Pedri, etc.), aplicados también cuando juegan en otro club.
- El enlace y los modos anteriores siguen utilizando el mismo motor.

## Límites importantes
**NO** son escaneos, fotografías mapeadas ni caras fotorrealistas individuales. No se han creado miles de rostros únicos; siete variaciones de una malla base no hacen que los futbolistas se parezcan a los reales. Las características de jugadores sin perfil son procedurales, no verificadas. Los futbolistas reales pueden no parecerse.

El cambio geométrico se ve en el modo WebGL; la modalidad compatible sin WebGL sigue utilizando atlas pre-renderizados anteriores y solo recibe los nuevos atributos de apariencia. La optimización/rendimiento y semejanza visual deben comprobarse en Mac y en iPhone con WebGL activo.

## Próxima fase
Usar modelos de cabeza dedicados y recursos de licencia adecuada para estrellas verificadas, controlar el presupuesto de polígonos/texturas por equipo y actualizar también los atlas compatibles. Validar en capturas de partidos reales, no con imágenes generadas por IA.

Se validaron aquí sintaxis JavaScript y perfiles deterministas antes de publicar. No se ejecutó en este entorno la suite Node ni una sesión WebGL real.
