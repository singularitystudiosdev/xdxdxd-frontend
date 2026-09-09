// hub-boot: the boot-sequence hero. One requestAnimationFrame clock drives a
// 32s story (22s to the park, then act two's client tour) that then HOLDS on
// its last frame (no auto-loop, user decision 2026-09-06): the mascot parks
// beside the hub and keeps idling, and the ↻ button restarts the clock. Every
// beat is either a one-shot EVENT (fires once per run, when the clock passes
// its time) or a TWEEN (a pure function of the clock, evaluated every frame).
// Nothing is timer-based, so pausing the clock (offscreen, hidden tab) freezes
// the whole scene and resumes it exactly where it stopped.
//
// Motion is transform/opacity only. The mascot renderer is the site's own
// mascot.js; its ascii-morph crush (morphFrames) boots the face up out of a
// flat glyph row at the start and crushes it into the blob the badge springs
// from mid-story.
//
// The variants under review are CUTS, imported from hub-boot-cuts.js and picked
// with `?v=<name>` (no param = the shipped story). They are this same story with
// different behaviour after the reveal, so there are no forked files.

import { Mascot, mascotFrame, morphFrames, VARIANTS } from './mascot.js?v=13';
import { mountKeys } from './hub-keys.js?v=2';
import { CUTS, cutByName } from './hub-boot-cuts.js?v=7';

const $ = (id) => document.getElementById(id);
const stage = $('stage'), arena = $('arena'), margin = $('margin'), mascotEl = $('mascot');
const bubble = $('bubble'), bubbleText = bubble.querySelector('.t'), scan = $('scan');
const itemsEl = $('items'), badge = $('badge'), hub = $('hub');
// the beam is two paths on one `d` (a dissolving rail and the light that runs
// it) plus the two gradients whose coordinates layout() and tick() write
const beam = $('beam'), beamPath = $('beam-path'), beamRun = $('beam-run-path');
const beamFade = $('beam-fade'), beamRunGrad = $('beam-run');
const phone = $('phone'), phoneLabel = $('phone-label'), sync = $('sync'), led = $('led');

const COLS = 40, ROWS = 20; // the story runs 32s, then holds on its last frame
const REST = { eyeL: 'open', eyeR: 'open', mouth: 'smile', bob: 0, pupil: { x: 0, y: 0 } };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- the cut in play ----------
// The table lives in hub-boot-cuts.js so the contact sheet reads the same list;
// what each flag does is documented there. `?v=<name>` picks one; anything
// unknown, and no parameter at all, falls back to CUTS[0] — `ship`, the
// shipped story (`hold`, the original, is `?v=hold`).
const V = { pace: 1, zen: 0, grow: 0, chatter: 0, perch: 0, tabs: 0, ...cutByName(new URLSearchParams(location.search).get('v')) };
stage.dataset.cut = V.name;

// ---------- copy ----------
const CMD = '$ superbot install';
// after the tidy-up the story rests for a beat at t=12 (he says "all yours
// now.") before the gulp; the beat is spent in the beat times themselves, so
// the clock never has to stall
const BUBBLE = [
  { from: 3.0, to: 3.75, text: "hi, i'm superbot.", mode: 'type' },
  { from: 4.4, to: 4.7, text: "hi, i'm superbot.", mode: 'erase' },
  { from: 4.7, to: 6.1, text: 'scanning your machine, one sec...', mode: 'type' },
  { from: 7.0, to: 7.5, text: 'scanning your machine, one sec...', mode: 'erase' },
  { from: 12.15, to: 12.75, text: 'all yours now.', mode: 'type' },
  { from: 14.9, to: 15.15, text: 'all yours now.', mode: 'erase' },
];

// ---------- inventory: 7 apps and 9 chips, four snap groups ----------
const APPS = ['cursor', 'claude', 'vscode', 'openai', 'gemini', 'zed', 'windsurf'];
const CHIPS = [['rule', 'no em dashes'], ['rule', 'ask before deploy'], ['skill', 'release'], ['skill', 'triage'],
  ['mcp', 'github'], ['mcp', 'slack'], ['mcp', 'postgres'], ['auth', 'slack'], ['auth', 'github']];
// the transcript counters are DERIVED from the inventory above, so the log can
// never find a different number of things than the stage shows or the
// receipts claim (qa round 1, Q-02: the log found 6 apps and wired 7)
const chipCount = (kind) => CHIPS.filter(([k]) => k === kind).length;
// one fact per line, counters in a padded key/value column, receipts with a
// check, so it reads as a log and not a paragraph
const FOUND = [
  ['apps', APPS.length], ['mcp servers', chipCount('mcp')], ['rules', chipCount('rule')],
  ['skills', chipCount('skill')], ['auth sessions', chipCount('auth')],
];
const kv = (label, n) => `${label.padEnd(14)}${String(n).padStart(3)}`;
// the closing facts use the same padded key/value column as the counters
const DONE = [['aggregated', '1.2s'], ['apps wired', APPS.length], ['copies', 1], ['devices synced', 2]];
// receipt line → which items snap tidy when it prints
const GROUPS = [
  { at: 8.6, line: 'linking cursor', keys: ['cursor', 'claude'] },
  { at: 9.8, line: 'importing rules', keys: ['rule:no em dashes', 'rule:ask before deploy', 'skill:release', 'skill:triage'] },
  { at: 11.0, line: 'syncing auth slack', keys: ['mcp:github', 'mcp:slack', 'mcp:postgres', 'auth:slack', 'auth:github'] },
  { at: 11.8, line: 'trimming 1.2M tokens', keys: ['vscode', 'openai', 'gemini', 'zed', 'windsurf'] },
];

