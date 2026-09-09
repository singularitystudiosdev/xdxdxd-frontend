// toolkit.js — operator panel for the lander's chat scene.
// Clear chat empties the #feed thread; Chat types a superbot message with a
// selectable fade-in typewriter effect; the font editor restyles the thread
// live. Plain DOM, no dependencies, persists its settings in localStorage.

const STORE = 'tk-settings-v1';

const FONTS = [
  ['System UI', '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'],
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
];

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
    : h('div', { class: 'msg' }, h('div', { class: 'm-main' }, h('div', { class: 'm-text' })));
  msg.removeAttribute('data-m');
  msg.querySelectorAll('.m-when').forEach(e => { e.textContent = nowLabel(); });
  const text = msg.querySelector('.m-text');
  if (!text) return;
  text.innerHTML = '';
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

  const fontSel = h('select', { onchange: () => { settings.font = fontSel.value; applyFont(); save(); } },
    ...FONTS.map(([name, stack]) => h('option', { value: stack }, name)));
  fontSel.value = settings.font;

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
        fontSel,
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
  document.body.append(buildPanel());
  applyFont();
  applyEffectClass();
}

mount();
