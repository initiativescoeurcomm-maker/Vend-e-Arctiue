// --------------------------------------------------------------
// Multi-race registry — Initiatives-Cœur
// Each race provides its own waypoints, key POIs, start date and
// theoretical duration. Switch via setActiveRace(key).
// Routes are stylised/theoretical: plausible courses, not actual
// GPS tracks.
// --------------------------------------------------------------

// ---------- Race definitions ----------
// Format: [lat, lon, dayOffset, label?]
const RACES = {

  // ============================================================
  // 1. VENDÉE GLOBE 2024-2025 — solo, non-stop, tour du monde
  // ============================================================
  vendeeGlobe: {
    name: 'Vendée Globe',
    subtitle: '2024 · 2025 · tour du monde en solitaire',
    short: 'Tour du monde',
    startDate: new Date('2024-11-10T12:02:00Z'),
    raceDays: 86,
    totalNm: 28800,
    startLabel: "LES SABLES-D'OLONNE",
    finishLabel: "LES SABLES-D'OLONNE",
    kind: 'MONOCOQUE IMOCA 60′',
    waypoints: [
      [46.50,  -1.78,   0,   "LES SABLES-D'OLONNE"],
      [44.5,   -5.0,    0.8],
      [44.0,   -8.0,    1.2],
      [42.5,  -11.0,    1.8,  "CAP FINISTERRE"],
      [36.0,  -12.0,    3.0],
      [28.0,  -17.0,    5.0],
      [20.0,  -22.0,    7.0],
      [12.0,  -26.0,    9.0],
      [ 0.0,  -28.0,   11.5,  "ÉQUATEUR"],
      [-8.0,  -30.0,   13.5],
      [-18.0, -32.0,   15.5],
      [-28.0, -28.0,   17.5],
      [-35.0, -18.0,   19.5],
      [-38.0,  -5.0,   21.5],
      [-40.0,   8.0,   23.5],
      [-40.5,  20.0,   25.5,  "CAP DE BONNE-ESPÉRANCE"],
      [-44.0,  35.0,   28.0],
      [-46.0,  50.0,   31.0],
      [-47.5,  65.0,   34.0],
      [-48.0,  80.0,   37.0],
      [-48.5,  95.0,   40.0],
      [-46.0, 115.0,   43.0,  "CAP LEEUWIN"],
      [-48.0, 130.0,   46.0],
      [-50.0, 150.0,   49.5],
      [-52.0, 170.0,   53.0],
      [-53.0,-170.0,   56.5],
      [-55.0,-150.0,   60.0],
      [-56.0,-130.0,   63.5],
      [-56.5,-110.0,   66.5],
      [-56.5, -90.0,   69.0],
      [-56.0, -67.5,   71.5,  "CAP HORN"],
      [-48.0, -55.0,   73.5],
      [-38.0, -45.0,   75.5],
      [-28.0, -38.0,   77.0],
      [-15.0, -33.0,   78.5],
      [  0.0, -28.0,   80.0,  "ÉQUATEUR RETOUR"],
      [ 12.0, -28.0,   81.2],
      [ 22.0, -30.0,   82.4],
      [ 32.0, -28.0,   83.5],
      [ 40.0, -20.0,   84.5],
      [ 44.0, -10.0,   85.3],
      [ 46.50, -1.78,  86.0,  "ARRIVÉE"]
    ],
    capes: [
      { key: 'sables',  label: "Les Sables-d'Olonne",   day: 0,    labelKey: "LES SABLES-D'OLONNE" },
      { key: 'eq1',     label: 'Équateur (aller)',       day: 11.5, labelKey: "ÉQUATEUR" },
      { key: 'bonne',   label: 'Cap de Bonne-Espérance', day: 25.5, labelKey: "CAP DE BONNE-ESPÉRANCE" },
      { key: 'leeuwin', label: 'Cap Leeuwin',            day: 43.0, labelKey: "CAP LEEUWIN" },
      { key: 'horn',    label: 'Cap Horn',               day: 71.5, labelKey: "CAP HORN" },
      { key: 'eq2',     label: 'Équateur (retour)',      day: 80.0, labelKey: "ÉQUATEUR RETOUR" },
      { key: 'arrivee', label: 'Arrivée Les Sables',     day: 86.0, labelKey: "ARRIVÉE" }
    ]
  },

  // ============================================================
  // 2. GUYADER BERMUDES 1000 RACE 2026 — solo, qualifier pour la Route du Rhum
  // Parcours ~1000 milles en Atlantique Nord : Les Sables-d'Olonne, bouée au large
  // de la Bretagne, descente vers la Corogne, remontée vers l'Irlande, retour.
  // ============================================================
  bermudes1000: {
    name: 'Guyader Bermudes 1000 Race',
    subtitle: '2026 · 1 000 milles en solitaire',
    short: '1000 Race',
    startDate: new Date('2026-04-27T13:00:00Z'),
    raceDays: 6.5,
    totalNm: 1000,
    startLabel: "LES SABLES-D'OLONNE",
    finishLabel: "LES SABLES-D'OLONNE",
    kind: 'IMOCA · 1 000 nm',
    waypoints: [
      [46.50,  -1.78,  0.00,  "LES SABLES-D'OLONNE"],
      [47.20,  -3.50,  0.30],
      [47.80,  -5.50,  0.60,  "BOUÉE BRETAGNE"],
      [47.40,  -7.50,  0.90],
      [46.20, -10.00,  1.40],
      [44.50, -11.50,  1.90],
      [43.20, -10.50,  2.30,  "LA CORUÑA"],
      [44.00,  -9.00,  2.70],
      [45.50,  -8.50,  3.10],
      [47.00,  -9.50,  3.50],
      [48.80, -10.50,  4.00],
      [50.20, -11.80,  4.40,  "SUD IRLANDE"],
      [50.80, -10.00,  4.70],
      [50.00,  -7.50,  5.00],
      [48.50,  -6.00,  5.40],
      [47.40,  -4.00,  5.80],
      [46.80,  -2.80,  6.20],
      [46.50,  -1.78,  6.50,  "ARRIVÉE"]
    ],
    capes: [
      { key: 'start',   label: 'Départ Les Sables',      day: 0.00, labelKey: "LES SABLES-D'OLONNE" },
      { key: 'bretagne',label: 'Bouée Bretagne',         day: 0.60, labelKey: "BOUÉE BRETAGNE" },
      { key: 'coruna',  label: 'La Coruña',              day: 2.30, labelKey: "LA CORUÑA" },
      { key: 'irlande', label: 'Sud Irlande',            day: 4.40, labelKey: "SUD IRLANDE" },
      { key: 'arrivee', label: 'Arrivée Les Sables',     day: 6.50, labelKey: "ARRIVÉE" }
    ]
  },

  // ============================================================
  // 3. VENDÉE ARCTIQUE LES SABLES 2026 — solo, juin
  // Les Sables → remontée Atlantique Nord, Écosse, Islande, banquise,
  // contournement d'une bouée en mer du Groenland, retour.
  // ============================================================
  vendeeArctique: {
    name: 'Vendée Arctique · Les Sables',
    subtitle: '2026 · 3 700 milles en solitaire',
    short: 'Vendée Arctique',
    startDate: new Date('2026-06-14T13:00:00Z'),
    raceDays: 12,
    totalNm: 3700,
    startLabel: "LES SABLES-D'OLONNE",
    finishLabel: "LES SABLES-D'OLONNE",
    kind: 'IMOCA · 3 700 nm',
    waypoints: [
      [46.50,  -1.78,  0.0,   "LES SABLES-D'OLONNE"],
      [47.80,  -4.50,  0.5],
      [49.50,  -7.00,  1.0],
      [51.50,  -9.50,  1.6],
      [54.00, -11.00,  2.3,   "OUEST IRLANDE"],
      [57.50, -12.00,  3.2,   "OUEST ÉCOSSE"],
      [60.80, -13.50,  4.1],
      [63.50, -16.00,  5.0,   "ISLANDE SUD"],
      [65.50, -22.00,  5.9],
      [67.80, -28.00,  6.9,   "MER DU GROENLAND"],
      [69.00, -15.00,  7.9,   "BOUÉE ARCTIQUE"],
      [67.00, -10.00,  8.7],
      [63.50,  -8.00,  9.4],
      [59.00,  -9.00, 10.1],
      [54.00, -11.00, 10.8],
      [50.00, -10.00, 11.3],
      [47.50,  -6.00, 11.7],
      [46.50,  -1.78, 12.0,   "ARRIVÉE"]
    ],
    capes: [
      { key: 'start',    label: 'Départ Les Sables',     day: 0.0,  labelKey: "LES SABLES-D'OLONNE" },
      { key: 'irlande',  label: 'Ouest Irlande',         day: 2.3,  labelKey: "OUEST IRLANDE" },
      { key: 'ecosse',   label: 'Ouest Écosse',          day: 3.2,  labelKey: "OUEST ÉCOSSE" },
      { key: 'islande',  label: 'Islande Sud',           day: 5.0,  labelKey: "ISLANDE SUD" },
      { key: 'groenland',label: 'Mer du Groenland',      day: 6.9,  labelKey: "MER DU GROENLAND" },
      { key: 'bouee',    label: 'Bouée Arctique',        day: 7.9,  labelKey: "BOUÉE ARCTIQUE" },
      { key: 'arrivee',  label: 'Arrivée Les Sables',    day: 12.0, labelKey: "ARRIVÉE" }
    ]
  },

  // ============================================================
  // 4. ROUTE DU RHUM · DESTINATION GUADELOUPE 2026 — solo, novembre
  // Saint-Malo → Pointe-à-Pitre (Guadeloupe). ~3 542 nm.
  // ============================================================
  routeDuRhum: {
    name: 'Route du Rhum · Guadeloupe',
    subtitle: '2026 · 3 542 milles en solitaire',
    short: 'Route du Rhum',
    startDate: new Date('2026-11-08T14:02:00Z'),
    raceDays: 10,
    totalNm: 3542,
    startLabel: "SAINT-MALO",
    finishLabel: "POINTE-À-PITRE",
    kind: 'IMOCA · Saint-Malo → Guadeloupe',
    waypoints: [
      [48.65,  -2.02,  0.0,  "SAINT-MALO"],
      [48.40,  -4.50,  0.3],
      [48.00,  -6.80,  0.6],
      [47.50,  -9.00,  0.9,  "POINTE DE PENMARC'H"],
      [46.00, -11.00,  1.3],
      [43.50, -13.00,  1.8,  "FINISTÈRE ESPAGNOL"],
      [40.00, -14.50,  2.3],
      [36.50, -16.00,  2.8],
      [33.00, -18.00,  3.4,  "MADÈRE"],
      [28.50, -20.00,  4.0,  "CANARIES"],
      [24.00, -22.50,  4.7],
      [20.00, -26.00,  5.4,  "CAP-VERT"],
      [17.50, -30.00,  6.1],
      [16.50, -38.00,  7.0,  "ALIZÉS"],
      [16.30, -46.00,  7.9],
      [16.20, -54.00,  8.7],
      [16.20, -60.00,  9.5],
      [16.24, -61.53, 10.0,  "POINTE-À-PITRE"]
    ],
    capes: [
      { key: 'start',   label: 'Départ Saint-Malo',      day: 0.0,  labelKey: "SAINT-MALO" },
      { key: 'penmarch',label: "Pointe de Penmarc'h",    day: 0.9,  labelKey: "POINTE DE PENMARC'H" },
      { key: 'finist',  label: 'Finistère espagnol',     day: 1.8,  labelKey: "FINISTÈRE ESPAGNOL" },
      { key: 'madere',  label: 'Madère',                 day: 3.4,  labelKey: "MADÈRE" },
      { key: 'canaries',label: 'Canaries',               day: 4.0,  labelKey: "CANARIES" },
      { key: 'capvert', label: 'Cap-Vert',               day: 5.4,  labelKey: "CAP-VERT" },
      { key: 'alizes',  label: 'Alizés',                 day: 7.0,  labelKey: "ALIZÉS" },
      { key: 'arrivee', label: 'Arrivée Pointe-à-Pitre', day: 10.0, labelKey: "POINTE-À-PITRE" }
    ]
  }
};

