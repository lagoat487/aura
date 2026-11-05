# Retratos de las cartas

El cargador compartido `AuraPortraits` da prioridad a los retratos de **FC 27**. Se usa en cartas normales, colección, mercado, plantilla, sobres, SBC, premios y todos los eventos. Las cartas ya guardadas reciben el cambio al volver a mostrarse; no se modifican sus datos ni los guardados del club.

Fuentes comprobadas el 5 de noviembre de 2026:

- La [ficha oficial de Yan Diomande en EA SPORTS FC 27](https://www.ea.com/es/games/ea-sports-fc/ratings/player-ratings/yan-diomande/78012) confirma su identidad `78012`. La web de EA muestra ahora una imagen de carta completa en `FC27/components/items/78012_es-ES.webp`; no usamos esa carta como retrato ni sustituimos las medias de AURA por las de EA.
- La [ficha FC 27 de FIFACM](https://www.fifacm.com/27/player/78012) sirve el retrato independiente de Diomande desde `https://cdn.fifacm.com/content/media/imgs/fc27/players/p78012.png?v=32`. En los compañeros visibles de esa misma página se comprobaron también los retratos de Mbappé (`231747`) y Bellingham (`252371`) con el mismo formato. Son imágenes del juego distribuidas por ese catálogo, no fotografías generadas.
- Se conserva SoFIFA como segundo proveedor de FC 27 y, si falta la imagen, fuentes de FC 26 y anteriores. Un futbolista sin retrato publicado en FC 27 puede mostrar la foto disponible de una edición anterior; no se promete una imagen nueva inexistente. Brian Fariñas conserva su retrato oficial del FC Barcelona, ya verificado para la plantilla 2026/27.

Las identidades numéricas tienen prioridad sobre el nombre. Las cartas antiguas con ID del Mundial o de evento pueden resolverse con el reconciliador existente o una coincidencia exacta y única en el catálogo incluido. No se usan coincidencias parciales de apellidos. Los alias puntuales de Neymar, Vardy, Kitu Díaz y Vinícius conservan las identidades de sus fichas: `190871`, `208830`, `189454` y `238794`. Las identidades creadas no reciben la cara de una persona real.

`portraits-fc27.js` es la copia de producción con ruta nueva para evitar que GitHack reutilice el antiguo cargador de FC 25. `portraits.js` sigue siendo la fuente canónica para pruebas e integraciones. La actualización de caché también invalida la URL exacta del cargador anterior, incluido su parámetro de versión, para atender a las páginas antiguas mientras se propaga el HTML nuevo.
