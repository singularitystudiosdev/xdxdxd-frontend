// hub-handoff.js: the stage handoff shared by the landing hero variants (W6,
// extracted from hero-xdxd.js so both variants hand #stage to the real app
// through ONE implementation). The contract, in the owner's terms: the intro
// plays, then the tagline's black layer hands the stage to the actual app
// display — the hub grounds in, its inner columns fade up, the intro overlay
// dissolves, the phone beat runs rebased to the handoff, and the story rests
// on the real interface with #replay shown (no auto-loop, no end card).
//
// Exports (all named):
//   PHONE           the beat-5 constants (hub-boot.js 17.0-22.4 rebased to
//                   the handoff, s); hero-xdxd.js spreads them into TIMING
//   prepStage(stage, heroName)  one-time stage preparation, idempotent:
//                   data-hero on #stage (the shared .stage[data-hero] sheet
//                   rules key on the attribute, hero-xdxd.css), the margin
//                   transcript column collapsed, the hub's window and rail
//                   grounds forced transparent (their stylesheet values are
//                   captured first so revealHub can lerp them back), every
//                   boot-story row and rail child zeroed, .docked/.perched
//                   cleared, #replay hidden. Returns the resolved refs.
//   revealHub(p, opts)          pure of a 0..1 progress: #hub and #hub .rail
//                   opacity ride p, and (unless opts.grounds === false) the
//                   captured window grounds lerp from transparent to their
//                   captured colours on the same progress, with the superbot
//                   slot surfacing under them. opts.grounds === false is the
//                   intro-time window (hero-xdxd.js's mid-stage rail reveal),
//                   where the grounds must stay transparent.
//   revealInners(p)             pure of a 0..1 progress: the non-rail .inner
//                   columns fade (hub-boot.css keeps .hub .inner at 0).
//   placeBeam()     the sync beam's geometry (hub-boot.js layout() port)
//   playPhoneFrame(pt)          pure of the rebased phone clock, s
//   still()         the composed end state (the hub fully revealed, the phone
//                   docked, .perched, #replay shown)
//   perch()         the hold: .perched on #stage + #replay shown (idempotent)
//   wireReplay(restart)         #replay -> restart()
//
// One rAF-clock assumption inherited from the variants: every call here is
// driven per frame by the caller's clock, so a paused clock freezes the
// handoff exactly where it stopped. No timers, no WAAPI in this module.

export const PHONE = {
  // beat 5: the phone beat (hub-boot.js 17.0-22.4) rebased to the handoff, s
  FEED0: 0.0, UP0: 1.0, UP1: 1.5, BEAM0: 2.2, BEAM1: 2.5, COMET0: 2.4, COMET1: 4.0,
  LABEL: 4.0, LINE2: 4.2, SYNC0: 4.2, SYNC1: 4.4, BEAM_FADE0: 4.4, BEAM_FADE1: 4.8,
  DOCK: 5.0, LABEL_FADE1: 5.4, END: 5.6, POP: 0.25, POP_DY: 6, LABEL_DY: 4,
};

const P = PHONE;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const outQuint = (p) => 1 - Math.pow(1 - p, 5);
const outBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const inOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const op = (el, v) => { if (el) el.style.opacity = String(clamp01(v)); };
const popIn = (el, t, at, dur = P.POP, dy = P.POP_DY) => {
  if (!el) return;
  const p = seg(t, at, at + dur);
  op(el, p * 2);
  el.style.transform = 'translateY(' + ((1 - outBack(p)) * dy).toFixed(1) + 'px)';
};

// the refs prepStage resolved; null until the first call
let S = null;

