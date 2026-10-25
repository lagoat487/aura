# AURA FC27 ⚽

Prototipo original de modo carrera de fútbol, jugable desde el navegador.

## Cómo jugar en GitHub Codespaces

1. Abre tu Codespace. Si estaba abierto antes de la actualización, ejecuta `git pull` en la rama que quieras probar.
2. En la terminal ejecuta `python3 -m http.server 8000`.
3. En **Puertos (PORTS)**, selecciona **Open in Browser / Abrir en navegador** para el puerto **8000**.
4. Elige una competición y un club. El progreso existe solo durante la sesión: al recargar se inicia desde cero.

Si el puerto está ocupado puedes usar `python3 -m http.server 8080`. No hace falta instalar dependencias para jugar; también se puede abrir `index.html` directamente.

## Jugadores reales incluidos en el juego

AURA incluye **1.248 futbolistas reales** del conjunto [FIFA World Cup 2026 – Player Dataset](https://github.com/matyuschenko/fifa-wc2026-players), acreditado bajo **CC BY 4.0** y recopilado el 10 de septiembre de 2026 según su README. Se incluyen nombre, posición original y club informado por la fuente. No es una base completa de todas las plantillas mundiales ni refleja necesariamente cada traspaso actual.

- Los jugadores reales de este catálogo aparecen en las carreras nuevas **sin necesitar conexión**. Los clubes cuyos jugadores no están cubiertos conservan canteranos marcados como tales.
- En **Plantilla → Actualizar jugadores reales** se pueden sustituir futbolistas genéricos por los disponibles sin reiniciar la temporada. Los jugadores ya identificados como reales, comprados o desarrollados no son borrados deliberadamente.
- El buscador local permite localizar futbolistas del Mundial por nombre o club incluso si el catálogo más amplio no carga.
- Los GRL, potenciales y valores económicos sin fuente específica son **estimaciones del videojuego**, no los oficiales de FC27. No hay caras 3D licenciadas; las imágenes de terceros siguen siendo opcionales.

## Competiciones implementadas

- **LaLiga**: 20 clubes por nombre, con participantes de referencia de la edición **2026/27**; 38 jornadas, 380 partidos, 19 de local y 19 de visitante por club.
- **Liga internacional de exhibición**: los 24 clubes originales, 46 jornadas y 552 partidos. Es una competición ficticia separada.
- **Catálogo mundial opcional**: al abrir el juego con conexión, `world.js` descarga un CSV externo de plantillas del **12 de septiembre de 2026**. Agrupa competiciones por liga y categoría, y permite elegir cualquiera que tenga al menos dos clubes con once jugadores. **El número exacto de ligas y jugadores cargados aparece en pantalla**; no se promete que estén todas las ligas ni todos los futbolistas del mundo.
- **Plantillas**: cuando el catálogo proporciona jugadores para un club, muestra sus nombres, posiciones y valoraciones de la instantánea y busca un retrato en un servicio externo. Las imágenes pueden faltar; no son escaneos 3D. Los clubes sin correspondencia conservan las plantillas ficticias.
- **Buscador mundial de mercado**: permite encontrar futbolistas externos por nombre o club. El valor, salario y potencial usados para fichajes son cálculos ficticios, no importes oficiales.
- Calendario completo generado al crear la temporada. **No reproduce las fechas ni el orden del calendario oficial**.
- Cada avance simula toda la jornada y guarda sus resultados. Clasificación, calendario y balance de tu club salen de los mismos marcadores: 3 puntos por victoria, 1 por empate y 0 por derrota.
- Consulta los diez partidos de cada jornada de LaLiga desde Calendario, o los doce de exhibición. Clasificación muestra todos los participantes.
- Desempates de LaLiga por enfrentamientos directos completos, diferencia de goles general y goles a favor, con miniliga para empates múltiples. Hasta completar los duelos directos se usa diferencia de goles general. No se modelan tarjetas de juego limpio ni un desempate en campo neutral: una igualdad total se ordena por ID de club.
- Cierre de temporada con campeón, archivo del balance anterior y comienzo de otra temporada con tu plantilla y presupuesto.

También incluye mercado de fichajes y ventas por negociación, cantera y desarrollo de jugadores. La carrera dura la sesión actual, sin guardado automático.

## Nueva carrera sin guardado

Esta edición no escribe ni lee partidas desde localStorage. Cada vez que abres o recargas el juego aparece la pantalla **Iniciar nueva carrera**, con selección de competición y equipo. Las partidas viejas que ya estaban en el almacenamiento del navegador se dejan intactas, pero no se cargan. El botón Nueva carrera reinicia la sesión actual.

En Barça se priorizan los nombres reales incluidos localmente (Lamine Yamal, Pedri, Raphinha, etc.) para que ninguna base externa ocupe sus plazas. Plantillas incompletas se completan con canteranos explícitamente identificados.

## Plantilla y negociaciones · actualización 25 de octubre de 2026

La plantilla tiene una hoja de equipo editable y una central de contratos, con una interfaz original inspirada en el modo carrera de FC27.

- Elige entre cinco formaciones, arrastra jugadores para intercambiar posiciones o selecciona **Cambiar jugador** y el destino. **Mejor once** elige por posición, valoración y estado. El capitán también se puede cambiar.
- La simulación usa el **once seleccionado**: fuera de posición, energía y moral influyen en su valoración efectiva. Los suplentes no reciben apariciones; los roles importantes incumplidos durante varias jornadas afectan a la moral.
- Cada ficha muestra rol, sueldo, contrato, moral, energía, apariciones y valor. **Renovar contrato** y **Negociar venta** abren llamadas de negociación.
- Para fichar, busca por jugador o club y pulsa **Negociar**: consulta de disponibilidad, acuerdo con el club, contrato con el agente y firma. También hay contraofertas, medidor de tensión y ruptura de conversaciones.
- Negocia importe, porcentaje de futura venta, sueldo, rol, duración, prima, comisión del agente y cláusula de salida. Las cláusulas existentes se tienen en cuenta al comprar y los porcentajes anteriores se descuentan al vender.
- El presupuesto y la propiedad del jugador cambian **solo al confirmar la operación**. Se vuelve a comprobar el dinero, el tope salarial y el tamaño de plantilla antes de firmar; cerrar o retirar una llamada no cobra dinero.
- La central del mercado permite retomar operaciones pausadas y ver las cerradas. Al avanzar jornadas pueden aparecer ofertas rivales y perderse un fichaje sin cargos. El fichaje confirmado tiene una presentación y acceso directo a su ficha.

Consulta las [reglas y límites del sistema](docs/career-management.md). Todas las operaciones y contratos son parte de la simulación de AURA, no un servicio de fichajes reales.

## Límites actuales y siguiente prioridad

Sin conexión, el juego conserva LaLiga y exhibición con jugadores de demostración. Con conexión puede cargar las plantillas externas, pero la cobertura y su disponibilidad dependen del catálogo remoto. Los participantes de cada liga externa representan una **instantánea del proveedor**, no una lista verificada de inscripciones oficiales; sus calendarios se generan para el videojuego. Las reglas de desempate de ligas externas se aproximan con puntos, diferencia de goles y goles a favor, sin reglas regionales específicas.

**No incluye licencias oficiales, escudos, caras 3D, partidos 3D controlables, multijugador, copas, Champions League, Libertadores, Sudamericana, ascensos/descensos ni clasificación continental**. Las siguientes temporadas mantienen los participantes de su liga seleccionada.

La mejora siguiente es implementar copas y clasificación continental, junto a reglas específicas por país. Solo añadir los nombres de clubes no equivale a reproducir sus competiciones oficiales.

La base de valoraciones enlazada es un proyecto tercero: [EA FC ANALYSIS](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS). El enlace al CSV no implica una licencia para redistribuirlo; los rostros se solicitan al CDN de SoFIFA y pueden estar ausentes o sujetos a condiciones de uso. Para una distribución pública/comercial hay que verificar derechos sobre marcas, datos e imágenes. Cambiar únicamente los nombres de la exhibición no implementa esas competiciones. Ver [diseño, fuentes y alcance](docs/competitions.md).

## Estructura y comprobaciones

| Archivo | Responsabilidad |
| --- | --- |
| `clubs.js` | Catálogo de clubes e IDs estables; datos de juego separados de reglas. |
| `competitions.js` | Definiciones, calendarios, resultados, validación y clasificación; usable en navegador y Node. |
| `game.js` | Carrera, simulación, mercado, cantera, interfaz y compatibilidad de guardados. |
| `world.js` | Importación opcional de ligas/plantillas de terceros, búsqueda y perfiles de jugadores. |
| `real-players.js` | Base local acreditada de 1.248 futbolistas del Mundial 2026 y búsqueda sin conexión. |
| `squad.js` | Formaciones, once editable, capitán, posición, energía, moral y masa salarial. |
| `negotiations.js` | Máquina de estados de compras, ventas y renovaciones; validación y liquidación de acuerdos. |
| `career-ui.js`, `career.css` | Hoja de equipo, central de contratos, llamadas, ofertas y presentación de fichajes. |
| `index.html`, `styles.css` | Carga de scripts en orden, selector de competición y presentación general. |
| `tests/` | Propiedades del calendario, tablas, empates, persistencia y regresiones de carrera. |

Para comprobar el proyecto, con **Node 22 o superior**: `npm test` o `node --test`. No requiere `npm install`. GitHub Actions ejecuta estas pruebas en pushes y pull requests. Las pruebas no requieren descargar datos ni imágenes en tiempo de ejecución. Ver [catálogo mundial y sus límites](docs/world-catalog.md).

