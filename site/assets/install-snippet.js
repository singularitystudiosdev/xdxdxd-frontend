// Install snippet with OS detection. Shared by the landers:
//   import { mountInstallSnippet } from '/site/assets/install-snippet.js?v=32';
//   mountInstallSnippet(document.getElementById('oneliner'));
// There is no installer anymore: the MCP server is hosted on the origin and
// the desktop app (linked from /download) wires every AI client on the
// machine. The widget leads with the paste-to-agent command row (what is
// shown IS what is copied), then a quiet "setup for every client" link to
// /install, then the "what does this do?" fold carrying the per-client
// alternates (claude code's own add line, VS Code's one-click URL).
// Self-styled via CSS vars with fallbacks so it inherits each page's tokens
// (site/assets/site.css).
//
// Fires `superbot:copied` on window with { source } after a copy that
// actually happened (the mascot celebrates; /docs advances its step rail).

import { detectPlatform } from '/site/assets/os-detect.js?v=1';

// The desktop OS for the widget's own purposes, mapped off the one shared
// ladder (os-detect.js, also behind download.html, the header's nav-store.js
// and chat.js's gate): windows -> 'win', mac -> 'mac', linux -> 'linux'.
// A phone (ios or android) or an unknown platform answers null when the
// device reads as mobile — the download belongs on the computer there, which
// is the old fallback's noDownload behaviour — and 'linux' only for an
// unknown desktop platform.
function detectOS() {
  const { os, mobile } = detectPlatform();
  if (os === 'windows') return 'win';
  if (os === 'mac') return 'mac';
  if (os === 'linux') return 'linux';
  return mobile ? null : 'linux';
}

// The touch/mobile predicate shared with /chat's account gate (chat.js
// imports it so the two cannot drift): when it answers true the visitor is on
// a phone or tablet, the download belongs on the computer, and the widget
// says so instead of offering a desktop artifact as its primary.
export const isTouchDevice = () => {
  // os-detect.js carries the same ladder plus the iPadOS desktop-mode case,
  // so its answer wins; the old probe below stays for anything where the
  // import is unavailable. (chat.js imports this by name — shape intact.)
  try { if (detectPlatform().mobile) return true; } catch { /* os-detect unavailable */ }
  return matchMedia('(pointer: coarse)').matches || /android|iphone|ipad|mobile/i.test(navigator.userAgent || '');
};

// Evidence for an arch chip when client hints are absent: Safari answers
// navigator.userAgentData with nothing, so the WebGL renderer is the only
// probe left. WEBGL_debug_renderer_info exposes UNMASKED_RENDERER_WEBGL
// (MDN: https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info,
// retrieved 2026-09-04). CAVEAT, same retrieval: current Safari masks the
// renderer to "Apple GPU" on EVERY mac, Intel included (gpuweb/gpuweb#2195,
// retrieved 2026-09-04), so "Apple GPU" is only WEAK arm evidence on Safari.
// Firefox with privacy.resistFingerprinting disables the extension entirely
// (MDN), and any throw or miss leaves arch null. Never blocks rendering:
// try/catch around the whole probe.
function webglArch() {
  try {
    const canvas = document.createElement && document.createElement('canvas');
    const gl = canvas && canvas.getContext && canvas.getContext('webgl');
    if (!gl || !gl.getExtension || !gl.getParameter) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return null;
    const r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    if (!r) return null;
    if (/Apple (GPU|M\d)/i.test(r)) return 'arm';
    if (/Intel|AMD|Radeon|NVIDIA/i.test(r)) return 'x64';
    return null;
  } catch {
    // no canvas, no webgl, a masked renderer, anything — no evidence
  }
  return null;
}

