// toolkit.js — operator panel for the lander's chat scene.
// Clear chat empties the #feed thread; Chat types a superbot message with a
// selectable fade-in typewriter effect; the font editor restyles the thread
// live. Plain DOM, no dependencies, persists its settings in localStorage.

const STORE = 'tk-settings-v1';

// ---- the font library -----------------------------------------------------
// system: macOS stock faces (on other OSes a pill falls back to the system
// face - previews are honest only on a Mac). brands: famous marks mapped to
// their real face where it is freely available, else the closest free cut.
// web: the wider Google Fonts shelf. One <link> per family, display=swap -
// a face downloads only when it is actually rendered, so the long list is
// cheap until used, and one missing family can never break the others.

const SANS = 'sans-serif';
const FONTS_SYSTEM = [
  ['System UI (this OS)', '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'],
  ['SF Pro Rounded (Ask Superbot)', '"SF Pro Rounded", "SF Pro Display", -apple-system, system-ui, sans-serif'],
  ['SF Pro Display', '"SF Pro Display", -apple-system, sans-serif'],
  ['SF Pro Text', '"SF Pro Text", -apple-system, sans-serif'],
  ['superbot.gg wordmark', '"SF Pro Rounded", "SF Pro Display", -apple-system, system-ui, sans-serif'],
  ['New York (ui-serif)', 'ui-serif, "New York", Georgia, serif'],
  ['SF Mono (page mono)', 'ui-monospace, "SF Mono", Menlo, monospace'],
  ['Menlo', 'Menlo, "Bitstream Vera Sans Mono", monospace'],
  ['Helvetica', 'Helvetica, "Helvetica Neue", Arial, sans-serif'],
  ['Helvetica Neue', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['Arial', 'Arial, Helvetica, sans-serif'],
  ['Arial Black', '"Arial Black", Arial, sans-serif'],
  ['Arial Narrow', '"Arial Narrow", Arial, sans-serif'],
  ['Avenir', 'Avenir, "Avenir Next", sans-serif'],
  ['Avenir Next', '"Avenir Next", Avenir, sans-serif'],
  ['Avenir Next Condensed', '"Avenir Next Condensed", "Avenir Next", sans-serif'],
  ['Futura', 'Futura, "Century Gothic", sans-serif'],
  ['Futura Condensed ExtraBold', '"Futura Condensed ExtraBold", Futura, sans-serif'],
  ['Gill Sans', '"Gill Sans", "Gill Sans MT", sans-serif'],
  ['Optima', 'Optima, Candara, sans-serif'],
  ['Verdana', 'Verdana, Geneva, sans-serif'],
  ['Trebuchet MS', '"Trebuchet MS", Tahoma, sans-serif'],
  ['Impact', 'Impact, "Arial Black", sans-serif'],
  ['Georgia', 'Georgia, "Times New Roman", serif'],
  ['Times New Roman', '"Times New Roman", Times, serif'],
  ['Palatino', 'Palatino, "Palatino Linotype", "Book Antiqua", serif'],
  ['Baskerville', 'Baskerville, "Baskerville Old Face", serif'],
  ['Big Caslon', '"Big Caslon", "Baskerville Old Face", serif'],
  ['Bodoni 72', '"Bodoni 72", Didot, serif'],
  ['Didot', 'Didot, "Bodoni MT", serif'],
  ['Hoefler Text', '"Hoefler Text", Georgia, serif'],
  ['Rockwell', 'Rockwell, "Courier Bold", serif'],
  ['Superclarendon', '"Superclarendon", "Clarendon", Georgia, serif'],
  ['Charter', 'Charter, "Bitstream Charter", Georgia, serif'],
  ['Kefa', 'Kefa, Georgia, serif'],
  ['Galvji', 'Galvji, "Avenir Next", sans-serif'],
  ['Skia', 'Skia, "Avenir Next", sans-serif'],
  ['DIN Alternate', '"DIN Alternate", Futura, sans-serif'],
  ['DIN Condensed', '"DIN Condensed", "DIN Alternate", sans-serif'],
  ['Copperplate', 'Copperplate, "Copperplate Gothic Bold", sans-serif'],
  ['American Typewriter', '"American Typewriter", "Courier New", monospace'],
  ['Andale Mono', '"Andale Mono", "Courier New", monospace'],
  ['Chalkboard SE', '"Chalkboard SE", "Comic Sans MS", cursive'],
  ['Chalkduster', 'Chalkduster, "Chalkboard SE", cursive'],
  ['Marker Felt', '"Marker Felt", "Comic Sans MS", cursive'],
  ['Noteworthy', 'Noteworthy, "Marker Felt", cursive'],
  ['Bradley Hand', '"Bradley Hand", "Comic Sans MS", cursive'],
  ['Brush Script MT', '"Brush Script MT", cursive'],
  ['Trattatello', 'Trattatello, "Marker Felt", cursive'],
  ['Papyrus', 'Papyrus, fantasy'],
  ['Luminari', 'Luminari, fantasy'],
  ['Apple Chancery', '"Apple Chancery", cursive'],
  ['Snell Roundhand', '"Snell Roundhand", cursive'],
  ['Savoye LET', '"Savoye LET", cursive'],
  ['SignPainter', 'SignPainter, "Snell Roundhand", cursive'],
  ['Grand Hotel', '"Grand Hotel", cursive'],
  ['Party LET', '"Party LET", cursive'],
  ['Zapfino', 'Zapfino, cursive'],
];

const FONTS_BRANDS = [
  ['Netflix · Bebas Neue', '"Bebas Neue", Impact, sans-serif'],
  ['Vercel · Geist', '"Geist", -apple-system, sans-serif'],
  ['IBM · Plex Sans', '"IBM Plex Sans", Helvetica, sans-serif'],
  ['YouTube · Roboto', 'Roboto, Arial, sans-serif'],
  ['Stripe · Inter', 'Inter, -apple-system, sans-serif'],
  ['Tesla · Montserrat', 'Montserrat, Futura, sans-serif'],
  ['Spotify · DM Sans', '"DM Sans", Circular, sans-serif'],
  ['Meta · Figtree', 'Figtree, -apple-system, sans-serif'],
  ['Uber · Archivo', 'Archivo, -apple-system, sans-serif'],
  ['Amazon · Open Sans', '"Open Sans", Arial, sans-serif'],
  ['Airbnb · Nunito Sans', '"Nunito Sans", -apple-system, sans-serif'],
  ['NYT masthead · UnifrakturCook', '"UnifrakturCook", serif'],
  ['Disney · Pacifico', 'Pacifico, cursive'],
];

const FONTS_WEB = [
  ['Inter Tight', '"Inter Tight", -apple-system, sans-serif'],
  ['Manrope', 'Manrope, -apple-system, sans-serif'],
  ['Space Grotesk', '"Space Grotesk", -apple-system, sans-serif'],
  ['Outfit', 'Outfit, -apple-system, sans-serif'],
  ['Urbanist', 'Urbanist, -apple-system, sans-serif'],
  ['Plus Jakarta Sans', '"Plus Jakarta Sans", -apple-system, sans-serif'],
  ['Lexend', 'Lexend, -apple-system, sans-serif'],
  ['Sora', 'Sora, -apple-system, sans-serif'],
  ['Work Sans', '"Work Sans", -apple-system, sans-serif'],
  ['Rubik', 'Rubik, -apple-system, sans-serif'],
  ['Raleway', 'Raleway, -apple-system, sans-serif'],
  ['Public Sans', '"Public Sans", -apple-system, sans-serif'],
  ['Source Sans 3', '"Source Sans 3", -apple-system, sans-serif'],
  ['Fira Sans', '"Fira Sans", -apple-system, sans-serif'],
  ['Oswald', 'Oswald, Impact, sans-serif'],
  ['Barlow Condensed', '"Barlow Condensed", -apple-system, sans-serif'],
  ['Roboto Condensed', '"Roboto Condensed", -apple-system, sans-serif'],
  ['JetBrains Mono', '"JetBrains Mono", Menlo, monospace'],
  ['IBM Plex Mono', '"IBM Plex Mono", Menlo, monospace'],
  ['Fira Code', '"Fira Code", Menlo, monospace'],
  ['Space Mono', '"Space Mono", Menlo, monospace'],
  ['Roboto Mono', '"Roboto Mono", Menlo, monospace'],
  ['Playfair Display', '"Playfair Display", Georgia, serif'],
  ['Merriweather', 'Merriweather, Georgia, serif'],
  ['EB Garamond', '"EB Garamond", Georgia, serif'],
  ['Fraunces', 'Fraunces, Georgia, serif'],
  ['Spectral', 'Spectral, Georgia, serif'],
  ['Instrument Serif', '"Instrument Serif", Georgia, serif'],
  ['Anton', 'Anton, Impact, sans-serif'],
  ['Archivo Black', '"Archivo Black", Impact, sans-serif'],
  ['Lobster', 'Lobster, cursive'],
  ['Dancing Script', '"Dancing Script", cursive'],
  ['Josefin Sans', '"Josefin Sans", sans-serif'],
  ['Quicksand', 'Quicksand, sans-serif'],
  ['Comfortaa', 'Comfortaa, sans-serif'],
];

// [Google Fonts family, css2 weight list] - discrete lists only, so a family
// serves exactly the weights it publishes.
const WEB_FAMILIES = [
  ['Inter Tight', '100;200;300;400;500;600;700;800;900'],
  ['Inter', '100;200;300;400;500;600;700;800;900'],
  ['Manrope', '200;300;400;500;600;700;800'],
  ['Space Grotesk', '300;400;500;600;700'],
  ['Outfit', '100;200;300;400;500;600;700;800;900'],
  ['Urbanist', '100;200;300;400;500;600;700;800;900'],
  ['Plus Jakarta Sans', '200;300;400;500;600;700;800'],
  ['Lexend', '100;200;300;400;500;600;700;800;900'],
  ['Sora', '100;200;300;400;500;600;700;800'],
  ['Work Sans', '100;200;300;400;500;600;700;800;900'],
  ['Rubik', '300;400;500;600;700;800;900'],
  ['Raleway', '100;200;300;400;500;600;700;800;900'],
  ['Public Sans', '100;200;300;400;500;600;700;800;900'],
  ['Source Sans 3', '200;300;400;500;600;700;800;900'],
  ['Fira Sans', '100;200;300;400;500;600;700;800;900'],
  ['Oswald', '200;300;400;500;600;700'],
  ['Barlow Condensed', '100;200;300;400;500;600;700;800;900'],
  ['Roboto', '100;200;300;400;500;600;700;800;900'],
  ['Roboto Condensed', '100;200;300;400;500;600;700;800;900'],
  ['Roboto Mono', '100;200;300;400;500;600;700'],
  ['JetBrains Mono', '100;200;300;400;500;600;700;800'],
  ['IBM Plex Mono', '100;200;300;400;500;600;700'],
  ['Fira Code', '300;400;500;600;700'],
  ['Space Mono', '400;700'],
  ['Playfair Display', '400;500;600;700;800;900'],
  ['Merriweather', '300;400;500;600;700;800;900'],
  ['EB Garamond', '400;500;600;700;800'],
  ['Fraunces', '100;200;300;400;500;600;700;800;900'],
  ['Spectral', '200;300;400;500;600;700;800'],
  ['Instrument Serif', '400'],
  ['Bebas Neue', '400'],
  ['Anton', '400'],
  ['Archivo Black', '400'],
  ['Archivo', '100;200;300;400;500;600;700;800;900'],
  ['Montserrat', '100;200;300;400;500;600;700;800;900'],
  ['DM Sans', '100;200;300;400;500;600;700;800;900;1000'],
  ['Figtree', '300;400;500;600;700;800;900'],
  ['Open Sans', '300;400;500;600;700;800'],
  ['Nunito Sans', '200;300;400;500;600;700;800;900;1000'],
  ['IBM Plex Sans', '100;200;300;400;500;600;700'],
  ['Geist', '100;200;300;400;500;600;700;800;900'],
  ['Pacifico', '400'],
  ['UnifrakturCook', '700'],
];

const FONT_GROUPS = [
  ['system · this mac', FONTS_SYSTEM],
  ['brands', FONTS_BRANDS],
  ['web · google fonts', FONTS_WEB],
];

let webFontsLinked = false;
function linkWebFonts() {
  if (webFontsLinked) return;
  webFontsLinked = true;
  for (const [family, wghts] of WEB_FAMILIES) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${wghts}&display=swap`;
    document.head.append(link);
  }
}

const EFFECTS = [
  ['fade', 'Fade (clean typewriter)'],
  ['blur', 'Blur fade'],
  ['slide', 'Slide-up fade'],
  ['scale', 'Scale fade'],
  ['word', 'Word fade'],
  ['instant', 'Instant (hard) typewriter'],
];

const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
  'ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
  'duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.',
  'sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  'nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur.',
  'at vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.',
];

const SWATCHES = [
  ['#e6e6ea', 'default'],
  ['#5b8cff', 'accent'],
  ['#43d17c', 'green'],
  ['#ffab5e', 'orange'],
  ['#ff7ad9', 'pink'],
  ['#ffffff', 'white'],
];

const settings = Object.assign(
  { font: FONTS_SYSTEM[0][1], size: 13, weight: 400, italic: false, spacing: 0, lineHeight: 1.5, color: '', effect: 'fade', msPerChar: 26, fadeMs: 220, bold: false, recent: [] },
  JSON.parse(localStorage.getItem(STORE) || '{}'),
);

let typing = null; // { timer, caret, done }

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids) el.append(kid);
  return el;
}

function save() { localStorage.setItem(STORE, JSON.stringify(settings)); }

function feed() { return document.querySelector('#feed'); }

function applyFont() {
  const f = feed();
  if (!f) return;
  f.classList.add('tk-font');
  f.style.setProperty('--tk-ff', settings.font);
  f.style.setProperty('--tk-fs', settings.size + 'px');
  f.style.setProperty('--tk-fw', settings.bold ? 700 : settings.weight);
  f.style.setProperty('--tk-fst', settings.italic ? 'italic' : 'normal');
  f.style.setProperty('--tk-ls', settings.spacing + 'px');
  f.style.setProperty('--tk-lh', settings.lineHeight);
  f.style.setProperty('--tk-col', settings.color || 'inherit');
}

function applyEffectClass() {
  const f = feed();
  if (!f) return;
  f.className = f.className.replace(/tk-eff-\w+/g, '').trim();
  f.classList.add('tk-eff-' + settings.effect);
  f.style.setProperty('--tk-fade', settings.fadeMs + 'ms');
}

function stopTyping() {
  if (!typing) return;
  clearTimeout(typing.timer);
  typing = null;
}

function nowLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

function typeLorem() {
  const f = feed();
  if (!f) return;
  stopTyping();
  applyFont();
  applyEffectClass();

  const template = [...f.querySelectorAll('.msg')].pop();
  const msg = template
    ? template.cloneNode(true)
    : h('div', { class: 'msg' });
  if (!template) {
    // same shape as the origin's own message markup (document-relative img)
    msg.innerHTML = '<span class="avatar sb"><img src="site/assets/brand/mark-clean.svg" alt=""/></span>'
      + '<div class="m-main"><div class="m-head"><span class="m-name">superbot</span>'
      + '<span class="app">APP</span><span class="m-when"></span></div><div class="m-text"></div></div>';
  }
  msg.removeAttribute('data-m');
  msg.querySelectorAll('.m-when').forEach(e => { e.textContent = nowLabel(); });
  const text = msg.querySelector('.m-text');
  if (!text) return;
  text.innerHTML = '';
  // the scene's CSS starts .msg at opacity 0 and only the animation timeline
  // reveals the two static ones; a runtime message must reveal itself.
  msg.style.opacity = '1';
  msg.style.animation = 'none';
  f.append(msg);

  const body = LOREM[Math.floor(Math.random() * LOREM.length)];
  const eff = settings.effect;
  const chars = [];
  if (eff === 'word') {
    let w = 0;
    for (const token of body.split(/(?<=\s)/)) {
      for (const ch of token) {
        const span = h('span', { class: 'tk-ch' }, ch);
        span.style.transitionDelay = `calc(${w} * ${settings.msPerChar}ms)`;
        text.append(span);
        chars.push(span);
      }
      w++;
    }
  } else {
    for (const [i, ch] of [...body].entries()) {
      const span = h('span', { class: 'tk-ch' }, ch);
      if (eff === 'instant') span.style.transitionDelay = '0ms';
      else span.style.transitionDelay = `calc(${i} * ${settings.msPerChar}ms)`;
      text.append(span);
      chars.push(span);
    }
  }
  if (f.scrollTop !== undefined) f.scrollTop = f.scrollHeight;

  // one class flip on the feed runs every char's transition on its own delay.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const c of chars) c.classList.add('on');
  }));
  typing = {
    timer: setTimeout(() => {
      typing = null;
    }, Math.max(body.length * settings.msPerChar + settings.fadeMs + 120, 400)),
  };
}

function clearChat() {
  stopTyping();
  const f = feed();
  if (!f) return;
  f.querySelectorAll('.msg, .date-div').forEach(e => e.remove());
}

// --- recording: region-capture the chat column, save a clean-named file ---
let recording = null; // { rec, btn }

function stopRecording() {
  if (!recording) return;
  recording.rec.stop();
  recording.btn.textContent = 'Record chat';
  recording.btn.classList.remove('recording');
  recording = null;
}

async function startRecording(btn) {
  const target = document.querySelector('.main.inner');
  if (!navigator.mediaDevices?.getDisplayMedia) { btn.textContent = 'no capture support'; setTimeout(() => { btn.textContent = 'Record chat'; }, 2000); return; }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 }, audio: false,
    preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'exclude',
  });
  const track = stream.getVideoTracks()[0];
  // Region Capture (Chrome 116+): crop the shared tab to exactly the chat panel
  if (target && 'CropTarget' in window) {
    try { await track.cropTo(await CropTarget.fromElement(target)); } catch { /* fall back to full-tab */ }
  }
  const mimes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  const mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `superbot-chat-${stamp}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  track.addEventListener('ended', stopRecording);
  rec.start(250);
  recording = { rec, btn };
  btn.textContent = 'Stop recording';
  btn.classList.add('recording');
}

function toggleRecording(e) {
  const btn = e.currentTarget;
  if (recording) stopRecording();
  else startRecording(btn).catch(() => { btn.textContent = 'Record chat'; btn.classList.remove('recording'); });
}

// --- screenshot all: one PNG per recent font, caption burned at the bottom ---
const SHOT_LENGTHS = [
  ['short', 'sure. syncing now.'],
  ['medium', 'nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos.'],
  ['long', LOREM[0] + ' ' + LOREM[1]],
  ['xlong', LOREM[0] + ' ' + LOREM[2] + ' ' + LOREM[4] + ' ' + LOREM[5]],
];

function fontLabelOf(stack) {
  for (const [, fonts] of FONT_GROUPS) {
    const hit = fonts.find(([, s]) => s === stack);
    if (hit) return hit[0];
  }
  return 'custom';
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

// minimal store-only ZIP (PNGs are already compressed) so all shots arrive as
// ONE download - Chrome blocks multiple programmatic downloads per gesture.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeZip(files) { // files: [{ name, data: Uint8Array }]
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBytes = enc.encode(name), crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);
    central.push({ nameBytes, crc, size: data.length, offset });
    offset += local.length + data.length;
  }
  const cdStart = offset;
  for (const { nameBytes, crc, size, offset: o } of central) {
    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, o, true);
    cd.set(nameBytes, 46);
    chunks.push(cd);
    offset += cd.length;
  }
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, offset - cdStart, true); ev.setUint32(16, cdStart, true);
  chunks.push(eocd);
  const out = new Uint8Array(offset + 22);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

