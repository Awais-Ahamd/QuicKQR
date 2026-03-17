/* ================================================
   QR TOOLKIT — SCRIPT.JS
   Scanner completely rewritten for reliability.
================================================ */

'use strict';

/* ════════════════════════════════════════
   THEME
════════════════════════════════════════ */
const html = document.documentElement;
const themeBtn = document.getElementById('themeToggle');

if (localStorage.getItem('qr-theme') === 'dark') {
  html.setAttribute('data-theme', 'dark');
  // Pre-set color pickers to dark-mode defaults on load
  document.addEventListener('DOMContentLoaded', () => {
    const qrEl = document.getElementById('genQrColor');
    const bgEl = document.getElementById('genBgColor');
    if (qrEl && bgEl) {
      qrEl.value = '#FFFFFF';
      bgEl.value = '#1F2937';
      const qrHex = document.getElementById('genQrHex');
      const bgHex = document.getElementById('genBgHex');
      if (qrHex) qrHex.textContent = '#FFFFFF';
      if (bgHex) bgHex.textContent = '#1F2937';
    }
  });
}

themeBtn.addEventListener('click', () => {
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('qr-theme', dark ? 'light' : 'dark');

  // Swap QR color pickers when switching theme
  // (only if the user has not manually customised away from defaults)
  const defaultDark  = '#1F2937';
  const defaultLight = '#FFFFFF';
  const qrEl = document.getElementById('genQrColor');
  const bgEl = document.getElementById('genBgColor');
  if (!qrEl || !bgEl) return;

  const currentQr = qrEl.value.toUpperCase();
  const currentBg = bgEl.value.toUpperCase();

  // going light→dark: if colours are still the light-mode defaults, swap them
  if (!dark) {  // was light, now going dark
    if (currentQr === defaultDark.toUpperCase() && currentBg === defaultLight.toUpperCase()) {
      qrEl.value = defaultLight;
      bgEl.value = defaultDark;
      document.getElementById('genQrHex').textContent = defaultLight;
      document.getElementById('genBgHex').textContent = defaultDark.toUpperCase();
      if (typeof genMade !== 'undefined' && genMade) doGen();
    }
  } else {      // was dark, now going light
    if (currentQr === defaultLight.toUpperCase() && currentBg === defaultDark.toUpperCase()) {
      qrEl.value = defaultDark;
      bgEl.value = defaultLight;
      document.getElementById('genQrHex').textContent = defaultDark.toUpperCase();
      document.getElementById('genBgHex').textContent = defaultLight;
      if (typeof genMade !== 'undefined' && genMade) doGen();
    }
  }
});

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
const navItems  = document.querySelectorAll('.nav-item');
const tabPages  = document.querySelectorAll('.tab-page');
const hamburger = document.getElementById('hamburger');
const navList   = document.getElementById('navList');
const mobScannerPin = document.getElementById('mobScannerPin');
const navHomeBtn    = document.getElementById('navHomeBtn');

function switchTab(name) {
  navItems.forEach(n => n.classList.toggle('active', n.dataset.tab === name));
  tabPages.forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  navList.classList.remove('open');
  // keep mobile pin button active state in sync
  if (mobScannerPin) {
    mobScannerPin.classList.toggle('active', name === 'camera');
  }
  // keep home button active state in sync
  if (navHomeBtn) {
    navHomeBtn.classList.toggle('active', name === 'home');
  }
}

navItems.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
hamburger.addEventListener('click', () => navList.classList.toggle('open'));
document.addEventListener('click', e => {
  if (!hamburger.contains(e.target) && !navList.contains(e.target)) {
    navList.classList.remove('open');
  }
});

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function toast(msg, type = 'default', ms = 3000) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  const icons = { success: '✓', error: '✕', warn: '⚠', default: 'ℹ' };
  el.className = 'toast' + (type !== 'default' ? ` t-${type}` : '');
  el.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 250);
  }, ms);
}