// ---------- Shared mutable ACTIVE race state ----------
// Globe & UI read from these; setActiveRace() mutates them in-place.
let ACTIVE_KEY = 'vendeeGlobe';
let RACE = RACES[ACTIVE_KEY];
let WAYPOINTS = RACE.waypoints;
let CAPES = RACE.capes;
let START_DATE = RACE.startDate;
let RACE_DAYS = RACE.raceDays;
let TOTAL_DISTANCE_NM = RACE.totalNm;
let ROUTE = [];        // filled by rebuildRoute()
let SEGMENTS = [];

// ---------- Route smoothing / interpolation helpers ----------
function smoothRoute(wps, steps) {
  steps = steps || 10;
  const toXYZ = (lat, lon) => {
    const phi = (90 - lat) * Math.PI / 180;
    const the = (lon + 180) * Math.PI / 180;
    return [
      -Math.sin(phi) * Math.cos(the),
       Math.cos(phi),
       Math.sin(phi) * Math.sin(the)
    ];
  };
  const toLL = (x,y,z) => {
    const lat = 90 - Math.acos(y) * 180 / Math.PI;
    const lon = (Math.atan2(z, -x) * 180 / Math.PI) - 180;
    return [lat, ((lon + 540) % 360) - 180];
  };
  const slerp = (a, b, t) => {
    const dot = Math.max(-1, Math.min(1, a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
    const om = Math.acos(dot);
    if (om < 1e-6) return a;
    const s1 = Math.sin((1-t)*om)/Math.sin(om);
    const s2 = Math.sin(t*om)/Math.sin(om);
    return [a[0]*s1+b[0]*s2, a[1]*s1+b[1]*s2, a[2]*s1+b[2]*s2];
  };
  const out = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const [lat1, lon1, d1] = wps[i];
    const [lat2, lon2, d2] = wps[i+1];
    const a = toXYZ(lat1, lon1);
    const b = toXYZ(lat2, lon2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const p = slerp(a, b, t);
      const [la, lo] = toLL(p[0], p[1], p[2]);
      const day = d1 + (d2 - d1) * t;
      out.push({ lat: la, lon: lo, day });
    }
  }
  const last = wps[wps.length - 1];
  out.push({ lat: last[0], lon: last[1], day: last[2] });
  return out;
}

function haversineNm(a, b) {
  const R = 3440;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rebuildRoute() {
  ROUTE = smoothRoute(WAYPOINTS, 10);
  let cum = 0;
  ROUTE.forEach((p, i) => {
    if (i === 0) p.dist = 0;
    else { cum += haversineNm(ROUTE[i-1], p); p.dist = cum; }
  });
}

// ---------- Sampling ----------
function sampleRoute(day) {
  day = Math.max(0, Math.min(RACE_DAYS, day));
  let lo = 0, hi = ROUTE.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (ROUTE[mid].day <= day) lo = mid; else hi = mid;
  }
  const a = ROUTE[lo], b = ROUTE[hi];
  const t = (day - a.day) / Math.max(1e-6, b.day - a.day);
  const lat = a.lat + (b.lat - a.lat) * t;
  let lonA = a.lon, lonB = b.lon;
  if (Math.abs(lonB - lonA) > 180) {
    if (lonB > lonA) lonA += 360; else lonB += 360;
  }
  let lon = lonA + (lonB - lonA) * t;
  lon = ((lon + 540) % 360) - 180;
  const dist = a.dist + (b.dist - a.dist) * t;
  const ahead = ROUTE[Math.min(ROUTE.length - 1, hi)];
  const behind = ROUTE[Math.max(0, lo)];
  const dDay = Math.max(0.1, ahead.day - behind.day);
  const dNm = ahead.dist - behind.dist;
  const speed = (dNm / dDay) / 24;
  const y = Math.sin((b.lon-a.lon)*Math.PI/180) * Math.cos(b.lat*Math.PI/180);
  const x = Math.cos(a.lat*Math.PI/180)*Math.sin(b.lat*Math.PI/180) -
            Math.sin(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.cos((b.lon-a.lon)*Math.PI/180);
  const bearing = ((Math.atan2(y, x) * 180/Math.PI) + 360) % 360;
  return { lat, lon, dist, speed, bearing, t, segIndex: lo };
}

// ---------- Wind ----------
function sampleWind(lat, lon, day) {
  const n = Math.sin(day * 1.37 + lon * 0.04) * 0.5 + 0.5;
  let speed, dir, state;
  if (lat > 55)       { speed = 22 + n * 14;  dir = 250; state = 'Agitée'; }
  else if (lat > 30)  { speed = 14 + n * 10;  dir = 250; state = 'Belle'; }
  else if (lat > 10)  { speed = 18 + n * 8;   dir = 60;  state = 'Peu agitée'; }
  else if (lat > -10) { speed = 8  + n * 8;   dir = 100; state = 'Pot-au-noir'; }
  else if (lat > -30) { speed = 18 + n * 10;  dir = 130; state = 'Peu agitée'; }
  else if (lat > -45) { speed = 25 + n * 12;  dir = 280; state = 'Agitée'; }
  else if (lat > -55) { speed = 32 + n * 18;  dir = 270; state = 'Très agitée'; }
  else                { speed = 40 + n * 15;  dir = 260; state = 'Grosse mer'; }
  dir = (dir + Math.sin(day * 0.8 + lat * 0.1) * 15 + 360) % 360;
  speed = Math.max(4, speed + Math.sin(day * 2.1) * 3);
  return { speed: Math.round(speed), dir: Math.round(dir), state };
}

// ---------- Format helpers ----------
function dayToDate(day) {
  return new Date(START_DATE.getTime() + day * 86400000);
}
function formatDate(d) {
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;
}
function formatLat(lat) {
  const a = Math.abs(lat).toFixed(2);
  return `${a}° ${lat >= 0 ? 'N' : 'S'}`;
}
function formatLon(lon) {
  const a = Math.abs(lon).toFixed(2);
  return `${a}° ${lon >= 0 ? 'E' : 'W'}`;
}
function dirName(deg) {
  const names = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return names[Math.round(deg/22.5) % 16];
}

// ---------- Race switching ----------
// Listeners subscribe to get notified on race change.
const _raceListeners = [];
function onRaceChange(fn) { _raceListeners.push(fn); }

function setActiveRace(key) {
  if (!RACES[key]) return;
  ACTIVE_KEY = key;
  RACE = RACES[key];
  WAYPOINTS = RACE.waypoints;
  CAPES = RACE.capes;
  START_DATE = RACE.startDate;
  RACE_DAYS = RACE.raceDays;
  TOTAL_DISTANCE_NM = RACE.totalNm;
  rebuildRoute();
  _raceListeners.forEach(fn => { try { fn(key, RACE); } catch(e) { console.error(e); } });
}

// Initial build
rebuildRoute();
