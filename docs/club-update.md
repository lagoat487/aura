# Club Update 4.1

Corrección de ventas pendientes en carrera de jugador: al firmar se vuelve a comprobar si el futbolista es ahora el protagonista. Una venta acordada antes de activar este modo se rechaza conservando plantilla, once, presupuesto y transacciones. El acuerdo puede retirarse y las ventas de otros futbolistas siguen disponibles; el protagonista puede continuar su siguiente partido.

Corrección del selector de clubes en Copas: Champions, Europa y Conference reutilizan la elegibilidad europea de la Champions de carrera. El selector incluye ligas compatibles del catálogo como Trendyol Süper Lig, prioriza el país declarado y conserva una sola entrada por identidad de club. Se mantienen los formatos AURA de 16 equipos; jugar estas copas avanza su propio cuadro y conserva el calendario y presupuesto de carrera.

Corrección de controles en Calle: perder la captura de un botón táctil libera esa dirección y conserva las demás pulsaciones activas. Pausar con P, Esc o el botón limpia tanto teclado como controles táctiles. Las pulsaciones durante la pausa se descartan; al volver se necesita una pulsación nueva para moverse.

Corrección de retratos en premios de carrera: los registros del equipo de la semana, jugador del mes y clasificación anual conservan la identidad real y las referencias de fotografía del futbolista original. Los retratos disponibles se muestran también en el panel de premios; un real sin imagen conserva «Sin foto» y los canteranos generados se identifican como «Creado». Las notas, goles y reglas de elección de los premios se mantienen.

Corrección del banquillo UT: las nueve plazas se cubren con las reservas de mayor GRL, en vez de las primeras cartas recibidas. Se conserva una plaza para un portero de reserva si existe y solo se convoca una edición de cada futbolista. La plantilla muestra exactamente los suplentes disponibles al entrar al partido. Comprar una carta mejor ya permite usarla como suplente sin alterar el once; las demás cartas siguen en Mi club.

Corrección del calendario de Champions en carrera: la final se identifica como partido único, tanto pendiente como terminada. Las semifinales y las demás eliminatorias conservan las etiquetas de ida y vuelta.

Corrección de elegibilidad de Champions: el país declarado de la liga prevalece sobre nombres compartidos como «Serie A», «Premier League» o «Superliga». Cuando el catálogo no declara país, se reconocen nombres completos de las ligas europeas compatibles, junto con el país de los clubes antiguos. Los alias no pueden incorporar un club de origen no elegible. Las carreras de ligas importadas como «Brasileirão Serie A», «LigaPro Serie A» y «Argentina Superliga» conservan su calendario doméstico y no reciben partidos ni ingresos de Champions. Se mantienen los clubes europeos del catálogo, la entrada única por identidad, los cuatro primeros y la exención del campeón europeo.

Corrección de divisiones UT: al llegar a División 1 se indica que es la categoría máxima y se muestran sus puntos, sin prometer otro ascenso. Los partidos, monedas y puntos siguen las reglas existentes; las divisiones inferiores conservan el objetivo de nueve puntos.

Corrección del mercado UT: el selector de posición incluye MI, MD y SD, presentes en el catálogo. Se pueden buscar refuerzos para las bandas de 4-4-2, 4-2-3-1 y 3-5-2 sin mezclar otras posiciones; la compra conserva el once y usa las monedas de la sesión.

Corrección de selección de DCP: al volver al desafío, se descartan de la selección las cartas vendidas, consumidas o incorporadas al once. Las cartas todavía elegibles permanecen seleccionadas. El contador y la revisión usan la selección vigente; esta limpieza no consume cartas ni monedas.

La corrección de identidad de los repetidos también se aplica a las cartas de «Último sobre» en Inicio de UT. Abrir o vender una copia desde ese bloque usa su UID; la carta original se conserva. Si la copia ya fue consumida o vendida, su enlace histórico no actúa sobre la original.

Corrección de temporadas de Champions: al inicializar una temporada se vacía su historial europeo actual, también si el club no clasifica o no puede participar. Los resultados de temporadas anteriores permanecen en `seasonHistory`; no se arrastran ni se vuelven a archivar como resultados de un año sin Champions.

