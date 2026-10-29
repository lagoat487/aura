# AURA 27 / World Tour 4.0

Fútbol de navegador con partidos 3D de once contra once, modo carrera, plantilla editable, negociaciones por etapas y Draft XI gratuito. World Tour 4.0 conserva Club Edition y añade cuatro modos, torneos, premios, nuevas generaciones y música original.

## World Tour 4.0 · 28 de octubre de 2026

- **Siete modos accesibles desde el inicio:** mánager, partido rápido, Draft XI, carrera de jugador, copas y selecciones, AURA UT y Calle / Volta.
- **Carrera de jugador:** crea un futbolista o elige uno real de campo. En el partido controlas solo a ese jugador, incluso cuando pasa el balón. Gana EXP, GRL hasta su potencial, apariciones y goles. No incluye traspasos personales entre clubes ni narrativa cinematográfica.
- **Copas:** Champions, Europa League, Conference League, Libertadores, Sudamericana, Mundial, Eurocopa, Copa América y Copa de Canteranos Sub-21. Torneos AURA de 8 o 16 participantes, eliminación directa a un partido y desempate automático por penaltis. Puedes jugar tu cruce o simular una ronda completa. No son sus formatos oficiales ni reproducen la clasificación real; se avanzan desde Copas.
- **Premios de la liga:** once semanal por posición, jugador del mes cada cuatro jornadas y gala del Balón de Oro AURA al acabar la temporada. Las puntuaciones de una simulación se estiman a partir de goles y resultado. El ranking abarca la liga de la carrera, no todo el fútbol mundial.
- **Reencarnaciones:** los futbolistas envejecen al cambiar de temporada. Algunos veteranos se retiran y generan juveniles ficticios de 17 años con la misma posición y nacionalidad, y potencial aproximado. Los retirados no pueden reimportarse mediante el botón de actualizar.
- **Eventos:** molestias que reducen energía, apoyo de la afición que aumenta moral, patrocinadores y EXP sorpresa. Un evento o premio nunca se cobra dos veces por la misma jornada.
- **AURA UT local:** once editable, colección por sesión, sobres de tres cartas, monedas exclusivamente de juego y recompensas por partidos contra la IA. Recargar reinicia la colección. No incluye mercado en línea, otros usuarios ni pagos.
- **Calle / Volta:** arcade 2D original de tres contra tres en una cancha urbana, paredes con rebote, sin porteros; primero a cinco goles o dos minutos. WASD/flechas, J, K, E, Espacio y Shift; botones táctiles. No es el motor ni el modo licenciado de EA.
- **Plantillas:** pertenencias del primer equipo de Barça, Real Madrid y Liverpool contrastadas con sus páginas oficiales. Kitu Díaz añadido en Barcelona SC, con búsqueda por apodo. La base mundial continúa fechada el 12/09/2026; no está actualizada en vivo.
- **Valores:** modelo económico de AURA sensible a edad, GRL, potencial y forma, recalculado cada cuatro jornadas. Son estimaciones de juego, no cotizaciones de mercado verificadas.
- **Identidad:** camisetas del once con los colores del club y retratos disponibles con conexión, con avatares ilustrados como respaldo. No se añaden caras 3D fotorealistas.
- **Música:** electrónica original generada con Web Audio a 112 BPM. Actívala con ♫ Música. Se suspende durante los partidos y al ocultar la pestaña. No se incluyen canciones de FIFA Mobile 23.

Alcance, fuentes y correspondencia con la lista pedida: [docs/world-tour.md](docs/world-tour.md).

## Novedades de Next Season

- **Presentación:** nueva identidad grafito, naranja y lima, estadio 3D en el inicio, progreso de temporada y resumen de confianza directiva. Diseño adaptable a móvil.
- **Partidos:** pases que valoran dirección, espacios y líneas de intercepción; desmarques del receptor; coberturas defensivas y porteros que anticipan la trayectoria. La presión rival y la fatiga afectan a los tiros.
- **Plan de partido:** pausa con P, Escape o el botón en pantalla. Cambia entre equilibrado, posesión, presión alta y contraataque; realiza hasta cinco sustituciones. Un jugador sustituido no puede regresar. Los cambios respetan la energía, el puesto y el rendimiento efectivo del futbolista.
- **Desarrollo:** tres sesiones por jornada, una por jugador. Equilibrado entrega 25 EXP y consume 6 de energía; intensivo entrega 40 EXP y consume 12; recuperación devuelve 12 de energía. Cada 100 EXP suma un punto de GRL hasta el potencial. Las sesiones se renuevan tras disputar o simular una jornada.
- **Directiva:** tres objetivos de temporada con recompensas que solo se reciben una vez: victorias, desarrollo e incorporación de un juvenil. La confianza es un indicador informativo; no hay despidos.
- **Ojeadores:** rutas de Ecuador, España y Brasil. Un informe por jornada con tres juveniles ficticios identificados como cantera generada. Máximo dos incorporaciones por temporada; se valida presupuesto, límite de 28 jugadores y margen salarial. El informe nuevo reemplaza al anterior.