// ---------- easing ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a)); // progress of t across [a, b]
const outQuint = (p) => 1 - Math.pow(1 - p, 5);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const inOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const inCubic = (p) => p * p * p;
const lerp = (a, b, p) => a + (b - a) * p;
// deterministic pseudo-random so every run (and every replay) scatters identically
const rnd = (i, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

// ---------- mascot frames ----------
const flatFrame = () => {
  const rows = Array.from({ length: ROWS }, () => ' '.repeat(COLS));
  rows[16] = ' '.repeat(8) + '='.repeat(24) + ' '.repeat(COLS - 32);
  return rows;
};
const blobFrame = () => {
  const rows = Array.from({ length: ROWS }, () => ' '.repeat(COLS));
  const art = ['#@@@@#', '@@@@@@', '#@@@@#'];
  for (let i = 0; i < 3; i++) rows[9 + i] = ' '.repeat(17) + art[i] + ' '.repeat(COLS - 23);
  return rows;
};
const FLAT = flatFrame();
const BLOB = blobFrame();
const face = (expr = REST, shape = VARIANTS.smol) => mascotFrame(COLS, ROWS, expr, shape);
const lerpShape = (a, b, p) => { const o = { ...a }; for (const k in b) o[k] = lerp(a[k] ?? VARIANTS.smol[k] ?? 0, b[k], p); return o; };
const SMOL = { ...VARIANTS.smol }, WIDE = { ...VARIANTS.smol, ...VARIANTS.smolWide };

// ---------- build the inventory DOM ----------
const items = [];
{
  APPS.forEach((key, i) => {
    const el = document.createElement('div');
    el.className = 'item app';
    el.innerHTML = `<svg aria-hidden="true"><use href="#sb-ic-${key}"/></svg>`;
    itemsEl.appendChild(el);
    items.push({ el, key, kind: 'app', i, col: 0, slot: i });
  });
  CHIPS.forEach(([kind, text], j) => {
    const el = document.createElement('div');
    el.className = 'item chip';
    el.innerHTML = `<b>${kind}:</b> ${text}`;
    itemsEl.appendChild(el);
    items.push({ el, key: `${kind}:${text}`, kind: 'chip', i: APPS.length + j, col: 1, slot: j });
  });
  const byKey = Object.fromEntries(items.map((it) => [it.key, it]));
  GROUPS.forEach((g, gi) => g.keys.forEach((k) => { byKey[k].snapAt = g.at; byKey[k].group = gi; }));
}

// ---------- layout: everything in arena px, from its center ----------
const L = { W: 0, H: 0, halfM: 0, hubRect: null, badgeBox: null };
function layout() {
  L.W = arena.clientWidth; L.H = arena.clientHeight;
  const cw = L.W / 2, ch = L.H / 2;
  L.halfM = Math.max(80, mascotEl.getBoundingClientRect().width / 2 || 0);
  // tile pitch for the tidy grid: 78 for the 64px app tiles, 52 for the 44px
  // ones. The cut is the STAGE width at the same 660px the hub-boot.css
  // `@container stage (max-width: 660px)` tier uses to shrink the tiles, so
  // the pitch and the drawn size can never disagree (the old arena-width
  // 640 cut left 64px tiles on a 52px pitch between 641 and ~800px viewports)
  const tile = stage.clientWidth <= 660 ? 52 : 78;
  items.forEach((it) => {
    // messy: a band either side of the face, never over it and never past the
    // arena edge (chips are 140px wide, tiles 64px); each item enters from
    // its own side so nothing crosses the mascot on the way in
    const side = it.i % 2 ? 1 : -1;
    // anchor every item at its own center (chips vary in width) and keep the
    // whole item inside the arena at its messy position
    const halfW = (it.el.offsetWidth || (it.kind === 'app' ? 64 : 140)) / 2;
    it.el.style.marginLeft = `${-halfW}px`;
    it.halfW = halfW;
    const minX = L.halfM + 40 + halfW, maxX = Math.max(minX + 20, cw - halfW - 14);
    const mx = side * lerp(minX, maxX, rnd(it.i, 1));
    const my = lerp(-(ch - 56), ch - 56, rnd(it.i, 2));
    it.messy = { x: mx, y: my, rot: lerp(-8, 8, rnd(it.i, 3)), scale: lerp(0.85, 1.15, rnd(it.i, 4)) };
    it.start = { x: side * (cw + 140), y: my + lerp(-60, 60, rnd(it.i, 6)) };
    // tidy: apps in a 2x4 grid on his left, chips in one column on his right,
    // both clamped to the arena width
    const appsX = Math.min(L.halfM + 40, Math.max(60, cw - tile * 2 - 16));
    it.tidy = it.col === 0
      ? { x: -(appsX + (1 - (it.slot % 2)) * tile + tile / 2), y: (Math.floor(it.slot / 2) - 1.5) * tile }
      : { x: Math.min(L.halfM + 130, cw - halfW - 14), y: (it.slot - 4) * 38 };
    // absorption: a bezier curling into his chest, alternating sides
    it.curl = side * 70;
  });
  // the bubble sits centred above the face whatever the font size; the CSS
  // caps its width to the arena so long lines wrap instead of running off
  const mr = mascotEl.getBoundingClientRect();
  bubble.style.left = `${Math.round(cw)}px`;
  bubble.style.top = `${Math.round(ch - (mr.height || 200) / 2 - 10)}px`;
  // not while he is parked: the parked keys are placed from the bottom by CSS,
  // and a resize mid-hold would otherwise pin them back to an arena coordinate
  if (!parked) keys.el.style.top = `${Math.round(ch + (mr.height || 200) / 2 - 2)}px`;
  scan.textContent = '='.repeat(Math.ceil(L.W / 7) + 4);
  L.hubRect = { x: 8, y: 8, w: L.W - 16, h: L.H - 16 };
  L.badgeBox = { x: cw - 44, y: ch - 44, w: 88, h: 88 };
  // sync beam. It leaves the LOWER half of the chat lane — the empty feed space
  // the live chatter row sits in — so it reads as coming out of the conversation
  // rather than starting at a point in mid-air, and lands on the phone's
  // top-left shoulder, where the "synced" chip lights a beat later. The old path
  // began at (0.62W, 0.42H), which put its origin on top of the panel's cards.
  // offset* ignores transforms, so the phone's rest position is read even while
  // it sits translated below the arena.
  const px = phone.offsetLeft, py = phone.offsetTop, pw = phone.offsetWidth;
  const x0 = L.W * 0.45, y0 = L.H * 0.62, x1 = px + pw * 0.22, y1 = py + 10;
  // the control point sits near the start AND above the far end, so the curve
  // leaves rising and flattens as it arrives: a launch that settles into the
  // phone, not the old symmetric bow that arced away from its own destination
  const cx = x0 + (x1 - x0) * 0.3, cy = y1 - 14;
  const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  beamPath.setAttribute('d', d);
  beamRun.setAttribute('d', d);
  // both gradients sweep along x in user space (the curve is mostly horizontal,
  // so an x sweep reads as travel along it). The rail's spans the whole run, so
  // it fades in and out at BOTH ends and never shows a hard terminus; the run's
  // is a short window tick() slides across, sized off the distance covered.
  L.beam = { x0, x1, span: Math.max(90, (x1 - x0) * 0.42) };
  for (const g of [beamFade, beamRunGrad]) { g.setAttribute('y1', '0'); g.setAttribute('y2', '0'); }
  beamFade.setAttribute('x1', x0.toFixed(1));
  beamFade.setAttribute('x2', x1.toFixed(1));
  beam.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
}

// The run gradient parked wholly before the rail's start, so every frame outside
// the 19.4-21.0 window shows an unlit rail rather than a light stalled on it.
function parkBeamRun() {
  if (!L.beam) return;
  beamRunGrad.setAttribute('x1', (L.beam.x0 - L.beam.span).toFixed(1));
  beamRunGrad.setAttribute('x2', L.beam.x0.toFixed(1));
}

// ---------- margin log ----------
let log = [];
let marginKey = '';
let kvLines = [];
function renderMargin() {
  let out = '';
  for (const { text, cls } of log) {
    // a counter line ends in its number: bold just that, so the column reads
    // as a key/value pair rather than a sentence
    out += `<span class="ln ${cls}">${cls === 'kv' ? text.replace(/([\d.]+\w*)$/, '<b>$1</b>') : text}</span>`;
  }
  out += '<span class="caret"></span>';
  if (out !== marginKey) { margin.innerHTML = out; marginKey = out; }
}
const say = (text, cls = '') => { const line = { text, cls }; log.push(line); renderMargin(); return line; };
const gap = () => say(' ', 'gap');

// ---------- mascot ----------
const m = new Mascot(mascotEl, { cols: COLS, rows: ROWS, anim: 'calm', autoMorph: false });
mascotEl.addEventListener('click', (e) => e.stopImmediatePropagation(), true); // the stage owns the face; no click morphs
const noCanvas = m.state === 'fallback';
const keys = mountKeys(arena, m); // the homepage keyboard, under his body
let UP = [], CRUSH = [];
function freeze(frame) { if (noCanvas) return; m.state = 'morph'; if (frame) m.render(frame); }
function thaw() { if (noCanvas) return; m.state = 'idle'; }
function playSeq(seq, p) { if (noCanvas || !seq.length) return; m.render(seq[Math.min(seq.length - 1, Math.floor(p * seq.length))]); }
function prepareFrames() {
  if (noCanvas) return;
  UP = morphFrames(FLAT, face(), COLS, ROWS);
}

// ---------- style helpers (transform/opacity only) ----------
const tf = (el, x, y, s = 1, r = 0) => { el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${s.toFixed(3)})`; };
const op = (el, v) => { el.style.opacity = String(clamp01(v)); };
const popIn = (el, t, at, dur = 0.25, dy = 6) => {
  const p = seg(t, at, at + dur);
  op(el, p * 2);
  el.style.transform = `translateY(${((1 - outBack(p)) * dy).toFixed(1)}px)`;
};

// ---------- act two: the client tour (the `tabs` cut) ----------
// Once the stage has cleared and the hub is alone in frame, it tours the clients
// the reader already pays for. The arc is the product claim in miniature:
// ChatGPT answers the question, Claude writes the code, Superbot says it can do
// better and does — each in that vendor's own palette (hub-boot.css
// .hub[data-app]) — and coming home to the Superbot tab is the overview
// (user, 2026-09-06). Times are STORY seconds, after the 22.0-22.9 collapse.
const tourFeed = $('tour-feed'); // feedEl (the story's own feed) is declared below
const chatName = hub.querySelector('.chat-head b'), chatTopic = hub.querySelector('.chat-head .topic');
// the topic line left the header (owner, 2026-09-08); the tour's rename still
// compiles against an absent span
const HOME = { name: chatName.textContent, topic: chatTopic?.textContent ?? '' };
const TABS = [
  { at: 23.4, app: 'openai', name: 'chatgpt', topic: 'your ChatGPT subscription, in the hub' },
  { at: 26.4, app: 'claude', name: 'claude', topic: 'your Claude subscription, same window' },
  { at: 30.2, app: null }, // home, and the point of the tour: one overview over all of them
];
const TOUR_IN = TABS[0].at - 0.4; // the two feeds cross-fade over this beat
// the sql below is ours and carries no interpolation, so it is tinted, not escaped
const SQL_KW = /\b(BEGIN|COMMIT|CREATE|TABLE|SELECT|DISTINCT|ON|FROM|ORDER|BY|DESC|ALTER|RENAME|TO|INSERT|INTO|LIKE|INCLUDING|ALL|AS)\b/g;
const sql = (src) => src.replace(SQL_KW, '<span class="k">$1</span>').replace(/(--[^\n]*)/g, '<span class="c">$1</span>');
// The reader never sees themselves type: the tour is the CLIENTS answering, one
// message per tab, and the question is implied by the answer (owner, 2026-09-08:
// "don't bother showing the user sending messages anymore, make the screen less
// busy overall"). `own` stays supported below for a future beat that needs it.
const TOUR = [
  { at: 24.2, tab: 'openai', who: 'chatgpt', badge: 'GPT', text: 'rebuilding beats deleting in place: <b>SELECT DISTINCT ON</b> into a fresh table, then swap it in.' },
  { at: 27.2, tab: 'claude', who: 'claude', badge: 'CLAUDE', file: 'dedupe.sql',
    code: 'CREATE TABLE events_new AS\n  SELECT DISTINCT ON (id) * FROM events\n  ORDER BY id, seen_at DESC;\nALTER TABLE events RENAME TO events_old;\nALTER TABLE events_new RENAME TO events;' },
  { at: 29.0, tab: 'claude', who: 'superbot', badge: 'APP', text: 'i can make that better.' },
  { at: 30.6, tab: 'sb', who: 'superbot', badge: 'APP', file: 'dedupe.sql', better: true,
    text: 'same swap, one transaction: the copy keeps every index and constraint, and nothing is renamed until it is built.',
    code: 'BEGIN;\nCREATE TABLE events_new (LIKE events INCLUDING ALL);\nINSERT INTO events_new\n  SELECT DISTINCT ON (id) * FROM events\n  ORDER BY id, seen_at DESC;\nALTER TABLE events RENAME TO events_old;\nALTER TABLE events_new RENAME TO events;\nCOMMIT;  -- reversible: events_old is still there' },
];
const tourEls = TOUR.map((m) => {
  const el = document.createElement('div');
  el.className = `msg${m.own ? ' own' : ''}`;
  const av = m.own
    ? '<span class="avatar" style="--c:#fb7185">Y</span>'
    : (m.who === 'superbot'
      ? '<span class="avatar sb"><img src="site/assets/brand/mark-clean.svg" alt=""></span>'
      : `<span class="avatar sb">${m.who.slice(0, 2)}</span>`);
  const body = (m.text ? `<div class="m-text">${m.text}</div>` : '') +
    (m.code ? `<div class="card code${m.better ? ' better' : ''}"><div class="c-bar"><span class="cap">${m.file}</span></div><pre>${sql(m.code)}</pre></div>` : '');
  el.innerHTML = `${av}<div class="m-main"><div class="m-head"><span class="m-name">${m.who}</span>` +
    `${m.badge ? `<span class="app">${m.badge}</span>` : ''}<span class="m-when">now</span></div>${body}</div>`;
  el.style.display = 'none';
  tourFeed.appendChild(el);
  return el;
});
// the open client: retints the hub, moves the rail's pill and renames the lane
let curTab;
function applyTab(s) {
  const key = s ? (s.app || 'sb') : 'none';
  if (key === curTab) return;
  curTab = key;
  if (!s) return;
  if (s.app) hub.setAttribute('data-app', s.app); else hub.removeAttribute('data-app');
  hub.querySelectorAll('.rail-item.sel').forEach((el) => el.classList.remove('sel'));
  (s.app ? hub.querySelector(`.rail-item[data-app="${s.app}"]`) : hub.querySelector('.rail-item.sb'))?.classList.add('sel');
  chatName.textContent = s.name ?? HOME.name;
  if (chatTopic) chatTopic.textContent = s.topic ?? HOME.topic;
}
// every tour message hidden and the lane handed back to Superbot
function resetTour() {
  curTab = undefined;
  hub.classList.remove('slim');
  applyTab({ app: null });
  op(tourFeed, 0); op(feedEl, 1);
  tourEls.forEach((el) => { op(el, 0); el.style.transform = ''; el.style.display = 'none'; });
}

// ---------- reset to frame 0 ----------
const railItems = [...hub.querySelectorAll('.rail-item')];
const inners = [...hub.querySelectorAll('.inner')];
// :not(.tour) — act two stacks a second .feed in this column, and its six
// messages are not the story's: unscoped, the zen drift pool picked them up
const feedMsgs = [...hub.querySelectorAll('.feed:not(.tour) .msg')];
const phoneMsgs = [...phone.querySelectorAll('.msg')];
const cards = [...hub.querySelectorAll('.panel .pc')];
const replay = $('replay');
// the hub's four columns, addressed on their own for the `grow` cut
const railEl = hub.querySelector('.rail'), chatsEl = hub.querySelector('.chats');
const mainEl = hub.querySelector('.main'), panelEl = hub.querySelector('.panel');
// :not(.tour) — act two stacks a SECOND .feed in the same column, and the
// chatter row belongs to the story's own, not the tour transcript
const feedEl = hub.querySelector('.feed:not(.tour)');
// the headline lends nothing any more (owner, 2026-09-08: the brand tile sits
// there instead of the mascot); `perched` now means only "the terminal
// column collapsed", and the mascot fades out inside it
let fired = new Set();
let parked = false, perched = false;

// ---------- zen: the held end state breathes ----------
// Each element rides its own slow sine (7-13s) at under 4px, with a phase from
// the same deterministic rnd() the scatter uses, so nothing pulses in unison
// and a replay drifts identically. transform/opacity only; the clock never runs
// under prefers-reduced-motion, so this is guarded by construction.
const DRIFT = [];
// Empty the pool AND hand back the transforms it was writing, so whatever owns
// each element next (the perch exit tween, popIn, a replay) starts from a clean
// slate rather than from the last drift frame.
function clearDrift() {
  for (const d of DRIFT) d.el.style.transform = '';
  DRIFT.length = 0;
}
function buildDrift() {
  if (DRIFT.length || !V.zen) return;
  // the phone and its label are only driftable while they are STAYING. On the
  // perch cuts they leave to the right over 22.0-22.9, and drift() deliberately
  // runs last in the frame, so leaving them in the pool overwrites that exit
  // tween every frame and floats the phone back over the panel in the held end
  // state. park() runs immediately before this in the same 22.0 event, so
  // `perched` is already settled here.
  const pool = [...cards, ...feedMsgs, ...(perched ? [] : [phone, phoneLabel])].filter(Boolean);
  pool.forEach((el, i) => DRIFT.push({
    el,
    per: lerp(7, 13, rnd(i, 11)),
    ph: rnd(i, 12),
    amp: lerp(1.4, 3.4, rnd(i, 13)),
    fade: i % 3 === 0,
  }));
}
function drift(u) {
  for (const d of DRIFT) {
    const a = (u / d.per + d.ph) * Math.PI * 2;
    const x = Math.cos(a * 0.6) * d.amp * 0.4;
    d.el.style.transform = `translate3d(${x.toFixed(2)}px, ${(Math.sin(a) * d.amp).toFixed(2)}px, 0)`;
    if (d.fade) op(d.el, 0.88 + 0.12 * (0.5 + 0.5 * Math.sin(a * 0.8)));
  }
}

// ---------- chatter: the chat keeps living after the reveal ----------
// One row at the foot of the feed, reused: it types, it says its line, it
// fades, the next line takes its turn. One row and one cycle is the whole
// feature — the end state has to stay uncomplicated.
const CHATTER = [
  { who: 'you', own: true, text: 'and on my phone?' },
  { who: 'superbot', app: true, text: 'already there. same context, one copy.' },
  { who: 'you', own: true, text: 'ship it' },
];
let chatterRow = null, chatterAt = -1, chatterMade = false;
function makeChatter() {
  if (chatterMade || !V.chatter || !feedEl) return;
  chatterMade = true;
  // room for it: the date divider and the oldest message step aside once, so
  // the feed reads as having scrolled rather than overflowing its box
  feedEl.querySelector('.date-div')?.style.setProperty('display', 'none');
  feedEl.querySelector('.msg')?.style.setProperty('display', 'none');
  chatterRow = document.createElement('div');
  chatterRow.className = 'msg';
  chatterRow.style.opacity = '0';
  feedEl.appendChild(chatterRow);
}
function chatter(u) {
  if (!chatterRow) return;
  const CYCLE = 8.2;
  const i = Math.floor(u / CYCLE) % CHATTER.length;
  const p = u % CYCLE;
  if (i !== chatterAt) {
    chatterAt = i;
    const c = CHATTER[i];
    chatterRow.className = `msg${c.own ? ' own' : ''}`;
    chatterRow.innerHTML =
      `<span class="avatar${c.own ? '' : ' sb'}"${c.own ? ' style="--c:#fb7185"' : ''}>${c.own ? 'Y' : 'sb'}</span>` +
      `<div class="m-main"><div class="m-head"><span class="m-name">${c.who}</span>${c.app ? '<span class="app">APP</span>' : ''}` +
      `<span class="m-when">now</span></div><div class="m-text"></div></div>`;
  }
  const textEl = chatterRow.querySelector('.m-text');
  // 0-1.4 typing, 1.4-2.2 the line arrives a character at a time, 6.6-7.4 out
  if (p < 1.4) { textEl.textContent = 'typing…'; textEl.style.opacity = '.55'; }
  else {
    const c = CHATTER[i];
    textEl.style.opacity = '1';
    textEl.textContent = [...c.text].slice(0, Math.round(seg(p, 1.4, 2.2) * c.text.length)).join('');
  }
  op(chatterRow, seg(p, 0.2, 0.6) * (1 - seg(p, 6.6, 7.4)));
}

// ---------- the end state: he parks in the margin beside the hub ----------
// the `perch` cut sends him out of the stage entirely, onto the anchor the page
// lends beside its headline, and collapses the terminal column behind him. Only
// when the page offers an anchor that HAS layout (offsetParent is null while it
// is display:none, which is how both host pages retire it below 820px) and the
// stage is wide enough for the collapse to leave a usable arena; otherwise he
// parks in the terminal margin as usual.
const canPerchNow = () => !!(V.perch && stage.clientWidth > 660);
function placeParked() {
  stage.classList.toggle('perched', perched);
  // he always parks in the terminal margin now; on the perched cuts that column
  // collapses under him, and the tick below fades him with it
  margin.appendChild(mascotEl); margin.appendChild(keys.el);
  keys.el.style.top = ''; // parked, the keys are placed from the bottom by CSS
}
function park() {
  parked = true;
  perched = canPerchNow();
  placeParked();
  mascotEl.classList.add('parked'); keys.el.classList.add('parked', 'small');
  m.shape = SMOL; freeze(face()); thaw(); m.lookAt = null; m.typing = false;
  op(mascotEl, 0); op(keys.el, 0);
}
// a resize can retire the anchor under a parked mascot (or hand one back): move
// him to whichever host still has layout instead of leaving him in a hidden box
function reperch() {
  if (!parked) return;
  const want = canPerchNow();
  if (want === perched) return;
  perched = want;
  // the drift pool is built ONCE against `perched` (it excludes the phone on the
  // perch cuts, whose exit tween drift would otherwise overwrite). A resize can
  // flip that flag afterwards, so the pool is dropped and rebuilt HERE against
  // the flag that is now true — buildDrift() is otherwise only reachable from
  // the one-shot 22.0 event, so leaving it to "the next tick" would mean no
  // drift at all until a replay. Both calls no-op on the cuts without zen.
  clearDrift();
  placeParked();
  buildDrift();
  // the still froze its composition against the OLD flag and has no next frame
  // to correct itself, so it recomposes here. The animated path skips this: its
  // own tick() already rewrites every one of these values on the next frame.
  if (reduced) applyStillEnd();
}
function unpark() {
  parked = false; perched = false;
  clearDrift(); // a replay after a resize must not inherit the old pool
  stage.classList.remove('perched');
  arena.appendChild(mascotEl); arena.appendChild(keys.el);
  mascotEl.classList.remove('parked'); keys.el.classList.remove('parked', 'small');
  layout();
}
function restart() {
  unpark(); reset();
  t0 = performance.now(); if (paused) pausedAt = t0;
}
function reset() {
  fired = new Set();
  log = [{ text: CMD, cls: 'cmd' }];
  marginKey = '';
  renderMargin();
  led.classList.remove('on');
  freeze(FLAT);
  m.shape = SMOL; m.typing = false; m.lookAt = null;
  Object.assign(m.expr, REST, { pupil: { x: 0, y: 0 } });
  op(mascotEl, 1); op(keys.el, 1); keys.clear();
  bubbleText.textContent = ''; op(bubble, 0);
  op(scan, 0);
  kvLines = [];
  items.forEach((it) => { op(it.el, 0); tf(it.el, it.start.x, it.start.y, it.messy.scale, it.messy.rot); });
  op(badge, 0);
  op(hub, 0); hub.style.transform = ''; inners.forEach((el) => { op(el, 0); el.style.transform = ''; });
  if (chatterRow) { op(chatterRow, 0); chatterAt = -1; }
  railItems.forEach((el) => { op(el, 0); el.style.transform = ''; });
  feedMsgs.forEach((el) => { op(el, 0); el.style.transform = ''; });
  phoneMsgs.forEach((el) => { op(el, 0); el.style.transform = ''; });
  cards.forEach((el) => { op(el, 0); el.style.transform = ''; });
  replay.hidden = true;
  op(phone, 0); phone.style.transform = ''; op(phoneLabel, 0); op(sync, 0);
  phone.classList.remove('docked'); hub.classList.remove('docked');
  op(beam, 0); parkBeamRun(); resetTour();
}

// ---------- events: one-shots, in clock order ----------
const EVENTS = [
  { at: 2.1, run: () => { if (!UP.length) prepareFrames(); } },
  { at: 3.0, run: () => { thaw(); m.setExpr({ eyeR: 'wink', mouth: 'grin' }, 900); led.classList.add('on'); } },
  { at: 5.0, run: () => { gap(); kvLines = FOUND.map(([label]) => say(kv(label, 0), 'kv')); } },
  { at: 6.9, run: () => { m.lookAt = null; } },
  { at: 8.2, run: () => { m.typing = true; } },
  ...GROUPS.map((g, gi) => ({ at: g.at, run: () => { if (gi === 0) gap(); say(g.line, 'done'); m.lookAt = { x: gi % 2 ? 0.8 : -0.8, y: 0.1 }; } })),
  { at: 12.0, run: () => { m.typing = false; m.lookAt = null; } },            // done organizing: the hold starts here
  { at: 12.01, run: () => { m.lookAt = { x: 0, y: 0.6 }; m.setExpr({ eyeL: 'open', eyeR: 'open', mouth: 'o' }, 900); } }, // inhale, after the beat
  { at: 12.9, run: () => { m.lookAt = null; m.setExpr({ eyeL: 'happy', eyeR: 'happy', mouth: 'grin' }, 900); m.excitedUntil = performance.now() + 500; } }, // gulp landed
  { at: 13.2, run: () => { if (noCanvas) return; freeze(); CRUSH = morphFrames(face({ eyeL: 'happy', eyeR: 'happy', mouth: 'grin' }, WIDE), BLOB, COLS, ROWS); } },
  { at: 13.7, run: () => { gap(); say(kv(...DONE[0]), 'kv'); } },
  { at: 15.0, run: () => { say(kv(...DONE[1]), 'kv'); say(kv(...DONE[2]), 'kv'); } },
  { at: 19.4, run: makeChatter },                       // `live`/`full`: the feed makes room for the live row
  { at: 21.0, run: () => say(kv(...DONE[3]), 'kv') },
  { at: 22.0, run: () => { park(); buildDrift(); } },   // the story is told; he hangs out beside it
  // the obvious way to watch it again, held back past act two when it plays
  { at: V.tabs ? 32.0 : 22.6, run: () => { replay.hidden = false; } },
];

// ---------- tweens: pure functions of the clock ----------
// t is story time: wall seconds divided by the cut's pace, so every beat below
// keeps the time it was written at whatever speed the cut runs
function render(t) {
  // fire due events
  for (let i = 0; i < EVENTS.length; i++) if (!fired.has(i) && t >= EVENTS[i].at) { fired.add(i); EVENTS[i].run(); }

  // 1.5-2.1 blip along the flat row; 2.1-3.0 crush-morph up into the face
  if (t >= 1.5 && t < 2.1 && !noCanvas) {
    const p = seg(t, 1.5, 2.1), col = 8 + Math.floor(p * 20);
    const row = FLAT[16].split('');
    for (let k = 0; k < 4; k++) if (col + k < 32) row[col + k] = '#';
    const f = FLAT.slice(); f[16] = row.join('');
    m.render(f);
  } else if (t >= 2.1 && t < 3.0) {
    playSeq(UP, seg(t, 2.1, 3.0));
  }

  // bubble typewriter
  {
    let text = '', live = false;
    for (const s of BUBBLE) {
      if (t < s.from) break;
      const p = seg(t, s.from, s.to);
      const n = Math.round(p * [...s.text].length);
      text = s.mode === 'type' ? [...s.text].slice(0, n).join('') : [...s.text].slice(0, [...s.text].length - n).join('');
      live = true;
    }
    bubbleText.textContent = text;
    op(bubble, live && text.length ? 1 : 0); // never an empty bubble floating with a caret
  }

  // 4.4-6.8 the glyph row becomes a scanline; pupils track it; counters count
  if (t >= 4.3 && t <= 7.0) {
    const p = seg(t, 4.4, 6.8);
    op(scan, seg(t, 4.3, 4.5) * (1 - seg(t, 6.8, 7.0)));
    scan.style.transform = `translateY(${(outQuint(p) * (L.H - 16)).toFixed(1)}px)`;
    if (!noCanvas && t < 6.9) m.lookAt = { x: 0.25, y: -1 + 2 * p };
    if (t >= 5.0 && t <= 5.95 && kvLines.length) {
      const q = outQuint(seg(t, 5.0, 5.9));
      kvLines.forEach((line, i) => { line.text = kv(FOUND[i][0], Math.round(FOUND[i][1] * q)); });
      renderMargin();
    }
  }

  // 7.0-8.4 scatter in (messy), snaps per receipt line, 12.0-12.9 absorption
  if (t >= 7.0 && t < 13.0) {
    items.forEach((it) => {
      const dep = 7.0 + it.i * 0.05; // everyone has landed by 8.45s, before the first snap
      const pIn = outQuint(seg(t, dep, dep + 0.7));
      let x = lerp(it.start.x, it.messy.x, pIn), y = lerp(it.start.y, it.messy.y, pIn);
      let r = it.messy.rot, s = it.messy.scale, o = seg(t, dep, dep + 0.25);
      if (t >= it.snapAt) {
        const q = outBack(seg(t, it.snapAt, it.snapAt + 0.25));
        x = lerp(it.messy.x, it.tidy.x, q); y = lerp(it.messy.y, it.tidy.y, q);
        r = it.messy.rot * (1 - q); s = lerp(it.messy.scale, 1, q);
      }
      // the gulp: everyone leaves within 0.15s, accelerates (gravity) along a
      // curl into his chest and arrives at 12.9 at the same instant
      const absAt = 12.0 + it.i * 0.01;
      if (t >= absAt) {
        const q = inCubic(seg(t, absAt, 12.9));
        const tx = 0, ty = L.H * 0.06;
        const mx = (x + tx) / 2 + it.curl, my = (y + ty) / 2 - 40;
        const bx = (1 - q) * (1 - q) * x + 2 * (1 - q) * q * mx + q * q * tx;
        const by = (1 - q) * (1 - q) * y + 2 * (1 - q) * q * my + q * q * ty;
        x = bx; y = by; s = lerp(s, 0.2, q); r = r * (1 - q) + it.curl * 0.4 * q; o = 1 - seg(t, 12.75, 12.9);
      }
      // the snap's overshoot spring may carry a chip past the arena edge for a
      // frame or two; keep every item inside the arena at all times
      const limX = L.W / 2 - (it.halfW ?? 70) - 8;
      x = Math.max(-limX, Math.min(limX, x));
      op(it.el, o);
      tf(it.el, x, y, s, r);
    });
  }

  // 8.2-12.0 he types: keycaps flash and the paw on that side drops
  if (t >= 8.2 && t < 12.0) keys.burst(t);

  // 12.0-13.2 he plumps (shape lerp smol -> smolWide); 13.2-13.7 crush to blob
  if (t >= 12.6 && t < 13.2 && !noCanvas) m.shape = lerpShape(SMOL, WIDE, inOut(seg(t, 12.6, 13.2)));
  else if (t >= 13.2 && t < 13.7) playSeq(CRUSH, seg(t, 13.2, 13.7));
  if (!parked) { const bodyOp = t < 13.7 ? 1 : 1 - seg(t, 13.7, 13.9); op(mascotEl, bodyOp); op(keys.el, bodyOp); }

  // 13.7-14.12 the badge springs out of the blob; fades as the hub takes over
  if (t >= 13.7 && t < 14.4) {
    const p = seg(t, 13.7, 14.12);
    op(badge, seg(t, 13.7, 13.85) * (1 - seg(t, 14.15, 14.35)));
    badge.style.transform = `scale(${lerp(0.6, 1, outBack(p)).toFixed(3)})`;
  } else if (t >= 14.4) op(badge, 0);

  // 14.1-14.9 FLIP: hub plays from the badge box to its final rect (800ms, deliberate)
  if (t >= 14.1) {
    const p = outQuint(seg(t, 14.1, 14.9));
    const { hubRect: h, badgeBox: b } = L;
    const sx = lerp(b.w / h.w, 1, p), sy = lerp(b.h / h.h, 1, p);
    const tx = lerp(b.x - h.x, 0, p), ty = lerp(b.y - h.y, 0, p);
    hub.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    op(hub, seg(t, 14.1, 14.25));
    if (V.grow) {
      // `grow`: the hub arrives as the simplest thing that is still the app —
      // the rail and one chat lane — and earns its columns afterwards: the
      // chat list slides in from the left at 16.4, the panel from the right at
      // 17.4, the phone at 18. Complexity revealed, never dumped.
      // order (owner, 2026-09-08): the rail, then the SIDEBAR, then the chat
      // lane; the chat list was landing after the chat before
      const base = seg(t, 14.6, 14.95);
      op(railEl, base);
      const cq = outQuint(seg(t, 15.4, 16.0)), mq = outQuint(seg(t, 16.4, 17.0)), pq = outQuint(seg(t, 17.4, 18.0));
      op(chatsEl, cq); chatsEl.style.transform = `translateX(${(-14 * (1 - cq)).toFixed(1)}px)`;
      op(mainEl, mq); mainEl.style.transform = `translateX(${(-10 * (1 - mq)).toFixed(1)}px)`;
      op(panelEl, pq); panelEl.style.transform = `translateX(${(14 * (1 - pq)).toFixed(1)}px)`;
    } else inners.forEach((el) => op(el, seg(t, 14.6, 14.95)));
    railItems.forEach((el, i) => { const q = outBack(seg(t, 14.9 + i * 0.04, 15.15 + i * 0.04)); op(el, q * 2); el.style.transform = `scale(${lerp(0.6, 1, q).toFixed(3)})`; });
    // two messages since the feed lost the reader's own turn and the council
    // card (2026-09-08): the answer, then the sync line in step with the phone
    [17.0, 21.2].forEach((at, i) => popIn(feedMsgs[i], t, at)); // after the lane lands at 17.0
    cards.forEach((el, i) => popIn(cards[i], t, 16.0 + i * 0.18)); // the panel fills in card by card
  }

  // 18.0-18.5 the phone slides up; 19.4-21.0 the light runs the beam;
  // 21.2 the resolved issue lands on both screens in the same frame
  if (t >= 18.0) {
    const p = outQuint(seg(t, 18.0, 18.5));
    // the `perch` cuts clear the stage in one symmetric gesture: as the terminal
    // collapses off the left, the phone leaves to the right, so the end state is
    // the hub alone and nothing sits on top of the panel (user, 2026-09-06)
    // the phone STAYS (owner, 2026-09-08: "the mobile could become a column on
    // the right... synced in real time"): at 22.0 it docks beside the hub as a
    // right column (hub-boot.css .docked, a CSS transition on right/bottom) and
    // the two screens hold the same last line. `out` is kept at 0 so the label
    // and sync chip below keep their end-state values.
    const out = 0;
    op(phone, p * 2 * (1 - out));
    phone.style.transform = `translateY(${((1 - p) * 120).toFixed(1)}%)`;
    const docked = perched && t >= 22.0;
    phone.classList.toggle('docked', docked); hub.classList.toggle('docked', docked);
    popIn(phoneMsgs[0], t, 18.5);
    popIn(phoneMsgs[1], t, 21.2);
    op(beam, seg(t, 19.2, 19.5) * (1 - seg(t, 21.4, 21.8)));
    // one light, once: the window is swept from wholly before the start to
    // wholly past the end, so it enters and leaves the rail as a comet instead
    // of popping on at full length. inOut so it gathers speed and settles.
    if (L.beam) {
      const gx = lerp(L.beam.x0 - L.beam.span, L.beam.x1 + L.beam.span, inOut(seg(t, 19.4, 21.0)));
      beamRunGrad.setAttribute('x1', gx.toFixed(1));
      beamRunGrad.setAttribute('x2', (gx + L.beam.span).toFixed(1));
    }
    op(sync, seg(t, 21.2, 21.4) * (1 - out));
    // the label under the phone has no room once it docks flush with the hub's
    // bottom; the "synced" chip in the phone's own header carries the fact
    popIn(phoneLabel, t, 21.0, 0.25, 4);
    if (perched && t >= 22.0) op(phoneLabel, 1 - seg(t, 22.0, 22.4));
  }

  // with the phone gone the chat list steps in and hands its foot to the
  // context readout. Gated on the RUNTIME `perched`, the same flag the phone's
  // exit above reads: on a host whose .sb-perch is not laid out (the 660-820px
  // tier hides it) the phone stays, and the list must stay with it. A toggle
  // rather than an event so a rewind cannot strand it.
  hub.classList.toggle('slim', perched && t >= 23.0);

  // act two: the client tour, only once the stage has cleared, so it plays with
  // the hub alone in frame. The two feeds cross-fade in over TOUR_IN, then only
  // the open client's messages are in the flow — the rest are display:none so
  // the grid never reserves their rows.
  // `perched`, not V.tabs alone: the same runtime flag the phone's exit and the
  // slim step-in read. On a tier whose perch anchor is not laid out the terminal
  // never collapses, and the tour must not play over a stage that never cleared.
  if (V.tabs && perched && t >= TOUR_IN) {
    let cur = null;
    for (const s of TABS) if (t >= s.at) cur = s;
    applyTab(cur);
    const on = seg(t, TOUR_IN, TABS[0].at);
    op(feedEl, 1 - on); op(tourFeed, on);
    const key = cur ? (cur.app || 'sb') : null;
    tourEls.forEach((el, i) => {
      const mine = TOUR[i].tab === key;
      el.style.display = mine ? '' : 'none';
      if (mine) popIn(el, t, TOUR[i].at);
    });
  }

  // parked: he hangs out in the margin beside the hub on his own idle clock
  // (blinks, bob, ears), glances at the hub and types a short burst now and then
  if (parked) {
    // perched cuts: the terminal collapses under him and he goes with it
    // (owner, 2026-09-08: "get rid of the ASCII guy at the end"); the hold
    // cuts keep him idling in the margin as before
    const vis = perched ? 1 - seg(t, 22.0, 22.5) : seg(t, 22.0, 22.6);
    op(mascotEl, vis); op(keys.el, vis);
    const ph = (t - 22.6) % 9;
    const typing = ph > 5 && ph < 6.6;
    if (typing !== m.typing) m.typing = typing;
    if (typing) keys.burst(t);
    // perched beside the headline he faces the page, not the hub he left
    m.lookAt = perched ? null : (ph > 2 && ph < 3.4 ? { x: 0.9, y: -0.2 } : null);
    if (perched) m.typing = false;
  }
  // the live chat and the drift run last, so they own the transforms the
  // reveal tweens above are still writing every frame
  if (t >= 19.6 && V.chatter) chatter(t - 19.6);
  if (parked && V.zen) drift(t - 22.0);
}

// ---------- the clock ----------
let t0 = 0, paused = false, pausedAt = 0, visible = true;
function setPaused(v) {
  if (v === paused) return;
  paused = v;
  if (v) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
}
function tick(now) {
  requestAnimationFrame(tick);
  if (paused) return;
  // pace stretches WALL time only: every beat keeps its story time, so a
  // slower cut is the same story with more room between its moments
  render((now - t0) / 1000 / V.pace); // no wrap: the story ends on its last frame and holds
}

// ---------- reduced motion: one composed still, no clock ----------
// Everything in the end state that depends on `perched`, in one place. The
// animated path recomputes all of this every frame in tick(), so it is
// self-correcting when a resize flips the flag; the still has no next frame, so
// it composes here once AND re-composes from reperch() when a resize flips it.
// Both directions matter: perched means the hub alone (list stepped in, phone
// and its label and the sync chip gone, act two's payoff in frame), and not
// perched means the stage never cleared, so the phone belongs back on it.
function applyStillEnd() {
  hub.classList.toggle('slim', perched);
  // the phone is in the end state on every cut now: docked beside the hub on
  // the perched cuts, on the stage on the hold cuts; the mascot is gone on the
  // perched cuts (the terminal he sat in has collapsed)
  phone.classList.toggle('docked', perched); hub.classList.toggle('docked', perched);
  op(phone, 1); op(phoneLabel, perched ? 0 : 1); op(sync, 1);
  phone.style.transform = '';
  op(mascotEl, perched ? 0 : 1); op(keys.el, perched ? 0 : 1);
  if (!V.tabs) return;
  op(feedEl, perched ? 0 : 1); op(tourFeed, perched ? 1 : 0);
  tourEls.forEach((el, i) => {
    const on = perched && TOUR[i].tab === 'sb';
    el.style.display = on ? '' : 'none';
    op(el, on ? 1 : 0); el.style.transform = '';
  });
}

function still() {
  stage.classList.add('still');
  log = [{ text: CMD, cls: 'cmd' }, { text: ' ', cls: 'gap' }, ...FOUND.map(([l, n]) => ({ text: kv(l, n), cls: 'kv' })), { text: ' ', cls: 'gap' },
    ...GROUPS.map((g) => ({ text: g.line, cls: 'done' })), { text: ' ', cls: 'gap' },
    // the same closing counters the live story prints at 13.7-21s (the old
    // LINES prose block they replaced was still referenced here, so the
    // reduced-motion still threw and rendered nothing; driver leg 4, 2026-09-06)
    ...DONE.map(([l, n]) => ({ text: kv(l, n), cls: 'kv' }))];
  renderMargin();
  led.classList.add('on');
  // no beam here: the reduced-motion still hides .beam outright (hub-boot.css's
  // .stage.still block), so there is nothing to position
  park(); freeze(face()); op(mascotEl, 1); op(keys.el, 1); // beside the hub, static
  applyStillEnd(); // after park(), which is what settles `perched`
  replay.hidden = false;
}

// ---------- boot ----------
layout();
new ResizeObserver(() => { layout(); reperch(); }).observe(arena);
if (reduced) {
  freeze(FLAT);
  still();
} else {
  prepareFrames();
  reset();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setPaused(!visible || document.hidden); }, { threshold: 0.15 }).observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(!visible || document.hidden));
  t0 = performance.now();
  requestAnimationFrame(tick);
}
replay.addEventListener('click', restart);

// exposed for the drive script: the clock, the mascot
// grid, which cut is playing and the names of every cut on offer
window.__hubBoot = {
  t: () => (paused ? pausedAt : performance.now()) - t0,
  grid: () => mascotEl.textContent,
  cut: V.name,
  cuts: CUTS.map(({ name, note }) => ({ name, note })),
  restart,
};
