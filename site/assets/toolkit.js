// toolkit.js — operator panel for the lander's chat scene.
// Clear chat empties the #feed thread; Chat types a superbot message with a
// selectable fade-in typewriter effect; the font editor restyles the thread
// live. Plain DOM, no dependencies, persists its settings in localStorage.

const STORE = 'tk-settings-v1';

// One batched Google Fonts request covers every (web) entry; injected on mount,
// display=swap so text never blocks. Stock faces below need nothing.
const WEB_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800'
  + '&family=Space+Grotesk:wght@400;500;600;700'
  + '&family=Archivo:wght@400;500;600;700;800'
  + '&family=Manrope:wght@400;500;600;700;800'
  + '&family=Oswald:wght@400;500;600;700'
  + '&family=Barlow+Condensed:wght@400;500;600;700;800'
  + '&family=Roboto+Condensed:wght@400;500;600;700;800&display=swap';

const FONTS = [
  ['System UI (this OS)', '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'],
  ['SF Pro Rounded (Ask Superbot)', '"SF Pro Rounded", "SF Pro Display", -apple-system, system-ui, sans-serif'],
  ['SF Pro Display', '"SF Pro Display", -apple-system, sans-serif'],
  ['SF Pro Text', '"SF Pro Text", -apple-system, sans-serif'],
  ['SF Mono (page mono)', 'ui-monospace, "SF Mono", Menlo, monospace'],
  ['Menlo', 'Menlo, "Bitstream Vera Sans Mono", monospace'],
  ['Courier New', '"Courier New", Courier, monospace'],
  ['American Typewriter', '"American Typewriter", "Courier New", monospace'],
  ['Helvetica Neue', '"Helvetica Neue", Helvetica, Arial, sans-serif'],
  ['Arial', 'Arial, Helvetica, sans-serif'],
  ['Avenir Next', '"Avenir Next", Avenir, sans-serif'],
  ['Futura', 'Futura, "Century Gothic", sans-serif'],
  ['Gill Sans', '"Gill Sans", "Gill Sans MT", sans-serif'],
  ['Optima', 'Optima, Candara, sans-serif'],
  ['Verdana', 'Verdana, Geneva, sans-serif'],
  ['Trebuchet MS', '"Trebuchet MS", Tahoma, sans-serif'],
  ['Georgia', 'Georgia, "Times New Roman", serif'],
  ['Times New Roman', '"Times New Roman", Times, serif'],
  ['Palatino', 'Palatino, "Palatino Linotype", "Book Antiqua", serif'],
  ['Baskerville', 'Baskerville, "Baskerville Old Face", serif'],
  ['Didot', 'Didot, "Bodoni MT", serif'],
  ['Chalkboard SE', '"Chalkboard SE", "Comic Sans MS", cursive'],
  // the tight & bold shelf: macOS stock first, then lazy web faces
  ['Avenir Next Condensed', '"Avenir Next Condensed", "Avenir Next", sans-serif'],
  ['Futura Condensed ExtraBold', '"Futura Condensed ExtraBold", Futura, sans-serif'],
  ['Arial Narrow', '"Arial Narrow", Arial, sans-serif'],
  ['Arial Black', '"Arial Black", Arial, sans-serif'],
  ['Inter Tight (web)', '"Inter Tight", -apple-system, sans-serif'],
  ['Space Grotesk (web)', '"Space Grotesk", -apple-system, sans-serif'],
  ['Archivo (web)', '"Archivo", -apple-system, sans-serif'],
  ['Manrope (web)', '"Manrope", -apple-system, sans-serif'],
  ['Oswald (web)', '"Oswald", -apple-system, sans-serif'],
  ['Barlow Condensed (web)', '"Barlow Condensed", -apple-system, sans-serif'],
  ['Roboto Condensed (web)', '"Roboto Condensed", -apple-system, sans-serif'],
];

let webFontsLinked = false;
function linkWebFonts() {
  if (webFontsLinked) return;
  webFontsLinked = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = WEB_FONTS_URL;
  document.head.append(link);
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
  { font: FONTS[0][1], size: 13, weight: 400, italic: false, spacing: 0, lineHeight: 1.5, color: '', effect: 'fade', msPerChar: 26, fadeMs: 220, bold: false },
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
  typing.caret?.remove();
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
  const caret = h('span', { class: 'tk-caret' });
  text.append(caret);
  if (f.scrollTop !== undefined) f.scrollTop = f.scrollHeight;

  // one class flip on the feed runs every char's transition on its own delay;
  // the clock only schedules the caret removal at the very end.
  const total = body.length * settings.msPerChar + settings.fadeMs + 120;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const c of chars) c.classList.add('on');
  }));
  typing = {
    caret,
    done: false,
    timer: setTimeout(() => {
      caret.remove();
      typing = null;
    }, Math.max(total, 400)),
  };
}

function clearChat() {
  stopTyping();
  const f = feed();
  if (!f) return;
  f.querySelectorAll('.msg, .date-div').forEach(e => e.remove());
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

  // font options as pills, Ask-Superbot style; each label previews its own face
  const fontPills = FONTS.map(([name, stack]) => {
    const b = h('button', {
      class: 'tk-fp' + (settings.font === stack ? ' sel' : ''),
      style: `font-family:${stack}`,
      'data-tk': 'font',
      onclick: () => {
        settings.font = stack;
        fontPills.forEach(p => p.classList.toggle('sel', p === b));
        applyFont();
        save();
      },
    }, name);
    return b;
  });

  const effSel = h('select', { onchange: () => { settings.effect = effSel.value; applyEffectClass(); save(); } },
    ...EFFECTS.map(([id, name]) => h('option', { value: id }, name)));
  effSel.value = settings.effect;

  const weightSel = h('select', { onchange: () => { settings.weight = Number(weightSel.value); settings.bold = settings.weight === 700; boldBox.checked = settings.bold; applyFont(); save(); } },
    ...[400, 500, 600, 700].map(w => h('option', { value: w }, w)));
  weightSel.value = String(settings.bold ? 700 : settings.weight);

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
        h('div', { class: 'tk-grid2' },
          h('div', { class: 'tk-group' }, h('span', { class: 'tk-label' }, 'weight'), weightSel),
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
