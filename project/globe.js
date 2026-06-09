// --------------------------------------------------------------
// Three.js globe scene for Initiatives-Cœur Vendée Globe viz
// Real NASA Blue Marble textures (public domain)
// --------------------------------------------------------------

const Globe = (() => {
  const container = document.getElementById('scene');
  const w = () => container.clientWidth;
  const h = () => container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w(), h());
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, w() / h(), 0.1, 200);
  camera.position.set(0, 0.6, 4.2);

  // ---- lights
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.45);
  sun.position.set(5, 2, 3);
  scene.add(sun);
  const ambient = new THREE.AmbientLight(0x8aa3c8, 0.35);
  scene.add(ambient);
  const rim = new THREE.DirectionalLight(0x6b8dc8, 0.25);
  rim.position.set(-5, 1, -2);
  scene.add(rim);

  // ---- controls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.6;
  controls.maxDistance = 7;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.6;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.15;

  // ---- earth group (with axial tilt)
  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = 23.4 * Math.PI / 180;
  scene.add(earthGroup);

  // ============================================================
  // REAL EARTH TEXTURES (NASA Blue Marble, public domain)
  // Loaded asynchronously; a procedural fallback fills in until ready.
  // ============================================================
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  // fallback solid blue texture until satellite map loads
  const fbCvs = document.createElement('canvas');
  fbCvs.width = 2; fbCvs.height = 2;
  const fbCtx = fbCvs.getContext('2d');
  fbCtx.fillStyle = '#0b3a68';
  fbCtx.fillRect(0, 0, 2, 2);
  const fallbackTex = new THREE.CanvasTexture(fbCvs);

  const TEX = {
    day:     'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
    night:   'https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg',
    bump:    'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png',
    spec:    'https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png',
    clouds:  'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'
  };

  function load(url) {
    return new Promise((resolve) => {
      loader.load(url, (t) => {
        t.anisotropy = 8;
        t.encoding = THREE.sRGBEncoding;
        resolve(t);
      }, undefined, () => resolve(fallbackTex));
    });
  }

  // ---- earth material (start with fallback)
  const earthGeo = new THREE.SphereGeometry(1, 128, 128);
  const earthMat = new THREE.MeshPhongMaterial({
    map: fallbackTex,
    shininess: 18,
    specular: new THREE.Color(0x2a4a70),
    bumpScale: 0.02
  });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  earthGroup.add(earth);

  // night side emissive texture (only shown when sun is on other side)
  // We use a dedicated night sphere slightly below, with custom shader that
  // mixes day/night based on lighting direction.
  // For simplicity and portability with MeshPhongMaterial, we set the
  // night texture as emissiveMap; day becomes the main map.
  // This gives "city lights" on the dark side.
  function applyNightMap(tex) {
    earthMat.emissive = new THREE.Color(0xffffff);
    earthMat.emissiveMap = tex;
    earthMat.emissiveIntensity = 0.55;
    earthMat.needsUpdate = true;
  }

  // ---- cloud sphere (fallback transparent)
  const cloudGeo = new THREE.SphereGeometry(1.014, 72, 72);
  const cloudMat = new THREE.MeshPhongMaterial({
    transparent: true, opacity: 0, depthWrite: false
  });
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  earthGroup.add(clouds);

  // load all textures
  (async () => {
    const [day, night, bump, spec, cl] = await Promise.all([
      load(TEX.day), load(TEX.night), load(TEX.bump), load(TEX.spec), load(TEX.clouds)
    ]);
    earthMat.map = day;
    earthMat.bumpMap = bump;
    earthMat.specularMap = spec;
    earthMat.needsUpdate = true;
    applyNightMap(night);

    cloudMat.map = cl;
    cloudMat.alphaMap = cl;
    cloudMat.transparent = true;
    cloudMat.opacity = state.theme === 'night' ? 0.3 : 0.55;
    cloudMat.needsUpdate = true;

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
  })();

  // ---- atmosphere glow
  const atmoGeo = new THREE.SphereGeometry(1.09, 72, 72);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x88b3ff) },
      intensity: { value: 1.2 }
    },
    vertexShader: `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vView;
      uniform vec3 glowColor; uniform float intensity;
      void main() {
        float f = pow(1.0 - dot(vNormal, vView), 2.3);
        gl_FragColor = vec4(glowColor * f * intensity, f);
      }`,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  const atmo = new THREE.Mesh(atmoGeo, atmoMat);
  scene.add(atmo);

  // ---- stars (night)
  const starGeo = new THREE.BufferGeometry();
  const starCount = 2200;
  const sp = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 50 + Math.random() * 25;
    const u = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u;
    const ph = Math.acos(2 * v - 1);
    sp[i*3]   = r * Math.sin(ph) * Math.cos(th);
    sp[i*3+1] = r * Math.cos(ph);
    sp[i*3+2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7, sizeAttenuation: true
  }));
  scene.add(stars);
  stars.visible = false;

  // ---- lat/lon → V3
  const R = 1.005;
  function llToV3(lat, lon, r = R) {
    const phi = (90 - lat) * Math.PI / 180;
    const the = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(the),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(the)
    );
  }

  // ---- route points + POIs (rebuildable when race changes)
  // Parent group holds everything tied to a specific race
  const raceGroup = new THREE.Group();
  earthGroup.add(raceGroup);

  let routePoints = [];
  let fullLine = null;
  let trailGeo = null;
  let trailPositions = null;
  let trail = null;
  let trailGlow = null;
  let trailMat = null;
  let trailGlowMat = null;
  const poiList = [];  // {cape, worldPos, labelEl, dot}

  function disposeMesh(m) {
    if (!m) return;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach(mm => mm.dispose());
      else m.material.dispose();
    }
  }

  function buildRaceScene() {
    // Clear old POI labels from the DOM (UI layer manages them but holds refs via poiList)
    poiList.forEach(p => { if (p.labelEl && p.labelEl.parentNode) p.labelEl.parentNode.removeChild(p.labelEl); });
    poiList.length = 0;

    // Clear children of raceGroup and dispose
    while (raceGroup.children.length) {
      const c = raceGroup.children.pop();
      c.traverse && c.traverse(n => { if (n.isMesh || n.isLine) disposeMesh(n); });
    }

    // Build route line
    routePoints = ROUTE.map(p => llToV3(p.lat, p.lon, 1.014));
    const fullGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
    const fullMat = new THREE.LineDashedMaterial({
      color: 0xf6f1e7, dashSize: 0.025, gapSize: 0.02,
      transparent: true, opacity: 0.3
    });
    fullLine = new THREE.Line(fullGeo, fullMat);
    fullLine.computeLineDistances();
    raceGroup.add(fullLine);

    // Trail
    trailGeo = new THREE.BufferGeometry();
    trailMat = new THREE.LineBasicMaterial({ color: 0xE30613, linewidth: 2 });
    const maxTrail = routePoints.length + 1;
    trailPositions = new Float32Array(maxTrail * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setDrawRange(0, 0);
    trail = new THREE.Line(trailGeo, trailMat);
    raceGroup.add(trail);

    const trailGlowColor = 0xff4757;
    trailGlowMat = new THREE.LineBasicMaterial({
      color: trailGlowColor, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    trailGlow = new THREE.Line(trailGeo.clone(), trailGlowMat);
    raceGroup.add(trailGlow);

    // POI markers — use each cape's labelKey to match a waypoint
    const poiGroup = new THREE.Group();
    raceGroup.add(poiGroup);
    CAPES.forEach(c => {
      const target = (c.labelKey || '').toUpperCase();
      const wp = WAYPOINTS.find(w => w[3] && w[3].toUpperCase() === target);
      const [la, lo] = wp ? [wp[0], wp[1]] : [0, 0];
      const v = llToV3(la, lo, 1.018);

      const ringGeo = new THREE.RingGeometry(0.016, 0.022, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf6f1e7, transparent: true, opacity: 0.85, side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(v);
      ring.lookAt(v.clone().multiplyScalar(2));
      poiGroup.add(ring);

      const dotGeo = new THREE.SphereGeometry(0.007, 10, 10);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xE30613 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(v);
      poiGroup.add(dot);

      poiList.push({ cape: c, worldPos: v.clone(), ring, dot });
    });
  }

  buildRaceScene();

  // ---- AEZ (antarctic exclusion)
  const aezGroup = new THREE.Group();
  earthGroup.add(aezGroup);
  const aezPts = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    let lat;
    if (lon < 20)          lat = -45 - (lon + 180) * 0.02;
    else if (lon < 100)    lat = -48 - (lon - 20) * 0.07;
    else if (lon < 180)    lat = -55 - (lon - 100) * 0.01;
    else                    lat = -55;
    aezPts.push(llToV3(lat, lon, 1.016));
  }
  const aezGeo = new THREE.BufferGeometry().setFromPoints(aezPts);
  const aezMat = new THREE.LineDashedMaterial({
    color: 0xff9bb0, dashSize: 0.015, gapSize: 0.01,
    transparent: true, opacity: 0.6
  });
  const aezLine = new THREE.Line(aezGeo, aezMat);
  aezLine.computeLineDistances();
  aezGroup.add(aezLine);

  // ============================================================
  // IMOCA 60 — Initiatives-Cœur (clean, robust build)
  // Red hull with lofted profile, white foils, red sails with white heart.
  // ============================================================
  const boat = new THREE.Group();
  const LEN = 0.030;
  const BEAM = 0.010;
  const FREE = 0.004;

  function makeHeartShape(size) {
    const sh = new THREE.Shape();
    const s = size;
    sh.moveTo(0, -s*0.85);
    sh.bezierCurveTo(s*1.0, -s*0.2,  s*1.05,  s*0.65,  0, s*0.35);
    sh.bezierCurveTo(-s*1.05, s*0.65, -s*1.0, -s*0.2,  0, -s*0.85);
    return sh;
  }

  // --- Hull built from extruded top plan, tapered with scaling.
  // Top-view shape: pointed bow forward (+X), wide transom aft (-X).
  const hullPlan = new THREE.Shape();
  hullPlan.moveTo(LEN*0.5, 0);                              // bow tip
  hullPlan.bezierCurveTo(LEN*0.45, BEAM*0.18, LEN*0.25, BEAM*0.45, LEN*0.05, BEAM*0.50);
  hullPlan.bezierCurveTo(-LEN*0.15, BEAM*0.52, -LEN*0.35, BEAM*0.50, -LEN*0.50, BEAM*0.48);
  hullPlan.lineTo(-LEN*0.50, -BEAM*0.48);
  hullPlan.bezierCurveTo(-LEN*0.35, -BEAM*0.50, -LEN*0.15, -BEAM*0.52, LEN*0.05, -BEAM*0.50);
  hullPlan.bezierCurveTo(LEN*0.25, -BEAM*0.45, LEN*0.45, -BEAM*0.18, LEN*0.5, 0);

  const hullGeo = new THREE.ExtrudeGeometry(hullPlan, {
    depth: FREE*1.3,
    bevelEnabled: true,
    bevelThickness: FREE*0.35,
    bevelSize: BEAM*0.15,
    bevelSegments: 4,
    curveSegments: 22
  });
  hullGeo.rotateX(-Math.PI/2);     // lay flat (Y up)
  hullGeo.translate(0, -FREE*0.3, 0);
  const hullMat = new THREE.MeshPhongMaterial({
    color: 0xE30613, shininess: 80, specular: 0x552222
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  boat.add(hull);

  // --- White wordmark band on both flanks
  const bandGeo = new THREE.PlaneGeometry(LEN*0.55, FREE*0.32);
  const bandMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const bandP = new THREE.Mesh(bandGeo, bandMat);
  bandP.position.set(-LEN*0.05, FREE*0.05, BEAM*0.52);
  boat.add(bandP);
  const bandS = new THREE.Mesh(bandGeo, bandMat);
  bandS.position.set(-LEN*0.05, FREE*0.05, -BEAM*0.52);
  bandS.rotation.y = Math.PI;
  boat.add(bandS);

  // Small red hearts on the band
  const flankHeartGeo = new THREE.ShapeGeometry(makeHeartShape(FREE*0.35));
  const flankHeartMat = new THREE.MeshBasicMaterial({ color: 0xE30613, side: THREE.DoubleSide });
  const fhP = new THREE.Mesh(flankHeartGeo, flankHeartMat);
  fhP.position.set(LEN*0.18, FREE*0.05, BEAM*0.525);
  boat.add(fhP);
  const fhS = new THREE.Mesh(flankHeartGeo, flankHeartMat);
  fhS.position.set(LEN*0.18, FREE*0.05, -BEAM*0.525);
  fhS.rotation.y = Math.PI;
  boat.add(fhS);

  // --- Low coachroof (darker red)
  const cabinGeo = new THREE.BoxGeometry(LEN*0.32, FREE*0.55, BEAM*0.55);
  const cabinMat = new THREE.MeshPhongMaterial({ color: 0xA00A10, shininess: 60 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(LEN*0.00, FREE*0.85, 0);
  boat.add(cabin);
  // Cockpit windscreen (tinted)
  const cockpitGeo = new THREE.BoxGeometry(LEN*0.08, FREE*0.3, BEAM*0.45);
  const cockpitMat = new THREE.MeshPhongMaterial({ color: 0x222733, shininess: 120, specular: 0x99aadd });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(LEN*0.14, FREE*0.95, 0);
  cockpit.rotation.z = -0.22;
  boat.add(cockpit);

  // --- Keel fin + bulb (torpedo)
  const keelGeo = new THREE.BoxGeometry(LEN*0.05, LEN*0.38, BEAM*0.10);
  const keelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 });
  const keel = new THREE.Mesh(keelGeo, keelMat);
  keel.position.set(-LEN*0.01, -LEN*0.22, 0);
  boat.add(keel);
  const bulbGeo = new THREE.SphereGeometry(LEN*0.055, 14, 10);
  bulbGeo.scale(2.6, 0.55, 0.75);
  const bulb = new THREE.Mesh(bulbGeo, keelMat);
  bulb.position.set(-LEN*0.01, -LEN*0.42, 0);
  boat.add(bulb);

  // --- Twin rudders (stern)
  const rudMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
  const rudGeo = new THREE.BoxGeometry(LEN*0.025, LEN*0.12, BEAM*0.05);
  const rudP = new THREE.Mesh(rudGeo, rudMat);
  rudP.position.set(-LEN*0.42, -LEN*0.05, BEAM*0.32);
  rudP.rotation.z = -0.15;
  boat.add(rudP);
  const rudS = new THREE.Mesh(rudGeo, rudMat);
  rudS.position.set(-LEN*0.42, -LEN*0.05, -BEAM*0.32);
  rudS.rotation.z = -0.15;
  boat.add(rudS);

  // --- WHITE FOILS — big white curved blades protruding from each flank
  function buildFoil(side) {
    const g = new THREE.Group();
    const foilMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 });
    // main horizontal blade
    const bladeGeo = new THREE.BoxGeometry(LEN*0.04, FREE*0.28, BEAM*1.5);
    const blade = new THREE.Mesh(bladeGeo, foilMat);
    blade.position.set(0, 0, BEAM*0.75);
    blade.rotation.x = 0.08 * side; // slight dihedral
    g.add(blade);
    // downturned tip
    const tipGeo = new THREE.BoxGeometry(LEN*0.035, FREE*0.25, BEAM*0.4);
    const tip = new THREE.Mesh(tipGeo, foilMat);
    tip.position.set(0, -FREE*0.3, BEAM*1.5);
    tip.rotation.x = 0.6 * side;
    g.add(tip);

    g.position.set(LEN*0.05, FREE*0.05, side * BEAM*0.45);
    if (side < 0) g.scale.z = -1;
    return g;
  }
  boat.add(buildFoil(+1));
  boat.add(buildFoil(-1));

  // --- Mast
  const MAST_H = LEN*2.8;
  const mastGeo = new THREE.CylinderGeometry(LEN*0.009, LEN*0.013, MAST_H, 10);
  const mastMat = new THREE.MeshPhongMaterial({ color: 0xdddddd, shininess: 80 });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(LEN*0.02, FREE*1.1 + MAST_H/2, 0);
  mast.rotation.z = -0.03;
  boat.add(mast);

  // --- Boom
  const boomGeo = new THREE.CylinderGeometry(LEN*0.007, LEN*0.007, LEN*0.5, 8);
  boomGeo.rotateZ(Math.PI/2);
  const boom = new THREE.Mesh(boomGeo, mastMat);
  boom.position.set(-LEN*0.18, FREE*1.4, 0);
  boat.add(boom);

  // --- Bowsprit
  const bspGeo = new THREE.CylinderGeometry(LEN*0.006, LEN*0.008, LEN*0.20, 6);
  bspGeo.rotateZ(Math.PI/2);
  const bsp = new THREE.Mesh(bspGeo, mastMat);
  bsp.position.set(LEN*0.56, FREE*0.6, 0);
  boat.add(bsp);

  // --- Sails: RED with WHITE HEART
  function makeCurvedSail(width, height, curve, segs) {
    segs = segs || 12; curve = curve || 0.15;
    const g = new THREE.BufferGeometry();
    const v = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const chord = width * t;
      for (let j = 0; j <= segs; j++) {
        const s = j / segs;
        const x = chord * s;
        const y = height - height * t;
        const belly = Math.sin(Math.PI * s) * Math.sin(Math.PI * t) * curve * width;
        v.push(x, y, belly);
      }
    }
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs+1) + j;
        const b = a + 1, c = a + (segs+1), d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  const sailW = LEN*1.0;
  const sailH = MAST_H*0.96;

  // Mainsail (aft of mast, extending backwards along -X)
  const mainsailGeo = makeCurvedSail(sailW, sailH, 0.18, 14);
  // Build in +X direction then rotate so it extends backwards from mast
  mainsailGeo.rotateY(Math.PI);
  const mainsailMat = new THREE.MeshPhongMaterial({
    color: 0xE30613, side: THREE.DoubleSide, shininess: 15
  });
  const mainsail = new THREE.Mesh(mainsailGeo, mainsailMat);
  mainsail.position.set(LEN*0.02, FREE*1.1, 0);
  boat.add(mainsail);

  // White heart on mainsail — triangle: tack(0,0), head(0,sailH), clew(-sailW,0)
  // At height y, chord extends from x=0 to x=-sailW*(1-y/sailH)
  // Place heart at y=0.32*sailH, x=-sailW*0.25 — chord at that y is 0.68*sailW so x=-sailW*0.25 is inside
  const heartSailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mainHeart = new THREE.Mesh(
    new THREE.ShapeGeometry(makeHeartShape(sailW*0.13)),
    heartSailMat
  );
  mainHeart.position.set(LEN*0.02 - sailW*0.25, FREE*1.1 + sailH*0.32, 0.022);
  boat.add(mainHeart);

  // Jib (forward of mast, extending forward +X)
  const jibW = sailW*0.6;
  const jibH = sailH*0.82;
  const jibGeo = makeCurvedSail(jibW, jibH, 0.14, 10);
  // jib's triangle: tack(0,0), head(0,jibH), clew(+jibW,0). Extends forward along +X.
  const jibMat = new THREE.MeshPhongMaterial({
    color: 0xE30613, side: THREE.DoubleSide, shininess: 10
  });
  const jib = new THREE.Mesh(jibGeo, jibMat);
  jib.position.set(LEN*0.38, FREE*1.1, 0);
  boat.add(jib);

  // White heart on jib (inside triangle)
  const jibHeart = new THREE.Mesh(
    new THREE.ShapeGeometry(makeHeartShape(jibW*0.15)),
    heartSailMat
  );
  jibHeart.position.set(LEN*0.38 + jibW*0.22, FREE*1.1 + jibH*0.30, 0.024);
  boat.add(jibHeart);

  // --- Pulse ring at sea level
  const pulseGeo = new THREE.RingGeometry(LEN*0.55, LEN*0.80, 40);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0xE30613, transparent: true, opacity: 0.5, side: THREE.DoubleSide
  });
  const pulse = new THREE.Mesh(pulseGeo, pulseMat);
  pulse.rotation.x = -Math.PI/2;
  pulse.position.y = -FREE*0.2;
  boat.add(pulse);

  boat.scale.setScalar(1.15);

  earthGroup.add(boat);

  // ---- resize
  function onResize() {
    camera.aspect = w() / h();
    camera.updateProjectionMatrix();
    renderer.setSize(w(), h());
  }
  window.addEventListener('resize', onResize);

  // ---- update boat/trail
  function updateBoat(progress) {
    const day = progress * RACE_DAYS;
    const s = sampleRoute(day);
    const pos = llToV3(s.lat, s.lon, 1.016);
    boat.position.copy(pos);

    const nextDay = Math.min(RACE_DAYS, day + 0.2);
    const sNext = sampleRoute(nextDay);
    const posNext = llToV3(sNext.lat, sNext.lon, 1.016);
    const up = pos.clone().normalize();
    const forward = posNext.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const trueForward = new THREE.Vector3().crossVectors(right, up).normalize();
    const m = new THREE.Matrix4();
    // boat's local +X axis points forward along hull (bow)
    m.makeBasis(trueForward, up, right);
    boat.quaternion.setFromRotationMatrix(m);

    const zoom = camera.position.length();
    const scale = Math.max(1.1, Math.min(3.0, zoom / 1.8));
    boat.scale.setScalar(scale);

    const cutIdx = Math.floor(progress * (routePoints.length - 1));
    for (let i = 0; i <= cutIdx; i++) {
      const p = routePoints[i];
      trailPositions[i*3]     = p.x;
      trailPositions[i*3 + 1] = p.y;
      trailPositions[i*3 + 2] = p.z;
    }
    trailPositions[cutIdx*3 + 3] = pos.x;
    trailPositions[cutIdx*3 + 4] = pos.y;
    trailPositions[cutIdx*3 + 5] = pos.z;
    trailGeo.attributes.position.needsUpdate = true;
    trailGlow.geometry.attributes.position.array.set(trailPositions);
    trailGlow.geometry.attributes.position.needsUpdate = true;
    const count = cutIdx + 2;
    trailGeo.setDrawRange(0, count);
    trailGlow.geometry.setDrawRange(0, count);
    return s;
  }

  // ---- follow (camera keeps boat centered; pauses on user drag)
  let follow = true;          // always-on by default
  let followTarget = null;
  let lastInteract = 0;
  const IDLE_MS = 3000;

  function setFollow(v) { follow = v; }
  // User-input listeners: disable follow on drag/wheel; re-enable after idle
  const dom = renderer.domElement;
  ['pointerdown','wheel','touchstart'].forEach(ev => {
    dom.addEventListener(ev, () => { lastInteract = performance.now(); follow = false; }, {passive:true});
  });
  // Orbit-controls 'change' after drag also counts as interaction
  controls.addEventListener('start', () => { lastInteract = performance.now(); follow = false; });
  controls.addEventListener('end',   () => { lastInteract = performance.now(); });

  // ---- POI label projection: called each frame by UI
  const tmpVec = new THREE.Vector3();
  function projectPOIs(labelsContainer) {
    const size = renderer.getSize(new THREE.Vector2());
    const camWorldDir = camera.position.clone().normalize();
    // compute dynamic safe zones from visible panels
    const safeZones = [];
    ['.topbar', '.hud', '.wind', '.controls', '.tweaks.visible'].forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.1) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      safeZones.push(r);
    });
    const hitsPanel = (x, y) => safeZones.some(r =>
      x > r.left - 8 && x < r.right + 8 && y > r.top - 8 && y < r.bottom + 8
    );

    poiList.forEach(p => {
      if (!p.labelEl) return;
      const world = p.worldPos.clone().applyMatrix4(earthGroup.matrixWorld);
      const worldN = p.worldPos.clone().normalize().applyQuaternion(earthGroup.quaternion);
      const facing = worldN.dot(camWorldDir);

      tmpVec.copy(world).project(camera);
      const x = (tmpVec.x * 0.5 + 0.5) * size.x;
      const y = (-tmpVec.y * 0.5 + 0.5) * size.y;
      // label sits above anchor; check both anchor and label centre
      const labelY = y - 35;
      const inView = x > 20 && x < size.x - 20 && labelY > 8 && y < size.y - 8;
      const notBlocked = !hitsPanel(x, labelY) && !hitsPanel(x, y);
      const visible = facing > 0.08 && tmpVec.z < 1 && inView && notBlocked;
      p.labelEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -135%)`;
      p.labelEl.style.opacity = visible ? String(Math.min(1, (facing - 0.08) * 3)) : '0';
    });
  }

  // ---- state/theme
  let pulseT = 0;
  const state = {
    theme: 'day', trailColor: 'red',
    clouds: true, atmosphere: true, showAEZ: true, autoRotate: true
  };

  function applyTheme() {
    const isNight = state.theme === 'night';
    if (isNight) {
      document.body.style.background =
        'radial-gradient(ellipse at center, #0a1634 0%, #02060f 80%)';
      sun.intensity = 0.9;
      sun.color.set(0xb8d0ff);
      ambient.intensity = 0.18;
      ambient.color.set(0x1a2848);
      atmoMat.uniforms.glowColor.value.set(0x3d5fb0);
      atmoMat.uniforms.intensity.value = 1.5;
      stars.visible = true;
      if (cloudMat.map) cloudMat.opacity = 0.25;
      earthMat.emissiveIntensity = 0.8;
    } else {
      document.body.style.background =
        'radial-gradient(ellipse at top, #0a1f44 0%, #040d24 80%)';
      sun.intensity = 1.45;
      sun.color.set(0xfff4e0);
      ambient.intensity = 0.35;
      ambient.color.set(0x8aa3c8);
      atmoMat.uniforms.glowColor.value.set(0x88b3ff);
      atmoMat.uniforms.intensity.value = 1.2;
      stars.visible = false;
      if (cloudMat.map) cloudMat.opacity = 0.55;
      earthMat.emissiveIntensity = 0.35;
    }

    const red = 0xE30613, ivory = 0xf6f1e7;
    const color = state.trailColor === 'red' ? red : ivory;
    trailMat.color.setHex(color);
    trailGlowMat.color.setHex(state.trailColor === 'red' ? 0xff4757 : 0xffffff);
    pulseMat.color.setHex(color);

    clouds.visible = state.clouds;
    atmo.visible = state.atmosphere;
    aezGroup.visible = state.showAEZ;
    if (!follow) controls.autoRotate = state.autoRotate;
  }

  // ---- anim loop
  function animate(t) {
    requestAnimationFrame(animate);
    pulseT += 0.03;
    const p = 1 + Math.sin(pulseT) * 0.3;
    pulse.scale.setScalar(p);
    pulseMat.opacity = 0.7 - (p - 0.7) * 0.5;
    clouds.rotation.y += 0.00012;

    // Re-enable follow after IDLE_MS since last interaction
    if (!follow && performance.now() - lastInteract > IDLE_MS) {
      follow = true;
    }
    // Turn off autoRotate while follow is active
    controls.autoRotate = follow ? false : state.autoRotate;

    if (follow && followTarget) {
      const desiredDist = Math.max(camera.position.distanceTo(controls.target), 2.0);
      const targetDir = followTarget.clone().normalize();
      const camDir = camera.position.clone().normalize();
      const newDir = camDir.clone().lerp(targetDir, 0.06).normalize();
      camera.position.copy(newDir.multiplyScalar(desiredDist));
      controls.target.set(0, 0, 0);
    }

    controls.update();
    renderer.render(scene, camera);
    if (typeof window.__renderLabels === 'function') window.__renderLabels();
  }
  requestAnimationFrame(animate);

  return {
    updateBoat(progress) {
      const s = updateBoat(progress);
      followTarget = llToV3(s.lat, s.lon, 1.016);
      return s;
    },
    setFollow,
    get state() { return state; },
    applyTheme,
    get camera() { return camera; },
    get controls() { return controls; },
    poiList,
    projectPOIs,
    llToV3,
    setRace(key) {
      setActiveRace(key);
      buildRaceScene();
      // reapply theme so trail colors stay consistent after rebuild
      if (typeof applyTheme === 'function') applyTheme();
      // clear trail
      if (trailGeo) trailGeo.setDrawRange(0, 0);
      return poiList;
    },
    rebuildRaceScene: buildRaceScene
  };
})();