// arch, best effort: userAgentData's high-entropy ask is the strongest signal
// (its UA is frozen at "Intel" on all macs). Without client hints, the UA
// string sniff covers Linux (its UA carries the real arch) and a WebGL
// renderer probe takes a mac the rest of the way; anything unresolved leaves
// arch null and the caller's default stands. windowsArm64 is TRUE only on
// POSITIVE arm evidence: the client hint's architecture 'arm' WITH bitness
// '64', or an ARM64 token in the UA string — a bare 'arm' answer with no
// bitness never claims arm64. `source` says where the answer came from:
// 'client-hints' when the probe answered (the only fully-trusted tier),
// 'webgl' when the renderer decided, 'none' when the default was kept on no
// evidence. Exported for /chat's gate (chat.js), which paints its own
// arch-aware rows.
export async function detectArchEvidence(dlOS) {
  let arch = null;
  let heAnswered = false;
  let heBitness64 = false;
  try {
    const he = await navigator.userAgentData?.getHighEntropyValues?.(['architecture', 'bitness']);
    if (/^arm/.test(he?.architecture || '')) { arch = 'arm'; heAnswered = true; heBitness64 = he?.bitness === '64'; }
    else if (/^x86/.test(he?.architecture || '')) { arch = 'x64'; heAnswered = true; }
  } catch {
    // no userAgentData — the UA sniff below decides
  }
  if (!arch) {
    const ua = `${navigator.userAgent || ''} ${navigator.platform || ''}`;
    if (/aarch64|arm64|armv[78]/i.test(ua)) arch = 'arm';
    else if (/x86_64|amd64|x64/i.test(ua)) arch = 'x64';
  }
  let source = heAnswered ? 'client-hints' : 'none';
  if (!arch && dlOS === 'mac') {
    const w = webglArch();
    if (w) { arch = w; source = 'webgl'; }
  }
  return { arch, heAnswered, source, windowsArm64: (heAnswered && heBitness64) || (!heAnswered && arch === 'arm') };
}

// The /onboard card's primary-download contract: the desktop app page,
// handed over as data. Resolves to { href, label, file, afterLine }, or null
// on a touch/mobile device (the download belongs on the computer there).
// Never throws. onboarding-page.ts imports it as
// /site/assets/install-snippet.js?v=32 — the name and shape are fixed.
export async function resolvePrimaryDownload() {
  try {
    if (isTouchDevice()) return null;
    return {
      href: `${location.origin}/download`,
      label: 'Download the desktop app',
      file: 'superbot-desktop',
      afterLine: '',
    };
  } catch {
    return null;
  }
}

// Minimal tinting for copy boxes: the command word bright, flags muted,
// URLs in the accent. WYSIWYG contract: this styles the SAME text that is
// copied — the plain string still rides the copy handler untouched.
function tint(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(https?:\/\/[^\s"]+)/g, '<span class="sb-url">$1</span>')
    .replace(/(^|\s)(curl|wget|powershell|npx|sh|claude)(?=\s|$)/g, '$1<b>$2</b>')
    .replace(/(^|\s)(-{1,2}[a-zA-Z][\w-]*)/g, '$1<span class="sb-flag">$2</span>');
}

const CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COPY = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke="currentColor" stroke-width="1.6"/></svg>';

// the storm copy button, shared by the widget's rows and the standalone
// command row (mountCommandRow): a .sb-btn carrying the copy icon and label
const copyBtn = (cls, label = 'copy') =>
  `<button class="sb-btn ${cls}" type="button" aria-label="copy command">${COPY}<span>${label}</span></button>`;

// the STYLE tag goes in once per page, whichever mount ran first
function ensureStyle() {
  if (document.getElementById('sb-oneliner-style')) return;
  const style = document.createElement('style');
  style.id = 'sb-oneliner-style';
  style.textContent = STYLE;
  document.head.appendChild(style);
}

// Same ladder as the landers' copy buttons: async clipboard in secure
// contexts, execCommand elsewhere, prompt last — and feedback only on a
// copy that actually happened. `text` may be a getter so the main box
// always copies what is currently displayed. `live` is the aria-live
// region to announce through (null on a mount that has none);
// `restore` is the button's idle markup, replayed after the copied dwell.
function wireCopy(btn, text, source, live, restore = copyBtn('sb-copy')) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const value = typeof text === 'function' ? text() : text;
    const done = () => {
      const box = btn.closest('.sb-cmd');
      box.classList.remove('copied');
      void box.offsetWidth; // reflow so the ring replays on rapid re-clicks
      box.classList.add('copied');
      clearTimeout(box._t);
      // 2000ms is the copy-confirmation dwell shadcn's copy-button and
      // VitePress's copyCode both ship (retrieved 2026-09-04)
      box._t = setTimeout(() => box.classList.remove('copied'), 2000);
      dispatchEvent(new CustomEvent('superbot:copied', { detail: { source } }));
      btn.innerHTML = `${CHECK}<span>copied</span>`;
      btn.classList.add('copied');
      if (live) live.textContent = 'copied to clipboard';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.innerHTML = restore; btn.classList.remove('copied'); if (live) live.textContent = ''; }, 1500);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } finally {
        ta.remove();
      }
      if (ok) done();
      else {
        // both clipboard rungs refused: leave the command selected so one
        // keystroke copies it, and say so — no modal
        const codeEl = btn.closest('.sb-cmd')?.querySelector('code');
        if (codeEl) { const sel = getSelection(); sel.removeAllRanges(); const r = document.createRange(); r.selectNodeContents(codeEl); sel.addRange(r); }
        if (live) live.textContent = 'clipboard blocked: the command is selected, press copy on your keyboard';
      }
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, fallback);
    else fallback();
  });
}