/* ════════════════════════════════════════
   QR GENERATION HELPER
   Uses qrcode.js in a hidden div, then
   copies the rendered canvas/img to target.
════════════════════════════════════════ */
function makeQR(targetCanvas, text, darkColor, lightColor, size) {
  return new Promise((resolve, reject) => {
    // qrcode.js throws synchronously for data too large
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden';
    document.body.appendChild(div);

    let instance;
    try {
      instance = new QRCode(div, {
        text:         text,
        width:        size,
        height:       size,
        colorDark:    darkColor,
        colorLight:   lightColor,
        correctLevel: QRCode.CorrectLevel.M   // M is more forgiving than H
      });
    } catch (err) {
      document.body.removeChild(div);
      return reject(err);
    }

    // qrcode.js renders async via setTimeout internally; wait two frames
    function attempt(tries) {
      const srcCanvas = div.querySelector('canvas');
      const srcImg    = div.querySelector('img');

      if (srcCanvas && srcCanvas.width > 0) {
        targetCanvas.width  = size;
        targetCanvas.height = size;
        targetCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, size, size);
        document.body.removeChild(div);
        return resolve();
      }

      if (srcImg && srcImg.src && srcImg.complete && srcImg.naturalWidth > 0) {
        targetCanvas.width  = size;
        targetCanvas.height = size;
        targetCanvas.getContext('2d').drawImage(srcImg, 0, 0, size, size);
        document.body.removeChild(div);
        return resolve();
      }

      if (srcImg && srcImg.src && !srcImg.complete) {
        srcImg.onload = () => {
          targetCanvas.width  = size;
          targetCanvas.height = size;
          targetCanvas.getContext('2d').drawImage(srcImg, 0, 0, size, size);
          document.body.removeChild(div);
          resolve();
        };
        srcImg.onerror = () => {
          document.body.removeChild(div);
          reject(new Error('img failed to load'));
        };
        return;
      }

      if (tries > 0) {
        setTimeout(() => attempt(tries - 1), 80);
      } else {
        document.body.removeChild(div);
        reject(new Error('QR render timed out'));
      }
    }

    setTimeout(() => attempt(10), 60);
  });
}

/* ════════════════════════════════════════
   SHOW QR IN STAGE
════════════════════════════════════════ */
function showQRResult(stageId, canvasId, placeholderId, dlBarId) {
  document.getElementById(placeholderId).classList.add('hidden');
  const canvas = document.getElementById(canvasId);
  canvas.style.display = 'block';
  canvas.style.animation = 'none';
  // force reflow then re-apply animation
  void canvas.offsetWidth;
  canvas.style.animation = '';
  document.getElementById(stageId).classList.add('has-qr');
  document.getElementById(dlBarId).classList.remove('hidden');
}