## Novedades de Club Edition

- El catálogo de septiembre tiene prioridad sobre la referencia antigua del Mundial. Las listas ya no se concatenan: un traspasado no vuelve a aparecer en su club anterior por tener otro identificador.
- El primer equipo del Barça se contrasta con los 27 dorsales oficiales de 2026/27. Ronald Araújo está en Liverpool; las incorporaciones verificadas no permanecen duplicadas en sus equipos de origen.
- “Ver plantilla” permite comprobar futbolistas y fecha de referencia antes de empezar. Carrera, Partido rápido, Draft y mercado usan las mismas pertenencias.
- Escudos reales incluidos en el propio juego, con monograma de reserva para clubes sin correspondencia segura. Cobertura y procedencia: [docs/badge-sources.md](docs/badge-sources.md).
- Menús Club Edition, selector de modos compacto, buscador de equipos en Partido rápido y agenda de las siguientes jornadas.

La fuente global disponible sigue siendo la instantánea del **12 de septiembre de 2026**. El contraste oficial de Barça, Real Madrid y Liverpool, más la incorporación de Kitu Díaz, se realizó el **28 de octubre de 2026**. No se presenta el resto del catálogo como una actualización en vivo. Detalles y fuentes: [docs/roster-update.md](docs/roster-update.md).

## Jugar

Abre `index.html` o sirve el repositorio en tu Codespace con `python3 -m http.server 8000` y abre el puerto 8000. No necesitas instalar paquetes para jugar: el motor gráfico y el catálogo están incluidos. Los retratos opcionales siguen dependiendo de un proveedor externo.

- **Carrera:** selecciona competición y club. **Jugar partido 3D** disputa tu siguiente jornada; **Simular jornada** calcula los resultados inmediatamente.
- **Partido rápido:** elige dos equipos y juega contra la IA.
- **Draft XI:** elige uno de cinco futbolistas por posición, completa once jugadores distintos y juega un amistoso contra Real Madrid. Sin monedas, compras ni premios de pago.

La carrera permanece en memoria durante la sesión. Recargar siempre vuelve a **Iniciar nueva carrera**, sin leer ni escribir `localStorage`.

## Controles

| Acción | Teclado | Mando estándar |
| --- | --- | --- |
| Mover | WASD o flechas | Stick izquierdo |
| Disparar | Mantener y soltar J | B / círculo |
| Pase | K | A / cruz |
| Pase al espacio | L | Y / triángulo |
| Entrada | Espacio | X / cuadrado |
| Cambiar jugador | E | LB / L1 |
| Sprint | Shift | RB / R1 |
| Cambiar cámara | C | Botón en pantalla |
| Pausa | P o Escape | Start / Options |

En pantalla táctil aparecen un joystick y botones. El equipo dirigido ataca hacia la derecha en la primera parte y hacia la izquierda en la segunda. Hay tres cámaras: transmisión, amplia y táctica.

Antes de jugar puedes elegir 2, 3, 5 u 8 minutos de duración total, tres dificultades, noche/atardecer/día y tres calidades gráficas. El reloj transforma esa duración en 90 minutos de fútbol. El descanso, las celebraciones y la pausa no consumen tiempo de partido.

## Partidos y gráficos

`match-engine.js` separa la simulación de los gráficos. Incluye 22 futbolistas, movimiento con energía, balón, pases, tiros con potencia, entradas, porteros, reinicios al salir el balón, goles, cambio de campo y estadísticas.

