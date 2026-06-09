// --------------------------------------------------------------
// UI + playback state
// --------------------------------------------------------------

(function () {
  const $q = s => document.querySelector(s);
  const $$q = s => [...document.querySelectorAll(s)];
  const $ = $q;
  const $$ = $$q;

  // ----- playback state -----
  let progress = 0; // 0..1
  let playing = false;
  let speed = 2; // race-days per real-second (base)
  const SPEED_BASE = 0.8; // race-days per second at ×1

  // ----- populate cape list / scrubber markers / POI labels (rebuildable) -----
  const capeList = $('#cape-list');
  const markersEl = $('#scrubber-markers');
  const labelsLayer = $('#labels-layer');

  function buildRaceUI() {
    // Clear previous
    capeList.innerHTML = '';
    markersEl.innerHTML = '';
    // POI labels are rebuilt by Globe.setRace() which cleared old labelEl refs;
    // but on first call poiList is still the initial one — clear labelsLayer anyway.
    labelsLayer.innerHTML = '';

    CAPES.forEach(c => {
      const row = document.createElement('div');
      row.className = 'cape';
      row.dataset.key = c.key;
      row.innerHTML = `<span class="dot"></span><span class="label">${c.label}</span><span class="d">J+${c.day < 10 ? c.day.toFixed(1) : Math.round(c.day)}</span>`;
      capeList.appendChild(row);
    });

    // scrubber markers
    const majorKeys = new Set(CAPES.filter((c, i) => i > 0 && i < CAPES.length - 1).slice(-3).map(c => c.key).concat(['arrivee']));
    CAPES.forEach(c => {
      const pct = (c.day / RACE_DAYS) * 100;
      const m = document.createElement('div');
      m.className = 'scrubber-marker';
      m.dataset.day = c.day;
      m.style.left = pct + '%';
      markersEl.appendChild(m);

      if (majorKeys.has(c.key)) {
        const lb = document.createElement('div');
        lb.className = 'scrubber-marker-label';
        lb.style.left = pct + '%';
        lb.textContent = c.key === 'arrivee' ? 'Arrivée' : c.label.split(' ').pop();
        markersEl.appendChild(lb);
      }
    });

    // POI labels on globe
    Globe.poiList.forEach(p => {
      const el = document.createElement('div');
      el.className = 'poi-label';
      el.dataset.key = p.cape.key;
      el.innerHTML = `<span>${p.cape.label}</span><span class="d">J+${p.cape.day < 10 ? p.cape.day.toFixed(1) : Math.round(p.cape.day)}</span>`;
      labelsLayer.appendChild(el);
      p.labelEl = el;
    });

    // topbar meta
    const metaEl = $('#race-meta');
    if (metaEl) {
      const d = START_DATE;
      const p = n => String(n).padStart(2, '0');
      const dateStr = `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}`;
      metaEl.innerHTML =
        `Départ <strong>${dateStr}</strong> — ${RACE.startLabel}<br/>` +
        `${RACE.kind} · <strong>${RACE.totalNm.toLocaleString('fr-FR')}&nbsp;nm</strong> théoriques`;
    }
    const titleEl = $('#race-title');
    if (titleEl) {
      titleEl.innerHTML = `Initiatives <b>Cœur</b> · ${RACE.name}`;
    }
    const eyebrowEl = $('#race-eyebrow');
    if (eyebrowEl) eyebrowEl.textContent = RACE.subtitle;

    // end-of-scrubber chip
    const chipEnd = $('#chip-end');
    if (chipEnd) chipEnd.textContent = 'J+' + (RACE_DAYS < 10 ? RACE_DAYS.toFixed(1) : Math.round(RACE_DAYS));

    // hook the projection to the render loop (first call only; idempotent)
    window.__renderLabels = () => Globe.projectPOIs(labelsLayer);
  }

  buildRaceUI();

  // ----- wind ticks -----
  const windTicksEl = document.getElementById('wind-ticks');
  for (let i = 0; i < 36; i++) {
    const angle = i * 10;
    const isMajor = i % 9 === 0;
    const len = isMajor ? 4 : 2;
    const rad = (angle - 90) * Math.PI / 180;
    const x1 = 50 + Math.cos(rad) * 42;
    const y1 = 50 + Math.sin(rad) * 42;
    const x2 = 50 + Math.cos(rad) * (42 - len);
    const y2 = 50 + Math.sin(rad) * (42 - len);
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1);
    l.setAttribute('y1', y1);
    l.setAttribute('x2', x2);
    l.setAttribute('y2', y2);
    l.setAttribute('stroke', 'rgba(246,241,231,.25)');
    l.setAttribute('stroke-width', isMajor ? 0.8 : 0.4);
    windTicksEl.appendChild(l);
  }

  const hudDay = $('#hud-day');
  const hudDate = $('#hud-date');
  const hudLat = $('#hud-lat');
  const hudLon = $('#hud-lon');
  const hudSpeed = $('#hud-speed');
  const hudDist = $('#hud-dist');
  const windN = $('#wind-n');
  const windDir = $('#wind-dir');
  const windState = $('#wind-state');
  const windArrow = $('#wind-arrow');
  const fill = $('#scrubber-fill');
  const thumb = $('#scrubber-thumb');

  function update() {
    const day = progress * RACE_DAYS;
    const s = Globe.updateBoat(progress);
    const date = dayToDate(day);
    const w = sampleWind(s.lat, s.lon, day);

    hudDay.textContent = 'J+' + day.toFixed(1);
    hudDate.textContent = formatDate(date);
    hudLat.textContent = formatLat(s.lat);
    hudLon.textContent = formatLon(s.lon);
    hudSpeed.innerHTML = `${s.speed.toFixed(1)}<span class="u">kn</span>`;
    hudDist.innerHTML = `${Math.round(s.dist).toLocaleString('fr-FR')}<span class="u">nm</span>`;

    windN.textContent = w.speed;
    windDir.textContent = `${dirName(w.dir)} · ${w.dir}°`;
    windState.textContent = w.state;
    windArrow.setAttribute('transform', `rotate(${w.dir} 50 50)`);

    fill.style.width = (progress * 100) + '%';
    thumb.style.left = (progress * 100) + '%';

    // Update cape list status
    CAPES.forEach(c => {
      const row = capeList.querySelector(`[data-key="${c.key}"]`);
      if (!row) return;
      row.classList.remove('done', 'active');
      if (day >= c.day) row.classList.add('done');
      else if (c === CAPES.find(x => day < x.day)) row.classList.add('active');
      // update POI label styling
      const lbl = labelsLayer.querySelector(`[data-key="${c.key}"]`);
      if (lbl) lbl.classList.toggle('passed', day >= c.day);
    });

    // Update scrubber markers
    $$('.scrubber-marker').forEach(m => {
      const d = parseFloat(m.dataset.day);
      m.classList.toggle('passed', day >= d);
    });
  }

  // ----- play loop -----
  let lastT = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    const dt = (t - lastT) / 1000;
    lastT = t;
    if (playing && dt < 0.5) {
      const inc = (SPEED_BASE * speed * dt) / RACE_DAYS;
      progress = Math.min(1, progress + inc);
      update();
      if (progress >= 1) setPlaying(false);
    }
  }
  requestAnimationFrame(tick);

  // ----- play controls -----
  const btnPlay = $('#btn-play');
  const iconPlay = $('#icon-play');
  const iconPause = $('#icon-pause');
  const playLabel = $('#btn-play-label');

  function setPlaying(p) {
    playing = p;
    iconPlay.style.display = p ? 'none' : '';
    iconPause.style.display = p ? '' : 'none';
    playLabel.textContent = p ? 'Pause' : (progress >= 1 ? 'Rejouer' : 'Lancer');
  }
  btnPlay.addEventListener('click', () => {
    if (progress >= 1) progress = 0;
    setPlaying(!playing);
  });

  $('#btn-reset').addEventListener('click', () => {
    progress = 0;
    setPlaying(false);
    update();
  });

  // speed group
  $$('#spd-group .btn').forEach(b => {
    b.addEventListener('click', () => {
      $$('#spd-group .btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      speed = parseFloat(b.dataset.spd);
    });
  });

  // scrubber drag
  const scrubber = $('#scrubber');
  let dragging = false;
  function setFromX(e) {
    const r = scrubber.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    progress = Math.max(0, Math.min(1, x / r.width));
    update();
  }
  scrubber.addEventListener('mousedown', e => { dragging = true; setFromX(e); });
  window.addEventListener('mousemove', e => { if (dragging) setFromX(e); });
  window.addEventListener('mouseup', () => dragging = false);
  scrubber.addEventListener('touchstart', e => { dragging = true; setFromX(e); });
  window.addEventListener('touchmove', e => { if (dragging) setFromX(e); });
  window.addEventListener('touchend', () => dragging = false);

  // follow button: now toggles auto-rotate (less useful since follow is default).
  // Re-label to reflect new behaviour: "Auto-centre" indicator (always on by default).
  const btnFollow = $('#btn-follow');
  btnFollow.classList.add('active');
  // Update the text node safely
  if (btnFollow.lastChild && btnFollow.lastChild.nodeType === 3) {
    btnFollow.lastChild.textContent = ' Auto-centré';
  }
  btnFollow.addEventListener('click', () => {
    Globe.setFollow(true);
    btnFollow.classList.add('flash');
    setTimeout(() => btnFollow.classList.remove('flash'), 400);
  });

  // ----- Tweaks -----
  const tweaksEl = $('#tweaks');
  const btnTweaks = $('#btn-tweaks');
  btnTweaks.addEventListener('click', () => {
    tweaksEl.classList.toggle('visible');
  });

  // read defaults
  Object.assign(Globe.state, TWEAK_DEFAULTS);
  Globe.applyTheme();

  // theme buttons
  $$('#tk-theme .tweak-btn').forEach(b => {
    if (b.dataset.val === Globe.state.theme) b.classList.add('active');
    else b.classList.remove('active');
    b.addEventListener('click', () => {
      $$('#tk-theme .tweak-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      Globe.state.theme = b.dataset.val;
      Globe.applyTheme();
      postEdit({ theme: b.dataset.val });
    });
  });
  $$('#tk-trail .tweak-btn').forEach(b => {
    if (b.dataset.val === Globe.state.trailColor) b.classList.add('active');
    else b.classList.remove('active');
    b.addEventListener('click', () => {
      $$('#tk-trail .tweak-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      Globe.state.trailColor = b.dataset.val;
      Globe.applyTheme();
      postEdit({ trailColor: b.dataset.val });
    });
  });

  function bindToggle(id, key) {
    const el = $('#' + id);
    el.classList.toggle('on', !!Globe.state[key]);
    el.addEventListener('click', () => {
      Globe.state[key] = !Globe.state[key];
      el.classList.toggle('on', Globe.state[key]);
      Globe.applyTheme();
      postEdit({ [key]: Globe.state[key] });
    });
  }
  bindToggle('tk-clouds', 'clouds');
  bindToggle('tk-atmo', 'atmosphere');
  bindToggle('tk-aez', 'showAEZ');
  bindToggle('tk-autorotate', 'autoRotate');

  // Edit-mode protocol
  window.addEventListener('message', e => {
    const d = e.data || {};
    if (d.type === '__activate_edit_mode') tweaksEl.classList.add('visible');
    if (d.type === '__deactivate_edit_mode') tweaksEl.classList.remove('visible');
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');

  function postEdit(edits) {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); }
    catch (e) {}
  }

  // ----- Race picker -----
  const racePickerEl = $('#race-picker');
  if (racePickerEl) {
    const RACE_ORDER = ['vendeeGlobe', 'routeDuRhum', 'vendeeArctique', 'bermudes1000'];
    RACE_ORDER.forEach(key => {
      if (!RACES[key]) return;
      const b = document.createElement('button');
      b.className = 'race-btn' + (key === 'vendeeGlobe' ? ' active' : '');
      b.dataset.key = key;
      b.textContent = RACES[key].short;
      racePickerEl.appendChild(b);
      b.addEventListener('click', () => {
        if (key === ACTIVE_KEY) return;
        $$('.race-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        Globe.setRace(key);
        buildRaceUI();
        progress = 0;
        setPlaying(false);
        update();
      });
    });
  }

  // Also listen for programmatic race changes (keep UI/topbar in sync)
  onRaceChange(() => { /* no-op: button handler + buildRaceUI already cover it */ });

  // ----- keyboard -----
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (progress >= 1) progress = 0;
      setPlaying(!playing);
    }
    if (e.code === 'KeyR') {
      progress = 0;
      setPlaying(false);
      update();
    }
  });

  // init
  update();

  // hide loading
  setTimeout(() => document.getElementById('loading').classList.add('hidden'), 400);
})();
