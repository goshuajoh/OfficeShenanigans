// Atlas Workforce art: illustrated avatars, client logos, icons and the office floor plan, all drawn as inline SVG.
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
    return `<rect width="64" height="64" fill="${look.bg || '#e7e5ff'}"/>`
      + `<path d="M9 64C9 52 17.5 46 27 45H37C46.5 46 55 52 55 64Z" fill="${c}"/>`
      + `<rect x="27.5" y="38" width="9" height="8" rx="2" fill="${shade(c, -0.25)}"/>`
      + `<path d="M32 12V7" stroke="${shade(c, -0.2)}" stroke-width="2"/><circle cx="32" cy="6" r="2.6" fill="#ff8fb1"/>`
      + `<rect x="17.5" y="12" width="29" height="28" rx="9" fill="#f6f7ff" stroke="${c}" stroke-width="2"/>`
      + `<rect x="21" y="18.5" width="22" height="12.5" rx="5.5" fill="#1d2342"/>`
      + `<path d="M25.5 25.2Q27.5 22.8 29.5 25.2M34.5 25.2Q36.5 22.8 38.5 25.2" stroke="#7cf4ff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      + `<path d="M28.5 35Q32 37 35.5 35" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  }

  function dog(look) {
    const f = look.fur || '#e2a857', d = shade(f, -0.22), l = shade(f, 0.4);
    return `<rect width="64" height="64" fill="${look.bg || '#fdf0d5'}"/>`
      + `<path d="M12 64C12 52 20 46 32 46S52 52 52 64Z" fill="${f}"/><path d="M25 64C25 56 28 52.5 32 52.5S39 56 39 64Z" fill="${l}"/>`
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
  function avatar(look, opts = {}) {
    let inner;
    if (!look) look = {};
    if (look.dog) inner = dog(look);
    else if (look.bot) inner = bot(look);
    else {
      const skin = SKIN[look.skin == null ? 1 : look.skin];
      const hairC = look.hc || '#2b2018';
      const parts = [`<rect width="64" height="64" fill="${look.bg || '#e8edf3'}"/>`];
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
    const filter = opts.mono ? ' style="filter:grayscale(1) brightness(1.15) contrast(.6);opacity:.55"' : '';
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${filter}>${inner}</svg>`;
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
  // ------------------------------------------------------------------ floor plan
  // 720×360. Zones open as funding rounds land; furniture appears as you build.
  const FP = { w: 720, h: 360 };
  const ZONE_RECTS = {
    kitchen: [16, 16, 180, 104], lounge: [16, 128, 180, 108], games: [16, 244, 180, 100],
    open: [204, 16, 312, 328],
    meeting: [524, 16, 180, 104], library: [524, 128, 180, 108], servers: [524, 244, 86, 100], lobby: [618, 244, 86, 100],
  };
  const DESKS = (() => {
    const out = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) out.push({ x: 222 + col * 100, y: 34 + row * 80 });
    return out;
  })();
  const deskSeat = i => ({ x: DESKS[i].x + 38, y: DESKS[i].y + 46 });
  const MEETING_ROOMS = [[532, 24], [616, 24], [532, 74], [616, 74]];

  function plant(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-6" r="7" fill="#5fa86b"/><circle cx="-5" cy="-1" r="5" fill="#4e9a5c"/><circle cx="5" cy="-1" r="5" fill="#6bb877"/><rect x="-5" y="2" width="10" height="7" rx="2" fill="#b98157"/></g>`;
  }
  function label(x, y, text) {
    return `<text x="${x}" y="${y}" font-size="9" font-weight="600" letter-spacing=".8" fill="#9a9384">${text.toUpperCase()}</text>`;
  }
  function locked(z, text) {
    const [x, y, w, h] = ZONE_RECTS[z];
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#fp-hatch)" stroke="#d8d2c6" stroke-dasharray="4 4"/>`
      + `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-size="9.5" fill="#a39c8f">${text}</text>`;
  }

  // m: { lv: office levels, funding, zones: {zone: unlockLabel|null}, desks: count }
  function floor(m) {
    const lv = id => m.lv[id] || 0;
    const z = id => !m.zones[id];
    const out = [`<svg viewBox="0 0 ${FP.w} ${FP.h}" xmlns="http://www.w3.org/2000/svg" class="fp-svg" role="img" aria-label="Office floor plan">`,
      '<defs><pattern id="fp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f1eee8"/><line x1="0" y1="0" x2="0" y2="8" stroke="#e4dfd5" stroke-width="3"/></pattern></defs>',
      `<rect x="6" y="6" width="${FP.w - 12}" height="${FP.h - 12}" rx="6" fill="#f6f3ed" stroke="#cfc8bb" stroke-width="5"/>`];
    // windows along the top wall
    for (let x = 40; x < FP.w - 40; x += 70) out.push(`<rect x="${x}" y="4" width="44" height="5" rx="2" fill="#bfe0f2"/>`);

    // kitchen
    out.push(label(24, 30, 'Kitchen'));
    out.push('<rect x="20" y="38" width="96" height="16" rx="3" fill="#ddd6c8"/><rect x="124" y="36" width="22" height="34" rx="3" fill="#e9edf2" stroke="#d3d9e0"/><circle cx="40" cy="46" r="5" fill="#cbd5df"/>');
    const coffee = lv('coffee');
    if (coffee) {
      const w = 10 + coffee * 5;
      out.push(`<rect x="${58}" y="39" width="${w}" height="13" rx="2.5" fill="#3d4450"/><rect x="${60}" y="41" width="5" height="5" rx="1" fill="#e85d4a"/>`);
      out.push(`<g class="fp-steam"><path d="M${60 + w / 2} 36c-2-2 2-3 0-6" stroke="#b9b3a8" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`);
      if (coffee >= 4) out.push('<rect x="92" y="40" width="20" height="11" rx="2" fill="#7b5a3a"/><circle cx="97" cy="45.5" r="2" fill="#f4e9d8"/><circle cx="106" cy="45.5" r="2" fill="#f4e9d8"/>');
    } else out.push('<text x="60" y="49" font-size="8" fill="#b0a99c">coffee bar</text>');
    out.push('<circle cx="80" cy="92" r="16" fill="#e3d7c3"/><circle cx="58" cy="92" r="5" fill="#cbd2dc"/><circle cx="102" cy="92" r="5" fill="#cbd2dc"/><circle cx="80" cy="113" r="5" fill="#cbd2dc"/>');

    // open plan desks
    out.push(label(212, 30, 'Open plan'));
    for (let i = 0; i < DESKS.length; i++) {
      const d = DESKS[i];
      if (i < m.desks) {
        out.push(`<rect x="${d.x}" y="${d.y}" width="76" height="26" rx="3" fill="#e8d9bf" stroke="#d8c6a6"/><rect x="${d.x + 26}" y="${d.y + 3}" width="24" height="5" rx="1.5" fill="#3a4252"/>`);
        out.push(`<circle cx="${d.x + 38}" cy="${d.y + 44}" r="9" fill="#cdd4de"/>`);
      } else {
        out.push(`<rect x="${d.x}" y="${d.y}" width="76" height="26" rx="3" fill="none" stroke="#ddd7cc" stroke-dasharray="3 3"/>`);
      }
    }
    // plants spread around as you buy them
    const spots = [[30, 340], [200, 340], [510, 40], [520, 340], [175, 125]];
    for (let i = 0; i < Math.min(lv('plants'), spots.length); i++) out.push(plant(spots[i][0], spots[i][1] - 12, 0.9));

    // meeting rooms
    if (z('meeting')) {
      out.push(label(532, 21, 'Meeting rooms'));
      MEETING_ROOMS.forEach(([x, y], i) => {
        if (i < lv('rooms')) {
          out.push(`<rect x="${x}" y="${y}" width="80" height="44" rx="3" fill="#f3f9fc" stroke="#9cc9e3" stroke-width="1.6"/><rect x="${x + 22}" y="${y + 14}" width="36" height="16" rx="6" fill="#d9c3a3"/>`);
          [[x + 16, y + 22], [x + 64, y + 22], [x + 40, y + 9], [x + 40, y + 36]].forEach(([cx, cy]) => out.push(`<circle cx="${cx}" cy="${cy}" r="3.6" fill="#cdd4de"/>`));
        } else out.push(`<rect x="${x}" y="${y}" width="80" height="44" rx="3" fill="none" stroke="#d8d2c6" stroke-dasharray="3 3"/><text x="${x + 40}" y="${y + 26}" text-anchor="middle" font-size="8.5" fill="#b0a99c">room ${i + 1}</text>`);
      });
    } else out.push(locked('meeting', m.zones.meeting));

    // lounge
    if (z('lounge')) {
      out.push(label(24, 143, 'Lounge'));
      out.push('<rect x="34" y="166" width="96" height="54" rx="10" fill="#ece1f6"/>');
      if (lv('lounge')) out.push('<path d="M40 160H120V172H52V196H40Z" fill="#8193b5"/><rect x="72" y="182" width="34" height="18" rx="4" fill="#d9c3a3"/>');
      const booths = Math.min(4, Math.ceil(lv('phones') / 2));
      for (let i = 0; i < booths; i++) out.push(`<rect x="${150}" y="${150 + i * 21}" width="20" height="18" rx="3" fill="#dfe9e4" stroke="#9fc4b0"/>`);
      if (lv('pmo')) out.push('<rect x="40" y="222" width="54" height="10" rx="2" fill="#3a4252"/><text x="98" y="230" font-size="7.5" fill="#9a9384">PMO</text>');
      if (lv('recruit')) out.push('<rect x="110" y="222" width="28" height="10" rx="2" fill="#c9b18a"/>');
    } else out.push(locked('lounge', m.zones.lounge));

    // game room
    if (z('games')) {
      out.push(label(24, 259, 'Game room'));
      if (lv('games')) out.push('<rect x="40" y="276" width="70" height="38" rx="3" fill="#2f8f5b" stroke="#25744a"/><path d="M75 276V314" stroke="#fff" stroke-width="1.5"/>');
      if (lv('games') >= 2) out.push('<rect x="130" y="270" width="26" height="40" rx="3" fill="#3b3f6b"/><rect x="134" y="275" width="18" height="12" rx="1" fill="#7cf4ff"/>');
      if (lv('games') >= 3) out.push('<circle cx="60" cy="330" r="8" fill="#f4a259"/><circle cx="84" cy="331" r="8" fill="#e5735f"/>');
    } else out.push(locked('games', m.zones.games));

    // library
    if (z('library')) {
      out.push(label(532, 143, 'Library'));
      const shelves = Math.max(1, Math.min(4, Math.ceil(lv('library') / 3)));
      const books = ['#c0392b', '#2f6db5', '#e0a800', '#3f8f5a', '#7a3fd1'];
      for (let i = 0; i < shelves; i++) {
        const x = 532 + i * 42;
        out.push(`<rect x="${x}" y="152" width="36" height="12" rx="2" fill="#a7835d"/>`);
        for (let b = 0; b < 6; b++) out.push(`<rect x="${x + 2 + b * 5.6}" y="154" width="4" height="8" fill="${books[(i + b) % books.length]}"/>`);
      }
      if (lv('library')) out.push('<circle cx="580" cy="205" r="10" fill="#d9c3a3"/><circle cx="560" cy="205" r="5" fill="#cdd4de"/><circle cx="600" cy="205" r="5" fill="#cdd4de"/>');
    } else out.push(locked('library', m.zones.library));

    // server room
    if (z('servers')) {
      out.push(label(532, 259, 'Servers'));
      const racks = Math.max(1, Math.min(3, Math.ceil(lv('servers') / 4)));
      for (let i = 0; i < racks; i++) {
        const x = 534 + i * 24;
        out.push(`<rect x="${x}" y="268" width="18" height="64" rx="2" fill="#2b3140"/>`);
        for (let k = 0; k < 6; k++) out.push(`<circle class="fp-led" style="animation-delay:${(i * 0.37 + k * 0.53) % 2}s" cx="${x + 5}" cy="${275 + k * 10}" r="1.5" fill="${lv('servers') ? '#4ade80' : '#3b4252'}"/>`);
      }
    } else out.push(locked('servers', m.zones.servers));

    // lobby
    if (z('lobby')) {
      out.push(label(624, 259, 'Lobby'));
      if (lv('lobby')) out.push('<path d="M630 300Q661 284 692 300V310H630Z" fill="#d9c3a3"/><text x="661" y="333" text-anchor="middle" font-size="9" font-weight="700" fill="#005f73" letter-spacing="1.5">ATLAS</text>');
      out.push(plant(694, 330, 0.8));
    } else out.push(locked('lobby', m.zones.lobby));

    // internal walls
    out.push('<path d="M196 12V348M520 12V348M12 120H196M12 240H196M520 124H708M520 240H708M614 240V348" stroke="#ddd6c9" stroke-width="2.5"/>');
    out.push('</svg>');
    return out.join('');
  }

  // Where someone stands on the floor plan, as % of the plan's width/height.
  function spot(kind, index = 0) {
    let p;
    if (kind === 'desk') p = deskSeat(index % DESKS.length);
    else if (kind === 'coffee') p = [{ x: 58, y: 92 }, { x: 102, y: 92 }, { x: 80, y: 113 }, { x: 40, y: 72 }][index % 4];
    else if (kind === 'lounge') p = [{ x: 60, y: 186 }, { x: 88, y: 168 }, { x: 112, y: 168 }][index % 3];
    else if (kind === 'meeting') { const [x, y] = MEETING_ROOMS[Math.floor(index / 4) % 4]; p = [{ x: x + 16, y: y + 22 }, { x: x + 64, y: y + 22 }, { x: x + 40, y: y + 9 }, { x: x + 40, y: y + 36 }][index % 4]; }
    else p = { x: 360, y: 340 };
    return { x: (p.x / FP.w) * 100, y: (p.y / FP.h) * 100 };
  }

  return { avatar, logo, gearIcon, roleIcon, moodFace, STAR, floor, spot, box, chart, chartScale, DESK_COUNT: DESKS.length, RARITY_COLORS, shade };
})();