Corrección de repetidos en UT: la ficha del almacén identifica cada copia por su UID y muestra su propia condición de transferible. La venta desde esa ficha consume únicamente la copia seleccionada y conserva la carta original, incluido un titular intransferible. Los repetidos intransferibles no ofrecen vender la carta original.

## Revisión de regresiones · 30 de octubre de 2026

Revisión sobre `43a03c6`, que ya incluye los arreglos de mercado, selecciones DCP, identidad de repetidos e historial continental. La mejora se limita a la elegibilidad de Champions; no añade persistencia ni cambia el motor de partidos.

| Flujo | Riesgo revisado | Comprobación |
| --- | --- | --- |
| Mercado UT | Filtros incompletos, doble compra o débito incorrecto | Filtros con el catálogo incluido, coste en monedas, rechazo de compras repetidas y conservación del once. |
| DCP | Selección oculta o pérdida de inventario si falla la recompensa | Limpieza de reservas vendidas o convertidas en titulares; nueva prueba de recompensa sin garantía 82+ que deja el club íntegro. |
| Repetidos | Vender o consumir la carta original en lugar de una copia | Inspección y venta por UID, enlaces históricos caducados y nueva entrega DCP de dos copias que conserva el titular y una tercera copia. |
| Champions | Confundir el origen por un fragmento de nombre o por un alias | País prioritario, nombres exactos como respaldo, bloqueo del alias de origen no elegible y temporadas de ligas importadas sin partidos ni ingresos europeos. |
| Canvas | Regresión del respaldo sin WebGL | Suite del renderizador compatible en vertical y horizontal, cámaras, acciones y liberación del lienzo. |

Las nuevas pruebas continentales también conservan las ligas europeas del catálogo, la deduplicación de alias y la entrada del campeón europeo aunque quede fuera del top cuatro. La comparación del catálogo anterior y posterior mantiene los mismos 399 candidatos en el mismo orden. Cuando falta el país, el respaldo sigue dependiendo de los nombres conocidos del catálogo; una liga nueva necesita país compatible o una incorporación explícita a esa lista.

## Problemas corregidos

- La Champions de World Tour era un torneo aislado. Ahora tiene estado y resultados propios dentro de la carrera, y se intercala con los partidos de liga.
- Ultimate Team era una lista de once jugadores y un sobre. Ahora tiene navegación de club, cartas en una cancha, cambios de posiciones, formación, química, reservas, tienda, presentación de cartas, repetidos, mercado, DCP, objetivos y dos vías de competición contra la IA.
- No había una ruta para cambiar de modo conservando la carrera. Modos abre el lobby y permite regresar a la carrera o al club UT de esa sesión.
- El enlace de imágenes anterior devolvía errores para futbolistas conocidos. Ahora se usa primero un patrón de retratos observado en las páginas oficiales de EA y se comprueba la identidad por ID. Los respaldos están limitados a proveedores conocidos. Un real sin fotografía muestra sus iniciales y “Sin foto”; no usa un rostro inventado.
- Crear un protagonista fallaba al alcanzar 28 jugadores. Una carrera de jugador permite una plaza adicional sin borrar a otro futbolista.
- Calle usaba dos tríos fijos. Ahora se eligen clubes, se toma su once real como base para el trío y se puede escoger dificultad. Se evita el robo inmediato continuo entre dos poseedores superpuestos.
- Las selecciones conservan un portero real disponible aunque quede fuera de los primeros 23 por GRL.

## Champions en carrera

La fase liga genera 144 encuentros: ocho partidos por club contra ocho rivales diferentes, cuatro de local y cuatro de visitante. La tabla usa puntos, diferencia de goles, goles a favor y victorias, con desempate estable por ID. No reproduce todos los desempates de UEFA.

Los ocho primeros avanzan directamente a octavos. Los puestos 9–24 disputan ocho eliminatorias de ida y vuelta. Los vencedores se unen a los ocho primeros. Octavos, cuartos y semifinales tienen ida y vuelta; la final es única. El torneo completo contiene **189 partidos**. Los empates en el global se resuelven con penaltis automáticos, sin regla de goles fuera de casa. No se incorpora una tanda jugable ni tiempo extra controlable.

