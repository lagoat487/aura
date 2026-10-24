# Competiciones: primera liga nacional completa

## Problema prioritario

En la revisión de `main` en `2dc6ad590d734c253db4c3537d786dad80e77a55`, `nextOpponent()` recorría los 23 rivales de la exhibición y `playMatch()` solo simulaba el partido del usuario. `seasonTable()` volvía a estimar las estadísticas de los demás según temporada y jornada. Por tanto, no existían resultados comunes para los dos clubes de un partido. El calendario no representaba una liga nacional y la vista completa de clasificación estaba limitada por defecto a 12 filas.

El paso prioritario es una fuente única de encuentros y resultados. Sobre ella pueden construirse copas, puestos clasificatorios y competiciones continentales sin duplicar o contradecir marcadores.

## Alcance de esta implementación

1. Separar los datos de clubes en `clubs.js`, manteniendo IDs y orden de los 24 originales para no cambiar sus plantillas generadas ni sus guardados.
2. Añadir en `competitions.js` un catálogo de competiciones: LaLiga con 20 participantes y exhibición con sus 24 participantes originales.
3. Generar ida y vuelta mediante el método del círculo, sin dos partidos del mismo club en una jornada. Las jornadas se almacenan completas, con IDs de partido, local, visitante y resultado inicialmente nulo.
4. Simular todos los encuentros de la siguiente jornada de manera atómica. Si falla un resultado, no se aplica ninguno. Una jornada terminada nunca se vuelve a simular.
5. Calcular todas las tablas desde los marcadores persistidos. En LaLiga se resuelven empates múltiples con miniliga y se vuelven a aplicar los enfrentamientos entre los clubes que sigan igualados cuando se excluye a otro.
6. Integrar el calendario en `game.js`: selección de competición, rival/localía reales dentro de esa carrera, resultados de toda la jornada, clasificación completa, cierre y siguiente temporada.
7. Mantener guardados v1 hasta el final de su temporada; activar v2 en una temporada nueva. Una carrera v2 guarda una copia de sus participantes y reglas, por lo que editar un catálogo no cambia a mitad de temporada los cruces ya creados.

El motor comparte código entre el navegador y el ejecutor de pruebas de Node, sin módulos de red ni dependencias de producción. Los scripts clásicos con `defer` mantienen la posibilidad de abrir `index.html` directamente.

## Fuentes y procedencia

Consulta de referencia: **24 de octubre de 2026**.

- [Clasificación oficial de LaLiga, edición 2026/27](https://www.laliga.com/en-GB/laliga-easports/standing): referencia para los nombres de los 20 participantes. No se copian sus puntos, resultados, escudos ni plantillas. Los IDs nuevos son `alaves`, `athletic`, `betis`, `celta`, `deportivo`, `elche`, `espanyol`, `getafe`, `levante`, `malaga`, `osasuna`, `racing`, `rayo`, `sociedad`, `sevilla`, `valencia` y `villarreal`, además de los tres clubes españoles ya existentes.
- [Bases de Primera y Segunda División de la RFEF, edición 2025/26](https://rfef.es/sites/default/files/2025-06/1._CNL_Primera_y_Segunda_Division.pdf): artículos 6 y 7 para 20 clubes, doble vuelta, 38 jornadas y puntos 3/1/0; artículo 10 para los criterios deportivos de desempate. Esta es la edición de reglas consultada, no una afirmación de reproducción íntegra del reglamento 2026/27.

Los nombres del catálogo no equivalen a licencias. El calendario generado, los jugadores y los datos económicos son de simulación. No se importa el calendario oficial ni se asignan fechas de partidos que puedan confundirse con las oficiales.

## Compatibilidad y límites deliberados

- V1 no almacenaba marcadores rivales: se sigue mostrando esa temporada como exhibición con clasificación estimada. Se conservan historial y finanzas; al cerrar se archiva el balance antes de iniciar v2.
- V2 valida la estructura y el orden de las jornadas al cargar; rechaza un calendario incompleto o corrupto sin sobrescribirlo automáticamente. El balance del usuario se vuelve a calcular desde los resultados.
- El orden de último recurso tras una igualdad deportiva total usa el ID del club, en lugar de sanciones de juego limpio o partido neutral. La interfaz lo indica.
- No se asignan aún plazas europeas, descensos ni participantes nuevos al pasar de temporada: requieren otras competiciones y reglas de asignación. El cierre de liga no afirma que se juegue una copa aún inexistente.
- Se conserva el guardado único del prototipo; no hay importación, exportación ni sincronización entre dispositivos.

## Extensiones siguientes

| Sistema | Cambio necesario |
| --- | --- |
| Otra liga nacional completa | Añadir participantes con fuente y edición en `clubs.js`, y reglas en `competitions.js`; reutilizar las comprobaciones de calendario. |
| Copa del Rey | Añadir tipo de competición, rondas eliminatorias, elegibilidad, prórroga/penaltis y sorteo con restricciones. |
| Champions / Libertadores / Sudamericana | Modelar sus formatos propios y cupos por federación, incluyendo ganadores y excepciones; no usar una única liga global como sustituto. |
| Calendario de varias competiciones | Sustituir el único contador de jornada por un calendario común de eventos sin doble reserva de clubes y con descansos. |
| Temporadas con ascensos/descensos | Guardar la pirámide de ligas y ejecutar el reparto de plazas antes de generar los encuentros de la nueva temporada. |

## Validación

`npm test` comprueba 380 partidos de LaLiga, localía equilibrada, cruces únicos, ausencia de dobles reservas, ligas impares, conservación de puntos y goles, simulación atómica, recarga de resultados, empates directos y múltiples, final de temporada y compatibilidad con v1. Las pruebas de integración de `game.js` usan un DOM mínimo y no sustituyen una revisión visual en un navegador.
