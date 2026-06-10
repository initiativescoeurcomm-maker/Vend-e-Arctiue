/* ============================================================
   record.js — Capture trajet (MP4 export)
   ------------------------------------------------------------
   Hidden palette opened with the "R" key (desktop) or a triple-tap
   on the canvas (mobile). Lets the user pick:
     - a start and end position on the route timeline
     - one or two aspect ratios (16:9 horizontal, 9:16 vertical)
     - a duration (3..60 s) and frame rate (30 / 60 fps)

   Encoding pipeline:
     - The renderer is resized to the target resolution.
     - Per frame, we set `progress`, run the existing update() then
       render(), capture the canvas via a VideoFrame, and feed it
       to a WebCodecs VideoEncoder + mp4-muxer.
     - When done, the MP4 is offered as a download.

   Existing layer toggles (clouds, atmosphere, ISS, etc.) are NOT
   touched — whatever the user has enabled in the OPTIONS palette
   is what gets recorded. Only DOM overlays (HUD, scrubber,
   palettes themselves) are hidden via body.is-recording.
   ============================================================ */
(function () {
  'use strict';

  const App = window.__VendeeApp;
  if (!App) {
    console.warn('[record] window.__VendeeApp not found — script loaded too early?');
    return;
  }

  // ----------------------------------------------------------
  // Build the palette DOM
  // ----------------------------------------------------------
  const palette = document.createElement('div');
  palette.className = 'record-palette';
  palette.innerHTML = `
    <div class="record-palette__head">
      <h4 class="record-palette__title">Capture trajet</h4>
      <button class="record-palette__close" aria-label="Fermer">×</button>
    </div>

    <div class="record-row">
      <span class="record-row__label">Début · fin sur la timeline</span>
      <div class="record-range">
        <span class="record-range__chip" data-role="start-chip">J+0</span>
        <input type="range" min="0" max="1000" step="1" value="0" data-role="start" />
      </div>
      <div class="record-range">
        <span class="record-range__chip" data-role="end-chip">J+86</span>
        <input type="range" min="0" max="1000" step="1" value="1000" data-role="end" />
      </div>
    </div>

    <div class="record-row">
      <span class="record-row__label">Format vidéo</span>
      <div class="record-format-toggles">
        <button class="record-format-btn active" data-ratio="16:9">
          <span class="ratio-icon"></span>
          <span>16:9 · Paysage</span>
        </button>
        <button class="record-format-btn" data-ratio="9:16">
          <span class="ratio-icon"></span>
          <span>9:16 · Vertical</span>
        </button>
      </div>
    </div>

    <div class="record-extra">
      <label>
        Durée
        <select data-role="duration">
          <option value="3">3 s</option>
          <option value="5">5 s</option>
          <option value="10" selected>10 s</option>
          <option value="15">15 s</option>
          <option value="20">20 s</option>
          <option value="30">30 s</option>
          <option value="45">45 s</option>
          <option value="60">60 s</option>
        </select>
      </label>
      <label>
        Image
        <select data-role="fps">
          <option value="30">30 fps</option>
          <option value="60" selected>60 fps</option>
        </select>
      </label>
      <span data-role="estimate"></span>
    </div>

    <button class="record-go" data-role="go">
      Enregistrer
      <span class="record-go__sub" data-role="go-sub">16:9 · 1920×1080</span>
    </button>

    <div class="record-progress">
      <div class="record-progress__label">
        <span data-role="prog-label">Préparation…</span>
        <span data-role="prog-pct">0%</span>
      </div>
      <div class="record-progress__bar">
        <div class="record-progress__fill" data-role="prog-fill"></div>
      </div>
    </div>

    <div class="record-status" data-role="status"></div>

    <div class="record-downloads" data-role="downloads"></div>
  `;
  document.body.appendChild(palette);

  // ----- Recording feedback banner -----
  const banner = document.createElement('div');
  banner.className = 'record-recording-banner';
  banner.innerHTML = `
    <span class="record-recording-banner__dot"></span>
    <span data-role="banner-label">Capture en cours · 16:9</span>
    <button class="record-recording-banner__cancel" data-role="banner-cancel">Annuler</button>
  `;
  document.body.appendChild(banner);

  // ----- Start / end markers on the existing scrubber -----
  const scrubber = document.getElementById('scrubber');
  let startMarker, endMarker;
  if (scrubber) {
    startMarker = document.createElement('div');
    startMarker.className = 'record-marker record-marker--start';
    endMarker = document.createElement('div');
    endMarker.className = 'record-marker record-marker--end';
    scrubber.appendChild(startMarker);
    scrubber.appendChild(endMarker);
  }

  // ----------------------------------------------------------
  // State + helpers
  // ----------------------------------------------------------
  const state = {
    start: 0,        // 0..1
    end: 1,          // 0..1
    ratios: ['16:9'],
    durationSec: 10,
    fps: 60,
    recording: false,
    cancelRequested: false,
  };

  const $ = (sel, root = palette) => root.querySelector(sel);
  const els = {
    start: $('input[data-role="start"]'),
    end: $('input[data-role="end"]'),
    startChip: $('[data-role="start-chip"]'),
    endChip: $('[data-role="end-chip"]'),
    duration: $('select[data-role="duration"]'),
    fps: $('select[data-role="fps"]'),
    estimate: $('[data-role="estimate"]'),
    go: $('[data-role="go"]'),
    goSub: $('[data-role="go-sub"]'),
    progress: palette.querySelector('.record-progress'),
    progFill: $('[data-role="prog-fill"]'),
    progLabel: $('[data-role="prog-label"]'),
    progPct: $('[data-role="prog-pct"]'),
    bannerLabel: banner.querySelector('[data-role="banner-label"]'),
    bannerCancel: banner.querySelector('[data-role="banner-cancel"]'),
    close: $('.record-palette__close'),
    formatBtns: palette.querySelectorAll('.record-format-btn'),
    head: palette.querySelector('.record-palette__head'),
    status: $('[data-role="status"]'),
    downloads: $('[data-role="downloads"]'),
  };

  function dayLabel(p) {
    const d = Math.round(p * App.RACE_DAYS);
    return `J+${d}`;
  }

  function formatRatio(r) {
    return r === '16:9' ? '1920×1080' : '1080×1920';
  }

  function updateChips() {
    els.startChip.textContent = dayLabel(state.start);
    els.endChip.textContent = dayLabel(state.end);
    const span = Math.max(0, state.end - state.start);
    const days = Math.round(span * App.RACE_DAYS);
    // Final clip is the chosen duration + 3 s pause au port de départ
    // + 3 s pause au port d'arrivée.
    const totalSec = state.durationSec + 6;
    els.estimate.textContent = `≈ ${days} j de course · clip ${totalSec} s (3 + ${state.durationSec} + 3)`;
    if (state.ratios.length === 0) {
      els.go.disabled = true;
      els.goSub.textContent = 'Choisir un format';
    } else if (span <= 0.001) {
      els.go.disabled = true;
      els.goSub.textContent = 'Plage trop courte';
    } else {
      els.go.disabled = false;
      els.goSub.textContent = state.ratios.map(formatRatio).join(' + ');
    }
    if (startMarker) startMarker.style.left = (state.start * 100) + '%';
    if (endMarker) endMarker.style.left = (state.end * 100) + '%';
  }

  // ----------------------------------------------------------
  // Wiring: range inputs, format toggles, close button
  // ----------------------------------------------------------
  els.start.addEventListener('input', () => {
    state.start = +els.start.value / 1000;
    if (state.start > state.end - 0.005) {
      state.end = Math.min(1, state.start + 0.005);
      els.end.value = Math.round(state.end * 1000);
    }
    updateChips();
  });
  els.end.addEventListener('input', () => {
    state.end = +els.end.value / 1000;
    if (state.end < state.start + 0.005) {
      state.start = Math.max(0, state.end - 0.005);
      els.start.value = Math.round(state.start * 1000);
    }
    updateChips();
  });
  els.duration.addEventListener('change', () => {
    state.durationSec = +els.duration.value;
    updateChips();
  });
  els.fps.addEventListener('change', () => {
    state.fps = +els.fps.value;
    updateChips();
  });
  els.formatBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const ratio = btn.dataset.ratio;
      const idx = state.ratios.indexOf(ratio);
      if (idx === -1) state.ratios.push(ratio);
      else if (state.ratios.length > 1) state.ratios.splice(idx, 1);
      // (We always keep at least one ratio active.)
      els.formatBtns.forEach((b) => {
        b.classList.toggle('active', state.ratios.includes(b.dataset.ratio));
      });
      updateChips();
    });
  });

  // ----------------------------------------------------------
  // Open / close palette
  // ----------------------------------------------------------
  // The bottom controls bar has a graphical "Enregistrer" button that
  // mirrors the R key shortcut + triple-tap. We sync its `active` state
  // with the palette so the button visually reflects whether the
  // capture controls are currently open.
  const btnRecordToggle = document.getElementById('btn-record');
  function syncRecordToggleState() {
    if (btnRecordToggle) {
      btnRecordToggle.classList.toggle('active', palette.classList.contains('visible'));
    }
  }
  function openPalette() {
    palette.classList.add('visible');
    document.body.classList.add('record-palette-open');
    // Snap default start to current scrubber position (caller's intent: capture from where I am)
    state.start = Math.min(0.99, App.getProgress());
    state.end = 1;
    els.start.value = Math.round(state.start * 1000);
    els.end.value = Math.round(state.end * 1000);
    updateChips();
    syncRecordToggleState();
  }
  function closePalette() {
    if (state.recording) return;
    palette.classList.remove('visible');
    document.body.classList.remove('record-palette-open');
    syncRecordToggleState();
  }
  function togglePalette() {
    palette.classList.contains('visible') ? closePalette() : openPalette();
  }
  els.close.addEventListener('click', closePalette);
  if (btnRecordToggle) {
    btnRecordToggle.addEventListener('click', togglePalette);
  }

  // ----------------------------------------------------------
  // Triggers: R key (desktop) + triple-tap on canvas (mobile)
  // ----------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (state.recording) return;
    // Ignore typing in inputs/selects
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Ne pas capturer les combinaisons avec modificateur : Cmd+R / Ctrl+R doivent
    // recharger la page normalement (et non ouvrir la capture).
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      togglePalette();
    } else if (e.key === 'Escape' && palette.classList.contains('visible')) {
      closePalette();
    }
  });

  // Triple-tap on the canvas / scene (mobile primary trigger)
  const sceneEl = document.getElementById('scene');
  if (sceneEl) {
    let tapCount = 0;
    let tapTimer = null;
    sceneEl.addEventListener('touchend', (e) => {
      if (state.recording) return;
      // Only count short taps (not drags)
      if (e.changedTouches && e.changedTouches.length > 1) return;
      tapCount += 1;
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { tapCount = 0; }, 500);
      if (tapCount >= 3) {
        tapCount = 0;
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
        e.preventDefault();
        togglePalette();
      }
    }, { passive: false });
  }

  // ----------------------------------------------------------
  // Recording itself
  // ----------------------------------------------------------
  function setProgressUI(pct, label) {
    els.progress.classList.add('visible');
    els.progFill.style.width = (pct * 100).toFixed(1) + '%';
    els.progPct.textContent = Math.round(pct * 100) + '%';
    if (label) els.progLabel.textContent = label;
  }
  function hideProgressUI() {
    els.progress.classList.remove('visible');
  }

  function checkSupport() {
    if (!('VideoEncoder' in window)) {
      showStatus(
        'Ce navigateur ne supporte pas WebCodecs (nécessaire pour l\'export MP4). ' +
        'Utilisez Chrome, Edge ou Safari 16.4+.',
        'error'
      );
      return false;
    }
    if (!window.Mp4Muxer) {
      showStatus('La bibliothèque mp4-muxer ne s\'est pas chargée. Vérifiez votre connexion.', 'error');
      return false;
    }
    return true;
  }

  // ----------------------------------------------------------
  // Label scale for the recorded video. The on-screen labels are
  // sized for desktop browsing where you can squint and zoom; on
  // mobile reels (9:16) and on Instagram / TikTok, the same labels
  // would be sub-pixel. Recording bumps every dimension (font, padding,
  // letter-spacing, dot, separator) by this factor so the text is
  // readable on a phone held at arm's length.
  // ----------------------------------------------------------
  const OVERLAY_SCALE = 2.0;

  // ----------------------------------------------------------
  // DOM overlay rasterizer (Canvas2D)
  // ------------------------------------------------------------
  // The cape / city / country / current / anticyclone labels live as
  // absolutely-positioned <div>s above the WebGL canvas — they are NOT
  // pixels in the 3D scene. To get them into the recorded MP4 we draw
  // them ourselves into the 2D composite canvas.
  //
  // We can't use SVG <foreignObject> + <Image> here: that path taints
  // the canvas (browser security policy), and `new VideoFrame(canvas)`
  // refuses tainted sources. So we read each label's inline transform
  // (set by Globe's projectPOIs / projectClimLabels) and re-draw it
  // with Canvas2D primitives.
  //
  // Styling is a faithful approximation of the CSS — close enough for
  // a video frame, robust enough not to depend on SVG quirks.
  // ----------------------------------------------------------

  // Parse "translate(123.4px, -56.7px) translate(-50%, -135%)" into the
  // pixel offset (px, py) and the percentage centring (cx, cy in 0..1).
  function parseTransform(t) {
    if (!t) return null;
    const px = t.match(/translate\(\s*([-\d.]+)\s*px\s*,\s*([-\d.]+)\s*px\s*\)/);
    if (!px) return null;
    const pct = t.match(/translate\(\s*([-\d.]+)\s*%\s*,\s*([-\d.]+)\s*%\s*\)/);
    return {
      x: parseFloat(px[1]),
      y: parseFloat(px[2]),
      ax: pct ? parseFloat(pct[1]) / 100 : -0.5,
      ay: pct ? parseFloat(pct[2]) / 100 : -0.5,
    };
  }

  function setFont(ctx, family, size, weight) {
    // Canvas2D accepts font shorthand. Use the first family from the stack
    // and let the browser fall back if not loaded.
    const fam = (family || 'sans-serif').split(',')[0].replace(/['"]/g, '').trim();
    ctx.font = `${weight || 400} ${size}px "${fam}", sans-serif`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Approximate text width including manual letter-spacing.
  function measureSpaced(ctx, text, letterSpacing) {
    if (!letterSpacing) return ctx.measureText(text).width;
    return ctx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
  }

  function fillSpacedText(ctx, text, x, y, letterSpacing) {
    if (!letterSpacing) {
      ctx.fillText(text, x, y);
      return;
    }
    const widths = [...text].map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + letterSpacing * (text.length - 1);
    let cx = x - total / 2;
    for (let i = 0; i < text.length; i++) {
      const cw = widths[i];
      ctx.fillText(text[i], cx + cw / 2, y);
      cx += cw + letterSpacing;
    }
  }

  // Draw a single .poi-label (cape) — pill with title + "J+N" suffix.
  function drawPoiLabel(ctx, el) {
    const tr = parseTransform(el.style.transform);
    if (!tr) return;
    const opacity = parseFloat(el.style.opacity || '1');
    if (opacity < 0.05) return;
    const passed = el.classList.contains('passed');
    const spans = el.querySelectorAll('span');
    if (spans.length < 2) return;
    const labelText = spans[0].textContent.toUpperCase();
    const dayText = spans[1].textContent;

    const fontSize = 14 * OVERLAY_SCALE;
    const padX = 11 * OVERLAY_SCALE, padY = 5 * OVERLAY_SCALE;
    const ls = 1.6 * OVERLAY_SCALE;
    const sepW = 13 * OVERLAY_SCALE;
    const radius = 6 * OVERLAY_SCALE;
    const sepInset = 4 * OVERLAY_SCALE;
    setFont(ctx, 'JetBrains Mono', fontSize, 500);
    const wMain = measureSpaced(ctx, labelText, ls);
    setFont(ctx, 'JetBrains Mono', fontSize - OVERLAY_SCALE, 500);
    const wDay = ctx.measureText(dayText).width;
    const w = wMain + sepW + wDay + padX * 2;
    const h = fontSize + padY * 2;

    // Anchor at (tr.x, tr.y), centred via tr.ax/ay scaled by (w, h).
    const cx = tr.x + w * tr.ax;
    const cy = tr.y + h * tr.ay;

    ctx.globalAlpha = opacity;
    // Background
    ctx.fillStyle = passed ? 'rgba(227,6,19,.18)' : 'rgba(6,20,51,.78)';
    roundRect(ctx, cx, cy, w, h, radius);
    ctx.fill();
    // Border
    ctx.lineWidth = 1 * OVERLAY_SCALE;
    ctx.strokeStyle = passed ? 'rgba(255,44,58,.45)' : 'rgba(246,241,231,.18)';
    ctx.stroke();

    // Main text — left side
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    setFont(ctx, 'JetBrains Mono', fontSize, 500);
    ctx.fillStyle = '#f6f1e7';
    let textX = cx + padX;
    for (let i = 0; i < labelText.length; i++) {
      const ch = labelText[i];
      ctx.fillText(ch, textX, cy + h / 2 + 0.5);
      textX += ctx.measureText(ch).width + ls;
    }

    // Separator line
    const sepX = textX - ls + 5 * OVERLAY_SCALE;
    ctx.strokeStyle = passed ? 'rgba(255,44,58,.35)' : 'rgba(246,241,231,.18)';
    ctx.lineWidth = 1 * OVERLAY_SCALE;
    ctx.beginPath();
    ctx.moveTo(sepX, cy + sepInset);
    ctx.lineTo(sepX, cy + h - sepInset);
    ctx.stroke();

    // Day text — right side
    setFont(ctx, 'JetBrains Mono', fontSize - OVERLAY_SCALE, 500);
    ctx.fillStyle = passed ? '#ff2c3a' : 'rgba(246,241,231,.55)';
    ctx.fillText(dayText, sepX + 6 * OVERLAY_SCALE, cy + h / 2 + 0.5);
    ctx.globalAlpha = 1;
  }

  // Map climatology / capital / country / ISS labels to their styling.
  // Mirrors the CSS in the main HTML, with custom properties pre-resolved.
  const CLIM_STYLES = {
    warm:      { font: 'JetBrains Mono', size: 13, weight: 500, ls: 1.5, color: '#ffe4dd', bg: 'rgba(227,6,19,.32)', border: 'rgba(255,107,74,.55)', radius: 4, padX: 8, padY: 3, upper: true, prefix: null, shadow: null },
    cold:      { font: 'JetBrains Mono', size: 13, weight: 500, ls: 1.5, color: '#e2f0ff', bg: 'rgba(10,60,150,.32)', border: 'rgba(74,168,255,.55)', radius: 4, padX: 8, padY: 3, upper: true, prefix: null, shadow: null },
    high:      { font: 'JetBrains Mono', size: 13, weight: 500, ls: 1.5, color: '#ffe58a', bg: 'rgba(76,54,12,.55)', border: 'rgba(255,208,96,.65)', radius: 4, padX: 8, padY: 3, upper: true, prefix: { text: 'H', fg: '#ffd060', bg: 'rgba(255,208,96,.25)', weight: 700 }, shadow: null },
    continent: { font: 'Fraunces',       size: 18, weight: 600, ls: 4.5, color: 'rgba(246,241,231,.85)', bg: 'rgba(10,20,40,.22)', border: 'rgba(246,241,231,.25)', radius: 4, padX: 14, padY: 4, upper: true, prefix: null, shadow: { color: 'rgba(0,0,0,.6)', blur: 4, oy: 1 } },
    capital:   { font: 'Inter',          size: 14, weight: 500, ls: 0.5, color: 'rgba(255,245,210,.92)', bg: 'rgba(12,24,44,.35)', border: 'rgba(255,208,128,.35)', radius: 4, padX: 9, padY: 3, upper: false, prefix: { dot: '#ffd080', glow: 'rgba(255,208,128,.9)' }, shadow: { color: 'rgba(255,200,80,.4)', blur: 5, oy: 0 } },
    country:   { font: 'Fraunces',       size: 14, weight: 500, ls: 2.2, color: 'rgba(246,241,231,.7)', bg: null, border: null, radius: 0, padX: 5, padY: 2, upper: true, prefix: null, shadow: { color: 'rgba(0,0,0,.85)', blur: 5, oy: 1 } },
    iss:      { font: 'JetBrains Mono', size: 14, weight: 500, ls: 1.4, color: 'rgba(235,245,255,.92)', bg: 'rgba(20,35,70,.55)', border: 'rgba(168,198,255,.55)', radius: 4, padX: 9, padY: 4, upper: true, prefix: { dot: '#a8c6ff', glow: 'rgba(168,198,255,.95)' }, shadow: { color: 'rgba(168,198,255,.4)', blur: 6, oy: 0 } },
  };

  function drawClimLabel(ctx, el) {
    const tr = parseTransform(el.style.transform);
    if (!tr) return;
    const opacity = parseFloat(el.style.opacity || '1');
    if (opacity < 0.05) return;
    const kind = ['warm', 'cold', 'high', 'continent', 'capital', 'country', 'iss']
      .find(k => el.classList.contains(k));
    const s = CLIM_STYLES[kind || 'warm'];
    if (!s) return;
    const text = s.upper ? el.textContent.toUpperCase() : el.textContent;
    if (!text) return;

    // Pre-scale every visual dimension so labels are reels-readable.
    const fontSize = s.size * OVERLAY_SCALE;
    const ls = s.ls * OVERLAY_SCALE;
    const padX = s.padX * OVERLAY_SCALE;
    const padY = s.padY * OVERLAY_SCALE;
    const radius = s.radius * OVERLAY_SCALE;

    setFont(ctx, s.font, fontSize, s.weight);
    let textW = measureSpaced(ctx, text, ls);
    let extraLeft = 0;
    if (s.prefix) {
      if (s.prefix.text) {
        extraLeft = ctx.measureText(s.prefix.text).width + 14 * OVERLAY_SCALE;
      } else if (s.prefix.dot) {
        extraLeft = 12 * OVERLAY_SCALE;
      }
    }
    const w = textW + extraLeft + padX * 2;
    const h = fontSize + padY * 2 + 2 * OVERLAY_SCALE;
    const cx = tr.x + w * tr.ax;
    const cy = tr.y + h * tr.ay;

    ctx.globalAlpha = opacity;
    if (s.bg) {
      ctx.fillStyle = s.bg;
      roundRect(ctx, cx, cy, w, h, radius);
      ctx.fill();
    }
    if (s.border) {
      ctx.lineWidth = 1 * OVERLAY_SCALE;
      ctx.strokeStyle = s.border;
      roundRect(ctx, cx, cy, w, h, radius);
      ctx.stroke();
    }

    let curX = cx + padX;

    // Prefix: 'H' chip for highs, glowing dot for capitals/iss
    if (s.prefix) {
      if (s.prefix.text) {
        const prefW = ctx.measureText(s.prefix.text).width + 8 * OVERLAY_SCALE;
        ctx.fillStyle = s.prefix.bg;
        roundRect(ctx, curX, cy + 4 * OVERLAY_SCALE, prefW, h - 8 * OVERLAY_SCALE, 3 * OVERLAY_SCALE);
        ctx.fill();
        setFont(ctx, s.font, fontSize, s.prefix.weight);
        ctx.fillStyle = s.prefix.fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.prefix.text, curX + prefW / 2, cy + h / 2 + 0.5);
        curX += prefW + 6 * OVERLAY_SCALE;
        // Restore main font for the rest of the text
        setFont(ctx, s.font, fontSize, s.weight);
      } else if (s.prefix.dot) {
        const r = 3 * OVERLAY_SCALE;
        ctx.shadowColor = s.prefix.glow;
        ctx.shadowBlur = 6 * OVERLAY_SCALE;
        ctx.fillStyle = s.prefix.dot;
        ctx.beginPath();
        ctx.arc(curX + r + 1, cy + h / 2, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        curX += 12 * OVERLAY_SCALE;
      }
    }

    // Main text with letter-spacing + optional shadow
    if (s.shadow) {
      ctx.shadowColor = s.shadow.color;
      ctx.shadowBlur = s.shadow.blur * OVERLAY_SCALE;
      ctx.shadowOffsetY = (s.shadow.oy || 0) * OVERLAY_SCALE;
    }
    ctx.fillStyle = s.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let tx = curX;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      ctx.fillText(ch, tx, cy + h / 2 + 0.5);
      tx += ctx.measureText(ch).width + ls;
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
  }

  // Geographic place names (#geo-layer) and competitor boat names
  // (#fleet-layer) are positioned via left/top (not a transform). Draw them
  // into the composite so they appear in the recording too.
  function drawSimpleLabel(ctx, el, opts) {
    if (el.style.display === 'none') return;
    const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
    if (!isFinite(x) || !isFinite(y)) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    const S = OVERLAY_SCALE;
    setFont(ctx, 'JetBrains Mono', (opts.size || 11) * S, 500);
    let tx = x + (opts.xoff || 0) * S;
    if (opts.dot) {
      const r = 3 * S;
      ctx.fillStyle = opts.dotColor || 'rgba(246,241,231,.95)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      tx = x + r + 6 * S;
    }
    ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 5 * S; ctx.shadowOffsetY = 1 * S;
    ctx.fillStyle = opts.color || 'rgba(246,241,231,.96)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, tx, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  function drawOverlay(ctx) {
    const labels = document.getElementById('labels-layer');
    const clim = document.getElementById('clim-layer');
    const geo = document.getElementById('geo-layer');
    const fleet = document.getElementById('fleet-layer');
    if (labels) {
      for (const el of labels.children) drawPoiLabel(ctx, el);
    }
    if (clim) {
      for (const el of clim.children) drawClimLabel(ctx, el);
    }
    if (geo) {
      for (const el of geo.children) drawSimpleLabel(ctx, el, { size: 11, dot: true });
    }
    if (fleet) {
      for (const el of fleet.children) drawSimpleLabel(ctx, el, { size: 10.5, xoff: 7, color: 'rgba(246,241,231,.98)' });
    }
  }

  // Pick the best H.264 codec string actually supported by this browser.
  async function pickH264Codec(width, height, fps) {
    // High@4.0 fits ≤ 1920x1088 @ 30, High@4.2 fits 1080p @ 60. Try a few.
    const candidates = ['avc1.640034', 'avc1.640032', 'avc1.640028', 'avc1.4d4028', 'avc1.42E028'];
    for (const codec of candidates) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          framerate: fps,
          bitrate: 12_000_000,
          avc: { format: 'avc' },
        });
        if (support && support.supported) return codec;
      } catch (_) { /* ignore and try next */ }
    }
    return null;
  }

  async function recordOne(ratio) {
    const targetW = ratio === '16:9' ? 1920 : 1080;
    const targetH = ratio === '16:9' ? 1080 : 1920;
    const fps = state.fps;
    // Hold 3 s at the chosen start position (port de départ) and 3 s
    // at the end position (port d'arrivée) — gives a montage editor
    // clean head + tail frames to use as title cards or transitions.
    const holdSec = 3;
    const holdFrames = Math.round(fps * holdSec);
    const animFrames = Math.round(fps * state.durationSec);
    const totalFrames = holdFrames + animFrames + holdFrames;

    setProgressUI(0, `Préparation ${ratio}…`);
    els.bannerLabel.textContent = `Capture en cours · ${ratio} · ${targetW}×${targetH} · ${fps}fps`;

    const codec = await pickH264Codec(targetW, targetH, fps);
    if (!codec) {
      throw new Error(`Aucun codec H.264 supporté pour ${targetW}×${targetH}@${fps}fps`);
    }

    // ----- Save & swap renderer state -----
    const renderer = App.renderer;
    const camera = App.camera;
    const webglCanvas = renderer.domElement;
    const oldSize = renderer.getSize(new THREE.Vector2());
    const oldPixelRatio = renderer.getPixelRatio();
    const oldAspect = camera.aspect;
    const oldCanvasStyle = { width: webglCanvas.style.width, height: webglCanvas.style.height };

    renderer.setPixelRatio(1);
    renderer.setSize(targetW, targetH, false);
    webglCanvas.style.width = '100vw';
    webglCanvas.style.height = '100vh';
    camera.aspect = targetW / targetH;
    camera.updateProjectionMatrix();

    // ----- 2D composite canvas: WebGL frame + DOM-overlay raster -----
    const composite = document.createElement('canvas');
    composite.width = targetW;
    composite.height = targetH;
    const ctx = composite.getContext('2d');

    // ----- Setup muxer + encoder -----
    const muxer = new window.Mp4Muxer.Muxer({
      target: new window.Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: targetW,
        height: targetH,
        frameRate: fps,
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error('[record] encoder error:', e),
    });
    encoder.configure({
      codec,
      width: targetW,
      height: targetH,
      bitrate: 12_000_000,
      framerate: fps,
      avc: { format: 'avc' },
    });

    // ----- Render + encode loop -----
    const frameDurationUs = 1_000_000 / fps;
    for (let f = 0; f < totalFrames; f++) {
      if (state.cancelRequested) break;

      // 1) Step the timeline + recompute the boat / HUD data.
      //    First `holdFrames` stay at state.start (boat sitting at the
      //    departure port), then we lerp through the trajectory over
      //    `animFrames`, then we hold at state.end for another
      //    `holdFrames` (boat parked at the arrival port).
      let p;
      if (f < holdFrames) {
        p = state.start;
      } else if (f >= holdFrames + animFrames) {
        p = state.end;
      } else {
        const k = animFrames <= 1 ? 1 : (f - holdFrames) / (animFrames - 1);
        p = state.start + (state.end - state.start) * k;
      }
      App.setProgress(p);
      App.update();

      // 2) Snap the follow camera to the new boat position. Without this
      //    the follow lerp (4 % / frame in animate()) only catches up
      //    over many real frames — the boat would drift far off-centre.
      App.snapFollowCamera(true);

      // 3) WebGL render at target resolution
      renderer.render(App.scene, App.camera);

      // 4) Project DOM labels onto the resized canvas before snapshot
      App.renderLabels();

      // 5) Composite: WebGL frame, then DOM overlay (capes, capitals,
      //    countries, anticyclones, currents, ISS) drawn with Canvas2D.
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(webglCanvas, 0, 0, targetW, targetH);
      drawOverlay(ctx);

      // 6) Capture this composite as a video frame
      const vf = new VideoFrame(composite, {
        timestamp: Math.round(f * frameDurationUs),
        duration: Math.round(frameDurationUs),
      });
      encoder.encode(vf, { keyFrame: f % (fps * 2) === 0 });
      vf.close();

      // Throttle if encoder queue is backing up — keeps memory bounded.
      if (encoder.encodeQueueSize > 8) {
        await new Promise((r) => setTimeout(r, 0));
        while (encoder.encodeQueueSize > 4) {
          await new Promise((r) => setTimeout(r, 4));
        }
      }

      // Yield once per captured frame so the browser can repaint the
      // progress UI AND so the regular animate() loop runs the same
      // number of times between every pair of captured frames. Doing
      // this every other frame instead caused alternating big/small
      // motion (animate's cloud / current / ISS time advanced on some
      // transitions but not others → audible stutter in playback).
      setProgressUI(f / totalFrames, `Encodage ${ratio} · image ${f + 1} / ${totalFrames}`);
      await new Promise((r) => requestAnimationFrame(r));
    }

    setProgressUI(1, `Finalisation ${ratio}…`);
    await encoder.flush();
    encoder.close();
    muxer.finalize();

    // ----- Restore renderer state -----
    renderer.setPixelRatio(oldPixelRatio);
    renderer.setSize(oldSize.x, oldSize.y, false);
    webglCanvas.style.width = oldCanvasStyle.width;
    webglCanvas.style.height = oldCanvasStyle.height;
    camera.aspect = oldAspect;
    camera.updateProjectionMatrix();

    if (state.cancelRequested) return null;
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  }

  // Web Share API support check — on iOS / Android, sharing the MP4
  // file pops the native share sheet where the user can pick
  // "Save Video" / "Enregistrer la vidéo" to drop it into Photos /
  // Galerie. canShare() must be called with a real file to verify
  // the platform actually accepts video/mp4.
  function canShareFile(file) {
    return typeof navigator !== 'undefined'
      && typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [file] });
  }

  // Tries to silently download a blob via a synthetic <a> click.
  // Browsers commonly block this after a long async chain (no fresh
  // user gesture), so the visible "Télécharger" button added by
  // addDownload() is the real source of truth — this is just a
  // best-effort convenience.
  // On mobile, where Web Share is available, we skip the silent
  // download entirely: the share sheet is a much better path than
  // the browser's hidden "Téléchargements" folder.
  function trySilentDownload(blob, filename) {
    const probeFile = new File([blob], filename, { type: 'video/mp4' });
    if (canShareFile(probeFile)) return;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (_) {
      /* ignore — the visible button is the fallback */
    }
  }

  async function startRecording() {
    if (state.recording) return;
    clearStatus();
    if (!checkSupport()) return;
    if (state.ratios.length === 0) return;

    // Each fresh recording session resets the downloads list — the
    // user pressed "Enregistrer" again, so old links would be confusing.
    clearDownloads();

    state.recording = true;
    state.cancelRequested = false;
    els.go.disabled = true;

    // Save playback / interaction state
    const wasPlaying = App.getPlaying();
    if (wasPlaying) App.setPlaying(false);
    const savedProgress = App.getProgress();
    let wasAutoRotate = null;
    if (App.controls) {
      App.controls.enabled = false;
      wasAutoRotate = App.controls.autoRotate;
      // Stop autoRotate so the camera doesn't drift between captured frames.
      App.controls.autoRotate = false;
    }

    // Hide everything except the scene
    document.body.classList.add('is-recording');
    banner.classList.add('visible');

    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const produced = [];

    try {
      for (const ratio of state.ratios) {
        if (state.cancelRequested) break;
        const blob = await recordOne(ratio);
        if (blob) {
          const tag = ratio.replace(':', 'x');
          const dStart = Math.round(state.start * App.RACE_DAYS);
          const dEnd = Math.round(state.end * App.RACE_DAYS);
          const filename = `vendee-globe-${tag}-J${dStart}-J${dEnd}-${stamp}.mp4`;
          produced.push({ blob, filename });
        }
      }
    } catch (err) {
      console.error('[record] capture failed:', err);
      showStatus('Erreur pendant la capture : ' + (err && err.message ? err.message : err), 'error');
    } finally {
      // Restore everything
      document.body.classList.remove('is-recording');
      banner.classList.remove('visible');
      App.setProgress(savedProgress);
      App.update();
      if (App.controls) {
        App.controls.enabled = true;
        if (wasAutoRotate !== null) App.controls.autoRotate = wasAutoRotate;
      }
      if (wasPlaying) App.setPlaying(true);
      state.recording = false;
      els.go.disabled = false;
      els.bannerCancel.textContent = 'Annuler';
      hideProgressUI();
    }

    // Surface every produced MP4 as a clickable button + try silent
    // auto-download as a convenience.
    if (produced.length) {
      for (const { blob, filename } of produced) {
        addDownload(blob, filename);
        trySilentDownload(blob, filename);
      }
      const total = produced.reduce((s, p) => s + p.blob.size, 0);
      showStatus(
        `${produced.length} fichier${produced.length > 1 ? 's' : ''} prêt${produced.length > 1 ? 's' : ''} · ${(total / 1024 / 1024).toFixed(1)} MB. ` +
        'Si le téléchargement ne démarre pas automatiquement, cliquez sur les liens ci-dessous.',
        'info'
      );
    } else if (!state.cancelRequested && !els.status.classList.contains('is-error')) {
      showStatus('Aucun fichier généré. Vérifiez la console pour les détails.', 'error');
    } else if (state.cancelRequested) {
      showStatus('Capture annulée.', 'info');
    }
  }

  els.go.addEventListener('click', startRecording);
  els.bannerCancel.addEventListener('click', () => {
    state.cancelRequested = true;
    els.bannerCancel.textContent = 'Annulation…';
  });

  // ----------------------------------------------------------
  // Drag the palette by its header (mouse + touch)
  // ----------------------------------------------------------
  (function makeDraggable() {
    let dragging = false;
    let originX = 0, originY = 0;
    let baseX = 0, baseY = 0;

    function onDown(e) {
      // Ignore drags initiated on the close button or other controls
      if (e.target && e.target.closest('.record-palette__close')) return;
      const pt = e.touches ? e.touches[0] : e;
      dragging = true;
      originX = pt.clientX;
      originY = pt.clientY;
      const cs = getComputedStyle(palette);
      baseX = parseFloat(cs.getPropertyValue('--drag-x')) || 0;
      baseY = parseFloat(cs.getPropertyValue('--drag-y')) || 0;
      palette.classList.add('dragging');
      if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - originX;
      const dy = pt.clientY - originY;
      // Clamp so the palette stays at least partially on screen
      const rect = palette.getBoundingClientRect();
      const maxX = window.innerWidth / 2 + rect.width / 2 - 40;
      const maxY = window.innerHeight - 40;
      const minY = -(window.innerHeight - 80);
      const nx = Math.max(-maxX, Math.min(maxX, baseX + dx));
      const ny = Math.max(minY, Math.min(maxY, baseY + dy));
      palette.style.setProperty('--drag-x', nx + 'px');
      palette.style.setProperty('--drag-y', ny + 'px');
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      palette.classList.remove('dragging');
    }

    els.head.addEventListener('mousedown', onDown);
    els.head.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
  })();

  // ----------------------------------------------------------
  // Inline status messages (replaces alerts)
  // ----------------------------------------------------------
  function showStatus(msg, kind /* 'error' | 'info' */) {
    els.status.textContent = msg;
    els.status.classList.remove('is-error', 'is-info');
    els.status.classList.add('visible', kind === 'error' ? 'is-error' : 'is-info');
  }
  function clearStatus() {
    els.status.classList.remove('visible', 'is-error', 'is-info');
    els.status.textContent = '';
  }

  // ----------------------------------------------------------
  // Generated downloads — the palette keeps a clickable link per
  // produced MP4, so the user is never reliant on auto-download
  // (browsers often block silent a.click() after async work).
  // ----------------------------------------------------------
  const downloadUrls = []; // keep refs so we can revokeObjectURL on close
  function addDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    downloadUrls.push(url);
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);

    const row = document.createElement('div');
    row.className = 'record-download-row';

    // Always-visible download link — works everywhere.
    const a = document.createElement('a');
    a.className = 'record-download';
    a.href = url;
    a.download = filename;
    a.innerHTML = `
      <span class="record-download__icon">⬇</span>
      <span class="record-download__name">${filename}</span>
      <span class="record-download__size">${sizeMB} MB</span>
    `;
    row.appendChild(a);

    // On mobile / tablet, add a "Sauvegarder dans la galerie" button
    // that uses the Web Share API to push the file into the native
    // share sheet — from there, the user picks "Save Video" /
    // "Enregistrer la vidéo" to drop it straight into Photos / Galerie.
    const file = new File([blob], filename, { type: 'video/mp4' });
    if (canShareFile(file)) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'record-share';
      shareBtn.innerHTML = `
        <span class="record-share__icon">📲</span>
        <span>Sauvegarder dans la galerie / Partager</span>
      `;
      shareBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            files: [file],
            title: 'Vendée Globe — Initiatives-Cœur',
            text: filename,
          });
        } catch (err) {
          if (err && err.name === 'AbortError') return; // user cancelled, no-op
          console.warn('[record] share failed:', err);
          showStatus('Partage refusé : ' + (err && err.message ? err.message : err), 'error');
        }
      });
      row.appendChild(shareBtn);
    }

    els.downloads.appendChild(row);
    return row;
  }
  function clearDownloads() {
    while (downloadUrls.length) URL.revokeObjectURL(downloadUrls.pop());
    els.downloads.innerHTML = '';
  }

  // Initial chip refresh
  updateChips();
})();
