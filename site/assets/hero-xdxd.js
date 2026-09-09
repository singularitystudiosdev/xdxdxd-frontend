// hero-xdxd.js: variant B of the landing hero (W5), ported from the
// cloned-xdxdxd sphere intro (sphere-intro-28.js) onto our existing #stage.
// One rAF clock drives the sphere AND the rebased phone beat; the four
// finisher tweens (flip, glide to the column, drops, glide home) run on WAAPI
// and pause with the clock (IntersectionObserver + visibilitychange). The
// module self-boots on import: the chooser at lander-agent.html imports this
// module for ?hero=xdxd and hub-boot.js never runs. Since W6 the stage
// prologue and the whole finisher handoff (the margin collapse, the hub
// grounds, the inner fades, the beam geometry, the rebased phone beat, the
// perched hold) live in the shared module hub-handoff.js; this file keeps the
// sphere's beats and the WAAPI finisher tweens that drive them. ?t=<seconds>
// seeks the clock for captures (hold); ?t=<seconds>&play=1 starts there;
// prefers-reduced-motion composes ONE still (the hub fully revealed, the
// phone docked, no clock).

import { PHONE, prepStage, revealHub, revealInners, placeBeam, playPhoneFrame,
         still as stillShared, perch, wireReplay } from './hub-handoff.js?v=2';

export const TIMING = {
  // design space: a 460px choreography, sphere R=175, 54px tiles, 250px mark;
  // the holder is scaled to the arena so design px never leak (S, clone verbatim)
  STAGE: 460, C: 230, R: 175, TILE: 54, MARK: 250,
  // beats 1/1b: the sphere pops, spins up exponentially, then converges over
  // the 450ms pow-1.7 window; tiles fade 220ms after MERGE_T
  MERGE_T: 4000, MERGE_WINDOW: 450, MERGE_POW: 1.7, TILE_FADE: 220,
  POP_START: 120, POP_STAGGER: 60, OMEGA0: .35, OMEGA_MAX: 21, OMEGA_POW: 1.55,
  // beat 2: the flip and grow (the two-key WAAPI curve verbatim; FLIP_PERSP
  // scales with the arena like every design px)
  FLIP: 920, FLIP_PERSP: 900, FLIP_EASE: 'cubic-bezier(.3,.85,.3,1.04)', FLIP_PEAK: 1.05, FLIP_OFFSET: .76,
  // beats 3/4: shrink to the rail's size and rise (GLIDE), the icons drop
  // (out-spring), the lockup glides home, the hub grounds grow, the inner
  // columns fade, the overlay dissolves
  GLIDE1: 620, GLIDE: 'cubic-bezier(.3,.7,.2,1)',
  DROP: 480, DROP_STAGGER: 90, DROP_EASE: 'cubic-bezier(.34,1.56,.64,1)', DROP_FROM: 34,
  HOME: 640, GROUND: 520, INNER: 380, DISSOLVE: 300, DISSOLVE_REMOVE: 320,
  // beat 5: the phone beat (hub-boot.js 17.0-22.4) rebased to the handoff, s
  // — owned by hub-handoff.js's PHONE since W6 and spread in below
  // guards: force a stalled intro (WAAPI promises can sit unresolved under
  // throttling) at 11s, clone verbatim (startAt + 11s)
  WATCHDOG: 11000,
  ...PHONE,
};

const T = TIMING;
const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const outQuint = (p) => 1 - Math.pow(1 - p, 5);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const inOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const op = (el, v) => { if (el) el.style.opacity = String(clamp01(v)); };
const popIn = (el, t, at, dur = T.POP, dy = T.POP_DY) => {
  if (!el) return;
  const p = seg(t, at, at + dur);
  op(el, p * 2);
  el.style.transform = 'translateY(' + ((1 - outBack(p)) * dy).toFixed(1) + 'px)';
};

