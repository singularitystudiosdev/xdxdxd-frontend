// The header's store retarget. An ES module the shared header (siteNav in
// edge/src/site-nav.ts) loads on every page:
//   <script type="module" src="/site/assets/nav-store.js?v=1"></script>
//
//   - On a phone or tablet (detectPlatform().os of ios/android) it retargets
//     the header pill `.sb-nav .sb-btn[href$="/download"]` to the device's
//     store route (storeLink), and its label becomes 'Get the app' behind the
//     platform mark (osMark: the apple mark for iOS, the android robot for
//     Android, at 16px). Class list and aria-current are left untouched.
//   - On a desktop platform it prepends the platform mark to the same pill
//     and changes nothing else (same href, same text).
//   - No-op whenever nothing matches: no pill, no OS, an unknown platform, a
//     coarse pointer without a mobile UA token. Never throws.
//
// The mark sits inside the pill behind the site.css shared recipe
// (.sb-btn .sb-os-mark), left of the label with the button's own
// var(--sp-2) gap.

import { detectPlatform, storeLink, osMark } from '/site/assets/os-detect.js?v=1';

(function () {
  try {
    const pill = document.querySelector('.sb-nav .sb-btn[href$="/download"]');
    if (!pill) return;
    const { os, mobile } = detectPlatformSafe();

    // a phone or tablet: the pill becomes the store link
    if (mobile && (os === 'ios' || os === 'android')) {
      const link = storeLink(os);
      const mark = osMark(os === 'ios' ? 'mac' : 'android', 16);
      if (!link || !mark) return;
      pill.setAttribute('href', link);
      pill.innerHTML = `<span class="sb-os-mark">${mark}</span><span>Get the app</span>`;
      return;
    }

    // a desktop platform: keep href and text, prepend the mark only
    if (!os || mobile) return;
    const mark = osMark(os, 16);
    if (!mark) return;
    if (pill.querySelector('.sb-os-mark')) return; // already marked
    pill.insertAdjacentHTML('afterbegin', `<span class="sb-os-mark">${mark}</span>`);
  } catch {
    // a missing header, an odd DOM shape, anything — the page stands as served
  }

  function detectPlatformSafe() {
    try { return detectPlatform(); } catch { return { os: null, mobile: false, label: null }; }
  }
})();