export function prepStage(stage, heroName) {
  const $ = (id) => document.getElementById(id);
  const hub = $('hub'), rail = hub.querySelector('.rail'), sb = rail.querySelector('.rail-item.sb');
  const dropItems = [...rail.children].filter((el) => el !== sb);
  const inners = [...hub.querySelectorAll('.inner')].filter((el) => !el.classList.contains('rail'));
  const feed = [1, 2].map((n) => hub.querySelector('.msg[data-m="' + n + '"]'));
  const phone = $('phone'), phoneMsgs = [...phone.querySelectorAll('.msg')];
  const phoneLabel = $('phone-label'), sync = $('sync');
  const beam = $('beam'), beamPath = $('beam-path'), beamRun = $('beam-run-path');
  const beamFade = $('beam-fade'), beamRunGrad = $('beam-run');
  const replay = $('replay'), led = $('led'), margin = $('margin');
  const arena = $('arena') || stage;

  // the stylesheet's own window grounds, captured BEFORE they are forced
  // transparent: revealHub lerps back to exactly these, so a token change in
  // hub-boot.css/site.css stays one edit there (no values duplicated here)
  const hcs = getComputedStyle(hub), rcs = getComputedStyle(rail);
  const C = { hubBg: hcs.backgroundColor, hubBd: hcs.borderColor,
              railBg: rcs.backgroundColor, railBd: rcs.borderRightColor };

  // the shared sheet rules (hero-xdxd.css .stage[data-hero]) hide the
  // boot-story-only children the variants do not use
  stage.dataset.hero = heroName;
  hub.removeAttribute('aria-hidden');

  // the transcript margin column is dead weight (the boot story is unused):
  // collapse it from the very first frame so the arena and the hub own the
  // full stage width, with no empty panel on the left
  const body = stage.querySelector('.body') || stage;
  body.style.transition = 'none';
  body.style.gridTemplateColumns = '0% minmax(0, 1fr)';
  if (margin) { margin.style.opacity = '0'; margin.style.padding = '0'; margin.style.borderRight = '0'; margin.style.overflow = 'hidden'; }

  // the frontend waits invisible: window and rail grounds are transparent
  // until the reveal, the superbot slot waits, and the rest columns wait for
  // their fade. The stylesheet gives .hub a transition list (background-
  // color, border-color...) that would turn these instant changes into a
  // visible fade, so transitions are off while the stage is set
  hub.style.transition = 'none';
  rail.style.transition = 'none';
  hub.style.background = 'transparent';
  hub.style.borderColor = 'transparent';
  hub.style.boxShadow = 'none';
  rail.style.background = 'transparent';
  rail.style.borderRightColor = 'transparent';
  rail.style.transform = '';
  sb.classList.remove('sel');
  op(hub, 0);
  hub.style.transform = '';

  // the phone cut's rest state (hub-boot.css .phone/.beam): the phone sits
  // below the arena, the beam dark, the label and chip dark, the story's own
  // feed rows and the rail's children waiting
  const noPhone = getComputedStyle(phone).display === 'none';
  op(phone, 0); phone.style.transform = '';
  op(phoneLabel, 0); op(sync, 0); op(beam, 0);
  op(sb, 0);
  feed.forEach((el) => { if (el) { op(el, 0); el.style.transform = ''; } });
  phoneMsgs.forEach((el) => { op(el, 0); el.style.transform = ''; });
  dropItems.forEach((el) => { op(el, 0); el.style.transform = ''; });
  inners.forEach((el) => { op(el, 0); el.style.transform = ''; });
  phone.classList.remove('docked');
  hub.classList.remove('docked');
  stage.classList.remove('perched');
  replay.hidden = true;

  S = { stage, hero: heroName, arena, hub, rail, sb, dropItems, inners, feed, phone, phoneMsgs,
        phoneLabel, sync, beam, beamPath, beamRun, beamFade, beamRunGrad, replay, led,
        C, noPhone, docked: false, B: null };
  return S;
}

// rgba(13,13,13,0.42)-style lerp from transparent to a captured css color
function rideGround(style, prop, captured, p) {
  const m = captured.match(/\d+/g);
  if (!m || m.length < 3) { if (p > 0) style[prop] = captured; return; }
  style[prop] = 'rgba(' + m.slice(0, 3).join(',') + ',' + p.toFixed(3) + ')';
}

export function revealHub(p, opts = {}) {
  if (!S) return;
  p = clamp01(p);
  const { hub, rail, sb } = S;
  // hub-boot.css keeps .hub .inner (the .rail column is class .inner too) at
  // opacity 0; per-frame inline opacity, pure of progress. The rail rides
  // under its parent, so both need the same window (same mechanism as
  // hero-xdxd.js's verified mid-stage reveal)
  op(rail, p);
  op(hub, p);
  if (opts.grounds === false) return;
  // the window grounds grow in on the same progress: captured colours lerp
  // from transparent (the boot story's own reveal, hub-boot.js home beat,
  // rides a 520ms CSS transition — the clock-driven variants write per frame)
  rideGround(hub.style, 'background', S.C.hubBg, p);
  rideGround(hub.style, 'borderColor', S.C.hubBd, p);
  rideGround(rail.style, 'background', S.C.railBg, p);
  rideGround(rail.style, 'borderRightColor', S.C.railBd, p);
  // the superbot slot surfaces with its ground, SELECTED from the first frame
  // it is visible: `.sel` is what swaps the bare tile for the face and wakes
  // the aura (hub-boot.css .rail-item.sb.sel), so adding it only at p=1 fades
  // the plain tile in and then flicks it into its colouring (owner,
  // 2026-09-09). Set at p>0, the aura's own settle transition rides under the
  // opacity ramp and the tile arrives already in its final look. The rest of
  // the rail (the app tiles, the folder, the add tile) rides the same progress
  // unless the caller animates them itself (the sphere intro drops them in one
  // by one, so it passes `items: false`)
  op(sb, p);
  if (p > 0) sb.classList.add('sel');
  if (opts.items !== false) S.dropItems.forEach((el) => op(el, p));
}

export function revealInners(p) {
  if (!S) return;
  p = clamp01(p);
  S.inners.forEach((el) => op(el, p));
}

