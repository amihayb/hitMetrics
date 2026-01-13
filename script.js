(() => {
  const fileInput = document.getElementById('file');
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const hitColorInput = document.getElementById('hitColor');
  const hitAlphaInput = document.getElementById('hitAlpha');
  const decreaseAnnotationBtn = document.getElementById('decreaseAnnotationBtn');
  const increaseAnnotationBtn = document.getElementById('increaseAnnotationBtn');
  const annotationScaleDisplay = document.getElementById('annotationScaleDisplay');

  const realDistM = document.getElementById('realDistM');
  const rangeM = document.getElementById('rangeM');

  const setScaleBtn = document.getElementById('setScaleBtn');
  const resetScaleBtn = document.getElementById('resetScaleBtn');
  const toAimBtn = document.getElementById('toAimBtn');

  const resetAimBtn = document.getElementById('resetAimBtn');
  const toHitsBtn = document.getElementById('toHitsBtn');

  const clearHitsBtn = document.getElementById('clearHitsBtn');
  const undoHitBtn = document.getElementById('undoHitBtn');
  const exportBtn = document.getElementById('exportBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  const scaleOut = document.getElementById('scaleOut');
  const hitsOut = document.getElementById('hitsOut');
  const rOut = document.getElementById('rOut');
  const stdXYOut = document.getElementById('stdXYOut');
  const aimOffOut = document.getElementById('aimOffOut');

  const pillScale = document.getElementById('pillScale');
  const pillAim = document.getElementById('pillAim');
  const pillHits = document.getElementById('pillHits');

  const stageOut = document.getElementById('stageOut');
  const clickHint = document.getElementById('clickHint');

  const BLUE_STROKE = 'rgba(102,163,255,.90)';
  const BLUE_FILL   = 'rgba(102,163,255,.90)';

  const state = {
    img: null,
    stage: 'scale', // 'scale' | 'aim' | 'hits'
    scalePts: [],
    aimPt: null,
    hits: [],
    mradPerPx: null,
    labelOffsets: {
      center: { x: 16, y: 16 },
      radius: { x: 10, y: 0 },
      stdTr: { x: 0, y: 28 },
      stdEl: { x: 0, y: 56 },
      aimOffset: { x: 10, y: 10 }
    },
    draggingLabel: null,
    dragStart: null,
    annotationScale: 1.0
  };

  window.about = function(){
    //alert('For support, contact me:\n\nAmihay Blau\nmail: amihay@blaurobotics.co.il\nPhone: +972-54-6668902');
    Swal.fire({
      title: "Hit Metrics",
      html: "For support, contact me:<br><br> Amihay Blau <br> mail: amihay@blaurobotics.co.il <br> Phone: +972-54-6668902",
      icon: "info"
    });
  };

  let rafaelAudio = null;
  window.playRafaelTune = function(){
    if (!rafaelAudio) {
      rafaelAudio = new Audio('audio/the_good_bad_ugly.mp3');
    }
    rafaelAudio.currentTime = 0;
    rafaelAudio.play().catch(err => console.log('Audio play failed:', err));
  };

  function hexToRgba(hex, a=1.0) {
    const h = (hex || '#ff0000').replace('#','').trim();
    const full = h.length === 3 ? h.split('').map(ch=>ch+ch).join('') : h;
    const r = parseInt(full.slice(0,2),16);
    const g = parseInt(full.slice(2,4),16);
    const b = parseInt(full.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function overlayStroke() {
    const a = clamp(parseFloat(hitAlphaInput.value), 0.1, 1.0);
    return hexToRgba(hitColorInput.value, a);
  }
  function overlayFill() {
    const a = clamp(parseFloat(hitAlphaInput.value), 0.1, 1.0);
    return hexToRgba(hitColorInput.value, a);
  }

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  function setStage(s) {
    state.stage = s;
    pillScale.classList.toggle('on', s === 'scale');
    pillAim.classList.toggle('on', s === 'aim');
    pillHits.classList.toggle('on', s === 'hits');

    stageOut.textContent = (s === 'scale') ? 'Scale' : (s === 'aim' ? 'Aim point' : 'Hits');
    clickHint.textContent =
      (s === 'scale') ? 'Pick 2 scale points' :
      (s === 'aim') ? 'Click once to set aim point' :
      'Click to add hits';

    redraw();
  }

  function fmt(n, d=3) {
    if (!isFinite(n)) return '—';
    return Number(n).toFixed(d);
  }

  function dist(a,b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function canvasToImageXY(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
    const y = (evt.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  }

  function resizeCanvasToImage() {
    if (!state.img) return;
    canvas.width = state.img.naturalWidth || state.img.width;
    canvas.height = state.img.naturalHeight || state.img.height;
    redraw();
  }

  function computeStats() {
    if (state.hits.length === 0) return null;
    const n = state.hits.length;

    const mean = state.hits.reduce((acc,p)=>({x:acc.x+p.x, y:acc.y+p.y}), {x:0,y:0});
    mean.x /= n; mean.y /= n;

    const dxs = state.hits.map(p => p.x - mean.x);
    const dys = state.hits.map(p => p.y - mean.y);

    const radii = state.hits.map(p => dist(p, mean));
    const rMaxPx = Math.max(...radii);

    // population std of X and Y deviations
    const varX = dxs.reduce((a,v)=>a+v*v,0) / n;
    const varY = dys.reduce((a,v)=>a+v*v,0) / n;
    const stdX = Math.sqrt(varX);
    const stdY = Math.sqrt(varY);

    return { mean, rMaxPx, stdX, stdY, radii };
  }

  function updateUI() {
    setScaleBtn.disabled = !(state.scalePts.length === 2 && state.img);
    resetScaleBtn.disabled = !(state.scalePts.length > 0);

    toAimBtn.disabled = !(state.mradPerPx && state.img);

    resetAimBtn.disabled = !(state.aimPt && state.img);
    toHitsBtn.disabled = !(state.mradPerPx && state.aimPt && state.img);

    clearHitsBtn.disabled = !(state.hits.length > 0);
    undoHitBtn.disabled = !(state.hits.length > 0);
    exportBtn.disabled = !(state.img && state.hits.length > 0);
    exportCsvBtn.disabled = !(state.img && state.hits.length > 0);

    annotationScaleDisplay.textContent = `${state.annotationScale.toFixed(1)}×`;

    scaleOut.textContent = state.mradPerPx ? fmt(state.mradPerPx, 6) : '—';
    hitsOut.textContent = String(state.hits.length);

    const stats = computeStats();
    if (stats && state.mradPerPx) {
      rOut.textContent = fmt(stats.rMaxPx * state.mradPerPx, 3);

      const stdTr = stats.stdX * state.mradPerPx;
      const stdEl = stats.stdY * state.mradPerPx;
      stdXYOut.innerHTML = `STD TR = ${fmt(stdTr,3)}<br>STD EL = ${fmt(stdEl,3)}`;
    } else {
      rOut.textContent = '—';
      stdXYOut.textContent = '—';
    }

    if (stats && state.mradPerPx && state.aimPt) {
      const offPx = dist(state.aimPt, stats.mean);
      aimOffOut.textContent = fmt(offPx * state.mradPerPx, 3);
    } else {
      aimOffOut.textContent = '—';
    }
  }

  function computeScale() {
    if (state.scalePts.length !== 2) return;
    const real = parseFloat(realDistM.value);
    const range = parseFloat(rangeM.value);
    if (!(real > 0) || !(range > 0)) {
      alert('Please enter positive real distance and range.');
      return;
    }
    const px = dist(state.scalePts[0], state.scalePts[1]);
    if (!(px > 0)) {
      alert('Scale points are identical.');
      return;
    }
    const totalMrad = 1000.0 * (real / range);
    state.mradPerPx = totalMrad / px;
    updateUI();
    redraw();
  }

  function drawCross(x,y, size=10) {
    const s = size * state.annotationScale;
    ctx.beginPath();
    ctx.moveTo(x-s, y); ctx.lineTo(x+s, y);
    ctx.moveTo(x, y-s); ctx.lineTo(x, y+s);
    ctx.stroke();
  }

  function drawPoint(x,y, r=4) {
    const radius = r * state.annotationScale;
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fill();
  }

  function drawLabel(text, x, y, bg='rgba(0,0,0,0.55)') {
    ctx.save();
    const fontSize = Math.round(16 * state.annotationScale);
    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = 'top';
    const pad = Math.round(5 * state.annotationScale);
    const h = Math.round(20 * state.annotationScale);
    const w = ctx.measureText(text).width;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w + pad*2, h + pad*2);
    ctx.fillStyle = 'white';
    ctx.fillText(text, x + pad, y + pad);
    ctx.restore();
    return { x, y, w: w + pad*2, h: h + pad*2 };
  }

  function isPointInLabel(point, labelBounds) {
    return point.x >= labelBounds.x && 
           point.x <= labelBounds.x + labelBounds.w &&
           point.y >= labelBounds.y && 
           point.y <= labelBounds.y + labelBounds.h;
  }

  function drawArrow(from, to, color, lineWidth=3) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return;

    const ux = dx / L, uy = dy / L;
    const headLen = Math.min(18 * state.annotationScale, 0.18 * L);
    const headW = headLen * 0.6;

    // end point for shaft (so arrowhead doesn't overshoot)
    const shaftEnd = { x: to.x - ux * headLen, y: to.y - uy * headLen };

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth * state.annotationScale;

    // shaft
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(shaftEnd.x, shaftEnd.y);
    ctx.stroke();

    // head (triangle)
    const nx = -uy, ny = ux;
    const p1 = to;
    const p2 = { x: shaftEnd.x + nx * headW, y: shaftEnd.y + ny * headW };
    const p3 = { x: shaftEnd.x - nx * headW, y: shaftEnd.y - ny * headW };

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    // Initialize label bounds storage
    state.labelBounds = {};

    if (!state.img) {
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(0,0,canvas.width||800,canvas.height||500);
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      const fontSize = Math.round(16 * state.annotationScale);
      ctx.font = `${fontSize}px system-ui`;
      ctx.fillText('Load an image to begin.', 20 * state.annotationScale, 40 * state.annotationScale);
      updateUI();
      return;
    }

    ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);

    // Scale points in blue
    if (state.scalePts.length > 0) {
      ctx.save();
      ctx.lineWidth = 3 * state.annotationScale;
      ctx.strokeStyle = BLUE_STROKE;
      ctx.fillStyle = BLUE_FILL;

      const offset = 8 * state.annotationScale;
      state.scalePts.forEach((p,i)=>{
        drawPoint(p.x,p.y,5);
        drawLabel(`S${i+1}`, p.x+offset, p.y+offset);
      });

      if (state.scalePts.length === 2) {
        const a = state.scalePts[0], b = state.scalePts[1];
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();

        const px = dist(a,b);
        let txt = `${fmt(px,1)} px`;
        if (state.mradPerPx) txt = `${fmt(px*state.mradPerPx,3)} mRad`;
        drawLabel(txt, (a.x+b.x)/2 + offset, (a.y+b.y)/2 + offset);
      }
      ctx.restore();
    }

    const O_STROKE = overlayStroke();
    const O_FILL = overlayFill();

    // Aim point cross
    if (state.aimPt) {
      ctx.save();
      ctx.lineWidth = 4 * state.annotationScale;
      ctx.strokeStyle = O_STROKE;
      drawCross(state.aimPt.x, state.aimPt.y, 16);
      const aimOffset = 18 * state.annotationScale;
      drawLabel('Aim', state.aimPt.x + aimOffset, state.aimPt.y + aimOffset);
      ctx.restore();
    }

    const stats = computeStats();

    // Aim offset arrow + label (requires aim + hits)
    if (stats && state.aimPt) {
      // Arrow Aim -> Center
      drawArrow(state.aimPt, stats.mean, O_STROKE, 4 * state.annotationScale);

      // Distance label at mid point (mRad)
      if (state.mradPerPx) {
        const mid = { x: (state.aimPt.x + stats.mean.x)/2, y: (state.aimPt.y + stats.mean.y)/2 };
        const offMrad = dist(state.aimPt, stats.mean) * state.mradPerPx;
        const aimOffsetLabelPos = {
          x: mid.x + state.labelOffsets.aimOffset.x * state.annotationScale,
          y: mid.y + state.labelOffsets.aimOffset.y * state.annotationScale
        };
        const aimOffsetLabelBounds = drawLabel(`Aim→Center = ${fmt(offMrad,3)} mRad`, 
          aimOffsetLabelPos.x, aimOffsetLabelPos.y);
        state.labelBounds.aimOffset = { ...aimOffsetLabelBounds, anchor: mid };
      }
    }

    // Hits + circle + center in chosen color
    if (state.hits.length > 0) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = O_STROKE;
      ctx.fillStyle = O_FILL;

      state.hits.forEach((p,i)=>{
        const hitRadius = 8 * state.annotationScale;
        const hitFillRadius = 3.5 * state.annotationScale;
        const hitLabelOffset = 10 * state.annotationScale;
        ctx.beginPath(); ctx.arc(p.x,p.y,hitRadius,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x,p.y,hitFillRadius,0,Math.PI*2); ctx.fill();
        drawLabel(String(i+1), p.x+hitLabelOffset, p.y-hitLabelOffset);
      });

      if (stats) {
        // center
        ctx.lineWidth = 4 * state.annotationScale;
        drawCross(stats.mean.x, stats.mean.y, 14);
        const centerLabelPos = {
          x: stats.mean.x + state.labelOffsets.center.x * state.annotationScale,
          y: stats.mean.y + state.labelOffsets.center.y * state.annotationScale
        };
        const centerLabelBounds = drawLabel('Center', centerLabelPos.x, centerLabelPos.y);
        state.labelBounds.center = { ...centerLabelBounds, anchor: stats.mean };

        // blocking circle
        ctx.lineWidth = 3 * state.annotationScale;
        ctx.beginPath();
        ctx.arc(stats.mean.x, stats.mean.y, stats.rMaxPx, 0, Math.PI*2);
        ctx.stroke();

        // dimension line to farthest hit
        let idxMax = 0;
        // pick first max
        for (let i=0;i<state.hits.length;i++){
          const r = dist(state.hits[i], stats.mean);
          if (Math.abs(r - stats.rMaxPx) < 1e-9) { idxMax = i; break; }
        }
        const pMax = state.hits[idxMax];
        ctx.beginPath();
        ctx.moveTo(stats.mean.x, stats.mean.y);
        ctx.lineTo(pMax.x, pMax.y);
        ctx.stroke();

        // Label: Radius + STD TR/EL (two lines each group)
        if (state.mradPerPx) {
          const rMrad = stats.rMaxPx * state.mradPerPx;
          const stdTr = stats.stdX * state.mradPerPx;
          const stdEl = stats.stdY * state.mradPerPx;

          const labelAnchor = { x: stats.mean.x + stats.rMaxPx, y: stats.mean.y };
          const lx = labelAnchor.x + state.labelOffsets.radius.x * state.annotationScale;
          const ly = labelAnchor.y + state.labelOffsets.radius.y * state.annotationScale;

          const radiusLabelBounds = drawLabel(`R = ${fmt(rMrad,3)} mRad`, lx, ly);
          state.labelBounds.radius = { ...radiusLabelBounds, anchor: labelAnchor };

          // stdTr and stdEl use the same x as radius (they're grouped), but have their own y offsets
          const stdTrLabelBounds = drawLabel(`STD TR = ${fmt(stdTr,3)} mRad`, 
            lx, ly + state.labelOffsets.stdTr.y * state.annotationScale);
          state.labelBounds.stdTr = { ...stdTrLabelBounds, anchor: labelAnchor };

          const stdElLabelBounds = drawLabel(`STD EL = ${fmt(stdEl,3)} mRad`, 
            lx, ly + state.labelOffsets.stdEl.y * state.annotationScale);
          state.labelBounds.stdEl = { ...stdElLabelBounds, anchor: labelAnchor };
        }
      }

      ctx.restore();
    }

    updateUI();
  }

  // Check if click is on a draggable label
  function getLabelAtPoint(point) {
    if (!state.labelBounds) return null;
    const labels = ['center', 'radius', 'stdTr', 'stdEl', 'aimOffset'];
    for (const labelKey of labels) {
      if (state.labelBounds[labelKey] && isPointInLabel(point, state.labelBounds[labelKey])) {
        // Group radius, stdTr, and stdEl together
        if (labelKey === 'radius' || labelKey === 'stdTr' || labelKey === 'stdEl') {
          return 'statsGroup';
        }
        return labelKey;
      }
    }
    return null;
  }

  canvas.addEventListener('mousedown', (evt) => {
    if (!state.img) return;
    
    const p = canvasToImageXY(evt);
    const clickedLabel = getLabelAtPoint(p);
    
    if (clickedLabel) {
      state.draggingLabel = clickedLabel;
      state.dragStart = p;
      canvas.style.cursor = 'grabbing';
      evt.preventDefault();
      return;
    }

    // Ctrl+Click removes last hit (only hits stage)
    if (evt.ctrlKey) {
      if (state.stage === 'hits' && state.hits.length > 0) state.hits.pop();
      redraw();
      return;
    }

    // Normal click handling
    if (state.stage === 'scale') {
      if (state.scalePts.length < 2) state.scalePts.push(p);
      else state.scalePts[1] = p;
      redraw();
      return;
    }

    if (state.stage === 'aim') {
      state.aimPt = p;
      redraw();
      return;
    }

    if (state.stage === 'hits') {
      state.hits.push(p);
      redraw();
    }
  });

  canvas.addEventListener('mousemove', (evt) => {
    if (!state.img) return;
    
    const p = canvasToImageXY(evt);
    
    // Update cursor when hovering over labels
    if (!state.draggingLabel) {
      const hoveredLabel = getLabelAtPoint(p);
      canvas.style.cursor = hoveredLabel ? 'grab' : 'default';
    }
    
    // Handle dragging
    if (state.draggingLabel && state.dragStart && state.labelBounds) {
      if (state.draggingLabel === 'statsGroup') {
        // Move all three stats labels together (radius, stdTr, stdEl)
        // Use radius label as the reference point
        const radiusLabel = state.labelBounds.radius;
        if (radiusLabel && radiusLabel.anchor) {
          const dx = p.x - state.dragStart.x;
          const dy = p.y - state.dragStart.y;
          
          // Convert current scaled offset to base units, then add the raw pixel movement
          // Offsets are stored in base units (scale 1.0), so divide by scale to convert back
          const currentBaseX = (radiusLabel.x - radiusLabel.anchor.x) / state.annotationScale;
          const currentBaseY = (radiusLabel.y - radiusLabel.anchor.y) / state.annotationScale;
          
          // Update the radius offset (x and y) - this moves the whole group
          // dx/dy are in canvas pixels, convert to base units
          state.labelOffsets.radius.x = currentBaseX + (dx / state.annotationScale);
          state.labelOffsets.radius.y = currentBaseY + (dy / state.annotationScale);
          
          // stdTr and stdEl maintain their relative y offsets (x is always same as radius)
          // Their x offsets are not used - they always align with radius.x
          
          state.dragStart = p;
          redraw();
        }
      } else {
        // Handle other labels individually
        const label = state.labelBounds[state.draggingLabel];
        if (label && label.anchor) {
          const dx = p.x - state.dragStart.x;
          const dy = p.y - state.dragStart.y;
          
          // Convert current scaled offset to base units, then add the raw pixel movement
          // Offsets are stored in base units (scale 1.0), so divide by scale to convert back
          const currentBaseX = (label.x - label.anchor.x) / state.annotationScale;
          const currentBaseY = (label.y - label.anchor.y) / state.annotationScale;
          
          // Update the offset
          // dx/dy are in canvas pixels, convert to base units
          state.labelOffsets[state.draggingLabel].x = currentBaseX + (dx / state.annotationScale);
          state.labelOffsets[state.draggingLabel].y = currentBaseY + (dy / state.annotationScale);
          
          state.dragStart = p;
          redraw();
        }
      }
    }
  });

  canvas.addEventListener('mouseup', (evt) => {
    if (state.draggingLabel) {
      state.draggingLabel = null;
      state.dragStart = null;
      canvas.style.cursor = 'default';
    }
  });

  canvas.addEventListener('mouseleave', (evt) => {
    if (state.draggingLabel) {
      state.draggingLabel = null;
      state.dragStart = null;
    }
    canvas.style.cursor = 'default';
  });

  // Color changes should redraw immediately
  hitColorInput.addEventListener('input', redraw);
  hitAlphaInput.addEventListener('input', redraw);

  // Annotation scale controls
  decreaseAnnotationBtn.addEventListener('click', () => {
    state.annotationScale = Math.max(0.5, state.annotationScale - 0.1);
    updateUI();
    redraw();
  });

  increaseAnnotationBtn.addEventListener('click', () => {
    state.annotationScale = Math.min(3.0, state.annotationScale + 0.1);
    updateUI();
    redraw();
  });

  // Keyboard shortcut: S cycles stages (only if allowed)
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 's') return;

    if (state.stage === 'scale') {
      if (state.mradPerPx) setStage('aim');
    } else if (state.stage === 'aim') {
      if (state.mradPerPx && state.aimPt) setStage('hits');
      else setStage('scale');
    } else {
      setStage('scale');
    }
  });

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      state.img = img;
      state.scalePts = [];
      state.aimPt = null;
      state.hits = [];
      state.mradPerPx = null;
      setStage('scale');
      resizeCanvasToImage();
      updateUI();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  setScaleBtn.addEventListener('click', () => computeScale());

  resetScaleBtn.addEventListener('click', () => {
    state.scalePts = [];
    state.mradPerPx = null;
    state.aimPt = null;
    state.hits = [];
    state.labelBounds = null;
    // Reset label offsets to defaults
    state.labelOffsets = {
      center: { x: 16, y: 16 },
      radius: { x: 10, y: 0 },
      stdTr: { x: 0, y: 28 },
      stdEl: { x: 0, y: 56 },
      aimOffset: { x: 10, y: 10 }
    };
    setStage('scale');
    redraw();
  });

  toAimBtn.addEventListener('click', () => {
    if (state.mradPerPx) setStage('aim');
  });

  resetAimBtn.addEventListener('click', () => {
    state.aimPt = null;
    redraw();
  });

  toHitsBtn.addEventListener('click', () => {
    if (state.mradPerPx && state.aimPt) setStage('hits');
  });

  clearHitsBtn.addEventListener('click', () => {
    state.hits = [];
    redraw();
  });

  undoHitBtn.addEventListener('click', () => {
    if (state.hits.length > 0) state.hits.pop();
    redraw();
  });

  exportBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'dispersion_annotated.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportToCSV() {
    const stats = computeStats();
    if (!stats || !state.mradPerPx) {
      alert('Please complete the analysis with hits marked before exporting.');
      return;
    }

    // Prepare CSV data row with specified columns: Hits, Range, STD TR, STD EL, Radius, Aim Offset
    const hitsCount = state.hits.length;
    const range = parseFloat(rangeM.value) || '';
    const stdTr = fmt(stats.stdX * state.mradPerPx, 3);
    const stdEl = fmt(stats.stdY * state.mradPerPx, 3);
    const radiusMrad = fmt(stats.rMaxPx * state.mradPerPx, 3);
    const aimOffsetMrad = state.aimPt ? fmt(dist(state.aimPt, stats.mean) * state.mradPerPx, 3) : '';

    const csvRow = [
      hitsCount,
      range,
      stdTr,
      stdEl,
      radiusMrad,
      aimOffsetMrad
    ].join(',');

    // Check if user wants to append to existing CSV
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          let csvContent = event.target.result;
          
          // Check if file has header
          const hasHeader = csvContent.trim().startsWith('Hits');
          
          // If no header, add it
          if (!hasHeader || csvContent.trim() === '') {
            csvContent = 'Hits,Range,STD TR,STD EL,Radius,AimOffset\n';
          }
          
          // Ensure content ends with newline before appending
          if (!csvContent.endsWith('\n')) {
            csvContent += '\n';
          }
          
          // Append new row
          csvContent += csvRow + '\n';
          
          // Download updated CSV
          downloadCSV(csvContent, 'dispersion_results.csv');
        };
        reader.readAsText(file);
      } else {
        // No file selected, create new CSV with header
        const header = 'Hits,Range,STD TR,STD EL,Radius,AimOffset\n';
        downloadCSV(header + csvRow + '\n', 'dispersion_results.csv');
      }
      
      document.body.removeChild(input);
    };
    
    // If user cancels file selection, create new CSV
    input.oncancel = () => {
      const header = 'Hits,Range,STD TR,STD EL,Radius,AimOffset\n';
      downloadCSV(header + csvRow + '\n', 'dispersion_results.csv');
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  }

  exportCsvBtn.addEventListener('click', () => {
    exportToCSV();
  });

  // Init placeholder canvas size
  canvas.width = 1200;
  canvas.height = 800;
  redraw();
})();