async function screenshotAll(btn) {
  const targets = ((settings.recent || []).length ? settings.recent : [settings.font]).slice(0, 4);
  const orig = { font: settings.font, weight: settings.weight, bold: settings.bold, spacing: settings.spacing };
  const origText = btn.textContent;
  btn.disabled = true;
  if (!window.html2canvas) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'site/assets/html2canvas.min.js';
      s.onload = res; s.onerror = rej;
      document.head.append(s);
    }).catch(() => {});
  }
  if (!window.html2canvas) { btn.textContent = 'rasterizer failed'; setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2000); return; }

  const panel = document.querySelector('.main.inner');
  const cap = h('div', { class: 'tk-cap' });
  panel.append(cap);
  const weight = orig.bold ? 700 : orig.weight;
  // html2canvas mis-measures text with non-zero letter-spacing; shots are
  // taken at 0 and the operator's spacing is restored after.
  settings.spacing = 0;
  const shots = [];
  try {
    for (let i = 0; i < targets.length; i++) {
      const stack = targets[i];
      settings.font = stack;
      applyFont();
      // fresh thread with one instant message of this shot's length
      clearChat();
      const f = feed();
      const msg = h('div', { class: 'msg', style: 'opacity:1;animation:none;' });
      msg.innerHTML = '<span class="avatar sb"><img src="site/assets/brand/mark-clean.svg" alt=""/></span>'
        + '<div class="m-main"><div class="m-head"><span class="m-name">superbot</span><span class="app">APP</span>'
        + `<span class="m-when">${nowLabel()}</span></div><div class="m-text"></div></div>`;
      msg.querySelector('.app').style.cssText = 'background:#2f6bff;color:#fff;font-weight:700;border-radius:5px;padding:1px 5px;font-size:9px;';
      const [lenTag, text] = SHOT_LENGTHS[i % SHOT_LENGTHS.length];
      msg.querySelector('.m-text').textContent = text;
      f.append(msg);
      const label = fontLabelOf(stack);
      cap.textContent = `${label} · weight ${weight} · ${lenTag}`;
      // force the exact face at the exact weight to load before rasterizing
      const first = stack.split(',')[0].replace(/["']/g, '').trim();
      if (first && !first.startsWith('-apple') && !first.startsWith('ui-')) {
        try { await document.fonts.load(`${weight} 16px "${first}"`, text); } catch { /* best effort */ }
      }
      await document.fonts.ready;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      btn.textContent = `shooting ${i + 1}/${targets.length}`;
      const canvas = await window.html2canvas(panel, { scale: 2, backgroundColor: '#0c0c0e', logging: false, useCORS: true });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      shots.push({
        name: `chat-${String(i + 1).padStart(2, '0')}-${slug(label)}-w${weight}.png`,
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    }
    const zipBlob = new Blob([makeZip(shots)], { type: 'application/zip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `chat-shots-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  } finally {
    cap.remove();
    Object.assign(settings, orig);
    applyFont();
    save();
    btn.textContent = origText;
    btn.disabled = false;
  }
}

function buildPanel() {
  const slider = (key, label, min, max, step, unit) => {
    const val = h('span', { class: 'tk-val' }, settings[key] + (unit || ''));
    const input = h('input', { type: 'range', min, max, step, value: settings[key], oninput: () => {
      settings[key] = Number(input.value);
      val.textContent = input.value + (unit || '');
      if (key === 'msPerChar') { /* engine reads it per run */ }
      applyFont();
      save();
    } });
    return h('div', { class: 'tk-cfg' }, h('span', { class: 'tk-label' }, label), input, val);
  };

  // font options as pills across the three shelves; each label previews its own face
  const fontPills = [];
  const selectFont = (stack, btn) => {
    settings.font = stack;
    settings.recent = [stack, ...(settings.recent || []).filter(s => s !== stack)].slice(0, 4);
    fontPills.forEach(p => { if (p.classList?.contains('tk-fp')) p.classList.toggle('sel', p === btn); });
    applyFont();
    save();
  };
  for (const [label, fonts] of FONT_GROUPS) {
    fontPills.push(h('span', { class: 'tk-glabel' }, label));
    for (const [name, stack] of fonts) {
      fontPills.push(h('button', {
        class: 'tk-fp' + (settings.font === stack ? ' sel' : ''),
        style: `font-family:${stack}`,
        'data-tk': 'font',
        onclick: e => selectFont(stack, e.currentTarget),
      }, name));
    }
  }

  const effSel = h('select', { onchange: () => { settings.effect = effSel.value; applyEffectClass(); save(); } },
    ...EFFECTS.map(([id, name]) => h('option', { value: id }, name)));
  effSel.value = settings.effect;

  // weight shelf: 100-900 as pills; the bold checkbox stays as an alias for 700
  const weightPills = [100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => {
    const b = h('button', {
      class: 'tk-fp tk-w' + ((settings.bold ? 700 : settings.weight) === w ? ' sel' : ''),
      'data-tk': 'weight',
      onclick: () => {
        settings.weight = w;
        settings.bold = w === 700;
        boldBox.checked = settings.bold;
        weightPills.forEach(x => x.classList.toggle('sel', x === b));
        applyFont();
        save();
      },
    }, String(w));
    return b;
  });

  const boldBox = h('input', { type: 'checkbox', onchange: () => { settings.bold = boldBox.checked; if (settings.bold) weightSel.value = '700'; applyFont(); save(); } });
  boldBox.checked = settings.bold;
  const italicBox = h('input', { type: 'checkbox', onchange: () => { settings.italic = italicBox.checked; applyFont(); save(); } });
  italicBox.checked = settings.italic;

  const colorInput = h('input', { type: 'color', value: settings.color || '#e6e6ea', oninput: () => {
    settings.color = colorInput.value;
    swEls.forEach(s => s.classList.remove('sel'));
    applyFont();
    save();
  } });

  const swEls = SWATCHES.map(([c]) => h('button', { class: 'tk-sw' + (settings.color === c ? ' sel' : ''), style: `background:${c}`, 'data-c': c, onclick: () => {
    settings.color = c === '#e6e6ea' ? '' : c;
    swEls.forEach(s => s.classList.toggle('sel', s.getAttribute('data-c') === c));
    applyFont();
    save();
  } }));

  const panel = h('div', { class: 'tk', 'data-tk': 'panel' },
    h('div', { class: 'tk-head', onclick: () => panel.classList.toggle('folded') },
      h('span', { class: 'tk-dot' }),
      h('span', { class: 'tk-title' }, 'scene toolkit'),
      h('span', { class: 'tk-fold' }, '–')),
    h('div', { class: 'tk-body' },
      h('div', { class: 'tk-row' },
        h('button', { class: 'tk-btn danger', 'data-tk': 'clear', onclick: clearChat }, 'Clear chat'),
        h('button', { class: 'tk-btn primary', 'data-tk': 'chat', onclick: typeLorem }, 'Chat')),
      h('div', { class: 'tk-row' },
        h('button', { class: 'tk-btn', 'data-tk': 'record', onclick: toggleRecording }, 'Record chat')),
      h('div', { class: 'tk-row' },
        h('button', { class: 'tk-btn', 'data-tk': 'shotall', onclick: e => screenshotAll(e.currentTarget) }, 'Screenshot All')),
      h('div', { class: 'tk-group' },
        h('span', { class: 'tk-label' }, 'effect'),
        effSel,
        slider('msPerChar', 'type speed', 6, 160, 1, 'ms/ch'),
        slider('fadeMs', 'fade time', 60, 1000, 10, 'ms')),
      h('div', { class: 'tk-group' },
        h('span', { class: 'tk-label' }, 'font'),
        h('div', { class: 'tk-fonts', 'data-tk': 'fonts' }, ...fontPills),
        slider('size', 'size', 10, 22, 0.5, 'px'),
        slider('spacing', 'letterspacing', -0.5, 4, 0.1, 'px'),
        slider('lineHeight', 'line height', 1.1, 2, 0.05, ''),
        h('div', { class: 'tk-group' },
          h('span', { class: 'tk-label' }, 'weight'),
          h('div', { class: 'tk-fonts tk-weights' }, ...weightPills)),
        h('div', { class: 'tk-grid2' },
          h('div', { class: 'tk-group' }, h('span', { class: 'tk-label' }, 'color'), colorInput)),
        h('div', { class: 'tk-row' },
          h('label', { class: 'tk-check' }, boldBox, 'bold'),
          h('label', { class: 'tk-check' }, italicBox, 'italic')),
        h('div', { class: 'tk-swatches' }, ...swEls))));
  return panel;
}

function mount() {
  if (!document.querySelector('#feed')) { setTimeout(mount, 300); return; }
  linkWebFonts();
  document.body.append(buildPanel());
  applyFont();
  applyEffectClass();
}

mount();
