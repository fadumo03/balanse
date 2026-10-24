// Balanse – egne ikoner i stedet for emojier, så appen ser lik ut på alle enheter.
// UI-ikoner er strektegninger (24×24), planter og pynt er flate illustrasjoner (48×48).
(function (root) {
  "use strict";

  const UI = {
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    droplet: '<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-1.9-.9-3.7-2.8-5.2S12.4 6.3 12 3.5c-.4 2.8-1.8 4.8-3.7 6.3S5.5 13.1 5.5 15a6.5 6.5 0 0 0 6.5 6.5z"/>',
    snowflake: '<path d="M12 2v20M2 12h20M19 15l-3-3 3-3M5 9l3 3-3 3M15 5l-3 3-3-3M9 19l3-3 3 3"/>',
    sparkles: '<path d="M11 3l1.8 4.9L17.5 10l-4.7 2.1L11 17l-1.8-4.9L4.5 10l4.7-2.1z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    cloudRain: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v5M8 14v5M12 16v5"/>',
    calendar: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M16 2.5v4M8 2.5v4M3.5 10h17"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    cap: '<path d="M22 9.5L12 4.5 2 9.5l10 5z"/><path d="M6 11.5v4.5c3.5 3 8.5 3 12 0v-4.5"/><path d="M22 9.5v5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    book: '<path d="M4 19.5V5a2.5 2.5 0 0 1 2.5-2.5H20v17H6.5A2.5 2.5 0 0 0 4 22"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
  };

  const GROUND = '<ellipse cx="24" cy="43" rx="11" ry="2" fill="#000" opacity=".07"/>';

  const ART = {
    seed: `${GROUND}<ellipse cx="24" cy="38" rx="6.5" ry="4.5" fill="#a47148"/><path d="M24 34c0-3.5 1.5-5.5 4-6.5" stroke="#5cb877" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ung: `${GROUND}<path d="M24 43V20" stroke="#3f9b5f" stroke-width="3" stroke-linecap="round"/><path d="M24 36c-7.5 0-10.5-4.5-10.5-9.5 6 0 10.5 3 10.5 9.5z" fill="#5cb877"/><path d="M24 30c0-7 4-10.5 10.5-10.5 0 6-4 10.5-10.5 10.5z" fill="#3f9b5f"/><path d="M24 23c-5 0-7-3-7-6.5 4 0 7 2 7 6.5z" fill="#7fd196"/>`,
    spire: `${GROUND}<path d="M24 43V29" stroke="#3f9b5f" stroke-width="3" stroke-linecap="round"/><path d="M24 33c-8 0-11-5-11-10.5 6.5 0 11 3.5 11 10.5z" fill="#7fd196"/><path d="M24 30c0-7.5 4-11.5 11-11.5 0 6.5-4 11.5-11 11.5z" fill="#3f9b5f"/>`,
    tulipan: `${GROUND}<path d="M24 43V22" stroke="#3f9b5f" stroke-width="3" stroke-linecap="round"/><path d="M24 41c-7.5-1-10.5-6-10.5-11.5 5.5 1 9.5 4.5 10.5 11.5z" fill="#3f9b5f"/><path d="M24 39c6.5-1 9.5-5.5 9.5-10.5-5 1-8.5 4.5-9.5 10.5z" fill="#5cb877"/><path d="M15 10.5c0 9.5 3 14 9 14s9-4.5 9-14l-4.5 4L24 7.5l-4.5 7z" fill="#ef6f98"/><path d="M24 7.5l-4.5 7 4.5 10 4.5-10z" fill="#f48fb1"/>`,
    solsikke: `${GROUND}<path d="M24 43V24" stroke="#3f9b5f" stroke-width="3" stroke-linecap="round"/><path d="M24 37c-7 0-10-4-10-9 6 0 10 3 10 9z" fill="#5cb877"/><circle cx="24" cy="16" r="9.5" fill="none" stroke="#f9c23c" stroke-width="7" stroke-dasharray="3.6 2.4"/><circle cx="24" cy="16" r="6" fill="#8d5a2b"/><circle cx="22" cy="14.5" r="1" fill="#a9733f"/><circle cx="26" cy="17" r="1" fill="#a9733f"/>`,
    tre: `${GROUND}<rect x="21.5" y="26" width="5" height="17" rx="2.5" fill="#8d6e63"/><circle cx="24" cy="18" r="12.5" fill="#3f9b5f"/><circle cx="18.5" cy="21.5" r="7.5" fill="#5cb877"/><circle cx="29" cy="13" r="4" fill="#5cb877" opacity=".6"/>`,
    kirsebaer: `${GROUND}<rect x="21.5" y="26" width="5" height="17" rx="2.5" fill="#8d6e63"/><circle cx="24" cy="18" r="12.5" fill="#f4a3c0"/><circle cx="18.5" cy="21.5" r="7.5" fill="#f8c3d6"/><circle cx="17" cy="14" r="1.6" fill="#fff"/><circle cx="28" cy="20" r="1.6" fill="#fff"/><circle cx="25" cy="11" r="1.4" fill="#fff"/><circle cx="30" cy="14" r="1.2" fill="#e57399"/>`,
    eksamen: `${GROUND}<path d="M24 43V26" stroke="#3f9b5f" stroke-width="3" stroke-linecap="round"/><path d="M24 38c6.5 0 9.5-4 9.5-9-5.5 0-9.5 3-9.5 9z" fill="#5cb877"/><circle cx="24" cy="16" r="10" fill="none" stroke="#ff8a5c" stroke-width="8" stroke-dasharray="5 2.6"/><circle cx="24" cy="16" r="6.5" fill="#ffd25c"/><path d="M21 16l2.2 2.2 4-4.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    visnet: `${GROUND}<path d="M21 43c0-11 2-17 10-19" stroke="#a1887f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M21 37c-6 0-8-3.5-8-7 4.5 0 8 2 8 7z" fill="#bcaaa4"/><path d="M31 24c3.5 1.5 5 5.5 3 9-3.5-1-5.5-4.5-5-7.5z" fill="#c9a8a0"/>`,
    benk: `${GROUND}<rect x="8" y="16" width="32" height="5" rx="2" fill="#a1785c"/><rect x="8" y="24" width="32" height="5" rx="2" fill="#8d6e63"/><rect x="11" y="29" width="3.5" height="13" rx="1.5" fill="#6d4c41"/><rect x="33.5" y="29" width="3.5" height="13" rx="1.5" fill="#6d4c41"/>`,
    lykt: `${GROUND}<rect x="22.5" y="22" width="3" height="21" rx="1.5" fill="#546e7a"/><path d="M17 9h14l-2 13H19z" fill="#ffd54f"/><path d="M16 9h16l-8-5z" fill="#546e7a"/><rect x="18" y="21" width="12" height="2.5" rx="1" fill="#546e7a"/>`,
    sommerfugl: `<ellipse cx="16" cy="19" rx="8" ry="9" fill="#9b87e8"/><ellipse cx="32" cy="19" rx="8" ry="9" fill="#9b87e8"/><ellipse cx="17.5" cy="31" rx="6" ry="6.5" fill="#c1b3f5"/><ellipse cx="30.5" cy="31" rx="6" ry="6.5" fill="#c1b3f5"/><rect x="22.5" y="13" width="3" height="24" rx="1.5" fill="#4a3f6b"/><path d="M24 13l-3-5M24 13l3-5" stroke="#4a3f6b" stroke-width="1.6" stroke-linecap="round"/>`,
    dam: `<ellipse cx="24" cy="32" rx="18" ry="9" fill="#8fd0f0"/><ellipse cx="24" cy="31" rx="14" ry="6.5" fill="#b4e1f7"/><ellipse cx="28.5" cy="31" rx="5" ry="3" fill="#5cb877"/><path d="M28.5 31l4.5-1" stroke="#b4e1f7" stroke-width="1.4" stroke-linecap="round"/><circle cx="17" cy="30" r="2.4" fill="#f48fb1"/>`,
    fontene: `${GROUND}<ellipse cx="24" cy="36" rx="16" ry="5" fill="#b0bec5"/><ellipse cx="24" cy="34.5" rx="13" ry="3.5" fill="#8fd0f0"/><rect x="22" y="18" width="4" height="16" rx="2" fill="#90a4ae"/><path d="M24 18c-6-1-9 3-9 9M24 18c6-1 9 3 9 9M24 18V9" stroke="#64b5f6" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    sopp: `${GROUND}<rect x="20" y="25" width="8" height="18" rx="3.5" fill="#fff3e0" stroke="#e8d5bd" stroke-width="1"/><path d="M8 27c0-10 7-17 16-17s16 7 16 17z" fill="#ef6f6f"/><circle cx="17" cy="20" r="2.2" fill="#fff"/><circle cx="27" cy="16" r="2.6" fill="#fff"/><circle cx="32" cy="23" r="1.8" fill="#fff"/>`,
    hus: `${GROUND}<path d="M10 23h28v20H10z" fill="#ffd8a8"/><path d="M6 24L24 9l18 15z" fill="#a1785c"/><rect x="20.5" y="31" width="7" height="12" rx="1.5" fill="#8d6e63"/><rect x="13" y="28" width="5" height="5" rx="1" fill="#b4e1f7"/><rect x="30" y="28" width="5" height="5" rx="1" fill="#b4e1f7"/>`
  };

  function icon(name, cls = "") {
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI[name] || ""}</svg>`;
  }

  function art(id, cls = "") {
    return `<svg class="art ${cls}" viewBox="0 0 48 48" aria-hidden="true">${ART[id] || ""}</svg>`;
  }

  root.Icons = { icon, art };
})(window);
