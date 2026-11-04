// Atlas Workforce art: illustrated avatars, client logos, icons, splash art and the 3D office, all drawn as inline SVG.
window.WF_ART = (() => {
  'use strict';

  const SKIN = ['#f9d8c2', '#f0c39c', '#dfa97c', '#c4875a', '#8f5b3b', '#603b26'];
  const INK = '#22252b';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.round(Math.max(0, Math.min(255, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ------------------------------------------------------------------ avatars (64×64)

  function hairBack(style, c) {
    switch (style) {
      case 'long': return `<path d="M18 28C17 14 24 9.5 32 9.5S47 14 46 28L47.5 47C44 49 40 48 38.5 45H25.5C24 48 20 49 16.5 47Z" fill="${c}"/>`;
      case 'bob': return `<path d="M18.5 30C18 15 24.5 10.5 32 10.5S46 15 45.5 30C45.5 36 44 39.5 41.5 40.5H22.5C20 39.5 18.5 36 18.5 30Z" fill="${c}"/>`;
      case 'afro': return `<circle cx="32" cy="22" r="17.5" fill="${c}"/>`;
      case 'pony': return `<path d="M41 15C50 14 52 25 48.5 37C47.5 31 45.5 26 41.5 23Z" fill="${c}"/><rect x="40.5" y="14.5" width="4" height="4" rx="1.5" fill="${shade(c, 0.35)}" transform="rotate(20 42 16)"/>`;
      case 'bun': return `<circle cx="32" cy="10.5" r="6" fill="${c}"/>`;
      case 'curly': return `<path d="M17.5 30C16 20 19 13 25 11S39 9 43.5 13S48 24 46.5 30Z" fill="${c}"/>`;
      default: return '';
    }
  }
  function hairFront(style, c) {
    const d = shade(c, -0.15);
    switch (style) {
      case 'short': return `<path d="M19.5 27C19 15.5 25 11.5 32 11.5S45 15.5 44.5 27C43 21 40 18.5 35 18C30 17.5 23 19.5 19.5 27Z" fill="${c}"/>`;
      case 'messy': return `<path d="M19.5 26.5C18.5 16 24 11 30.5 11.5L32.5 9L35 12L38.5 10.5L39 13.5C43.5 15 45.5 19.5 44.5 26.5C42 20.5 38 18.5 33 19C28 18.5 22.5 20.5 19.5 26.5Z" fill="${c}"/>`;
      case 'side': return `<path d="M19.5 26C19 15 25 11 32.5 11S45 15 44.5 25C43.5 19 41 17 37 16.5C31 16 26 19 22 22.5C21 23.5 20 24.5 19.5 26Z" fill="${c}"/><path d="M36.5 12.5C35 14 34.5 15.5 34.6 16.6" stroke="${d}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
      case 'slick': return `<path d="M20 24C20 14.5 26 11 32 11S44.5 14 44 24C42 19 37.5 16.5 32 16.5S22 19 20 24Z" fill="${c}"/><path d="M24 17.5C28 15 36 15 40.5 17.8" stroke="${shade(c, 0.25)}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
      case 'buzz': return `<path d="M20.5 24.5C21 15.5 26 12.5 32 12.5S43 15.5 43.5 24.5C40 19.5 36 18 32 18S24 19.5 20.5 24.5Z" fill="${c}" opacity=".88"/>`;
      case 'long': return `<path d="M32 12C25 12 19.5 16 19.5 27L21 34C21.5 25.5 25 19 32 16.2ZM32 12C39 12 44.5 16 44.5 27L43 34C42.5 25.5 39 19 32 16.2Z" fill="${c}"/>`;
      case 'bob': return `<path d="M20 23.5C20.5 15 26 12 32 12S43.5 15 44 23.5C40 21.5 36 21 32 21S24 21.5 20 23.5Z" fill="${c}"/>`;
      case 'pony': case 'bun': return `<path d="M20 25C20 15 26 11.5 32 11.5S44 15 44 25C42 20 37.5 17 32 17S22 20 20 25Z" fill="${c}"/>`;
      case 'curly': return [[21.5, 22, 4.6], [23.8, 16.5, 5], [29, 13, 5.2], [35, 13, 5.2], [40.2, 16.5, 5], [42.5, 22, 4.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
      case 'afro': return `<path d="M20 25C20 17 25 13.5 32 13.5S44 17 44 25C41 21 37 19.5 32 19.5S23 21 20 25Z" fill="${d}"/>`;
      case 'wavy': return `<path d="M19.5 27C18.5 15 25 10.5 32 11S46 16 44.5 27C43.5 22 41 19 37.5 18.5C35 21 31 21 29 18.5C25 19 21.5 22 19.5 27Z" fill="${c}"/>`;
      case 'spiky': return `<path d="M20 25L19 15L24 18L25 10L29.5 15L32 8L35 15L39 10L40 18L45 15L44 25C41 20 37 18 32 18S23 20 20 25Z" fill="${c}"/>`;
      case 'bald': return `<path d="M26 15.5C28.5 14.5 31 14.3 33 14.6" stroke="#fff" stroke-width="1.4" opacity=".35" fill="none" stroke-linecap="round"/>`;
      default: return '';
    }
  }
  function body(style, c, skin) {
    const d = shade(c, -0.18), l = shade(c, 0.22), sd = shade(skin, -0.12);
    const shoulders = `<path d="M9 64C9 52 17.5 45.5 27 44.5H37C46.5 45.5 55 52 55 64Z" fill="${c}"/>`;
    switch (style) {
      case 'hoodie': return shoulders + `<path d="M21 47C22.5 42 41.5 42 43 47L39.5 50.5C36.5 47.5 27.5 47.5 24.5 50.5Z" fill="${d}"/><path d="M29 50V56.5M35 50V56.5" stroke="${l}" stroke-width="1.3" stroke-linecap="round"/>`;
      case 'blazer': return shoulders + `<path d="M27 44.5L32 57L37 44.5Z" fill="#f7f7f7"/><path d="M27 44.5L31 55L25 50.5ZM37 44.5L33 55L39 50.5Z" fill="${d}"/><path d="M32 47.5L30.8 49.5L32 57L33.2 49.5Z" fill="${shade(c, -0.35)}" opacity=".85"/>`;
      case 'collar': return shoulders + `<path d="M27 44.5C28.5 47.5 35.5 47.5 37 44.5Z" fill="${sd}"/><path d="M26.5 44L31.5 48.5L27.8 51.5ZM37.5 44L32.5 48.5L36.2 51.5Z" fill="${l}"/>`;
      case 'sweater': return shoulders + `<path d="M26.5 44.5C28 48.5 36 48.5 37.5 44.5" stroke="${d}" stroke-width="2.4" fill="${sd}"/>`;
      default: return shoulders + `<path d="M27 44.5C28 48.5 36 48.5 37 44.5Z" fill="${sd}"/>`;
    }
  }
  function mouth(m) {
    switch (m) {
      case 'grin': return `<path d="M28 32.8H36C35.6 36.6 33.8 37.8 32 37.8S28.4 36.6 28 32.8Z" fill="#6b2b2b"/><path d="M28.4 32.8H35.6V34.2H28.4Z" fill="#fff"/>`;
      case 'flat': return `<path d="M29 34.2H35" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
      case 'smirk': return `<path d="M28.8 34.4Q32.8 35.8 35.6 32.8" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
      default: return `<path d="M28.5 33.3Q32 36.6 35.5 33.3" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    }
  }
  function glasses(g) {
    if (g === 'round') return `<g stroke="#2b2f36" stroke-width="1.2" fill="#fff" fill-opacity=".18"><circle cx="27.2" cy="28" r="3.7"/><circle cx="36.8" cy="28" r="3.7"/><path d="M30.9 28H33.1" fill="none"/></g>`;
    if (g === 'square') return `<g stroke="#2b2f36" stroke-width="1.2" fill="#fff" fill-opacity=".18"><rect x="23.3" y="25" width="7.8" height="6" rx="1.6"/><rect x="32.9" y="25" width="7.8" height="6" rx="1.6"/><path d="M31.1 27.5H32.9" fill="none"/></g>`;
    if (g === 'shades') return `<g fill="#1d1f24"><rect x="23" y="25" width="8.2" height="5.6" rx="2"/><rect x="32.8" y="25" width="8.2" height="5.6" rx="2"/><rect x="30.6" y="26.4" width="2.8" height="1.2"/></g><path d="M24.5 26.4H27" stroke="#fff" stroke-width=".8" opacity=".5" stroke-linecap="round"/>`;
    return '';
  }
  function facial(f, c) {
    if (f === 'beard' || f === 'stubble') {
      return `<path d="M20 28C20.5 40 26 44.8 32 44.8S43.5 40 44 28C42.5 33.5 40 36.6 36.5 37.2C34.5 35.6 29.5 35.6 27.5 37.2C24 36.6 21.5 33.5 20 28Z" fill="${c}" opacity="${f === 'stubble' ? 0.32 : 1}"/>`;
    }
    if (f === 'mustache') return `<path d="M27.5 33C29.5 31 31 31.4 32 32.4C33 31.4 34.5 31 36.5 33C34.5 33.6 33 33.8 32 33.2C31 33.8 29.5 33.6 27.5 33Z" fill="${c}"/>`;
    return '';
  }
  function accessory(a) {
    if (a === 'earrings') return `<circle cx="20.5" cy="33.2" r="1.3" fill="#e3b341"/><circle cx="43.5" cy="33.2" r="1.3" fill="#e3b341"/>`;
    if (a === 'headphones') return `<path d="M17.5 28C17 12.5 47 12.5 46.5 28" stroke="#2c3038" stroke-width="2.6" fill="none"/><rect x="14.5" y="24" width="5.5" height="10" rx="2.4" fill="#2c3038"/><rect x="44" y="24" width="5.5" height="10" rx="2.4" fill="#2c3038"/>`;
    if (a === 'flower') return [0, 72, 144, 216, 288].map(r => `<circle cx="${41.5 + 2.2 * Math.cos(r * Math.PI / 180)}" cy="${15 + 2.2 * Math.sin(r * Math.PI / 180)}" r="2" fill="#ff7aa2"/>`).join('') + '<circle cx="41.5" cy="15" r="1.3" fill="#ffd166"/>';
    return '';
  }
  function hijab(c, skin) {
    const d = shade(c, -0.18);
    return `<path d="M12 64C12 50 17 44 22 42C17 36 16.5 26 19 20C21.5 13.5 26 10 32 10S42.5 13.5 45 20C47.5 26 47 36 42 42C47 44 52 50 52 64Z" fill="${c}"/>`
      + `<ellipse cx="32" cy="28.5" rx="10.2" ry="11.6" fill="${skin}"/>`
      + `<path d="M21.6 23C23.5 16 28 14 32 14S40.5 16 42.4 23" stroke="${d}" stroke-width="1.6" fill="none"/>`;
  }
  function bot(look) {
    const c = look.top || '#6c63ff';
    return `<path d="M9 64C9 52 17.5 46 27 45H37C46.5 46 55 52 55 64Z" fill="${c}"/>`
      + `<rect x="27.5" y="38" width="9" height="8" rx="2" fill="${shade(c, -0.25)}"/>`
      + `<path d="M32 12V7" stroke="${shade(c, -0.2)}" stroke-width="2"/><circle cx="32" cy="6" r="2.6" fill="#ff8fb1"/>`
      + `<rect x="17.5" y="12" width="29" height="28" rx="9" fill="#f6f7ff" stroke="${c}" stroke-width="2"/>`
      + `<rect x="21" y="18.5" width="22" height="12.5" rx="5.5" fill="#1d2342"/>`
      + `<path d="M25.5 25.2Q27.5 22.8 29.5 25.2M34.5 25.2Q36.5 22.8 38.5 25.2" stroke="#7cf4ff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      + `<path d="M28.5 35Q32 37 35.5 35" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  }

  function dog(look) {
    const f = look.fur || '#e2a857', d = shade(f, -0.22), l = shade(f, 0.4);
    return `<path d="M12 64C12 52 20 46 32 46S52 52 52 64Z" fill="${f}"/><path d="M25 64C25 56 28 52.5 32 52.5S39 56 39 64Z" fill="${l}"/>`
      + `<path d="M20.5 45.5Q32 51 43.5 45.5L44.5 48.6Q32 54.6 19.5 48.6Z" fill="#d6336c"/><circle cx="32" cy="53.2" r="2.6" fill="#f4c542" stroke="#c99a1e" stroke-width=".8"/>`
      + `<path d="M18 17C11.5 19 9 31 12.5 40C15 42.5 18.6 40.5 19.6 36L21.5 22Z" fill="${d}"/><path d="M46 17C52.5 19 55 31 51.5 40C49 42.5 45.4 40.5 44.4 36L42.5 22Z" fill="${d}"/>`
      + `<ellipse cx="32" cy="28" rx="14" ry="15" fill="${f}"/><path d="M27 14.5Q32 12.5 37 14.5Q35 19 32 19.5Q29 19 27 14.5Z" fill="${l}" opacity=".7"/>`
      + `<ellipse cx="32" cy="36" rx="8.8" ry="6.8" fill="${l}"/>`
      + `<circle cx="26" cy="27" r="2" fill="${INK}"/><circle cx="38" cy="27" r="2" fill="${INK}"/><circle cx="26.7" cy="26.3" r=".65" fill="#fff"/><circle cx="38.7" cy="26.3" r=".65" fill="#fff"/>`
      + `<path d="M23.4 23.2Q26 21.9 28.4 23.1M35.6 23.1Q38 21.9 40.6 23.2" stroke="${d}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
      + `<ellipse cx="32" cy="32.8" rx="3.1" ry="2.3" fill="#2b2220"/><circle cx="31" cy="32.2" r=".7" fill="#fff" opacity=".5"/>`
      + `<path d="M32 35V37M28.4 37.2Q32 40 35.6 37.2" stroke="#2b2220" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M30.3 38.4Q32 43.8 33.7 38.4Z" fill="#ef6f8a"/>`;
  }

  // Returns an inline SVG. opts.mono draws a grey silhouette (for people not hired yet).
  // opts.bare returns only the drawing, with no background, to place inside a larger picture.
  function avatar(look, opts = {}) {
    let inner, bg = '#e8edf3';
    if (!look) look = {};
    if (look.dog) { inner = dog(look); bg = '#fdf0d5'; }
    else if (look.bot) { inner = bot(look); bg = '#e7e5ff'; }
    else {
      const skin = SKIN[look.skin == null ? 1 : look.skin];
      const hairC = look.hc || '#2b2018';
      const parts = [];
      if (look.hair === 'hijab') {
        parts.push(body(look.topStyle, look.top || '#5b6170', skin), hijab(hairC, skin));
      } else {
        parts.push(hairBack(look.hair, hairC), body(look.topStyle, look.top || '#5b6170', skin));
        parts.push(`<path d="M27 37H37V45.5C37 48 27 48 27 45.5Z" fill="${shade(skin, -0.12)}"/>`);
        parts.push(`<circle cx="20.5" cy="29" r="3.2" fill="${skin}"/><circle cx="43.5" cy="29" r="3.2" fill="${skin}"/>`);
        parts.push(`<ellipse cx="32" cy="27" rx="12" ry="13.5" fill="${skin}"/>`);
      }
      parts.push(facial(look.facial, look.fc || hairC));
      parts.push(`<circle cx="27.2" cy="28" r="1.55" fill="${INK}"/><circle cx="36.8" cy="28" r="1.55" fill="${INK}"/>`);
      if (look.hair !== 'hijab') parts.push(`<path d="M24.8 24.1Q27.2 22.8 29.6 24.1M34.4 24.1Q36.8 22.8 39.2 24.1" stroke="${shade(hairC, -0.1)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
      parts.push(`<circle cx="24.3" cy="32.6" r="2.2" fill="#ff8a80" opacity=".2"/><circle cx="39.7" cy="32.6" r="2.2" fill="#ff8a80" opacity=".2"/>`);
      parts.push(mouth(look.mouth));
      if (look.hair !== 'hijab') parts.push(hairFront(look.hair, hairC));
      parts.push(glasses(look.glasses), accessory(look.acc));
      inner = parts.join('');
    }
    if (opts.bare) return inner;
    const filter = opts.mono ? ' style="filter:grayscale(1) brightness(1.15) contrast(.6);opacity:.55"' : '';
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${filter}><rect width="64" height="64" fill="${look.bg || bg}"/>${inner}</svg>`;
  }

  // ------------------------------------------------------------------ client logos, icons

  const LOGO_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#c2410c', '#be123c', '#047857', '#4338ca', '#b45309', '#0e7490', '#9333ea', '#15803d', '#1d4ed8'];
  const GLYPHS = [
    '<circle cx="16" cy="16" r="7" fill="#fff"/>',
    '<path d="M16 8L24 23H8Z" fill="#fff"/>',
    '<path d="M16 7L25 16L16 25L7 16Z" fill="#fff"/>',
    '<rect x="9" y="9" width="14" height="14" rx="3" fill="#fff"/>',
    '<circle cx="16" cy="16" r="7.5" fill="none" stroke="#fff" stroke-width="3.5"/>',
    '<path d="M16 7.5L23.5 11.8V20.2L16 24.5L8.5 20.2V11.8Z" fill="#fff"/>',
    '<path d="M8 22L14 10L18 18L21 13L25 22Z" fill="#fff"/>',
    '<path d="M9 16A7 7 0 0 1 23 16H9Z M9 18H23A7 7 0 0 1 9 18Z" fill="#fff"/>',
  ];
  function logo(name) {
    const h = hash(name);
    return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="32" height="32" rx="8" fill="${LOGO_COLORS[h % LOGO_COLORS.length]}"/>${GLYPHS[(h >>> 8) % GLYPHS.length]}</svg>`;
  }

  const RARITY_COLORS = ['#98a2b3', '#12805c', '#1d6fd1', '#7a3fd1', '#c26a00', '#d6336c'];
  function gearIcon(slot, r = 0) {
    const c = RARITY_COLORS[r];
    const paths = {
      laptop: `<rect x="5" y="6" width="14" height="9.5" rx="1.5" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="1.6"/><path d="M3 18.5H21" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
      chair: `<path d="M8 4.5H16V12H8Z" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 12.5H18M12 12.5V18M8 20.5L12 18L16 20.5" stroke="${c}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
      headset: `<path d="M5 14V12A7 7 0 0 1 19 12V14" stroke="${c}" stroke-width="1.6" fill="none"/><rect x="3.5" y="13" width="4" height="6" rx="1.6" fill="${c}"/><rect x="16.5" y="13" width="4" height="6" rx="1.6" fill="${c}"/>`,
      mug: `<path d="M5 8H16V17A3 3 0 0 1 13 20H8A3 3 0 0 1 5 17Z" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="1.6"/><path d="M16 10.5H17.5A2.5 2.5 0 0 1 17.5 15.5H16" stroke="${c}" stroke-width="1.6" fill="none"/><path d="M8.5 4.5C8 5.5 9.5 6 9 7M12 4.5C11.5 5.5 13 6 12.5 7" stroke="${c}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    };
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${paths[slot] || ''}</svg>`;
  }

  const ROLE_PATHS = {
    eng: '<path d="M8.5 7.5L4 12L8.5 16.5M15.5 7.5L20 12L15.5 16.5" fill="none"/>',
    design: '<path d="M4.5 19.5L5.5 15L15.5 5L19 8.5L9 18.5Z M13.5 7L17 10.5" fill="none"/>',
    sales: '<path d="M4 18L9.5 12L13 15L20 7.5M15 7.5H20V12.5" fill="none"/>',
    pm: '<rect x="5.5" y="4.5" width="13" height="16" rx="2" fill="none"/><path d="M9 4.5V3H15V4.5M8.8 12.5L11 14.7L15.5 10" fill="none"/>',
    sre: '<path d="M12 3.5L19 6.5V12C19 16.5 15.8 19.5 12 20.5C8.2 19.5 5 16.5 5 12V6.5Z M9 12L11.2 14.2L15.5 9.8" fill="none"/>',
  };
  const roleIcon = role => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ROLE_PATHS[role] || ''}</svg>`;

  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8L14.9 8.7L21.4 9.6L16.7 14.2L17.8 20.6L12 17.6L6.2 20.6L7.3 14.2L2.6 9.6L9.1 8.7Z"/></svg>';

  function moodFace(m) {
    const c = m >= 70 ? '#12805c' : m >= 45 ? '#b54708' : '#c4320a';
    const mouthD = m >= 70 ? 'M8.5 14Q12 17 15.5 14' : m >= 45 ? 'M9 15H15' : 'M8.5 16Q12 13 15.5 16';
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="1.6"/><circle cx="9" cy="10" r="1.2" fill="${c}"/><circle cx="15" cy="10" r="1.2" fill="${c}"/><path d="${mouthD}" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
  }

  // ------------------------------------------------------------------ blind boxes

  const BOX_COLORS = { single: ['#c99a64', '#d94848'], fair: ['#3b6fd8', '#f2c14e'], legend: ['#e6b422', '#7c3aed'] };
  function box(kind = 'single') {
    const [c, rb] = BOX_COLORS[kind] || BOX_COLORS.single;
    const d = shade(c, -0.18), l = shade(c, 0.16);
    const sparkle = (x, y, r) => `<path d="M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z" fill="#ffd54a"/>`;
    return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<ellipse cx="48" cy="88" rx="30" ry="5" fill="#000" opacity=".12"/>`
      + `<path d="M19 37H77V81Q77 85 73 85H23Q19 85 19 81Z" fill="${c}"/><path d="M19 37H77V44H19Z" fill="${d}" opacity=".45"/>`
      + `<path d="M44 37H52V85H44Z" fill="${rb}"/>`
      + `<circle cx="31" cy="63" r="8.5" fill="#fff" opacity=".92"/><text x="31" y="67.5" text-anchor="middle" font-size="13" font-weight="800" font-family="system-ui,sans-serif" fill="${d}">?</text>`
      + `<g class="box-lid"><path d="M15 27Q15 24 18 24H78Q81 24 81 27V38H15Z" fill="${l}"/><path d="M44 24H52V38H44Z" fill="${shade(rb, 0.12)}"/>`
      + `<path d="M48 24C41 12 30 13.5 33 20.5C35 24.5 44 24 48 24ZM48 24C55 12 66 13.5 63 20.5C61 24.5 52 24 48 24Z" fill="${rb}"/><circle cx="48" cy="23.5" r="3" fill="${shade(rb, -0.15)}"/></g>`
      + (kind === 'legend' ? sparkle(14, 16, 5) + sparkle(84, 30, 4) + sparkle(80, 8, 3) : '')
      + '</svg>';
  }

  // ------------------------------------------------------------------ price chart
  // The plot is an SVG stretched to its box (the 2px line keeps its width); labels and the end dot are HTML,
  // so text never stretches with it. game.js adds the hover crosshair using chartScale().

  function chartScale(points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(y1 - y0, Math.abs(y1) * 0.04, 1e-9), mid = (y0 + y1) / 2;
    y0 = Math.min(y0, mid - span / 2) - span * 0.15;
    y1 = Math.max(y1, mid + span / 2) + span * 0.15;
    return { x0, x1: x1 > x0 ? x1 : x0 + 1, y0, y1 };
  }
  function niceTicks(y0, y1) {
    const raw = (y1 - y0) / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(v => v >= raw);
    const out = [];
    for (let v = Math.ceil(y0 / step) * step; v <= y1 && out.length < 6; v += step) out.push(v);
    return out;
  }
  function chart(points, opts = {}) {
    const W = 600, H = 200, c = opts.color || '#0b8aa8';
    const sc = chartScale(points);
    const X = t => ((t - sc.x0) / (sc.x1 - sc.x0)) * W;
    const Y = v => H - ((v - sc.y0) / (sc.y1 - sc.y0)) * H;
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
    const first = points[0], last = points[points.length - 1];
    const ticks = niceTicks(sc.y0, sc.y1).map(v => `<div class="ch-tick" style="top:${(100 * Y(v) / H).toFixed(2)}%"><span>${opts.fmt ? opts.fmt(v) : v}</span></div>`).join('');
    return `<div class="ch-plot" tabindex="0" aria-label="${opts.label || 'Price chart'}">${ticks}`
      + `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}L${X(last[0]).toFixed(1)} ${H}L${X(first[0]).toFixed(1)} ${H}Z" fill="${c}" fill-opacity=".1"/>`
      + `<path d="${line}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
      + `<i class="ch-dot" style="left:${(100 * X(last[0]) / W).toFixed(2)}%;top:${(100 * Y(last[1]) / H).toFixed(2)}%;background:${c}"></i>`
      + '<i class="ch-cross hidden"></i><i class="ch-hdot hidden" style="background:' + c + '"></i><div class="ch-tip hidden"></div></div>';
  }
  // ------------------------------------------------------------------ the office, in isometric 3D
  // World units: the floor is 720 along x (drawn towards the lower right) and 360 along y (towards the lower left). z is up.
  // Zones open as funding rounds land. Furniture appears, and gets better, as you build.
  const FW = 720, FD = 360, WALL = 84, SLAB = 14, PAD = 26;
  const OX = FD + PAD, OY = WALL + PAD;
  const VB = { w: FW + FD + 2 * PAD, h: (FW + FD) / 2 + WALL + SLAB + 2 * PAD };
  const P = (x, y, z = 0) => [OX + x - y, OY + (x + y) / 2 - z];
  const pt = (x, y, z) => P(x, y, z).map(v => v.toFixed(1)).join(' ');
  const poly = (ps, fill, extra = '') => `<polygon points="${ps.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill}"${extra}/>`;
  // Flat details are drawn in their own plane: a level surface at height z, one of the two back walls, or a side that faces +y.
  const flat = (z, s) => `<g transform="matrix(1 .5 -1 .5 ${OX} ${OY - z})">${s}</g>`;
  const wallR = s => `<g transform="matrix(1 .5 0 1 ${OX} ${OY - WALL})">${s}</g>`; // the y = 0 wall, in (x, distance below its top)
  const wallL = s => `<g transform="matrix(1 -.5 0 1 ${OX - FD} ${OY - WALL + FD / 2})">${s}</g>`; // the x = 0 wall, in (360 − y, distance below its top)
  const face = (y, s) => `<g transform="matrix(1 .5 0 1 ${OX - y} ${OY + y / 2})">${s}</g>`; // the plane at this y, in (x, −z)

  // A solid box: its top and the two sides that face the viewer. The light comes from the upper left.
  function cube(x, y, z, w, d, h, c) {
    const t = z + h;
    return poly([P(x, y + d, t), P(x + w, y + d, t), P(x + w, y + d, z), P(x, y + d, z)], shade(c, -0.07))
      + poly([P(x + w, y, t), P(x + w, y + d, t), P(x + w, y + d, z), P(x + w, y, z)], shade(c, -0.2))
      + poly([P(x, y, t), P(x + w, y, t), P(x + w, y + d, t), P(x, y + d, t)], c);
  }
  // A glass box, in two halves, so that what stands inside is drawn between its back and its front.
  function glass(x, y, w, d, h, tint) {
    const side = (ps, o) => poly(ps, tint, ` fill-opacity="${o}"`);
    return [
      side([P(x, y, 0), P(x + w, y, 0), P(x + w, y, h), P(x, y, h)], 0.55) + side([P(x, y, 0), P(x, y + d, 0), P(x, y + d, h), P(x, y, h)], 0.45),
      side([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)], 0.2) + side([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)], 0.3)
        + `<path d="M${pt(x, y, h)}L${pt(x + w, y, h)}L${pt(x + w, y + d, h)}L${pt(x, y + d, h)}ZM${pt(x, y + d, 0)}L${pt(x, y + d, h)}M${pt(x + w, y + d, 0)}L${pt(x + w, y + d, h)}M${pt(x + w, y, 0)}L${pt(x + w, y, h)}" fill="none" stroke="${shade(tint, -0.4)}" stroke-width="1.6" stroke-linejoin="round"/>`,
    ];
  }

  const WOOD = '#d8bf98', METAL = '#8a919d';
  function chair(x, y, c = '#3a4252') {
    return cube(x + 5, y + 4, 0, 3, 3, 8, '#59606d') + cube(x, y, 8, 13, 11, 3, c) + cube(x, y + 11, 8, 13, 2.5, 13, shade(c, 0.12));
  }
  // A desk with its monitors facing the chair, and the chair on the viewer's side.
  function desk(x, y, lvl) {
    const h = lvl >= 4 ? 28 : 21;
    let s = cube(x + 1, y + 2, 0, 3, 24, h - 3, METAL) + cube(x + 52, y + 2, 0, 3, 24, h - 3, METAL) + cube(x, y, h - 3, 56, 28, 3, lvl >= 3 ? '#f1f0ec' : WOOD);
    for (const mx of lvl >= 2 ? [x + 6, x + 29] : [x + 17]) {
      s += cube(mx + 9, y + 5, h, 3, 3, 5, '#59606d') + cube(mx, y + 4, h + 4, 21, 3, 13, '#2b3140')
        + face(y + 7, `<rect class="fp-screen" x="${mx + 1.5}" y="${-(h + 15.5)}" width="18" height="10" rx="1" fill="#7cc6e8"/>`
          + `<path class="fp-code" d="M${mx + 3.5} ${-(h + 13)}h9M${mx + 3.5} ${-(h + 10.5)}h12M${mx + 3.5} ${-(h + 8)}h6" stroke="#fff" stroke-opacity=".8" stroke-width="1.1"/>`);
    }
    return s + cube(x + 18, y + 16, h, 20, 7, 1.5, '#cfd5dd');
  }
  function plant(x, y, s = 1) {
    const [cx, cy] = P(x + 6 * s, y + 6 * s, 13 * s);
    const leaf = (dx, dy, r, c) => `<circle cx="${(cx + dx * s).toFixed(1)}" cy="${(cy + dy * s).toFixed(1)}" r="${(r * s).toFixed(1)}" fill="${c}"/>`;
    return cube(x, y, 0, 12 * s, 12 * s, 13 * s, '#c47e55')
      + `<g class="fp-plant" style="transform-origin:${cx.toFixed(1)}px ${cy.toFixed(1)}px">`
      + leaf(-7, -7, 8, '#3f8a50') + leaf(7, -9, 8, '#4e9a5c') + leaf(0, -18, 9, '#5fae6c') + leaf(-2, -5, 7, '#57a565') + leaf(7, -2, 6, '#469356') + '</g>';
  }
  function room(x, y) {
    const [back, front] = glass(x, y, 78, 44, 44, '#cfe6f5');
    const seat = (cx, cy) => cube(cx, cy, 0, 9, 8, 9, '#5b6b84');
    return back + seat(x + 7, y + 18) + cube(x + 20, y + 14, 0, 38, 16, 15, '#c9a77c') + seat(x + 26, y + 33) + seat(x + 44, y + 33) + seat(x + 62, y + 18) + front;
  }
  function booth(x, y) {
    const [back, front] = glass(x, y, 26, 24, 54, '#bfe3d2');
    return cube(x, y, 0, 26, 24, 2, '#9fc4b0') + back + cube(x + 8, y + 8, 0, 9, 8, 12, '#e2725b') + front + cube(x - 1, y - 1, 54, 28, 26, 3, '#7fa894');
  }
  function sofa(x, y, len, c) { // its back is against the x = 16 wall, so it faces +x
    return cube(x, y, 0, 8, len, 26, shade(c, -0.05)) + cube(x, y, 0, 26, 7, 17, c) + cube(x + 8, y + 7, 0, 18, len - 14, 11, shade(c, 0.12)) + cube(x, y + len - 7, 0, 26, 7, 17, c);
  }
  function lamp(x, y) {
    const [lx, ly] = P(x + 3, y + 3, 44);
    return cube(x, y, 0, 6, 6, 2, '#59606d') + cube(x + 2, y + 2, 2, 2, 2, 38, '#59606d') + `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="9" ry="6" fill="#ffe8a3"/><ellipse cx="${lx.toFixed(1)}" cy="${(ly + 3).toFixed(1)}" rx="9" ry="3" fill="#f4d27a"/>`;
  }
  const BOOKS = ['#c0392b', '#2f6db5', '#e0a800', '#3f8f5a', '#7a3fd1', '#e67e22'];
  function shelf(x, y, n) {
    let books = '';
    for (let row = 0; row < 3; row++) {
      const z0 = 5 + row * 18;
      books += `<rect x="${x + 2}" y="${-(z0 + 15)}" width="36" height="15" fill="#5e4631"/>`;
      for (let b = 0; b < 7; b++) {
        const hb = 9 + ((b * 7 + row * 3 + n) % 5);
        books += `<rect x="${x + 3 + b * 5}" y="${-(z0 + hb)}" width="4" height="${hb}" fill="${BOOKS[(b + row * 2 + n) % BOOKS.length]}"/>`;
      }
    }
    return cube(x, y, 0, 40, 12, 58, '#8b6a4a') + face(y + 12, books);
  }
  function rack(x, y, on, i) {
    let leds = '';
    for (let k = 0; k < 7; k++) {
      leds += `<rect x="${x + 3}" y="${-(64 - k * 8)}" width="16" height="5" rx="1" fill="#39404f"/>`
        + `<circle ${on ? `class="fp-led" style="animation-delay:${((i * 0.37 + k * 0.53) % 2).toFixed(2)}s"` : ''} cx="${x + 16}" cy="${-(61.5 - k * 8)}" r="1.4" fill="${on ? (k % 3 ? '#4ade80' : '#38bdf8') : '#4b5263'}"/>`;
    }
    return cube(x, y, 0, 22, 24, 70, '#2b3140') + face(y + 24, leds);
  }
  function arcade(x, y) {
    return cube(x, y, 0, 24, 20, 52, '#3b3f6b') + face(y + 20, `<rect class="fp-arcade" x="${x + 3}" y="-45" width="18" height="14" rx="2" fill="#7cf4ff"/><rect x="${x + 3}" y="-27" width="18" height="5" rx="1" fill="#e5735f"/><circle cx="${x + 8}" cy="-24.5" r="1.6" fill="#ffd166"/>`);
  }
  function pingpong(x, y) {
    const leg = (lx, ly) => cube(lx, ly, 0, 3, 3, 14, '#59606d');
    return leg(x + 4, y + 4) + leg(x + 63, y + 4) + leg(x + 4, y + 33) + leg(x + 63, y + 33) + cube(x, y, 14, 70, 40, 3, '#2f8f5b')
      + flat(17, `<path d="M${x + 35} ${y}V${y + 40}M${x} ${y + 20}H${x + 70}" stroke="#fff" stroke-width="1"/>`) + cube(x + 34, y - 2, 17, 2, 44, 6, '#f1f1f1');
  }
  function beanbag(x, y, c) {
    const [cx, cy] = P(x, y, 6);
    return `<ellipse cx="${cx.toFixed(1)}" cy="${(cy + 4).toFixed(1)}" rx="15" ry="8" fill="${shade(c, -0.2)}"/><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="14" ry="9" fill="${c}"/><ellipse cx="${(cx - 4).toFixed(1)}" cy="${(cy - 3).toFixed(1)}" rx="5" ry="2.5" fill="#fff" opacity=".25"/>`;
  }
  // The coffee bar grows with each level: a kettle, a drip machine, an espresso machine, a bar, a roaster.
  function coffee(lvl) {
    if (!lvl) return '';
    const w = [0, 8, 12, 22, 22, 22][lvl], h = [0, 10, 16, 17, 17, 17][lvl];
    const [sx, sy] = P(66 + w / 2, 24, 29 + h + 3);
    const steam = d => `<path class="fp-steam" style="animation-delay:${d}s" d="M${(sx + d * 8).toFixed(1)} ${sy.toFixed(1)}c-3-3 3-5 0-9" stroke="#a8a196" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return cube(66, 20, 29, w, 12, h, lvl === 1 ? '#f1f3f5' : lvl === 2 ? '#3d4450' : '#aeb6bf')
      + (lvl >= 3 ? face(32, `<rect x="69" y="${-(29 + h - 4)}" width="5" height="4" rx="1" fill="#e85d4a"/><rect x="77" y="${-(29 + h - 4)}" width="5" height="4" rx="1" fill="#3d4450"/>`) : '')
      + steam(0) + (lvl >= 3 ? steam(0.8) : '');
  }
  function cooler(x, y) {
    const [bx, by] = P(x + 6.5, y + 6.5, 36);
    return cube(x, y, 0, 13, 13, 28, '#e9edf2') + `<g opacity=".85">${cube(x + 2, y + 2, 28, 9, 9, 15, '#a5d8f3')}</g>`
      + [0, 0.8, 1.6].map((d, i) => `<circle class="fp-bub" style="animation-delay:${d}s" cx="${(bx - 2 + i * 2).toFixed(1)}" cy="${by.toFixed(1)}" r="1.2" fill="#fff"/>`).join('');
  }
  function cone(x, y) {
    const [ax, ay] = P(x, y, 18), [bx, by] = P(x, y, 2);
    return cube(x - 6, y - 6, 0, 12, 12, 2, '#d9480f')
      + `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}L${(bx + 6).toFixed(1)} ${by.toFixed(1)}A6 3 0 0 1 ${(bx - 6).toFixed(1)} ${by.toFixed(1)}Z" fill="#fd7e14"/>`
      + `<path d="M${(ax - 2.6).toFixed(1)} ${(ay + 7).toFixed(1)}h5.2l1.4 3.6h-8z" fill="#fff"/>`;
  }
  function crate(x, y, w, d, h) {
    return cube(x, y, 0, w, d, h, '#c9a46c') + flat(h, `<rect x="${x + w / 2 - 2}" y="${y}" width="4" height="${d}" fill="#e8d4a6"/>`);
  }
  function board(x) { // the project office's kanban board, on the back wall
    const notes = ['#ffd43b', '#ff8fab', '#8ce99a', '#74c0fc'];
    let s = `<rect x="${x}" y="10" width="144" height="40" rx="2" fill="#fff" stroke="#c9c2b6" stroke-width="1.5"/><path d="M${x + 48} 14V46M${x + 96} 14V46" stroke="#e3ddd2"/>`;
    for (let c = 0; c < 3; c++) for (let k = 0; k < 3 - c % 2; k++) s += `<rect x="${x + 8 + c * 48 + (k % 2) * 16}" y="${16 + Math.floor(k / 2) * 14 + (k % 2) * 4}" width="12" height="10" fill="${notes[(c + k) % 4]}"/>`;
    return s;
  }
  function win(x, w) {
    return `<rect x="${x}" y="12" width="${w}" height="44" fill="url(#ID-sky)"/>`
      + [[0.2, 20], [0.55, 27], [0.8, 18]].map(([f, y]) => `<circle class="fp-star" cx="${(x + w * f).toFixed(1)}" cy="${y}" r="1" fill="#fff"/>`).join('')
      + `<path d="M${x + w / 2} 12V56M${x} 34H${x + w}" stroke="#fff" stroke-width="2"/><rect x="${x}" y="12" width="${w}" height="44" fill="none" stroke="#fff" stroke-width="3"/><rect x="${x - 3}" y="56" width="${w + 6}" height="3" fill="#d6cdbf"/>`;
  }

  const ZONE_RECTS = {
    kitchen: [16, 16, 180, 104], lounge: [16, 128, 180, 108], games: [16, 244, 180, 100],
    open: [204, 16, 312, 328],
    meeting: [524, 16, 180, 104], library: [524, 128, 180, 108], servers: [524, 244, 86, 100], lobby: [618, 244, 86, 100],
  };
  const DESKS = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) DESKS.push({ x: 226 + col * 98, y: 30 + row * 80 });
  const ROOMS = [[530, 20], [614, 20], [530, 72], [614, 72]];
  // Low walls between the zones, with gaps for doors: [x0, y0, x1, y1].
  const PARTS = [
    [198, 0, 202, 52], [198, 88, 202, 160], [198, 200, 202, 276], [198, 312, 202, 360],
    [518, 0, 522, 52], [518, 88, 522, 160], [518, 200, 522, 276], [518, 312, 522, 360],
    [0, 122, 70, 126], [110, 122, 198, 126], [0, 238, 70, 242], [110, 238, 198, 242],
    [522, 122, 580, 126], [620, 122, 720, 126], [522, 238, 560, 242], [600, 238, 720, 242], [612, 242, 616, 300],
  ];
  // Where each upgrade goes, for the traffic cones while it is being built.
  const SITES = { coffee: [34, 52], plants: [360, 336], desks: [300, 338], rooms: [574, 104], pmo: [660, 104], phones: [150, 150], lounge: [100, 214], recruit: [128, 160], library: [610, 222], servers: [570, 300], games: [120, 326], lobby: [668, 328] };

  // Painter's order for boxes on a floor: a box is drawn before every box that stands in front of it along x or y.
  function depthSort(items) {
    const n = items.length, indeg = new Array(n).fill(0), next = items.map(() => []);
    const before = (a, b) => (a.x1 <= b.x0 && a.y0 < b.y1) || (a.y1 <= b.y0 && a.x0 < b.x1);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && before(items[i], items[j])) { next[i].push(j); indeg[j]++; }
    const depth = i => items[i].x0 + items[i].y0;
    const ready = [], order = [];
    for (let i = 0; i < n; i++) if (!indeg[i]) ready.push(i);
    while (ready.length) {
      ready.sort((a, b) => depth(b) - depth(a));
      const i = ready.pop();
      order.push(i);
      for (const j of next[i]) if (!--indeg[j]) ready.push(j);
    }
    if (order.length < n) for (let i = 0; i < n; i++) if (!order.includes(i)) order.push(i); // a cycle: draw the rest anyway
    return order.map(i => items[i]);
  }

  // m: { lv: office levels, zones: {zone: lock label or null}, desks: count, building: [office ids], id: prefix for SVG ids }
  function floor(m) {
    const id = m.id || 'fp';
    const lv = k => m.lv[k] || 0;
    const open = z => !m.zones[z];
    const items = [];
    const put = (x0, y0, x1, y1, s) => items.push({ x0, y0, x1, y1, s });
    const out = [`<svg viewBox="0 0 ${VB.w} ${VB.h}" xmlns="http://www.w3.org/2000/svg" class="fp-svg" role="img" aria-label="The office">`,
      `<defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky1,#8fcaf0)"/><stop offset="1" style="stop-color:var(--sky2,#dcf0fb)"/></linearGradient>`,
      `<radialGradient id="${id}-bg" cx="50%" cy="38%" r="72%"><stop offset="0" style="stop-color:var(--fp-bg1,#f4f6f9)"/><stop offset="1" style="stop-color:var(--fp-bg2,#dfe5ec)"/></radialGradient>`,
      `<pattern id="${id}-wood" width="64" height="16" patternUnits="userSpaceOnUse"><rect width="64" height="16" fill="#ead8b8"/><rect y="8" width="64" height="8" fill="#e5d1ae"/><path d="M0 8H64M0 16H64M22 0V8M54 8V16" stroke="#d8c09a" stroke-width=".8"/></pattern>`,
      `<pattern id="${id}-oak" width="64" height="16" patternUnits="userSpaceOnUse"><rect width="64" height="16" fill="#d9bd92"/><rect y="8" width="64" height="8" fill="#d3b689"/><path d="M0 8H64M0 16H64M14 0V8M44 8V16" stroke="#c4a577" stroke-width=".8"/></pattern>`,
      `<pattern id="${id}-tile" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#f4f1ea"/><path d="M0 0H10V10H0ZM10 10H20V20H10Z" fill="#e6dfd2"/></pattern>`,
      `<pattern id="${id}-grid" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#d6dbe2"/><path d="M0 .5H22M.5 0V22" stroke="#c2c8d1"/></pattern>`,
      `<pattern id="${id}-stone" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#f3f0ea"/><path d="M0 .5H36M.5 0V36" stroke="#e2ddd4"/></pattern>`,
      `<pattern id="${id}-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#e2ded6"/><rect width="4" height="10" fill="#d8d3c9"/></pattern></defs>`,
      `<rect width="${VB.w}" height="${VB.h}" fill="url(#${id}-bg)"/>`];

    // the slab the office stands on, and its shadow
    out.push(poly([P(-4, -4, -SLAB - 8), P(FW + 14, -4, -SLAB - 8), P(FW + 14, FD + 14, -SLAB - 8), P(-4, FD + 14, -SLAB - 8)], '#1d2939', ' opacity=".06"'));
    out.push(poly([P(0, FD, 0), P(FW, FD, 0), P(FW, FD, -SLAB), P(0, FD, -SLAB)], '#d9d0c1'));
    out.push(poly([P(FW, 0, 0), P(FW, FD, 0), P(FW, FD, -SLAB), P(FW, 0, -SLAB)], '#c4baa9'));

    // floors: each zone has its own material; zones still locked are bare concrete behind tape
    const mat = { kitchen: 'tile', open: 'wood', meeting: '#dde6ef', lounge: '#ebe2f3', games: '#dcece2', library: 'oak', servers: 'grid', lobby: 'stone' };
    const f = [`<rect width="${FW}" height="${FD}" fill="#ebe6dc"/>`];
    for (const [z, [x, y, w, h]] of Object.entries(ZONE_RECTS)) {
      const c = open(z) ? mat[z] : 'hatch';
      f.push(`<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="${c[0] === '#' ? c : `url(#${id}-${c})`}"/>`);
      if (!open(z)) f.push(`<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="none" stroke="#f2c94c" stroke-width="5"/><rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="none" stroke="#3b3833" stroke-width="5" stroke-dasharray="8 8"/>`);
    }
    if (open('lounge')) f.push('<rect x="34" y="146" width="116" height="80" rx="14" fill="#d9c8ee"/>');
    if (open('library')) f.push('<circle cx="590" cy="200" r="28" fill="#c9a07d"/>');
    if (open('lobby')) f.push('<rect x="644" y="344" width="44" height="14" rx="2" fill="#5b6170"/>');
    DESKS.forEach((d, i) => { if (i >= m.desks) f.push(`<rect x="${d.x}" y="${d.y}" width="56" height="28" rx="2" fill="none" stroke="#cdb38c" stroke-width="1.5" stroke-dasharray="4 4"/>`); });
    if (open('meeting')) ROOMS.forEach(([x, y], i) => { if (i >= lv('rooms')) f.push(`<rect x="${x}" y="${y}" width="78" height="44" fill="none" stroke="#a9bfd3" stroke-width="1.5" stroke-dasharray="4 4"/>`); });
    out.push(flat(0, f.join('')));

    // the two back walls, their caps and ends
    out.push(poly([P(0, 0, 0), P(0, FD, 0), P(0, FD, WALL), P(0, 0, WALL)], '#e8e2d7'));
    out.push(poly([P(0, 0, 0), P(FW, 0, 0), P(FW, 0, WALL), P(0, 0, WALL)], '#f4f0e9'));
    out.push(poly([P(-7, -7, WALL), P(FW, -7, WALL), P(FW, 0, WALL), P(0, 0, WALL), P(0, FD, WALL), P(-7, FD, WALL)], '#cec5b6'));
    out.push(poly([P(FW, -7, WALL), P(FW, 0, WALL), P(FW, 0, -SLAB), P(FW, -7, -SLAB)], '#b9af9f'));
    out.push(poly([P(-7, FD, WALL), P(0, FD, WALL), P(0, FD, -SLAB), P(-7, FD, -SLAB)], '#d2c9ba'));
    const R = [`<rect x="0" y="${WALL - 5}" width="${FW}" height="5" fill="#ddd5c8"/>`, win(222, 76), win(314, 76), win(406, 76)];
    R.push(lv('pmo') ? board(546) : win(540, 70) + win(628, 70));
    R.push('<circle cx="176" cy="24" r="10" fill="#fff" stroke="#3a4252" stroke-width="2"/><line class="fp-hh" x1="176" y1="24" x2="176" y2="18.5" stroke="#3a4252" stroke-width="2.2" stroke-linecap="round"/><line class="fp-mh" x1="176" y1="24" x2="176" y2="16" stroke="#3a4252" stroke-width="1.4" stroke-linecap="round"/>');
    out.push(wallR(R.join('').replace(/ID-sky/g, id + '-sky')));
    const L = [`<rect x="0" y="${WALL - 5}" width="${FD}" height="5" fill="#d5cdc0"/>`];
    L.push('<rect x="258" y="17" width="26" height="26" rx="5" fill="#005f73"/><text x="271" y="36" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">A</text><text x="292" y="36" font-size="15" font-weight="700" letter-spacing="2" fill="#005f73" font-family="system-ui,sans-serif">ATLAS</text>');
    L.push(open('lounge') && lv('lounge') >= 2 ? '<rect x="148" y="16" width="62" height="36" rx="2" fill="#20242c"/><rect class="fp-tv" x="151" y="19" width="56" height="30" fill="#4c8bd6"/>' : win(140, 80));
    L.push(win(44, 64));
    if (open('games') && lv('games')) L.push('<circle cx="24" cy="30" r="10" fill="#2f2f2f"/><circle cx="24" cy="30" r="7" fill="#e5735f"/><circle cx="24" cy="30" r="4" fill="#f4e9d8"/><circle cx="24" cy="30" r="1.6" fill="#2f8f5b"/>');
    out.push(wallL(L.join('').replace(/ID-sky/g, id + '-sky')));
    out.push(cube(22, 0, 52, 124, 9, 20, '#e4dccd') + face(9, [53, 84, 115].map(x => `<path d="M${x} -54V-70" stroke="#cfc4b2" stroke-width="1"/>`).join('')));

    // ------------------------------------------------ what stands on the floor
    for (const [x0, y0, x1, y1] of PARTS) put(x0, y0, x1, y1, cube(x0, y0, 0, x1 - x0, y1 - y0, 16, '#e5dfd4'));

    // kitchen
    put(18, 16, 148, 44, cube(18, 16, 0, 130, 26, 26, '#c9bca8') + cube(17, 15, 26, 132, 28, 3, '#f4f0e9') + flat(29, '<rect x="28" y="20" width="22" height="16" rx="2" fill="#c3ccd6"/>') + coffee(lv('coffee')));
    put(154, 16, 188, 44, cube(154, 16, 0, 34, 28, 64, '#eef1f4') + face(44, '<path d="M156 -40H186" stroke="#c9d1db" stroke-width="1.2"/><rect x="180" y="-36" width="2" height="14" fill="#aab4c0"/>'));
    put(56, 62, 124, 94, cube(87, 75, 0, 6, 6, 15, METAL) + cube(56, 62, 15, 68, 32, 3, WOOD));
    for (const [sx, sy] of [[62, 100], [84, 100], [106, 100], [40, 72]]) put(sx, sy, sx + 10, sy + 10, cube(sx, sy, 0, 10, 10, 11, '#e07a5f'));
    if (lv('coffee') >= 4) {
      put(150, 62, 190, 102, cube(150, 62, 0, 40, 40, 27, '#6b4a33') + cube(149, 61, 27, 42, 42, 3, '#3a2a1e') + cube(160, 66, 30, 22, 12, 15, '#c9a227')
        + (lv('coffee') >= 5 ? cube(158, 84, 30, 16, 14, 14, '#2b2b2b') + cube(162, 88, 44, 8, 6, 6, '#c0392b') : ''));
    }

    // open plan
    DESKS.forEach((d, i) => { if (i < m.desks) put(d.x, d.y, d.x + 56, d.y + 48, desk(d.x, d.y, lv('desks')) + chair(d.x + 21, d.y + 34)); });
    put(494, 18, 507, 31, cooler(494, 18));
    [[206, 330], [500, 336], [500, 160], [206, 160], [356, 340]].slice(0, lv('plants')).forEach(([x, y]) => put(x, y, x + 12, y + 12, plant(x, y)));
    if (lv('desks') >= 2) put(486, 286, 510, 308, cube(486, 286, 0, 24, 22, 22, '#dfe3e8') + cube(488, 288, 22, 20, 18, 4, '#c5ccd5'));

    // meeting rooms
    if (open('meeting')) ROOMS.forEach(([x, y], i) => { if (i < lv('rooms')) put(x, y, x + 78, y + 44, room(x, y)); });

    // lounge
    if (open('lounge')) {
      if (lv('lounge')) {
        put(18, 150, 44, 216, sofa(18, 150, 66, '#7d8fb5'));
        put(62, 170, 96, 194, cube(62, 170, 0, 34, 24, 11, '#d9c3a3'));
      }
      if (lv('lounge') >= 2) put(122, 138, 128, 144, lamp(122, 138));
      if (lv('lounge') >= 3) {
        const [fx, fy] = P(78, 136, 22);
        put(58, 130, 98, 142, cube(58, 130, 0, 40, 12, 12, '#59606d') + `<g opacity=".8">${cube(58, 130, 12, 40, 12, 18, '#5fb6e0')}</g>`
          + `<g class="fp-fish"><path d="M${fx.toFixed(1)} ${fy.toFixed(1)}l5-2.5v5z M${(fx - 7).toFixed(1)} ${fy.toFixed(1)}a3.5 2.2 0 1 0 7 0a3.5 2.2 0 1 0 -7 0" fill="#ff922b"/></g>`);
      }
      for (let i = 0; i < Math.min(4, Math.ceil(lv('phones') / 2)); i++) put(162, 132 + i * 26, 188, 156 + i * 26, booth(162, 132 + i * 26));
      if (lv('recruit')) put(104, 132, 144, 148, cube(104, 132, 0, 40, 16, 20, '#c9b18a') + cube(146, 130, 0, 6, 4, 46, '#005f73'));
    }

    // game room
    if (open('games')) {
      if (lv('games')) put(40, 268, 110, 308, pingpong(40, 268));
      if (lv('games') >= 2) put(150, 250, 174, 270, arcade(150, 250));
      if (lv('games') >= 3) { put(56, 322, 74, 336, beanbag(64, 328, '#f4a259')); put(90, 324, 108, 338, beanbag(98, 330, '#e5735f')); }
    }

    // library
    if (open('library')) {
      for (let i = 0; i < Math.max(1, Math.min(4, Math.ceil(lv('library') / 3))); i++) put(530 + i * 44, 130, 570 + i * 44, 142, shelf(530 + i * 44, 130, i));
      if (lv('library')) {
        put(568, 188, 592, 210, cube(568, 188, 0, 24, 22, 10, '#9c6644') + cube(568, 188, 0, 6, 22, 24, '#8a5a3c'));
        put(606, 184, 612, 190, lamp(606, 184));
      }
    }

    // server room
    if (open('servers')) {
      for (let i = 0; i < Math.max(1, Math.min(3, Math.ceil(lv('servers') / 4))); i++) put(530 + i * 26, 250, 552 + i * 26, 274, rack(530 + i * 26, 250, lv('servers') > 0, i));
      put(540, 308, 572, 328, cube(540, 308, 0, 32, 20, 28, '#e9edf2') + face(328, '<path d="M544 -8H568M544 -12H568M544 -16H568" stroke="#c5ccd5" stroke-width="1.5"/>'));
    }

    // lobby
    if (open('lobby')) {
      put(640, 250, 672, 258, cube(640, 250, 0, 32, 8, 66, '#005f73') + face(258, '<rect x="649" y="-56" width="14" height="14" rx="3" fill="#fff"/><text x="656" y="-45" text-anchor="middle" font-size="11" font-weight="800" fill="#005f73" font-family="system-ui,sans-serif">A</text>'));
      if (lv('lobby')) put(632, 288, 694, 306, cube(632, 288, 0, 62, 18, 26, '#efe9df') + cube(631, 287, 26, 64, 20, 3, '#c9a77c')
        + face(306, '<text x="663" y="-9" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="2.5" fill="#005f73" font-family="system-ui,sans-serif">ATLAS</text>'));
      put(622, 326, 635, 339, plant(622, 326, 1.1));
      put(690, 250, 701, 261, plant(690, 250, 0.9));
    }

    // zones not open yet: a few moving boxes behind the tape
    for (const [z, [x, y, w, h]] of Object.entries(ZONE_RECTS)) {
      if (open(z)) continue;
      const cx = x + w / 2, cy = y + h / 2;
      put(cx - 22, cy - 4, cx - 2, cy + 12, crate(cx - 22, cy - 4, 20, 16, 14));
      put(cx + 2, cy + 2, cx + 18, cy + 16, crate(cx + 2, cy + 2, 16, 14, 11));
    }
    // upgrades under construction get traffic cones
    for (const b of m.building || []) {
      const s = SITES[b];
      if (s) { put(s[0] - 6, s[1] - 6, s[0] + 6, s[1] + 6, cone(s[0], s[1])); put(s[0] + 12, s[1] - 2, s[0] + 24, s[1] + 10, cone(s[0] + 18, s[1] + 4)); }
    }

    for (const it of depthSort(items)) out.push(it.s);
    out.push('</svg>');
    return out.join('');
  }

  // Where someone stands, as % of the picture's width and height.
  const SEATS = { coffee: [[52, 114], [92, 116], [132, 112], [42, 60]], lounge: [[31, 172], [31, 198], [80, 210], [116, 176]] };
  const pct = (x, y) => { const [sx, sy] = P(x, y); return { x: (sx / VB.w) * 100, y: (sy / VB.h) * 100 }; };
  function spot(kind, index = 0) {
    if (kind === 'desk') { const d = DESKS[index % DESKS.length]; return pct(d.x + 28, d.y + 46); }
    if (kind === 'meeting') {
      const [x, y] = ROOMS[Math.floor(index / 4) % 4];
      return pct(...[[x + 31, y + 41], [x + 49, y + 41], [x + 68, y + 24], [x + 12, y + 26]][index % 4]);
    }
    const list = SEATS[kind];
    return list ? pct(...list[index % list.length]) : pct(360, 340);
  }
  const zoneSpot = z => { const [x, y, w, h] = ZONE_RECTS[z]; return pct(x + w / 2, y + h / 2); };

  // ------------------------------------------------------------------ splash art for rare hires
  // The person as a large bust over light rays, in the colours of their rarity. 300 × 360.
  const SPLASH = {
    4: { bg: ['#3b1600', '#d9822b'], ray: ['#ffd27a'] },
    5: { bg: ['#1b0a38', '#9c2f8f'], ray: ['#ffe066', '#ff8787', '#da77f2', '#74c0fc', '#8ce99a'] },
  };
  function splash(look, r) {
    const k = SPLASH[r] || SPLASH[4], id = 'sp' + r;
    const rays = Array.from({ length: 18 }, (_, i) => {
      const a = (i * 20 * Math.PI) / 180, b = a + 0.13;
      return `<path d="M150 150L${(150 + 320 * Math.cos(a)).toFixed(1)} ${(150 + 320 * Math.sin(a)).toFixed(1)}L${(150 + 320 * Math.cos(b)).toFixed(1)} ${(150 + 320 * Math.sin(b)).toFixed(1)}Z" fill="${k.ray[i % k.ray.length]}"/>`;
    }).join('');
    const star = (x, y, s, d) => `<path class="sp-tw" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${s})" d="M0 -10L2.4 -2.4L10 0L2.4 2.4L0 10L-2.4 2.4L-10 0L-2.4 -2.4Z" fill="#fff"/>`;
    return `<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
      + `<defs><radialGradient id="${id}-g" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${k.bg[1]}"/><stop offset="1" stop-color="${k.bg[0]}"/></radialGradient>`
      + `<radialGradient id="${id}-h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
      + `<rect width="300" height="360" fill="url(#${id}-g)"/><g class="sp-rays" opacity=".24">${rays}</g><circle cx="150" cy="150" r="125" fill="url(#${id}-h)"/>`
      + star(46, 58, 1, 0) + star(254, 92, 0.8, 0.7) + star(64, 226, 0.6, 1.3) + star(240, 212, 1.1, 0.4) + star(212, 38, 0.5, 1.8)
      + `<g transform="translate(22 104) scale(4)">${avatar(look, { bare: true })}</g></svg>`;
  }

  return { avatar, logo, gearIcon, roleIcon, moodFace, STAR, floor, spot, zoneSpot, splash, box, chart, chartScale, DESK_COUNT: DESKS.length, FLOOR_W: VB.w, FLOOR_H: VB.h, RARITY_COLORS, shade };
})();
