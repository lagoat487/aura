# Escudos de clubes

Los escudos se incluyen localmente y no requieren conexión durante la partida. `AuraBadges.get(club)` devuelve una ruta local segura o `null`; la interfaz conserva su insignia de reserva cuando no existe una correspondencia inequívoca.

## Fuentes y preparación

- [JoseArroyave/football-logos](https://github.com/JoseArroyave/football-logos), revisión `5ab11fed47427b3003f4b276554491fe683387b1`. Colección mundial SVG; licencia MIT del repositorio incluida en `assets/crests/LICENSE.txt`.
- [luukhopman/football-logos](https://github.com/luukhopman/football-logos), revisión `2a3978f0b4730645c205d855a4bda54c161183e9`. Directorio `logos/`, declarado por su mantenedor como temporada 2026/27. Se utiliza para coincidencias adicionales de clubes europeos.

Cada registro de `data/club-badges.json` identifica el ID y nombre del club, repositorio, ruta original, revisión y SHA del archivo fuente. Los archivos descargados se comprobaron contra su SHA de objeto Git antes del procesamiento.

La imagen auténtica se adapta a un lienzo transparente de 128 × 128 píxeles sin modificar su diseño ni colores. Se codifica como WebP sin pérdida y se incrusta en un SVG local autocontenido. Esto elimina scripts, referencias remotas y dependencias externas del archivo utilizado por el juego. Los nombres de club, escudos y marcas siguen perteneciendo a sus titulares; la presencia de un archivo en una colección no implica afiliación de AURA con ese club.

## Criterio de correspondencia

Se usan nombres exactos, equivalencias de prefijos y sufijos futbolísticos y alias explícitos revisados. La región resuelve nombres homónimos cuando el catálogo la proporciona. Un ID desconocido nunca hereda el escudo de otro club únicamente por compartir nombre. Las diferencias entre las secciones masculina y femenina no se sustituyen automáticamente por el emblema de otro club.

La cobertura y las excepciones concretas figuran en el manifiesto. El catálogo contiene IDs duplicados de clubes presentes en más de una competición, además de las secciones masculina y femenina; el número de IDs cubiertos no representa ese mismo número de entidades distintas. Los casos ambiguos mantienen la insignia de reserva y no se anuncian como verificados.

Esta entrega cubre **766 de 780 IDs de club** mediante **680 imágenes locales**. Los 24 clubes originales de AURA están cubiertos. Mantienen la insignia de reserva Badalona Women, C. Adeje Tenerife, DUX Logroño, Madrid CFF, OL Lyonnes, Asociación Atlética Estudiantes, Club Atlético Gimnasia y Esgrima, FC Rosengård, Nacional de la agrupación CONMEBOL Libertadores, UCV FC, Uni. Católica, Recoleta, Omonia FC y Chongqing FC.
