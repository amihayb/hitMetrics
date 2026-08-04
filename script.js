(() => {
  const fileInput = document.getElementById('file');
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const canvasWrap = document.querySelector('.canvasWrap');

  const cropBtn = document.getElementById('cropBtn');
  const applyCropBtn = document.getElementById('applyCropBtn');
  const cancelCropBtn = document.getElementById('cancelCropBtn');

  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomDisplay = document.getElementById('zoomDisplay');

  const mbUndo = document.getElementById('mbUndo');
  const mbNext = document.getElementById('mbNext');
  const mbStageLabel = document.getElementById('mbStageLabel');

  // Mobile: tap the empty canvas to open the file picker
  canvasWrap.addEventListener('touchend', (e) => {
    if (!state.img && e.changedTouches.length === 1) {
      e.preventDefault();
      fileInput.click();
    }
  }, { passive: false });

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
    annotationScale: 1.0,
    cropMode: false,
    cropRect: null,
    cropDragStart: null,
    viewZoom: 1.0,
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

    updateMobileToolbar();
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
    applyZoom();
    redraw();
  }

  function applyZoom() {
    if (state.viewZoom <= 1.0) {
      canvas.style.width = '';
      canvas.style.height = '';
      canvas.style.maxWidth = '';
      canvas.style.maxHeight = '';
      canvasWrap.style.overflow = '';
      canvasWrap.style.alignItems = '';
      canvasWrap.style.justifyContent = '';
    } else {
      const wrapW = canvasWrap.clientWidth;
      const wrapH = canvasWrap.clientHeight;
      const imgAspect = canvas.width / canvas.height;
      const wrapAspect = wrapW / wrapH;
      const baseW = imgAspect >= wrapAspect ? wrapW : wrapH * imgAspect;
      canvas.style.width = Math.round(baseW * state.viewZoom) + 'px';
      canvas.style.height = 'auto';
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';
      canvasWrap.style.overflow = 'auto';
      canvasWrap.style.alignItems = 'flex-start';
      canvasWrap.style.justifyContent = 'flex-start';
    }
    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    zoomDisplay.textContent = Math.round(state.viewZoom * 100) + '%';
  }

  function updateCropUI() {
    const inCrop = state.cropMode;
    cropBtn.textContent = inCrop ? 'Cropping…' : '✂ Crop image';
    cropBtn.style.display = inCrop ? 'none' : '';
    applyCropBtn.style.display = inCrop ? '' : 'none';
    cancelCropBtn.style.display = inCrop ? '' : 'none';
    applyCropBtn.disabled = !(state.cropRect && state.cropRect.w > 4 && state.cropRect.h > 4);
  }

  function updateMobileToolbar() {
    const s = state.stage;
    const stageNames = { scale: 'Scale', aim: 'Aim point', hits: 'Mark hits' };
    mbStageLabel.textContent = stageNames[s] || s;

    if (s === 'scale') {
      mbUndo.disabled = state.scalePts.length === 0;
    } else if (s === 'hits') {
      mbUndo.disabled = state.hits.length === 0;
    } else {
      mbUndo.disabled = true;
    }

    if (s === 'scale') {
      mbNext.disabled = !(state.scalePts.length === 2 && state.img);
      mbNext.textContent = 'Next →';
    } else if (s === 'aim') {
      mbNext.disabled = !(state.mradPerPx && state.aimPt && state.img);
      mbNext.textContent = 'Next →';
    } else {
      mbNext.disabled = true;
      mbNext.textContent = 'Done';
    }
  }

  function applyCrop() {    if (!state.img || !state.cropRect) return;
    const { x, y, w, h } = state.cropRect;
    if (w < 5 || h < 5) return;
    const tmp = document.createElement('canvas');
    tmp.width = Math.round(w);
    tmp.height = Math.round(h);
    tmp.getContext('2d').drawImage(state.img, x, y, w, h, 0, 0, Math.round(w), Math.round(h));
    const cropped = new Image();
    cropped.onload = () => {
      state.img = cropped;
      state.cropMode = false;
      state.cropRect = null;
      state.cropDragStart = null;
      state.scalePts = [];
      state.aimPt = null;
      state.hits = [];
      state.mradPerPx = null;
      state.viewZoom = 1.0;
      setStage('scale');
      resizeCanvasToImage();
      updateUI();
      updateCropUI();
    };
    cropped.src = tmp.toDataURL();
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
    canvasWrap.classList.toggle('no-image', !state.img);
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
      const dxMrad = (stats.mean.x - state.aimPt.x) * state.mradPerPx;
      const dyMrad = (stats.mean.y - state.aimPt.y) * state.mradPerPx;
      aimOffOut.innerHTML = `${fmt(offPx * state.mradPerPx, 3)}<br>ΔX(TR) = ${fmt(dxMrad,3)}<br>ΔY(EL) = ${fmt(dyMrad,3)}`;
    } else {
      aimOffOut.textContent = '—';
    }
    updateMobileToolbar();
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

  function drawCross(x,y, size=20) {
    const s = size * state.annotationScale;
    ctx.beginPath();
    ctx.moveTo(x-s, y); ctx.lineTo(x+s, y);
    ctx.moveTo(x, y-s); ctx.lineTo(x, y+s);
    ctx.stroke();
  }

  function drawPoint(x,y, r=8) {
    const radius = r * state.annotationScale;
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fill();
  }

  function drawLabel(text, x, y, bg='rgba(0,0,0,0.55)') {
    ctx.save();
    const fontSize = Math.round(32 * state.annotationScale);
    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = 'top';
    const pad = Math.round(10 * state.annotationScale);
    const h = Math.round(40 * state.annotationScale);
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
    const headLen = Math.min(36 * state.annotationScale, 0.18 * L);
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

  function drawDragDropIcon(x, y, size = 32) {
    const s = size * state.annotationScale;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.70)';
    ctx.lineWidth = 2 * state.annotationScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Tray
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.4);
    ctx.lineTo(x + s * 0.6, y + s * 0.4);
    ctx.lineTo(x + s * 0.4, y + s * 0.75);
    ctx.lineTo(x - s * 0.4, y + s * 0.75);
    ctx.closePath();
    ctx.stroke();

    // Arrow
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.8);
    ctx.lineTo(x, y + s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y - s * 0.1);
    ctx.lineTo(x, y + s * 0.1);
    ctx.lineTo(x + s * 0.2, y - s * 0.1);
    ctx.stroke();

    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    // Initialize label bounds storage
    state.labelBounds = {};

    if (!state.img) {
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(0,0,canvas.width||800,canvas.height||500);

      const centerX = (canvas.width || 800) / 2;
      const centerY = (canvas.height || 500) / 2;
      drawDragDropIcon(centerX, centerY - 60 * state.annotationScale, 34);

      ctx.fillStyle = 'rgba(255,255,255,.78)';
      const fontSize = Math.round(44 * state.annotationScale);
      ctx.font = `${fontSize}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Load image or drag and drop here to begin.', centerX, centerY + 20 * state.annotationScale);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      updateUI();
      return;
    }

    ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);

    // Crop overlay — drawn on top of image, skip all annotations
    if (state.cropMode) {
      if (state.cropRect && state.cropRect.w > 0 && state.cropRect.h > 0) {
        const { x, y, w, h } = state.cropRect;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(0, 0, canvas.width, y);
        ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
        ctx.fillRect(0, y, x, h);
        ctx.fillRect(x + w, y, canvas.width - x - w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2 * state.annotationScale;
        ctx.setLineDash([12 * state.annotationScale, 6 * state.annotationScale]);
        ctx.strokeRect(x, y, w, h);
        // Corner handles
        ctx.setLineDash([]);
        ctx.fillStyle = 'white';
        const hs = 12 * state.annotationScale;
        [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([cx,cy])=>{
          ctx.fillRect(cx - hs/2, cy - hs/2, hs, hs);
        });
        ctx.restore();
      } else {
        // No rect yet — hint text
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        const sz = Math.round(40 * state.annotationScale);
        ctx.font = `${sz}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Drag to select crop area', canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }
      updateUI();
      return;
    }

    // Scale points in blue — only shown during scale stage
    if (state.scalePts.length > 0 && state.stage === 'scale') {
      ctx.save();
      ctx.lineWidth = 6 * state.annotationScale;
      ctx.strokeStyle = BLUE_STROKE;
      ctx.fillStyle = BLUE_FILL;

      const offset = 16 * state.annotationScale;
      state.scalePts.forEach((p,i)=>{
        drawPoint(p.x,p.y,10);
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
      ctx.lineWidth = 8 * state.annotationScale;
      ctx.strokeStyle = O_STROKE;
      drawCross(state.aimPt.x, state.aimPt.y, 32);
      ctx.restore();
    }

    const stats = computeStats();

    // Aim offset arrow + label (requires aim + hits)
    if (stats && state.aimPt) {
      // Arrow Aim -> Center
      drawArrow(state.aimPt, stats.mean, O_STROKE, 8 * state.annotationScale);

      // Distance label at mid point (mRad)
      if (state.mradPerPx) {
        const mid = { x: (state.aimPt.x + stats.mean.x)/2, y: (state.aimPt.y + stats.mean.y)/2 };
        const offMrad = dist(state.aimPt, stats.mean) * state.mradPerPx;
        const dxMrad = (stats.mean.x - state.aimPt.x) * state.mradPerPx;
        const dyMrad = (stats.mean.y - state.aimPt.y) * state.mradPerPx;
        const aimOffsetLabelPos = {
          x: mid.x + state.labelOffsets.aimOffset.x * state.annotationScale,
          y: mid.y + state.labelOffsets.aimOffset.y * state.annotationScale
        };
        const line1 = `Aim→Center = ${fmt(offMrad,3)} mRad`;
        const line2 = `ΔX(TR) = ${fmt(dxMrad,3)} mRad`;
        const line3 = `ΔY(EL) = ${fmt(dyMrad,3)} mRad`;
        const lb1 = drawLabel(line1, aimOffsetLabelPos.x, aimOffsetLabelPos.y);
        const lineH = lb1.h - 2;
        const lb2 = drawLabel(line2, aimOffsetLabelPos.x, aimOffsetLabelPos.y + lineH);
        const lb3 = drawLabel(line3, aimOffsetLabelPos.x, aimOffsetLabelPos.y + lineH * 2);
        const combined = {
          x: aimOffsetLabelPos.x,
          y: aimOffsetLabelPos.y,
          w: Math.max(lb1.w, lb2.w, lb3.w),
          h: lb1.h + lineH * 2 + lb3.h
        };
        state.labelBounds.aimOffset = { ...combined, anchor: mid };
      }
    }

    // Hits + circle + center in chosen color
    if (state.hits.length > 0) {
      ctx.save();
      ctx.lineWidth = 6;
      ctx.strokeStyle = O_STROKE;
      ctx.fillStyle = O_FILL;

      state.hits.forEach((p,i)=>{
        const hitRadius = 16 * state.annotationScale;
        const hitFillRadius = 7 * state.annotationScale;
        const hitLabelOffset = 20 * state.annotationScale;
        ctx.beginPath(); ctx.arc(p.x,p.y,hitRadius,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x,p.y,hitFillRadius,0,Math.PI*2); ctx.fill();
        drawLabel(String(i+1), p.x+hitLabelOffset, p.y-hitLabelOffset);
      });

      if (stats) {
        // center
        ctx.lineWidth = 8 * state.annotationScale;
        drawCross(stats.mean.x, stats.mean.y, 28);

        // blocking circle
        ctx.lineWidth = 6 * state.annotationScale;
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

          const lineH = radiusLabelBounds.h;
          const stdTrLabelBounds = drawLabel(`STD TR = ${fmt(stdTr,3)} mRad`, lx, ly + lineH);
          state.labelBounds.stdTr = { ...stdTrLabelBounds, anchor: labelAnchor };

          const stdElLabelBounds = drawLabel(`STD EL = ${fmt(stdEl,3)} mRad`, lx, ly + lineH * 2);
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
    const labels = ['radius', 'stdTr', 'stdEl', 'aimOffset'];
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

    // Crop mode — start drawing crop rectangle
    if (state.cropMode) {
      state.cropDragStart = p;
      state.cropRect = null;
      updateCropUI();
      return;
    }

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

    // Crop drag
    if (state.cropMode) {
      canvas.style.cursor = 'crosshair';
      if (state.cropDragStart) {
        const x = Math.max(0, Math.min(state.cropDragStart.x, p.x));
        const y = Math.max(0, Math.min(state.cropDragStart.y, p.y));
        const x2 = Math.min(canvas.width, Math.max(state.cropDragStart.x, p.x));
        const y2 = Math.min(canvas.height, Math.max(state.cropDragStart.y, p.y));
        state.cropRect = { x, y, w: x2 - x, h: y2 - y };
        redraw();
      }
      return;
    }
    
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
    if (state.cropMode) {
      state.cropDragStart = null;
      updateCropUI();
      return;
    }
    if (state.draggingLabel) {
      state.draggingLabel = null;
      state.dragStart = null;
      canvas.style.cursor = 'default';
    }
  });

  canvas.addEventListener('mouseleave', (evt) => {
    if (state.cropMode) {
      state.cropDragStart = null;
      canvas.style.cursor = 'default';
      return;
    }
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

  function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      return false;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.img = img;
      state.scalePts = [];
      state.aimPt = null;
      state.hits = [];
      state.mradPerPx = null;
      state.cropMode = false;
      state.cropRect = null;
      state.cropDragStart = null;
      state.viewZoom = 1.0;
      setStage('scale');
      resizeCanvasToImage();
      updateUI();
      updateCropUI();
      cropBtn.disabled = false;
      URL.revokeObjectURL(url);
    };
    img.src = url;
    return true;
  }

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) loadImageFile(f);
  });

  // Drag and drop for canvas
  canvasWrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasWrap.classList.add('drag-over');
  });

  canvasWrap.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasWrap.classList.remove('drag-over');
  });

  canvasWrap.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    canvasWrap.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (loadImageFile(file)) {
        // Also update the file input to reflect the dropped file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      }
    }
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

  // Crop buttons
  cropBtn.addEventListener('click', () => {
    if (!state.img) return;
    state.cropMode = true;
    state.cropRect = null;
    state.cropDragStart = null;
    updateCropUI();
    redraw();
  });

  applyCropBtn.addEventListener('click', () => applyCrop());

  cancelCropBtn.addEventListener('click', () => {
    state.cropMode = false;
    state.cropRect = null;
    state.cropDragStart = null;
    updateCropUI();
    redraw();
  });

  // Zoom buttons
  zoomInBtn.addEventListener('click', () => {
    state.viewZoom = Math.min(5.0, parseFloat((state.viewZoom + 0.25).toFixed(2)));
    applyZoom();
  });

  zoomOutBtn.addEventListener('click', () => {
    state.viewZoom = Math.max(0.5, parseFloat((state.viewZoom - 0.25).toFixed(2)));
    applyZoom();
  });

  zoomResetBtn.addEventListener('click', () => {
    state.viewZoom = 1.0;
    applyZoom();
  });

  // Scroll wheel zoom on canvas
  canvasWrap.addEventListener('wheel', (e) => {
    if (!state.img) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    state.viewZoom = Math.max(0.5, Math.min(5.0, parseFloat((state.viewZoom + delta).toFixed(2))));
    applyZoom();
  }, { passive: false });

  // ── Touch support ─────────────────────────────────────────────────────
  function forwardTouch(e, type) {
    const t = e.touches[0] || e.changedTouches[0];
    if (!t) return;
    canvas.dispatchEvent(new MouseEvent(type, {
      clientX: t.clientX,
      clientY: t.clientY,
      bubbles: true,
      ctrlKey: e.ctrlKey,
    }));
  }

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) forwardTouch(e, 'mousedown');
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    forwardTouch(e, 'mouseup');
    lastPinchDist = null;
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    forwardTouch(e, 'mouseleave');
    lastPinchDist = null;
  }, { passive: false });

  let lastPinchDist = null;
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Two-finger pinch → zoom
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist !== null) {
        state.viewZoom = Math.max(0.5, Math.min(5.0,
          parseFloat((state.viewZoom * (d / lastPinchDist)).toFixed(2))
        ));
        applyZoom();
      }
      lastPinchDist = d;
    } else {
      lastPinchDist = null;
      forwardTouch(e, 'mousemove');
    }
  }, { passive: false });

  // ── Mobile quick-action toolbar buttons ───────────────────────────────
  mbUndo.addEventListener('click', () => {
    if (state.stage === 'scale' && state.scalePts.length > 0) {
      state.scalePts.pop();
    } else if (state.stage === 'hits' && state.hits.length > 0) {
      state.hits.pop();
    }
    updateUI();
    redraw();
  });

  mbNext.addEventListener('click', () => {
    if (state.stage === 'scale') {
      computeScale();
      if (state.mradPerPx) setStage('aim');
    } else if (state.stage === 'aim' && state.aimPt) {
      setStage('hits');
    }
  });

  // Init placeholder canvas size
  canvas.width = 1200;
  canvas.height = 800;
  updateZoomDisplay();
  updateMobileToolbar();
  updateUI();
  redraw();
})();

