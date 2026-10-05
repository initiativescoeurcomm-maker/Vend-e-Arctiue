// GET /api/rituel — dernier pointage d'Initiatives-Cœur sur la Route du Rhum 2026,
// pour la page « Le rituel du matin » (dist/rituel.html).
//
// Le flux « données brutes » Geovoile est sous clé et sous licence : la clé vit
// comme SECRET du projet Pages (env.GEOVOILE_RDR_KEY) — jamais dans le dépôt
// (public) ni dans la page. On ne renvoie au navigateur que NOTRE bateau, pas
// le reste de la flotte.
//
// Unités supposées (à vérifier au premier vrai pointage, le flux étant vide
// avant le départ) : vitesses en nœuds, distances en milles, hauteurs en
// mètres, températures en °C, pression en hPa.

const FEED = 'https://initiatives.geovoile.com/routedurhum/2026/rawdata/';
const OUR_BOAT = /initiatives/i;
const TTL = 300; // secondes : Geovoile n'est interrogé qu'une fois par 5 min

export const onRequestGet = async ({ env }) => {
  const key = env.GEOVOILE_RDR_KEY;
  if (!key) return json({ error: 'GEOVOILE_RDR_KEY non configurée' }, 503);

  let xml;
  try {
    const res = await fetch(`${FEED}?key=${encodeURIComponent(key)}`, {
      cf: { cacheTtl: TTL, cacheEverything: true },
    });
    if (!res.ok) return json({ error: `Geovoile a répondu ${res.status}` }, 502);
    xml = await res.text();
  } catch {
    return json({ error: 'Geovoile injoignable' }, 502);
  }

  const data = parseFeed(xml);
  if (!data) return json({ error: 'Initiatives-Cœur introuvable dans le flux' }, 502);
  return json(data, 200, `private, max-age=${TTL}`);
};

// Le flux est un XML plat et régulier (<race><leg><report><class><boat>…) :
// quelques expressions régulières suffisent, sans parseur XML (absent du
// runtime Workers).
export function parseFeed(xml) {
  // Un seul <report> observé avant le départ ; s'il y en a plusieurs un jour,
  // on garde le plus récent.
  const report = xml.split('<report ').slice(1)
    .map(body => ({ date: attr(body, 'date'), body }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
  if (!report) return null;

  for (const cls of report.body.split('<class ').slice(1)) {
    const boats = cls.split('<boat ').slice(1);
    const b = boats.find(boat => OUR_BOAT.test(attr(boat, 'name')));
    if (!b) continue;
    return {
      race: decode((xml.match(/<race[^>]*\bname="([^"]*)"/) || [])[1] || ''),
      report: report.date,
      cls: {
        name: attr(cls, 'name'),
        distance: toNum(attr(cls, 'distance')),
        start: attr(cls, 'start'),
        boats: boats.length,
      },
      boat: {
        name: attr(b, 'name'),
        skipper: attr(b, 'skipper'),
        firstname: attr(b, 'skipperfirstname'),
        status: tag(b, 'status'),
        rank: num(b, 'rank'),
        date: tag(b, 'date'),
        lat: num(b, 'latitude'),
        lon: num(b, 'longitude'),
        heading: num(b, 'heading'),
        speed: num(b, 'speed'),
        last24: {
          distance: num(b, 'over24h_distance'),
          speed: num(b, 'over24h_speed'),
          heading: num(b, 'over24h_heading'),
        },
        dtf: num(b, 'dtf'),
        sailed: num(b, 'stats_overground_distance'),
        wind: {
          dir: num(b, 'environment_wind_direction'),
          speed: num(b, 'environment_wind_speed'),
          gust: num(b, 'environment_wind_gust'),
        },
        waves: {
          height: num(b, 'environment_wave_height'),
          dir: num(b, 'environment_wave_direction'),
        },
        water: num(b, 'environment_tempwater'),
        air: num(b, 'environment_tempair'),
        pressure: num(b, 'environment_prmsl'),
        result: {
          rank: num(b, 'result_rank'),
          date: tag(b, 'result_date'),
          time: tag(b, 'result_time'),
        },
      },
    };
  }
  return null;
}

// Attribut de la balise ouvrante par laquelle commence `block`.
function attr(block, name) {
  const open = block.slice(0, block.indexOf('>'));
  const m = open.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? decode(m[1]) : '';
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([^<]*)</${name}>`));
  return m ? decode(m[1].trim()) : '';
}

function num(block, name) { return toNum(tag(block, name)); }

function toNum(s) {
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function json(body, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });
}