// the spinning tiles, the clone's SPIN registry ported to our artwork paths
// (downloaded into site/assets/brand/intro/; kiro is PNG, never external URLs
// at runtime). The four rail apps and the four sphere-only marks draw the
// rail's own #sb-ic-* symbols (lander-agent.html's defs) on the grounds
// hero-xdxd.css declares on the overlay root
const IMG = {
  devin: 'devin.png', hermes: 'hermes.png', grok: 'grok.png', kiro: 'kiro.png',
  replit: 'replit.png', lovable: 'lovable.png', jetbrains: 'jetbrains.png',
  bolt: 'bolt.png', base44: 'base44.png', v0: 'v0.svg',
};
const SPIN = [
  { app: 'openai' }, { app: 'claude' }, { app: 'gemini' }, { app: 'cursor' },
  { app: 'devin', name: 'Devin' }, { app: 'hermes', name: 'Hermes' }, { app: 'grok', name: 'Grok' },
  { app: 'copilot', name: 'GitHub Copilot' },
  { app: 'kiro', name: 'Kiro' },
  { app: 'vscode', name: 'VS Code' },
  { app: 'windsurf', name: 'Windsurf' },
  { app: 'replit', name: 'Replit', face: true, bg: 'var(--surface)' },
  { app: 'lovable', name: 'Lovable', face: true, bg: '#ffffff' },
  { app: 'zed', name: 'Zed' },
  { app: 'jetbrains', name: 'JetBrains', face: true, bg: 'var(--surface)' },
  { app: 'bolt', name: 'Bolt' },
  { app: 'base44', name: 'Base44', face: true, bg: 'var(--surface)' },
  { app: 'v0', name: 'v0', face: true, bg: '#000000' },
];
const N = SPIN.length;

const stage = $('stage');
if (stage) boot();