Los partidos continentales se intercalan después de determinadas jornadas de liga. Al entrar al campo se utiliza el once de Plantilla, con energía y moral. Los resultados europeos se guardan en `continentalHistory`, los de liga en `history`; ninguno modifica la clasificación del otro. Un partido abandonado no cuenta y un resultado no se puede confirmar dos veces. La Champions concede ingresos por partido y un premio único al campeón. Al cerrar temporada se archiva su campeón y la historia europea.

La primera participación se aproxima por los cuatro clubes de mayor valoración de la liga elegida. En las siguientes temporadas se usa la posición lograda: cuatro primeros o campeón continental vigente. Los clubes no europeos no se incorporan a la Champions. La lista de 36 participantes y el sorteo son de AURA: no se afirma que sean los inscritos ni los bombos oficiales, y no se aplican todas las restricciones de asociación del sorteo real. El calendario se escala a la duración de la liga elegida, no a fechas oficiales.

Fuentes de referencia para la estructura:

- https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-17-Match-system-league-phase-Online
- https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-20-Match-system-knockout-phase-Online

## AURA UT

La colección contiene 23 cartas iniciales y 10.000 monedas de juego. El paquete inicial favorece la liga elegida. El once usa cartas poseídas y no puede duplicar un futbolista. Cambiar una carta ya titular intercambia los puestos. Las cinco formaciones y las sustituciones del partido utilizan la misma selección del usuario.

La química suma 0–3 por titular, con un máximo de 33. Un futbolista compatible con su puesto recibe conexiones por club, nacionalidad y liga. Umbrales: club 2/4/7, país 2/5/8 y liga 3/5/8. Jugar fuera de posición da cero. Es una aproximación de juego de AURA, no una reproducción certificada de todos los elementos de FC 27. Los seis atributos visibles de cada carta se estiman a partir del GRL y el puesto; no se presentan como las seis valoraciones oficiales de EA.

La tienda ofrece sobres de plata, oro y oro premium; este último garantiza una carta de al menos 82 de GRL. Las cartas de GRL alto tienen menor peso en el sorteo. Los repetidos van al almacén, no se sustituyen por otros futbolistas. El mercado utiliza precios de AURA, no dinero real ni subastas de otros usuarios. La venta rápida rechaza titulares e intransferibles.

Los DCP usan puntos de artículo y cartas de reserva o repetidas elegibles. La revisión muestra exactamente las cartas que se entregarán y la recompensa. Al confirmar se valida todo de nuevo. Titulares, monedas y recompensas se modifican de manera conjunta; una operación inválida no cobra ni elimina cartas. Las recompensas no se cobran dos veces.

Squad Battles suma puntos para series con recompensas. Divisiones contra IA usa puntos de victoria/empate para ascender desde división 10. **No son Rivals en línea ni un mercado multijugador.** La colección y la carrera están en memoria y se reinician al recargar; no se ha añadido guardado automático.

Referencias de mecánicas consultadas:

- https://www.ea.com/games/ea-sports-fc/fc-27/news/football-ultimate-team-for-beginners
- https://help.ea.com/en/articles/ea-sports-fc/sbcs/

## Retratos

Fuente observada en páginas oficiales de valoraciones, incluido Kylian Mbappé:

- https://www.ea.com/es/games/ea-sports-fc/ratings/player-ratings/kylian-mbappe/231747
- `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p<ID>.png?padding=0.7`

Se contrastó la entrega de imágenes para los IDs de Mbappé, Lamine Yamal, Lionel Messi y Cristiano Ronaldo. El patrón se aplica al catálogo con IDs numéricos conocidos. No se afirma haber verificado individualmente todos los retratos ni que el proveedor cubra a cada futbolista. Hay respaldos SoFIFA por edición; no se persiguen coincidencias por nombre que puedan asignar la foto de otra persona. Sin fotografía disponible se muestra “Sin foto”. Los canteranos y jugadores creados se identifican como creados.

## Actualizaciones diarias

La revisión diaria es una tarea de ChatGPT asociada a este trabajo, configurada para las mañanas de Ecuador. No forma parte del código del navegador ni corre en el equipo del jugador. Debe revisar el estado más reciente de `lagoat487/aura/main`, implementar una mejora pequeña, verificarla y publicar solamente si las comprobaciones son satisfactorias. Las revisiones concretas mantienen su enlace inmutable; el enlace con `main` sigue la versión más reciente.