// ---- token mirror ----
// The hardcoded fallbacks in STYLE below mirror the canonical token sheet in
// site/assets/site.css (the :root block: surfaces + ink, the one accent,
// radii, spacing, type, durations, targets). site.css is the single source of truth; these
// fallbacks exist so pages that predate the sheet still paint. Any token
// change in site.css MUST update this mirror in the same commit, or the two
// surfaces drift.
const STYLE = `
.sb-oneliner {
  /* stay inside the page's centered column — never span the page margins */
  margin: 0 auto; max-width: var(--content, 720px); width: 100%; text-align: left;
  font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px);
}
.sb-oneliner .sb-or { color: var(--muted, #9a9a9a); margin-bottom: var(--sp-2, 8px); }
.sb-oneliner .sb-or:empty { display: none; }
/* the "setup for every client" link: a quiet text control (muted, underlined
   on hover), a full-height touch target */
.sb-oneliner .sb-more-link {
  display: inline-flex; align-items: center; min-height: max(24px, var(--target-sm, 28px)); padding: 0;
  background: none; border: 0; color: var(--muted, #9a9a9a); font: inherit; font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px);
  text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; cursor: pointer;
  transition: color var(--dur-2, 150ms) var(--ease-std, ease), text-decoration-color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner .sb-more-link:hover, .sb-oneliner .sb-more-link:focus-visible { color: var(--fg, #ececec); text-decoration-color: currentColor; }
.sb-oneliner .sb-more { margin-top: var(--sp-2, 8px); }
.sb-oneliner .sb-cmd {
  display: flex; gap: var(--sp-3, 12px); align-items: center; background: var(--card, #0d0d0d);
  border: 1px solid var(--line, #262626); border-radius: var(--r-lg, 16px); padding: var(--sp-2, 8px) var(--sp-2, 8px) var(--sp-2, 8px) var(--sp-4, 16px);
  min-height: 52px;
  transition: border-color var(--dur-3, 200ms) var(--ease-std, ease), box-shadow var(--dur-3, 200ms) var(--ease-std, ease);
}
.sb-oneliner .sb-cmd:focus-within { border-color: var(--accent); }
.sb-oneliner .sb-cmd.copied {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgb(43 107 255 / 0.18), 0 0 24px rgb(43 107 255 / 0.2);
}
/* the command WRAPS instead of scrolling: the text shown must be the text
   copied, everywhere — a hidden-scrollbar overflow on a non-focusable code is
   content a keyboard user can never reach (qa round 1, Q-01/Q-04/Q-09).
   min-width: 0 lets the flex item shrink below its content's min width */
.sb-oneliner .sb-cmd code {
  flex: 1; min-width: 0; overflow-wrap: anywhere; white-space: normal; color: var(--fg, #ececec);
  font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px); padding: var(--sp-1, 4px) 0;
}
/* the copy control is a .sb-btn storm button (site.css carries the ramp, the
   sheen and the glow); this rule keeps only the widget's own anatomy */
.sb-oneliner .sb-cmd .sb-copy, .sb-oneliner .sb-cmd .sb-copy-alt {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  color: #ffffff; border-radius: var(--r-md, 8px);
  font: inherit; font-weight: 600; min-height: var(--target, 36px); padding: 0 var(--sp-3, 12px); cursor: pointer; flex: none;
}
.sb-oneliner .sb-cmd .sb-copy-alt { background: transparent; color: var(--fg, #ececec); border: 1px solid var(--line, #262626); box-shadow: none; min-height: max(32px, var(--target-sm, 28px)); }
.sb-oneliner .sb-cmd .sb-copy-alt:hover { border-color: var(--accent); filter: none; }
.sb-oneliner .sb-cmd button.copied { background: linear-gradient(135deg, var(--accent) 0%, #6a1fd8 55%, #c026d3 100%); color: #ffffff; border-color: transparent; }
/* fold rows: a small label above each alternate command, so each one is a
   self-contained copy target instead of a wrapped inline fragment */
.sb-oneliner .sb-row { margin-top: var(--sp-3, 12px); }
.sb-oneliner .sb-row .sb-lab { color: var(--muted, #9a9a9a); font-size: var(--fs-xs, 12px); line-height: var(--lh-xs, 16px); margin-bottom: var(--sp-1, 4px); }
.sb-oneliner .sb-row .sb-cmd { min-height: 44px; padding: var(--sp-1, 4px) var(--sp-1, 4px) var(--sp-1, 4px) var(--sp-3, 12px); }
.sb-oneliner .sb-row .sb-cmd code { font-size: var(--fs-xs, 12px); }
.sb-oneliner .sb-row.sb-links { display: flex; flex-wrap: wrap; gap: var(--sp-2, 8px); align-items: center; }
.sb-oneliner .sb-row.sb-links .sb-lab { width: 100%; }
.sb-oneliner a.sb-deep {
  display: inline-flex; align-items: center; gap: 6px; min-height: max(32px, var(--target-sm, 28px)); padding: 0 var(--sp-3, 12px);
  border: 1px solid var(--line, #262626); border-radius: var(--r-md, 8px); background: transparent;
  color: var(--fg, #ececec); text-decoration: none; font-size: var(--fs-xs, 12px);
  transition: border-color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner a.sb-deep:hover { border-color: var(--accent); }
/* syntax tinting: verbs bright, flags muted, URLs accent — styling only,
   the text content stays byte-identical to what copy puts on the board */
.sb-oneliner .sb-cmd code b { color: var(--fg, #ececec); font-weight: 600; }
.sb-oneliner .sb-cmd code .sb-flag { color: var(--muted, #9a9a9a); }
.sb-oneliner .sb-cmd code .sb-url { color: var(--accent); }
.sb-oneliner details.sb-fold { margin-top: var(--sp-3, 12px); }
.sb-oneliner details.sb-fold summary {
  color: var(--muted, #9a9a9a); cursor: pointer; list-style: none; user-select: none; text-align: left;
  display: inline-flex; align-items: center; min-height: var(--target-sm, 28px); border-radius: var(--r-sm, 8px);
  transition: color var(--dur-2, 150ms) var(--ease-std, ease);
}
.sb-oneliner details.sb-fold summary:hover { color: var(--fg, #ececec); }
.sb-oneliner details.sb-fold summary::-webkit-details-marker { display: none; }
/* Child combinator: with folds nested, each arrow must key off its OWN
   details' open state, not any open ancestor's. */
.sb-oneliner details.sb-fold > summary::before { content: '▸'; color: var(--accent); width: 1.2em; display: inline-block; transition: transform var(--dur-3, 200ms) var(--ease-out, ease); }
.sb-oneliner details.sb-fold[open] > summary::before { transform: rotate(90deg); }
.sb-oneliner details.sb-fold .sb-cmd { margin-top: var(--sp-2, 8px); }
.sb-oneliner details.sb-fold details.sb-fold { margin-left: var(--sp-4, 16px); }
.sb-oneliner .sb-what { color: var(--muted, #9a9a9a); font-size: var(--fs-xs, 12px); line-height: var(--lh-xs, 16px); margin-top: var(--sp-2, 8px); max-width: var(--measure, 62ch); }
.sb-oneliner .sb-what code { color: var(--fg, #ececec); }
/* the fold's "get the desktop app" link is a control: it measured 266x37 on
   a coarse pointer (mobile matrix, 2026-09-09), under the 44px floor. The
   --target token lifts it to 44 there and 36 on a mouse. */
.sb-oneliner .sb-what a { display: inline-flex; align-items: center; min-height: var(--target, 36px); color: var(--accent); }
.sb-oneliner .sb-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (prefers-reduced-motion: reduce) {
  .sb-oneliner details.sb-fold > summary::before { transition: none; }
}
/* the fold's explanations are sentences: on a touch device they read at
   body-small, not caption size (the row labels above each command stay 12px);
   the command wrap itself is unconditional now, not a touch special case */
@media (pointer: coarse) {
  .sb-oneliner .sb-what { font-size: var(--fs-sm, 14px); line-height: var(--lh-sm, 20px); }
}
/* the download control is a .sb-btn storm button (site.css carries the ramp,
   the sheen and the glow); this rule keeps only the widget's own anatomy */
.sb-oneliner .sb-dl-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: max(44px, var(--target, 44px)); padding: 0 var(--sp-4, 16px);
  border-radius: var(--r-md, 8px);
  font-weight: 600; text-decoration: none;
}
.sb-oneliner .sb-dl-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

export async function mountInstallSnippet(el, opts = {}) {
  if (!el) return;
  const mcpUrl = opts.mcpUrl || `${location.origin}/mcp`;
  // The paste-to-agent line is the row: what it shows is what the copy
  // button puts on the clipboard, byte for byte.
  const skillCmd = `install the Superbot MCP server globally: ${mcpUrl}`;
  // Claude Code's own add line: `-s user` is what puts it in every project
  // (the flag defaults to local, one directory).
  const claudeCmd = `claude mcp add --transport http superbot ${mcpUrl} -s user`;
  // VS Code's documented URL handler: vscode:mcp/install?{urlencoded json}.
  // A human clicks it; the page never tells an agent to.
  const vscodeHref = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'superbot', type: 'http', url: mcpUrl }))}`;
  // the fold goes to innerHTML with intentional <code> markup, so the
  // origin is escaped here — a hostile Host header must not write markup
  // through it (the tint() path escapes its own interpolation; this one
  // would otherwise bypass that discipline)
  const eo = location.origin.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // The Desktop app is the install for a computer; a phone cannot run it, so a
  // coarse pointer gets no button and its first line is the command row.
  // opts.noDownload: the host already shows the download as its own primary
  // (the landing page's download hero, 2026-09-08), so the widget renders only
  // the paste path and its label stops saying "or"
  const showDl = !opts.noDownload && !matchMedia('(pointer: coarse)').matches;
  // opts.noLabel: the host already captions the command (the landing page's
  // "or paste this into your coding agent" divider), so the row label is blank
  const labels = {
    row: opts.noLabel ? '' : showDl ? 'or paste this into your coding agent:' : 'paste this into your coding agent:',
  };
  const dlRow = () => (showDl
    ? `<div class="sb-row sb-dl"><a class="sb-dl-btn sb-btn" href="${eo}/download">download the desktop app</a></div>`
    : '');
  // a phone leads with the same row: the MCP endpoint is reachable from the
  // agent's own machine, so nothing here needs to move to a computer
  const moreRow = () =>
    `<div class="sb-row sb-more"><a class="sb-more-link" href="${eo}/install">per-client setup recipes</a></div>`;
  const fold = {
    skill: `paste that into any coding agent and it fetches <code>${eo}/llms.txt</code>, picks its own client's recipe, and wires itself in. restart the client after. or <a href="${eo}/download">get the desktop app</a>, which wires every client on the machine for you.`,
  };

  ensureStyle();

  el.classList.add('sb-oneliner');
  el.innerHTML = `
    ${dlRow()}
    <div class="sb-row" id="sb-panel-row">
      <div id="sb-panel"><div class="sb-or"></div>
      <div class="sb-cmd"><code></code>${copyBtn('sb-copy')}</div></div>
    </div>
    ${moreRow()}
    <div class="sb-live" aria-live="polite"></div>
    <details class="sb-fold"><summary>what does this do?</summary>
      <div class="sb-what"></div>
      <div class="sb-extra">
        <div class="sb-row"><div class="sb-lab">just claude code:</div><div class="sb-cmd"><code>${tint(claudeCmd)}</code>${copyBtn('sb-copy-alt sb-copy-claude')}</div></div>
        <div class="sb-row sb-links"><div class="sb-lab">just vs code, one click:</div>
          <a class="sb-deep" href="${vscodeHref.replace(/"/g, '&quot;')}">add to VS Code</a>
          <span class="sb-what" style="margin:0">opens VS Code and asks you to confirm the <span class="sb-url">${eo}/mcp</span> server.</span>
        </div>
      </div>
    </details>
  `;

  const code = el.querySelector('.sb-cmd code');
  const label = el.querySelector('.sb-or');
  const what = el.querySelector('.sb-fold > .sb-what');
  const extra = el.querySelector('.sb-extra');

  // "add to VS Code" on a device with no VS Code (a phone) is a dead tap that
  // ends in the OS's "cannot open" dialog: there, the button copies the link
  // for the reader's computer instead, and its line says so (2026-09-02).
  const deep = el.querySelector('.sb-extra .sb-deep');
  if (deep && matchMedia('(pointer: coarse)').matches) {
    const note = deep.nextElementSibling;
    if (note) note.textContent = 'no VS Code on this device: tapping copies the link for your computer, where it opens VS Code and asks you to confirm the server.';
    deep.addEventListener('click', (e) => {
      e.preventDefault();
      const value = deep.getAttribute('href');
      const was = deep.textContent;
      const live = el.querySelector('.sb-live');
      const done = () => {
        deep.textContent = 'copied: open it on your computer';
        if (live) { live.textContent = 'link copied for your computer'; setTimeout(() => { live.textContent = ''; }, 2000); }
        setTimeout(() => { deep.textContent = was; }, 2500);
      };
      const fallback = () => {
        const ta = document.createElement('textarea'); ta.value = value; document.body.appendChild(ta); ta.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
        if (ok) done(); else if (live) live.textContent = 'clipboard blocked: the manual command above works on your computer too';
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, fallback); else fallback();
    });
  }
  const live = el.querySelector('.sb-live');
  const render = () => {
    // the guard is belt and braces against a future markup change losing the row
    if (!code || !label) return;
    label.textContent = labels.row;
    // WYSIWYG: tint() styles the same string the copy handler sends — only
    // spans differ from what is on the board
    code.innerHTML = tint(skillCmd);
    what.innerHTML = fold.skill;
    if (extra) extra.hidden = false;
  };

  wireCopy(el.querySelector('.sb-copy'), skillCmd, 'oneliner', live);
  wireCopy(el.querySelector('.sb-copy-claude'), claudeCmd, 'oneliner', live);
  // the deep link is an install too: the step rail on /docs listens for it.
  el.querySelector('.sb-extra a.sb-deep')?.addEventListener('click', () => {
    dispatchEvent(new CustomEvent('superbot:copied', { detail: { source: 'vscode' } }));
  });
  render();
}