// the sync beam's geometry, measured against the arena (hub-boot.js layout()
// port, hero-xdxd.js verbatim)
export function placeBeam() {
  if (!S || S.noPhone) return;
  const { arena, phone, beam, beamPath, beamRun, beamFade, beamRunGrad } = S;
  if (!beam || !beamPath || !beamRun || !beamFade || !beamRunGrad) return;
  const W = arena.clientWidth, H = arena.clientHeight;
  // offset* ignores transforms, so the phone's rest position is read while
  // it still sits below the arena
  const px = phone.offsetLeft, py = phone.offsetTop, pw = phone.offsetWidth;
  const x0 = W * 0.45, y0 = H * 0.62, x1 = px + pw * 0.22, y1 = py + 10;
  const cx = x0 + (x1 - x0) * 0.3, cy = y1 - 14;
  const d = 'M ' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  beamPath.setAttribute('d', d);
  beamRun.setAttribute('d', d);
  S.B = { x0, x1, span: Math.max(90, (x1 - x0) * 0.42) };
  for (const g of [beamFade, beamRunGrad]) { g.setAttribute('y1', '0'); g.setAttribute('y2', '0'); }
  beamFade.setAttribute('x1', x0.toFixed(1));
  beamFade.setAttribute('x2', x1.toFixed(1));
  // the light parked wholly before the rail's start until its run
  beamRunGrad.setAttribute('x1', (S.B.x0 - S.B.span).toFixed(1));
  beamRunGrad.setAttribute('x2', S.B.x0.toFixed(1));
  beam.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
}

// beat 5, evaluated every frame from the caller's clock, pure of pt (s):
// hub-boot.js's 17.0-22.4 rebased to the handoff (its 17.0, the chat lane
// having landed, is 0 here)
export function playPhoneFrame(t) {
  if (!S) return;
  const { feed, phone, phoneMsgs, phoneLabel, sync, beam } = S;
  popIn(feed[0], t, P.FEED0);
  popIn(feed[1], t, P.LINE2);
  if (S.noPhone) return;
  if (S.B) op(beam, seg(t, P.BEAM0, P.BEAM1) * (1 - seg(t, P.BEAM_FADE0, P.BEAM_FADE1)));
  op(sync, seg(t, P.SYNC0, P.SYNC1));
  const p = outQuint(seg(t, P.UP0, P.UP1));
  op(phone, p * 2);
  if (!S.docked) phone.style.transform = 'translateY(' + ((1 - p) * 120).toFixed(1) + '%)';
  popIn(phoneMsgs[0], t, P.UP1);
  popIn(phoneMsgs[1], t, P.LINE2);
  if (S.B) {
    // one light, once: swept from wholly before the start to wholly past
    // the end, so it enters and leaves the rail as a comet
    const gx = lerp(S.B.x0 - S.B.span, S.B.x1 + S.B.span, inOut(seg(t, P.COMET0, P.COMET1)));
    S.beamRunGrad.setAttribute('x1', gx.toFixed(1));
    S.beamRunGrad.setAttribute('x2', (gx + S.B.span).toFixed(1));
  }
  // the label under the phone has no room once it docks flush with the hub's
  // foot; the "synced" chip takes the signal dots' slot once docked
  if (t >= P.DOCK) {
    if (!S.docked) {
      S.docked = true;
      phone.style.transform = 'translateY(0%)';
      phone.classList.add('docked');
      S.hub.classList.add('docked');
    }
    op(phoneLabel, 1 - seg(t, P.DOCK, P.LABEL_FADE1));
  }
}

// the hold: the boot hero's terminal-collapsed state — the same `perched`
// stage class the boot story settles in placeParked() (hub-boot.js:344, 444),
// which lifts the hub off the foot and takes .replay-park to the centred
// placement under the window (hub-boot.css .stage.perched). Idempotent.
export function perch() {
  if (!S) return;
  S.stage.classList.add('perched');
  S.replay.hidden = false;
}

// reduced motion: ONE still, the hub fully revealed with the phone docked,
// no clock (mirrors hub-boot.js applyStillEnd for this variant)
export function still() {
  if (!S) return;
  const { hub, rail, sb, dropItems, inners, feed, phone, phoneMsgs, phoneLabel, led, replay } = S;
  op(hub, 1);
  hub.style.transition = '';
  rail.style.transition = '';
  hub.style.background = '';
  hub.style.borderColor = '';
  hub.style.boxShadow = '';
  rail.style.background = '';
  rail.style.borderRightColor = '';
  rail.style.transform = '';
  op(rail, 1); // hub-boot.css's .hub .inner hides the rail's ground too
  dropItems.forEach((el) => { op(el, 1); el.style.transform = ''; });
  op(sb, 1);
  sb.classList.add('sel');
  inners.forEach((el) => { op(el, 1); el.style.transform = ''; });
  feed.forEach((el) => { if (el) { op(el, 1); el.style.transform = ''; } });
  if (led) led.classList.add('on');
  perch();
  if (S.noPhone) return;
  phoneMsgs.forEach((el) => { op(el, 1); el.style.transform = ''; });
  op(phone, 1);
  op(sync, 1); op(phoneLabel, 0); op(beam, 0);
  S.docked = true;
  phone.style.transform = 'translateY(0%)';
  phone.classList.add('docked');
  hub.classList.add('docked');
}

// #replay restarts the caller's whole story
export function wireReplay(restart) {
  if (!S) return;
  S.replay.addEventListener('click', restart);
}
