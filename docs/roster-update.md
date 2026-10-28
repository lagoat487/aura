# Plantillas de Club Edition 3.1

La fuente principal de afiliaciones es el catálogo incluido, con fecha de referencia **12 de septiembre de 2026**: [EA FC ANALYSIS](https://github.com/LakshmiKanth11/EA_FC_ANALYSIS). Se volvió a descargar su CSV durante esta actualización; sus 19.789 filas originales coinciden exactamente con el archivo incluido. El adaptador acepta 19.423 jugadores en 739 clubes y 49 agrupaciones jugables. No había una instantánea posterior en ese archivo remoto.

La corrección principal afecta a todos los clubes cubiertos: la plantilla más reciente se utiliza de forma exclusiva. Antes se anteponían jugadores de la referencia del Mundial y se añadían después los del catálogo, lo que reintroducía futbolistas que ya habían cambiado de equipo y duplicaba identidades con nombres distintos. Las búsquedas, el Draft y las negociaciones usan ahora el mismo reconciliador. Las variantes de nombres solo se unen si la identidad coincide de forma única; los nombres formales también pueden resolverse por sus tokens y el año de nacimiento. Una coincidencia ambigua no se usa para inventar una afiliación.

`World.matchingClub` conserva el género del club y reconoce alias como Manchester United / Man Utd. Los equipos originales de AURA conservan sus identificadores estables. Los clubes no cubiertos mantienen la referencia del Mundial, identificada como tal; no se les atribuye una actualización en vivo.

## Barcelona y Araújo

La plantilla del primer equipo del FC Barcelona se contrastó el **28 de octubre de 2026** con su [lista oficial de dorsales 2026/27](https://www.fcbarcelona.com/en/football/first-team/news/4570894/202627-first-team-jersey-numbers-confirmed). Se incluyen esos 27 jugadores; Gabriel Jesus y Dominik Livaković conservan la identidad y los valores del catálogo, pero se cambia su afiliación conforme a la fuente oficial. Brian Fariñas no estaba en el catálogo y tiene un registro nuevo identificado con valores de juego estimados por AURA. Los futbolistas que no figuran en esa lista no se reincorporan desde la referencia del Mundial.

Ronald Araújo aparece una sola vez como futbolista del Liverpool, conforme al catálogo y a la [cesión anunciada oficialmente por el FC Barcelona hasta el 30 de junio de 2027](https://www.fcbarcelona.com/en/football/first-team/news/4556283/ronald-araujo-loaned-to-liverpool-fc). Su antigua identidad del Mundial resuelve al mismo registro actual en el buscador, sin crear otra versión en Barcelona.

Esta comprobación concreta no significa que se hayan verificado en fuentes oficiales las 739 plantillas al 28 de octubre. La interfaz distingue el primer equipo contrastado de Barcelona, el catálogo global de referencia y los clubes que solo disponen de la referencia del Mundial. GRL, potenciales, valoraciones económicas y presupuestos pertenecen al videojuego.

## API de integración

`AuraRosterSync.rosterFor(club)` devuelve copias de la plantilla reconciliada para ese objeto de club. `search`, `pool` y `getPlayer` utilizan las mismas afiliaciones. `key` sirve para comparar identidades antiguas y nuevas. `status(club)` devuelve fecha, cobertura, número de jugadores, fuente, nota y, solo cuando procede, fecha de verificación.

La reconciliación se realiza al crear la carrera y sus referencias de mercado; no cambia los fichajes que el usuario haya realizado dentro de una partida. Las carreras siguen siendo por sesión.