// The standalone command row: the widget's one-line copy box with nothing
// around it — no label, no download button, no fold. The landing page's
// download hero mounts it for the visitor's OS-resolved bootstrap command
// (the host captions it with its own .dl-or divider and supplies the OS
// itself). Same STYLE, same tint() (the URL lands in the accent) and the
// same copy ladder as mountInstallSnippet's row; `copyLabel` swaps the
// button's word when a host wants something other than "copy".
// Rendered markup:
//   <div class="sb-oneliner"><div class="sb-cmd"><code>…</code>
//   <button class="sb-btn sb-copy">copy</button></div></div>
export function mountCommandRow(el, { cmd, copyLabel } = {}) {
  if (!el || !cmd) return;
  ensureStyle();
  el.classList.add('sb-oneliner');
  el.innerHTML = `<div class="sb-cmd"><code></code>${copyBtn('sb-copy', copyLabel || 'copy')}</div>`;
  const code = el.querySelector('.sb-cmd code');
  // WYSIWYG, same contract as the main row: tint() styles the string the
  // copy handler sends, only spans differ from what is on the board
  code.innerHTML = tint(cmd);
  const idle = el.querySelector('.sb-copy').innerHTML;
  wireCopy(el.querySelector('.sb-copy'), cmd, 'oneliner', null, idle);
}