function boot() {
  // the stage prologue is the shared implementation since W6 (hub-handoff.js):
  // data-hero on #stage, the margin column collapsed, the hub grounds forced
  // transparent, every boot-story row and rail child zeroed, #replay hidden
  const { arena, hub, rail, sb, dropItems, inners, replay, led } = prepStage(stage, 'xdxd');

  // the intro overlay on #arena, and the 460px design holder scaled to it.
  // The sphere must stay inside the stage at any viewport: S scales the
  // holder to the terminal's visible interior (clone verbatim)
  const overlay = document.createElement('div');
  overlay.className = 'hero-xdxd';
  overlay.setAttribute('aria-hidden', 'true');
  arena.appendChild(overlay);
  const acx = () => arena.clientWidth / 2;
  const acy = () => arena.clientHeight / 2;
  let S = 1;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;left:0;top:0;width:' + T.STAGE + 'px;height:' + T.STAGE + 'px;transform-style:preserve-3d;perspective:1100px;will-change:transform;';
  overlay.appendChild(holder);
  const fit = () => {
    S = Math.min(1, Math.min(arena.clientWidth * 0.72, arena.clientHeight) / (T.STAGE + 40));
    holder.style.left = acx() + 'px';
    holder.style.top = acy() + 'px';
    holder.style.transform = 'translate(-50%,-50%) scale(' + S + ')';
  };
  fit();
  addEventListener('resize', fit);

  // the merge target: the rail's OWN superbot tile (brand/tile.svg), so when
  // the flipped tile lands on the rail slot nothing has to be swapped
  const HAIRLINE = 'inset 0 0 0 1px rgb(255 255 255 / .14)';
  const bloom = document.createElement('div');
  bloom.className = 'hx-bloom';
  bloom.style.cssText = 'position:absolute;left:50%;top:50%;width:' + T.MARK + 'px;height:' + T.MARK + 'px;margin:' + (-T.MARK / 2) + 'px 0 0 ' + (-T.MARK / 2) + 'px;z-index:5;opacity:0;will-change:transform,filter;border-radius:' + (T.MARK * (14 / 44)) + 'px;box-shadow:' + HAIRLINE + ';';
  const mark = new Image();
  mark.src = '/site/assets/brand/tile.svg';
  mark.alt = '';
  mark.draggable = false;
  mark.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  bloom.appendChild(mark);
  overlay.appendChild(bloom);

  // the sphere's tiles: the rail's own markup (.rail-item[data-app], hub-boot
  // brand rules + hero-xdxd.css's four sphere-only grounds), full-bleed image
  // tiles, and transparent face tiles at the registry marks' 60% face
  const rotY3 = (v, a) => ({ x: v.x * Math.cos(a) + v.z * Math.sin(a), y: v.y, z: -v.x * Math.sin(a) + v.z * Math.cos(a) });
  const FIB = Array.from({ length: N }, (_, i) => {
    const y = 1 - (2 * i + 1) / N;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = 2.399963 * i;
    return { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
  });
  const popAt = (i) => T.POP_START + i * T.POP_STAGGER;
  const omegaAt = (tMs) => {
    const x = clamp01(tMs / T.MERGE_T);
    return T.OMEGA0 * Math.exp(Math.log(T.OMEGA_MAX / T.OMEGA0) * Math.pow(x, T.OMEGA_POW));
  };
  const place3 = (el, x, y, z) => {
    el.style.transform = 'translate3d(' + (T.C - T.TILE / 2 + x) + 'px,' + (T.C - T.TILE / 2 + y) + 'px,' + z + 'px)';
  };
  const SYM = { openai: 1, claude: 1, gemini: 1, cursor: 1, copilot: 1, vscode: 1, windsurf: 1, zed: 1 };
  const tiles = SPIN.map((a) => {
    const t = document.createElement('span');
    t.className = 'rail-item' + (a.face ? ' hx-face' : '');
    t.dataset.app = a.app;
    t.title = a.name || a.app;
    t.style.cssText = 'position:absolute;left:0;top:0;width:' + T.TILE + 'px;height:' + T.TILE + 'px;will-change:transform,opacity,filter;opacity:0;border-radius:' + (T.TILE * (14 / 44)) + 'px;';
    const img = IMG[a.app] ? new Image() : null;
    if (img) { img.src = '/site/assets/brand/intro/' + IMG[a.app]; img.alt = ''; img.draggable = false; }
    if (a.face) { t.style.background = a.bg; t.style.color = 'var(--ink)'; t.appendChild(img); }
    else if (!SYM[a.app]) { t.appendChild(img); }
    else { t.innerHTML = '<svg aria-hidden="true"><use href="#sb-ic-' + a.app + '"/></svg>'; }
    const svg = t.querySelector('svg');
    if (svg) svg.style.cssText = 'width:' + (T.TILE / 44 * 31) + 'px;height:' + (T.TILE / 44 * 31) + 'px;';
    holder.appendChild(t);
    return t;
  });

  // the flip's keyframes, the clone's curve verbatim (the perspective scales
  // with the arena like every design px)
  const FLIP_KF = [
    { transform: 'perspective(' + (T.FLIP_PERSP * S) + 'px) rotateY(180deg) scale(' + (T.TILE / T.MARK) + ')', filter: 'brightness(0.5)', easing: T.FLIP_EASE },
    { transform: 'perspective(' + (T.FLIP_PERSP * S) + 'px) rotateY(0deg) scale(' + T.FLIP_PEAK + ')', filter: 'brightness(1)', offset: T.FLIP_OFFSET, easing: 'ease-out' },
    { transform: 'scale(1)', filter: 'brightness(1)' },
  ];

  // derived beat starts (ms): flip, shrink/rise, drops, glide home, inner
  // fades, then the phone beat rebased to the handoff
  const FLIP_END = T.MERGE_T + T.FLIP;                                  // 4920
  const GLIDE1_END = FLIP_END + T.GLIDE1;                               // 5540
  const DROP_LAST = GLIDE1_END + (dropItems.length - 1) * T.DROP_STAGGER + T.DROP;
  const HOME_END = DROP_LAST + T.HOME;                                  // 7290 for 8 items
  const INNER_END = HOME_END + T.INNER;                                 // 7670
  const PHONE_START = INNER_END;
  const INTRO_END = PHONE_START + T.END * 1000;                         // 13270

  // the sphere's angle as a pure function of clock: live frames integrate
  // incrementally (the clone's frame verbatim), but ?t seeks land mid-story,
  // so the seed for a seek comes from a cumulative integral table of omegaAt
  const cum = (() => {
    const steps = 2048, dt = T.MERGE_T / steps;
    const c = [0];
    for (let i = 1; i <= steps; i++) c.push(c[i - 1] + omegaAt(i * dt) * (dt / 1000));
    return { at: (ms) => {
      const u = clamp01(ms / T.MERGE_T) * steps;
      const i = Math.min(steps - 1, Math.floor(u));
      return lerp(c[i], c[i + 1], u - i);
    } };
  })();

  const params = new URLSearchParams(location.search);
  const startAt = Math.max(0, Math.round((parseFloat(params.get('t')) || 0) * 1000));
  const playing = startAt > 0 ? params.get('play') === '1' : true;
  const holding = !playing;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let clock = 0, ang = 0, last = null, phase = 'run', raf = 0;
  let handedOff = false;
  const popped = new Array(N).fill(false);
  const started = new Set();
  const once = (key, fn) => { if (!started.has(key)) { started.add(key); fn(); } };
  let paused = false;

  // the finishers: WAAPI, fill forwards, paused with the clock. Each beat is
  // evaluated as a pure function of clock so ?t seeks land exactly: a seek
  // past a tween writes the end state inline; a seek inside creates the tween
  // paused at the right currentTime; live play creates it at 0 and resumes
  const tweens = [];
  const anim = (el, keyframes, opts, atMs) => {
    const a = el.animate(keyframes, opts);
    if (atMs != null) a.currentTime = Math.max(0, atMs);
    if (holding || paused) a.pause();
    tweens.push(a);
    return a;
  };
  const settle = (el) => {
    for (const a of el.getAnimations()) { try { a.commitStyles(); } catch (e) {} try { a.cancel(); } catch (e2) {} }
  };

  // handoff + dissolve (clone verbatim)
  const handoff = () => {
    if (handedOff) return;
    handedOff = true;
    if (led) led.classList.add('on');
  };
  const dissolve = () => {
    if (!overlay.isConnected) return;
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), T.DISSOLVE_REMOVE);
  };

  // beat 5: the phone beat, hub-boot.js's 17.0-22.4 rebased to the handoff
  // (its 17.0, the chat lane having landed, is 0 here). One clock: this is
  // evaluated every frame from the main loop, pure of pt. W6: the whole
  // beat (noPhone, dock, placeBeam, playPhoneFrame and its PHONE constants)
  // lives in hub-handoff.js and is imported above

  // the landing geometry, measured when the flip settles: the real rail's
  // slot center in overlay px. Rects come back in SCREEN px but transforms
  // apply in the stage's LOCAL px, and an ancestor scales the stage (44px
  // tiles can render at 55px): Z converts one to the other (clone verbatim)
  let Z = 1, span = 0, sbFx = 0, sbFy = 0, homeY = 0, k = 1, rx = 0, ry = 0;
  const measure = () => {
    const ovR = overlay.getBoundingClientRect();
    const sbR = sb.getBoundingClientRect();
    Z = sbR.width / (parseFloat(getComputedStyle(sb).width) || sbR.width) || 1;
    const lastR = dropItems.length ? dropItems[dropItems.length - 1].getBoundingClientRect() : sbR;
    span = ((lastR.top + lastR.height / 2) - (sbR.top + sbR.height / 2)) / Z;
    sbFx = (sbR.left + sbR.width / 2 - ovR.left) / Z;
    sbFy = (sbR.top + sbR.height / 2 - ovR.top) / Z;
    homeY = acy() - span / 2;
    k = (sbR.width / Z) / (T.MARK * S);
    // stand the real rail in mid-stage under the mark (clone verbatim):
    // its superbot slot under the mark, every child waiting hidden
    rx = acx() - sbFx; ry = homeY - sbFy;
    rail.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
  };

  // beats 2-4, evaluated by clock: each guard runs once, writes inline end
  // states for seeks past it, and creates tweens paused at the seek for seeks
  // inside it. Live play creates them at 0 and they ride the clock 1:1
  const finisher = () => {
    if (clock < T.MERGE_T) return;
    // beat 3: the rail's own ground — hub-boot.css hides .hub .inner (the
    // .rail column is class .inner too) at opacity 0 until the boot story
    // reveals it, and this module's `inners` list deliberately excludes the
    // rail, so without this the rail and every child behind it stay at the
    // stylesheet's opacity 0 no matter what the drops spring to. Same
    // mechanism as the boot story's own reveal (hub-boot.js render:
    // inners.forEach((el) => op(el, seg(t, 14.6, 14.95)))): per-frame inline
    // opacity, pure of clock, across the glide — fully opaque the moment the
    // first drop starts (GLIDE1_END) and at 1 through beat 4 and the hold
    op(rail, seg(clock, FLIP_END, GLIDE1_END)); // W6: this and the hub line
    // below are the shared revealHub's opacity ground (hub-handoff.js);
    // grounds:false is the intro-time window, where the hub's chrome must
    // stay transparent until the home beat
    revealHub(seg(clock, FLIP_END, GLIDE1_END), { grounds: false });
    // ... and the rail's parent: #hub itself is op(hub, 0) at boot and the
    // home beat's op(hub, 1) does not run until DROP_LAST, so the rail's
    // per-frame opacity rode under a transparent parent and nothing inside
    // the hub painted at the mid-stage drops. Same window, same mechanism —
    // the hub's chrome is transparent until the home beat (boot: hub.style
    // background/borderColor/boxShadow; home: restored over GROUND 520ms),
    // so revealing it mid-stage shows only the rail under the mark; the
    // other columns still wait behind .inner { opacity: 0 }
    op(hub, seg(clock, FLIP_END, GLIDE1_END));
    once('flip', () => {
      bloom.style.opacity = '1';
      if (clock < FLIP_END) anim(bloom, FLIP_KF, { duration: T.FLIP, fill: 'forwards' }, clock - T.MERGE_T);
    });
    if (clock < FLIP_END) return;
    once('measure', measure);
    if (clock < GLIDE1_END) return;
    once('glide1', () => {
      if (clock >= GLIDE1_END) bloom.style.transform = 'translate(0,' + (homeY - acy()) + 'px) scale(' + k + ')';
      else anim(bloom, [
        { transform: 'translate(0,0) scale(1)' },
        { transform: 'translate(0,' + (homeY - acy()) + 'px) scale(' + k + ')' },
      ], { duration: T.GLIDE1, easing: T.GLIDE, fill: 'forwards' }, clock - FLIP_END);
    });
    // beat 3b: the icons drop down from the tile, one at a time
    dropItems.forEach((el, i) => {
      const at = GLIDE1_END + i * T.DROP_STAGGER;
      if (clock < at) return;
      once('drop' + i, () => {
        if (clock >= at + T.DROP) { el.style.opacity = '1'; el.style.transform = ''; return; }
        anim(el, [
          { transform: 'translateY(' + (-T.DROP_FROM) + 'px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ], { duration: T.DROP, easing: T.DROP_EASE, fill: 'both' }, clock - at);
      });
    });
    if (clock < DROP_LAST) return;
    once('home', () => {
      // beat 4: ALL of it moves left as one: the rail glides home, the tile
      // rides its slot, and the window's ground grows in around them
      op(hub, 1);
      hub.style.transition = 'background-color ' + T.GROUND + 'ms ease-out, border-color ' + T.GROUND + 'ms ease-out';
      rail.style.transition = 'background-color ' + T.GROUND + 'ms ease-out, border-right-color ' + T.GROUND + 'ms ease-out';
      hub.style.background = '';
      hub.style.borderColor = '';
      rail.style.background = '';
      rail.style.borderRightColor = '';
      if (clock >= HOME_END) { rail.style.transform = ''; op(sb, 1); sb.classList.add('sel'); bloom.remove(); }
      else {
        const gx = sbFx - acx(), gy = sbFy - homeY;
        anim(rail, [
          { transform: 'translate(' + rx + 'px,' + ry + 'px)' },
          { transform: 'translate(0,0)' },
        ], { duration: T.HOME, easing: T.GLIDE, fill: 'forwards' }, clock - DROP_LAST);
        anim(bloom, [
          { transform: 'translate(0,' + (homeY - acy()) + 'px) scale(' + k + ')' },
          { transform: 'translate(' + gx + 'px,' + (homeY - acy() + gy) + 'px) scale(' + k + ')' },
        ], { duration: T.HOME, easing: T.GLIDE, fill: 'forwards' }, clock - DROP_LAST);
      }
    });
    // beat 4b: the inner columns fade over INNER (380ms). W6: revealInners,
    // the shared implementation (hub-handoff.js) — same window, pure of
    // clock, replacing the WAAPI tween it used before the cut
    if (clock >= HOME_END) revealInners(seg(clock, HOME_END, INNER_END));
    if (clock < HOME_END) return;
    if (clock < INNER_END) return;
    once('handoff', () => {
      settle(rail);
      rail.style.transform = '';
      op(sb, 1);
      sb.classList.add('sel');
      if (bloom.isConnected) bloom.remove();
      hub.style.transition = '';
      rail.style.transition = '';
      hub.style.boxShadow = '';
      inners.forEach((el) => { settle(el); op(el, 1); el.style.transform = ''; });
      handoff();
      if (overlay.isConnected) dissolve();
      placeBeam();
    });
  };

  // the one render: the sphere's beats, the finisher and the phone beat, all
  // pure of clock
  const render = () => {
    if (clock < T.MERGE_T + T.TILE_FADE) {
      for (let i = 0; i < N; i++) {
        if (clock >= popAt(i)) popped[i] = true;
        if (!popped[i]) continue;
        const v = rotY3(FIB[i], ang);
        const mergeT = Math.pow(clamp01((clock - (T.MERGE_T - T.MERGE_WINDOW)) / T.MERGE_WINDOW), T.MERGE_POW);
        const x = lerp(v.x * T.R, 0, mergeT), y = lerp(v.y * T.R, 0, mergeT), z = v.z * lerp(T.R, 10, mergeT);
        const depth = (z + 190) / 380;
        place3(tiles[i], x, y, z);
        tiles[i].style.opacity = String(Math.min(1, (0.16 + 0.84 * depth) * (1 - clamp01((clock - T.MERGE_T) / T.TILE_FADE))));
        const blurT = clamp01((clock - T.MERGE_T * 0.62) / (T.MERGE_T * 0.38));
        const blur = Math.pow(blurT, 2) * 3.6 + (depth < 0.5 ? (0.5 - depth) * 3 : 0);
        tiles[i].style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
      }
    } else if (tiles[0].style.visibility !== 'hidden') {
      tiles.forEach((t) => { t.style.visibility = 'hidden'; });
    }
    finisher();
    if (clock >= PHONE_START) playPhoneFrame((clock - PHONE_START) / 1000);
    if (clock >= INTRO_END && phase !== 'hold') {
      phase = 'hold';
      playPhoneFrame(T.END);
      // the hold is the boot hero's terminal-collapsed state (hub-boot.js
      // placeParked, hub-boot.css .stage.perched): .perched lifts the hub
      // off the foot and takes .replay-park to the centred placement under
      // the window instead of over the sidebar's user row. W6: perch(), the
      // shared implementation (hub-handoff.js)
      perch();
      cancelAnimationFrame(raf);
    }
  };

  // reduced motion: ONE still, the hub fully revealed with the phone docked,
  // no clock (mirrors hub-boot.js applyStillEnd for this variant). W6: the
  // composed end state is the shared still() (hub-handoff.js); the wrapper
  // only drops this variant's own sphere overlay
  const still = () => { overlay.remove(); stillShared(); };

  // pause with the clock: the stage observer + the tab's visibility. WAAPI
  // tweens pause where they stopped and resume there (the assignment's
  // contract for the four finisher tweens)
  const setPaused = (v) => {
    if (paused === v || holding || reduce) return;
    paused = v;
    if (v) for (const a of tweens) if (a.playState === 'running') a.pause();
    else for (const a of tweens) if (a.playState === 'paused') a.play();
  };
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) setPaused(en.intersectionRatio < 0.15);
  }, { threshold: [0, 0.15, 0.5] });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));

  // #replay restarts the whole intro: reload at the same hero (the boot
  // hero's hold pattern: the button is the page's own restart). W6: wired
  // through the shared wireReplay (hub-handoff.js)
  wireReplay(() => { location.reload(); });

  // the watchdog: force the handoff and dissolve so the stage is never
  // covered, then play the phone anyway (clone verbatim: startAt + 11s;
  // live plays only, holds are captures)
  const force = () => {
    if (holding || reduce || phase === 'hold') return;
    clock = Math.max(clock, PHONE_START);
    setPaused(false);
    render();
  };
  setTimeout(force, startAt + T.WATCHDOG);

  // the one clock: the sphere's beats AND the phone beat, from the main loop.
  // Live frames integrate the clone's frame verbatim
  const liveFrame = (ts) => {
    if (last == null) last = ts;
    const dMs = Math.min(50, ts - last);
    last = ts;
    raf = requestAnimationFrame(liveFrame);
    if (paused) return;
    clock += dMs;
    if (clock < T.MERGE_T) ang += (dMs / 1000) * omegaAt(Math.min(clock, T.MERGE_T));
    render();
  };

  if (reduce) { still(); return; }

  if (holding) {
    // held: render the frame at the seek and stop (captures)
    clock = startAt;
    ang = cum.at(startAt);
    render();
    replay.hidden = clock < INTRO_END;
    // held past the end: the same perched hold the live play settles
    // (mid-story holds stay unperched — the lift would move the hub the
    // mid-story measure() already measured)
    if (clock >= INTRO_END) stage.classList.add('perched');
  } else {
    clock = startAt;
    ang = cum.at(startAt);
    last = null;
    raf = requestAnimationFrame(liveFrame);
  }
  window.__heroXdxd = { get clock() { return clock; }, get phase() { return phase; }, force, still };
}
