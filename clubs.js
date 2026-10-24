/* Club IDs remain stable for transfers and v1 saves. Ratings and budgets are game data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AuraClubs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
const legacyClubs=[
{id:"barcelona",name:"FC Barcelona",city:"Barcelona · España",rating:87,budget:105000000},
{id:"madrid",name:"Real Madrid CF",city:"Madrid · España",rating:88,budget:115000000},
{id:"city",name:"Manchester City",city:"Manchester · Inglaterra",rating:89,budget:130000000},
{id:"liverpool",name:"Liverpool FC",city:"Liverpool · Inglaterra",rating:85,budget:79000000},
{id:"boca",name:"Boca Juniors",city:"Buenos Aires · Argentina",rating:81,budget:30000000},
{id:"river",name:"River Plate",city:"Buenos Aires · Argentina",rating:82,budget:32000000},
{id:"guayaquil",name:"Barcelona SC",city:"Guayaquil · Ecuador",rating:77,budget:16000000},
{id:"quito",name:"Liga de Quito",city:"Quito · Ecuador",rating:78,budget:18000000},
{id:"milan",name:"Inter de Milán",city:"Milán · Italia",rating:84,budget:65000000},
{id:"munich",name:"Bayern Múnich",city:"Múnich · Alemania",rating:86,budget:82000000},
{id:"paris",name:"Paris Saint-Germain",city:"París · Francia",rating:86,budget:95000000},
{id:"london",name:"Chelsea FC",city:"Londres · Inglaterra",rating:82,budget:65000000},
{id:"emelec",name:"CS Emelec",city:"Guayaquil · Ecuador",rating:75,budget:12000000},
{id:"idv",name:"Independiente del Valle",city:"Sangolquí · Ecuador",rating:80,budget:22000000},
{id:"atletico",name:"Atlético de Madrid",city:"Madrid · España",rating:84,budget:72000000},
{id:"arsenal",name:"Arsenal FC",city:"Londres · Inglaterra",rating:87,budget:102000000},
{id:"united",name:"Manchester United",city:"Manchester · Inglaterra",rating:83,budget:96000000},
{id:"juventus",name:"Juventus FC",city:"Turín · Italia",rating:83,budget:68000000},
{id:"acmilan",name:"AC Milan",city:"Milán · Italia",rating:83,budget:70000000},
{id:"dortmund",name:"Borussia Dortmund",city:"Dortmund · Alemania",rating:83,budget:74000000},
{id:"flamengo",name:"Flamengo",city:"Río de Janeiro · Brasil",rating:84,budget:63000000},
{id:"palmeiras",name:"Palmeiras",city:"São Paulo · Brasil",rating:84,budget:65000000},
{id:"nacional",name:"Atlético Nacional",city:"Medellín · Colombia",rating:79,budget:25000000},
{id:"america",name:"América de Cali",city:"Cali · Colombia",rating:78,budget:22000000}
];
  const spanishClubs = [
  {
    "id": "alaves",
    "name": "Deportivo Alavés",
    "city": "Vitoria-Gasteiz · España",
    "rating": 75,
    "budget": 8000000
  },
  {
    "id": "athletic",
    "name": "Athletic Club",
    "city": "Bilbao · España",
    "rating": 81,
    "budget": 30000000
  },
  {
    "id": "betis",
    "name": "Real Betis",
    "city": "Sevilla · España",
    "rating": 80,
    "budget": 25000000
  },
  {
    "id": "celta",
    "name": "RC Celta",
    "city": "Vigo · España",
    "rating": 77,
    "budget": 12000000
  },
  {
    "id": "deportivo",
    "name": "RC Deportivo",
    "city": "A Coruña · España",
    "rating": 73,
    "budget": 6000000
  },
  {
    "id": "elche",
    "name": "Elche CF",
    "city": "Elche · España",
    "rating": 73,
    "budget": 6000000
  },
  {
    "id": "espanyol",
    "name": "RCD Espanyol",
    "city": "Barcelona · España",
    "rating": 75,
    "budget": 9000000
  },
  {
    "id": "getafe",
    "name": "Getafe CF",
    "city": "Getafe · España",
    "rating": 75,
    "budget": 8000000
  },
  {
    "id": "levante",
    "name": "Levante UD",
    "city": "Valencia · España",
    "rating": 73,
    "budget": 6000000
  },
  {
    "id": "malaga",
    "name": "Málaga CF",
    "city": "Málaga · España",
    "rating": 73,
    "budget": 6000000
  },
  {
    "id": "osasuna",
    "name": "CA Osasuna",
    "city": "Pamplona · España",
    "rating": 77,
    "budget": 12000000
  },
  {
    "id": "racing",
    "name": "Real Racing Club",
    "city": "Santander · España",
    "rating": 73,
    "budget": 6000000
  },
  {
    "id": "rayo",
    "name": "Rayo Vallecano",
    "city": "Madrid · España",
    "rating": 76,
    "budget": 8000000
  },
  {
    "id": "sociedad",
    "name": "Real Sociedad",
    "city": "San Sebastián · España",
    "rating": 80,
    "budget": 27000000
  },
  {
    "id": "sevilla",
    "name": "Sevilla FC",
    "city": "Sevilla · España",
    "rating": 77,
    "budget": 18000000
  },
  {
    "id": "valencia",
    "name": "Valencia CF",
    "city": "Valencia · España",
    "rating": 77,
    "budget": 14000000
  },
  {
    "id": "villarreal",
    "name": "Villarreal CF",
    "city": "Villarreal · España",
    "rating": 81,
    "budget": 32000000
  }
];
  return { clubs: legacyClubs.concat(spanishClubs), legacyClubs };
});
