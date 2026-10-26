# Catálogo de AURA Evolution

El juego incluye la instantánea ampliada en `data/world-rosters.js`; ya no exige descargar un CSV al abrir una carrera. Si se elimina ese archivo, `world.js` conserva la descarga anterior como alternativa. Las identidades incluidas se pueden cargar sin red.

Origen: [EA FC ANALYSIS](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS), archivo `EA_FC_PLAYERS_DATASET_AND_ DASHBOARD/data/players.csv`, instantánea declarada del **12 de septiembre de 2026**. La copia selecciona once campos: identificador, nombre habitual, nombre, apellido, GRL, posición, club, liga, género, nacimiento y nacionalidad. No incorpora fotografías.

De 19.789 filas de origen se aceptan **19.423 jugadores en 739 clubes y 49 agrupaciones**. Para ofrecer una agrupación necesita al menos dos clubes con once jugadores; descarta clubes de cobertura inferior. El número aceptado se calcula al importar y aparece en pantalla.

Las agrupaciones se distinguen por competición y categoría. Algunos nombres representan torneos continentales o selecciones parciales: no son 49 ligas nacionales completas. Todas usan el calendario de ida y vuelta de AURA, sin fases de grupos, eliminatorias, ascensos ni reglas oficiales regionales.

Los clubes originales mantienen sus IDs. Se conservan primero sus identidades y ajustes del catálogo del Mundial y después se añaden jugadores del catálogo ampliado, normalizando nombres conocidos. Si ambas fuentes tienen el mismo futbolista no se duplica su ficha; se puede añadir su retrato. Los clubes externos usan directamente las plantillas de su agrupación. Cuando se buscan plantillas para clubes originales, se prioriza la categoría masculina; las ligas femeninas siguen disponibles por separado.

El catálogo del Mundial incluye 1.248 identidades de [FIFA WC2026 Players](https://github.com/matyuschenko/fifa-wc2026-players), atribuido bajo **CC BY 4.0**. Las posiciones específicas, valoraciones y valores que ese origen no proporciona son estimaciones de AURA. Los juveniles sin ajuste específico tienen un techo inicial por edad para evitar estrellas creadas por un cálculo genérico.

Los nacimientos ISO y día-mes-año se interpretan respecto a la fecha de referencia. La fuente puede contener errores y afiliaciones desactualizadas. No es una lista oficial de inscritos ni una verificación de las plantillas actuales. No hay afiliación con EA SPORTS, FIFA o los clubes.

Precios, potenciales, sueldos y presupuestos son parámetros del juego. La búsqueda de mercado excluye por nombre normalizado a los futbolistas ya poseídos para impedir fichar una segunda identidad del mismo jugador.

Los retratos opcionales enlazan a SoFIFA. La ficha muestra iniciales si no cargan. No se incluyen escudos oficiales ni caras 3D escaneadas.

La carrera existe durante la sesión y no escribe `localStorage`. El código de recuperación de instantáneas se conserva para compatibilidad y pruebas; no activa guardados automáticos.