/* ════════════════════════════════════════
   DOWNLOAD HELPERS
════════════════════════════════════════ */
function downloadCanvas(canvas, fmt, name, bg) {
  let url;
  if (fmt === 'jpg') {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    const ctx = tmp.getContext('2d');
    ctx.fillStyle = bg || '#ffffff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    url = tmp.toDataURL('image/jpeg', 0.95);
  } else {
    url = canvas.toDataURL('image/png');
  }
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.${fmt}`; a.click();
  toast(`Downloaded as ${fmt.toUpperCase()}`, 'success');
}

function downloadWithDesc(canvas, fmt, name, desc, bg) {
  if (!desc || !desc.trim()) {
    downloadCanvas(canvas, fmt, name, bg);
    return;
  }
  const pad = 22, fs = 17, gap = 14;
  const out = document.createElement('canvas');
  out.width  = canvas.width  + pad * 2;
  out.height = canvas.height + pad * 2 + fs + gap * 2;
  const ctx = out.getContext('2d');
  ctx.fillStyle = bg || '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.font = `bold ${fs}px system-ui,Arial,sans-serif`;
  ctx.fillStyle = '#1F2937';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(desc.trim(), out.width / 2, gap + fs / 2);
  ctx.drawImage(canvas, pad, pad + fs + gap * 2);
  downloadCanvas(out, fmt, name, bg);
}

/* ════════════════════════════════════════
   ── TAB 1: GENERATOR ──
════════════════════════════════════════ */
const genInput   = document.getElementById('genInput');
const genDesc    = document.getElementById('genDesc');
const genQrColor = document.getElementById('genQrColor');
const genBgColor = document.getElementById('genBgColor');
const genQrHex   = document.getElementById('genQrHex');
const genBgHex   = document.getElementById('genBgHex');
const charCount  = document.getElementById('charCount');
const charWarn   = document.getElementById('charWarn');
const charFill   = document.getElementById('charFill');
const genBtn     = document.getElementById('genBtn');
const genReset   = document.getElementById('genReset');
const genCanvas  = document.getElementById('genCanvas');

let genSize = 260;
let genMade = false;

// Char counter
genInput.addEventListener('input', () => {
  const n = genInput.value.length, max = 300;
  charCount.textContent = `${n} / ${max} characters`;
  const pct = n / max * 100;
  charFill.style.width = pct + '%';
  charFill.classList.toggle('warn', pct >= 70 && pct < 100);
  charFill.classList.toggle('over', pct >= 100);
  charWarn.classList.toggle('hidden', n < max);
  if (genMade) doGen();
});

// Color pickers
genQrColor.addEventListener('input', () => {
  genQrHex.textContent = genQrColor.value.toUpperCase();
  if (genMade) doGen();
});
genBgColor.addEventListener('input', () => {
  genBgHex.textContent = genBgColor.value.toUpperCase();
  if (genMade) doGen();
});

// Size pills
document.querySelectorAll('#genSizePills .pill').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('#genSizePills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    genSize = parseInt(p.dataset.size);
    if (genMade) doGen();
  });
});

async function doGen() {
  const text = genInput.value.trim();
  if (!text) { toast('Please enter some content.', 'warn'); return; }

  genBtn.disabled = true;
  genBtn.textContent = 'Generating…';

  try {
    await makeQR(genCanvas, text, genQrColor.value, genBgColor.value, genSize);
    showQRResult('genStage', 'genCanvas', 'genPlaceholder', 'genDlBar');
    genMade = true;
    toast('QR code ready!', 'success');
  } catch (e) {
    toast('Could not generate QR. Try shorter text.', 'error');
    console.error(e);
  }

  genBtn.disabled = false;
  genBtn.innerHTML = '<span class="ripple"></span>Generate QR';
}

genBtn.addEventListener('click', doGen);
genInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doGen(); }
});

genReset.addEventListener('click', () => {
  genInput.value = ''; genDesc.value = '';
  genQrColor.value = '#1F2937'; genBgColor.value = '#FFFFFF';
  genQrHex.textContent = '#1F2937'; genBgHex.textContent = '#FFFFFF';
  charCount.textContent = '0 / 300 characters';
  charFill.style.width = '0'; charFill.className = 'char-fill';
  charWarn.classList.add('hidden');
  genCanvas.style.display = 'none';
  document.getElementById('genPlaceholder').classList.remove('hidden');
  document.getElementById('genStage').classList.remove('has-qr');
  document.getElementById('genDlBar').classList.add('hidden');
  document.querySelectorAll('#genSizePills .pill').forEach(p => p.classList.toggle('active', p.dataset.size === '260'));
  genSize = 260; genMade = false;
  toast('Reset complete.');
});

document.getElementById('dlPng').addEventListener('click', () => {
  if (genMade) downloadWithDesc(genCanvas, 'png', 'qr-code', genDesc.value, genBgColor.value);
});
document.getElementById('dlJpg').addEventListener('click', () => {
  if (genMade) downloadWithDesc(genCanvas, 'jpg', 'qr-code', genDesc.value, genBgColor.value);
});

/* ════════════════════════════════════════
   ── TAB 3: SCANNER ──
   ROOT CAUSE OF PREVIOUS FAILURES:
   The canvas was inside a tab-page with
   display:none — browsers return blank
   pixel data (all zeros) from a canvas
   that is inside a hidden element, so
   jsQR always saw an empty image.

   FIX: Always use a freshly created
   off-screen canvas that is appended to
   <body> (never inside a hidden element),
   read pixel data, then remove it.
════════════════════════════════════════ */
const dropZone       = document.getElementById('dropZone');
const dzBrowse       = document.getElementById('dzBrowse');
const scanFileInput  = document.getElementById('scanFile');
const scanImgPrev    = document.getElementById('scanImgPreview');
const scanPreviewImg = document.getElementById('scanPreviewImg');
const scanRemove     = document.getElementById('scanRemove');
const scanMeta       = document.getElementById('scanMeta');
const decodeBtn      = document.getElementById('decodeBtn');
const resultBox      = document.getElementById('resultBox');
const resultBadge    = document.getElementById('resultBadge');

let scanDataURL = null;

/* ── Accept file ── */
function acceptScanFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('Please upload an image file.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    scanDataURL = e.target.result;
    scanPreviewImg.src = scanDataURL;
    dropZone.classList.add('hidden');
    scanImgPrev.classList.remove('hidden');
    decodeBtn.classList.remove('hidden');
    scanMeta.textContent = `${file.name}  •  ${(file.size / 1024).toFixed(1)} KB`;
    resetResult();
  };
  reader.readAsDataURL(file);
}

dzBrowse.addEventListener('click', e => { e.stopPropagation(); scanFileInput.click(); });
dropZone.addEventListener('click', () => scanFileInput.click());
scanFileInput.addEventListener('change', () => {
  if (scanFileInput.files[0]) acceptScanFile(scanFileInput.files[0]);
});
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-active'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-active');
  if (e.dataTransfer?.files[0]) acceptScanFile(e.dataTransfer.files[0]);
});

scanRemove.addEventListener('click', () => {
  scanDataURL = null;
  scanFileInput.value = '';
  scanPreviewImg.src = '';
  dropZone.classList.remove('hidden');
  scanImgPrev.classList.add('hidden');
  decodeBtn.classList.add('hidden');
  resetResult();
});

/* ── Result helpers ── */
function resetResult() {
  resultBox.className = 'result-box';
  resultBadge.classList.add('hidden');
  resultBox.innerHTML = `
    <div class="result-idle">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
        <rect x="9"  y="9"  width="22" height="22" rx="3" stroke="var(--border-2)" stroke-width="2" fill="none"/>
        <rect x="13" y="13" width="14" height="14" rx="2" fill="var(--border)" opacity=".6"/>
        <rect x="41" y="9"  width="22" height="22" rx="3" stroke="var(--border-2)" stroke-width="2" fill="none"/>
        <rect x="45" y="13" width="14" height="14" rx="2" fill="var(--border)" opacity=".6"/>
        <rect x="9"  y="41" width="22" height="22" rx="3" stroke="var(--border-2)" stroke-width="2" fill="none"/>
        <rect x="13" y="45" width="14" height="14" rx="2" fill="var(--border)" opacity=".6"/>
        <rect x="41" y="41" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
        <rect x="54" y="41" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
        <rect x="41" y="54" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
        <rect x="54" y="54" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
      </svg>
      <p class="ri-title">Awaiting QR image</p>
      <p class="ri-sub">Upload an image and click Decode</p>
    </div>`;
}

function showSuccess(data) {
  resultBox.className = 'result-box success';
  resultBadge.className = 'result-badge ok';
  resultBadge.textContent = '✓ Decoded';
  resultBadge.classList.remove('hidden');

  const isURL   = /^https?:\/\//i.test(data);
  const isEmail = /^mailto:/i.test(data) || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data) && !data.includes(' '));
  const isWifi  = /^WIFI:/i.test(data);
  const isPhone = /^tel:/i.test(data) || /^\+?[\d\s\-()]{7,}$/.test(data);

  let tagClass = 'text', tagLabel = 'Text';
  if (isURL)        { tagClass = 'url';   tagLabel = 'URL';   }
  else if (isEmail) { tagClass = 'email'; tagLabel = 'Email'; }
  else if (isWifi)  { tagClass = 'wifi';  tagLabel = 'WiFi';  }
  else if (isPhone) { tagClass = 'phone'; tagLabel = 'Phone'; }

  const safe    = esc(data); 
  const display = isURL
    ? `<a href="${esc(data)}" target="_blank" rel="noopener noreferrer">${safe}</a>`
    : safe;

  resultBox.innerHTML = `
    <div class="decoded-wrap">
      <div class="type-tag ${tagClass}">${tagLabel}</div>
      <div class="decoded-data">${display}</div>
    </div>`;
  toast('QR code decoded!', 'success');
}

const copyBtn = document.getElementById("copyBtn");

copyBtn.addEventListener("click", () => {
  // Find the decoded text inside the scanner
  const decodedEl = document.querySelector(".decoded-data");
  if (!decodedEl || !decodedEl.textContent) {
    toast("Nothing to copy!", "warn");
    return;
  }

  navigator.clipboard.writeText(decodedEl.textContent)
    .then(() => toast("Text copied to clipboard!", "success"))
    .catch(() => toast("Failed to copy text.", "error"));
});

function showError() {
  resultBox.className = 'result-box error';
  resultBadge.className = 'result-badge err';
  resultBadge.textContent = '✕ Not a QR Code';
  resultBadge.classList.remove('hidden');
  resultBox.innerHTML = `
    <div class="decode-error">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M13 13l14 14M27 13L13 27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>Uploaded file is not a QR Code.</p>
      <small>Make sure the image clearly shows a QR code and try again.</small>
    </div>`;
  toast('No QR code found in the image.', 'error');
}

function esc(s) {
  return s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Core: draw image onto a fresh BODY-LEVEL canvas and run jsQR ──
   CRITICAL: canvas must be appended to document.body (NOT inside any
   hidden element) otherwise getImageData returns all-zero data.       */
function tryDecode(img, targetW, targetH) {
  // Create a fresh canvas, attach to body so it's in the render tree
  const c = document.createElement('canvas');
  c.width  = targetW;
  c.height = targetH;
  c.style.cssText = 'position:fixed;left:-99999px;top:-99999px;opacity:0;pointer-events:none';
  document.body.appendChild(c);

  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, targetW, targetH);
  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  document.body.removeChild(c);

  // Sanity check — if all pixels are zero the draw failed
  const allZero = imageData.data.every(v => v === 0);
  if (allZero) return null;

  // Try all inversion modes
  const modes = ['dontInvert', 'onlyInvert', 'attemptBoth', 'invertFirst'];
  for (const mode of modes) {
    try {
      const r = jsQR(imageData.data, targetW, targetH, { inversionAttempts: mode });
      if (r && r.data) return r.data;
    } catch (_) {}
  }
  return null;
}

function runDecode(img) {
  const nw = img.naturalWidth  || img.width  || 0;
  const nh = img.naturalHeight || img.height || 0;
  if (!nw || !nh) return null;

  // Try at multiple scales — sometimes smaller helps jsQR
  const scales = [
    [nw, nh],                                          // natural
    scaleDown(nw, nh, 1200),                           // max 1200
    scaleDown(nw, nh, 800),                            // max 800
    scaleDown(nw, nh, 500),                            // max 500
  ].filter((s,i,arr) =>
    s[0] > 0 && s[1] > 0 &&
    arr.findIndex(x => x[0]===s[0] && x[1]===s[1]) === i  // deduplicate
  );

  for (const [w, h] of scales) {
    const result = tryDecode(img, w, h);
    if (result) return result;
  }
  return null;
}

function scaleDown(w, h, max) {
  if (w <= max && h <= max) return [w, h];
  const r = Math.min(max / w, max / h);
  return [Math.round(w * r), Math.round(h * r)];
}

/* ── Decode button ── */
decodeBtn.addEventListener('click', () => {
  if (!scanDataURL) return;

  decodeBtn.disabled = true;
  decodeBtn.textContent = 'Decoding…';

  const img = new Image();

  img.onload = () => {
    const result = runDecode(img);

    if (result) {
      showSuccess(result);
    } else {
      showError();
    }

    decodeBtn.disabled = false;
    decodeBtn.innerHTML =
      `<span class="ripple"></span>
       <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style="flex-shrink:0">
         <circle cx="6.5" cy="6.5" r="4.5" stroke="white" stroke-width="1.8" fill="none"/>
         <path d="M10 10l3.5 3.5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
       </svg>
       Decode QR Code`;
  };

  img.onerror = () => {
    toast('Could not load the image file.', 'error');
    decodeBtn.disabled = false;
    decodeBtn.innerHTML = '<span class="ripple"></span>Decode QR Code';
  };

  img.src = scanDataURL;
});

/* ════════════════════════════════════════
   ── CAMERA SCANNER ──
════════════════════════════════════════ */
(function () {
  const camStartBtn   = document.getElementById('camStartBtn');
  const camStopBtn    = document.getElementById('camStopBtn');
  const camTorchBtn   = document.getElementById('camTorchBtn');
  const camViewport   = document.getElementById('camViewport');
  const camIdle       = document.getElementById('camIdle');
  const camStatusDot  = document.getElementById('camStatusDot');
  const camStatusText = document.getElementById('camStatusText');
  const camResultBox  = document.getElementById('camResultBox');
  const camResultBadge= document.getElementById('camResultBadge');
  const camCopyBtn    = document.getElementById('camCopyBtn');

  let html5QrScanner = null;
  let torchOn        = false;
  let torchSupported = false;
  let lastScan       = '';

  /* ── Status helper ── */
  function setStatus(msg, state) {
    camStatusText.textContent = msg;
    camStatusDot.className    = 'cam-status-dot' + (state ? ` ${state}` : '');
  }

  /* ── Show camera result ── */
  function showCamSuccess(data) {
    if (data === lastScan) return;   // avoid repeating same scan
    lastScan = data;

    camResultBox.className = 'result-box success';
    camResultBadge.className = 'result-badge ok';
    camResultBadge.textContent = '✓ Decoded';
    camResultBadge.classList.remove('hidden');

    const isURL   = /^https?:\/\//i.test(data);
    const isEmail = /^mailto:/i.test(data) || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data) && !data.includes(' '));
    const isWifi  = /^WIFI:/i.test(data);
    const isPhone = /^tel:/i.test(data) || /^\+?[\d\s\-()]{7,}$/.test(data);

    let tagClass = 'text', tagLabel = 'Text';
    if (isURL)        { tagClass = 'url';   tagLabel = 'URL';   }
    else if (isEmail) { tagClass = 'email'; tagLabel = 'Email'; }
    else if (isWifi)  { tagClass = 'wifi';  tagLabel = 'WiFi';  }
    else if (isPhone) { tagClass = 'phone'; tagLabel = 'Phone'; }

    const safe    = data.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const display = isURL ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>` : safe;

    camResultBox.innerHTML = `
      <div class="decoded-wrap">
        <div class="type-tag ${tagClass}">${tagLabel}</div>
        <div class="decoded-data cam-decoded">${display}</div>
      </div>`;

    setStatus('QR code scanned!', 'success');
    toast('Camera scan successful!', 'success');

    // Auto-stop the camera after a successful scan
    setTimeout(() => stopCamera(), 800);
  }

  /* ── Reset camera result ── */
  function resetCamResult() {
    lastScan = '';
    camResultBox.className = 'result-box';
    camResultBadge.classList.add('hidden');
    camResultBox.innerHTML = `
      <div class="result-idle">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <rect x="9"  y="9"  width="22" height="22" rx="3" stroke="var(--border-2)" stroke-width="2" fill="none"/>
          <rect x="13" y="13" width="14" height="14" rx="2" fill="var(--border)" opacity=".6"/>
          <rect x="41" y="9"  width="22" height="22" rx="3" stroke="var(--border-2)" stroke-width="2" fill="none"/>
          <rect x="45" y="13" width="14" height="14" rx="2" fill="var(--border)" opacity=".6"/>
          <rect x="9"  y="41" width="22" height="22" rx="3" stroke="var(--border-2)" stroke-width="2" fill="none"/>
          <rect x="13" y="45" width="14" height="14" rx="2" fill="var(--border)" opacity=".6"/>
          <rect x="41" y="41" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
          <rect x="54" y="41" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
          <rect x="41" y="54" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
          <rect x="54" y="54" width="9"  height="9"  rx="2" fill="var(--border)" opacity=".6"/>
        </svg>
        <p class="ri-title">No scan yet</p>
        <p class="ri-sub">Start the camera and point it at a QR code.</p>
      </div>`;
  }

  /* ── Detect torch support after camera starts ── */
  async function detectTorch() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const track  = stream.getVideoTracks()[0];
      const caps   = track.getCapabilities ? track.getCapabilities() : {};
      torchSupported = !!(caps.torch);
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      torchSupported = false;
    }
    if (torchSupported) {
      camTorchBtn.classList.remove('hidden');
    }
  }

  /* ── Start camera ── */
  async function startCamera() {
    camStartBtn.disabled = true;
    setStatus('Requesting camera…', '');

    try {
      if (!window.Html5Qrcode) throw new Error('html5-qrcode library not loaded.');

      html5QrScanner = new Html5Qrcode('camReader', { verbose: false });

      const config = {
        fps: 12,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.333,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      };

      await html5QrScanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => { showCamSuccess(decodedText); },
        () => {}   // silence per-frame errors
      );

      /* UI: scanning state */
      camIdle.classList.add('hidden');
      camViewport.classList.add('scanning');
      camStartBtn.classList.add('hidden');
      camStopBtn.classList.remove('hidden');
      setStatus('Scanning — point at a QR code', 'active');

      await detectTorch();

    } catch (err) {
      setStatus('Camera error — check permissions', 'error');
      toast('Camera access denied or unavailable.', 'error');
      console.warn('[CamScanner]', err);
      camStartBtn.disabled = false;
    }
  }

  /* ── Stop camera ── */
  async function stopCamera() {
    camStopBtn.disabled = true;
    try {
      if (html5QrScanner) {
        await html5QrScanner.stop();
        html5QrScanner.clear();
        html5QrScanner = null;
      }
    } catch (_) {}

    camViewport.classList.remove('scanning');
    camIdle.classList.remove('hidden');
    camStartBtn.classList.remove('hidden');
    camStartBtn.disabled = false;
    camStopBtn.classList.add('hidden');
    camStopBtn.disabled = false;
    camTorchBtn.classList.add('hidden');
    camTorchBtn.classList.remove('torch-on');
    torchOn = false;
    torchSupported = false;
    setStatus('Ready to scan', '');
  }

  /* ── Torch toggle ── */
  async function toggleTorch() {
    if (!html5QrScanner || !torchSupported) return;
    try {
      torchOn = !torchOn;
      await html5QrScanner.applyVideoConstraints({ advanced: [{ torch: torchOn }] });
      camTorchBtn.classList.toggle('torch-on', torchOn);
      toast(torchOn ? 'Flashlight on' : 'Flashlight off', 'default');
    } catch (_) {
      toast('Flashlight not supported on this device.', 'warn');
      torchOn = false;
      camTorchBtn.classList.remove('torch-on');
    }
  }

  /* ── Copy camera result ── */
  camCopyBtn.addEventListener('click', () => {
    const el = document.querySelector('.cam-decoded');
    if (!el || !el.textContent.trim()) {
      toast('Nothing to copy!', 'warn');
      return;
    }
    navigator.clipboard.writeText(el.textContent.trim())
      .then(() => toast('Camera result copied!', 'success'))
      .catch(() => toast('Failed to copy.', 'error'));
  });

  /* ── Stop camera when switching away from Camera tab ── */
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab !== 'camera' && html5QrScanner) {
        stopCamera();
      }
    });
  });

  camStartBtn.addEventListener('click', startCamera);
  camStopBtn.addEventListener('click',  stopCamera);
  camTorchBtn.addEventListener('click', toggleTorch);
})();

/* ════════════════════════════════════════
   HOME CARD NAVIGATION
════════════════════════════════════════ */
document.querySelectorAll('.home-card').forEach(card => {
  function activateCard() {
    const tab = card.dataset.tab;
    switchTab(tab);
    // Instant scroll to top — smooth scroll is unreliable on iOS Safari
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Auto-start camera when opening camera tab from home card
    if (tab === 'camera') {
      setTimeout(() => {
        const btn = document.getElementById('camStartBtn');
        if (btn && !btn.classList.contains('hidden')) btn.click();
      }, 300);
    }
  }

  // touchstart fires immediately on mobile (no 300ms tap delay)
  card.addEventListener('touchstart', function(e) {
    e.stopPropagation();
    activateCard();
  }, { passive: true });

  // click handles desktop and acts as fallback on mobile
  card.addEventListener('click', function(e) {
    e.stopPropagation();
    activateCard();
  });
});

/* ════════════════════════════════════════
   INIT — always open home page
════════════════════════════════════════ */
// Strip any active class from all tab-pages first (safety), then show home
tabPages.forEach(p => p.classList.remove('active'));
navItems.forEach(n => n.classList.remove('active'));
switchTab('home');