`match-graphics.js` utiliza **Three.js / WebGL**, incluido localmente bajo licencia MIT. El estadio, las gradas, los espectadores, las redes, los modelos y las texturas son geometría y dibujos originales generados por código. Los jugadores son estilizados; los escudos de los clubes se incluyen aparte, con sus fuentes documentadas.

`software-graphics.js` dibuja el mismo partido con proyección 3D sobre Canvas 2D cuando WebGL está desactivado. Se indica **3D compatible · sin aceleración gráfica** dentro del partido.

Esta actualización **no utiliza Unreal Engine**. Unreal no estaba instalado en el entorno. Una aplicación Unreal para navegador necesita una compilación nativa e infraestructura de Pixel Streaming; no se activa añadiendo una dependencia al HTML. No se han contratado servidores ni creado cuentas.

El fútbol es arcade: no hay fuera de juego, faltas, penaltis jugables, tarjetas ni lesiones durante el partido. No hay multijugador en línea ni animaciones de un juego comercial.

## Carrera, plantilla y mercado

- Cinco formaciones, once editable por selección o arrastre, suplentes, capitán y selección automática por posición. Los partidos 3D usan ese once y sus posiciones de partida.
- Moral, energía, roles, contratos, salarios y apariciones. Tanto los titulares como quienes entran durante un partido jugado reciben una aparición. La simulación y el partido 3D utilizan el rendimiento efectivo del once.
- Cuatro estilos de movimiento para tus compañeros en 3D: equilibrado, posesión, presión y contraataque.
- Fichajes: consulta → acuerdo con el club → contrato con el agente → firma. Incluye contraofertas, tensión, ventas, renovaciones y ofertas rivales al avanzar jornadas.
- El presupuesto cambia solo al confirmar una firma, después de validar dinero, propiedad, capacidad y tope salarial. Las llamadas pausadas se pueden retomar.
- El resultado jugado sustituye únicamente el marcador del encuentro del usuario; los demás se simulan. Se mantiene la orientación local/visitante del calendario.
- Salir sin resultado no avanza la jornada ni entrega ingresos. Un mismo resultado no puede confirmarse dos veces.

Reglas de contratos: [docs/career-management.md](docs/career-management.md). Los salarios actúan como tope de contratación, sin descuento semanal automático.

## Datos y alcance

La instantánea ampliada incluida acepta **19.423 jugadores, 739 clubes y 49 agrupaciones de competición**. Conserva además LaLiga y la exhibición originales. Algunas agrupaciones externas tienen cobertura parcial o representan torneos internacionales; todas se juegan con formato de liga de ida y vuelta de AURA.

Fuentes:

- [EA FC ANALYSIS](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS): instantánea declarada del 12 de septiembre de 2026. Se incluyen solo identidad, posición, GRL, club, liga, género, nacimiento y nacionalidad. Es una base de terceros, **no una lista de inscritos oficiales verificada**, y puede contener errores o traspasos desactualizados.
- [FIFA WC2026 Players](https://github.com/matyuschenko/fifa-wc2026-players): 1.248 identidades del Mundial, atribuidas bajo CC BY 4.0. Las posiciones específicas, GRL y precios que ese origen no proporciona son estimaciones originales de AURA. Se normalizan nombres formales conocidos para evitar duplicados.

Se interpretan correctamente cumpleaños ISO y día-mes-año. Los retratos opcionales enlazan a SoFIFA; si faltan se muestran avatares ilustrados. No hay caras 3D escaneadas. AURA es un juego independiente; presupuestos, salarios, valores y potenciales pertenecen al videojuego. Los calendarios no reproducen las fechas oficiales.

No hay ascensos, descensos, copas con formato oficial ni clasificación continental. Las siguientes temporadas mantienen los participantes de la liga seleccionada. Detalles: [docs/world-catalog.md](docs/world-catalog.md).

## Verificación

Con Node 22 o superior:

```sh
npm test
npm run build
```

Las pruebas verifican partidos, goles válidos, controles del modelo, porteros, pausa, sustituciones, cambio de campo, determinismo, calendarios, plantilla, Draft XI, catálogo sin red, presupuesto, negociaciones, entrenamiento, ojeo y recompensas. El build comprueba sintaxis y reúne solo los archivos de ejecución en `dist/`.

La revisión de navegador usa Canvas 3D cuando el navegador de pruebas tiene WebGL desactivado. La ejecución acelerada debe comprobarse en un dispositivo compatible con WebGL. Licencia de Three.js: [vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt).
