// Hand-authored SVG sprite for town buildings. Painted-cartoon ARPG style:
// slight 3/4 perspective wooden hut with a dark shingled roof.
//
// One sprite covers both orientations — WorldCanvas rotates the canvas 90°
// for buildings taller than wide. The viewBox is 150×100 (horizontal hut);
// it's drawn into the building's full AABB so the visible footprint matches
// the existing collision rect.
//
// To swap to authored PNG art later: replace HUT_SVG_TEXT with the new SVG,
// or change the WorldCanvas call from `canvas.drawSvg` to image rendering.

export const HUT_SVG_TEXT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 100">
  <!-- heavy ground shadow -->
  <ellipse cx="75" cy="94" rx="64" ry="7" fill="#000000" opacity="0.65"/>

  <!-- right side wall (in deep shadow) -->
  <path d="M 140 58 L 146 64 L 146 88 L 140 84 Z" fill="#1f1812" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/>

  <!-- front wall — weathered gray-brown wood -->
  <rect x="18" y="58" width="122" height="30" fill="#3a302a"/>
  <!-- plank shadows -->
  <line x1="18" y1="68" x2="140" y2="68" stroke="#1a140e" stroke-width="1.4" opacity="0.9"/>
  <line x1="18" y1="78" x2="140" y2="78" stroke="#1a140e" stroke-width="1.4" opacity="0.9"/>
  <!-- plank seams -->
  <line x1="48" y1="58" x2="48" y2="88" stroke="#1a140e" stroke-width="0.9" opacity="0.8"/>
  <line x1="112" y1="58" x2="112" y2="88" stroke="#1a140e" stroke-width="0.9" opacity="0.8"/>
  <!-- a stain / weather streak on the wall -->
  <path d="M 78 58 L 76 88" stroke="#0a0807" stroke-width="2" opacity="0.5"/>
  <!-- wall outline -->
  <rect x="18" y="58" width="122" height="30" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round"/>

  <!-- door -->
  <rect x="66" y="64" width="22" height="24" fill="#0a0807"/>
  <rect x="66" y="64" width="22" height="24" fill="none" stroke="#000000" stroke-width="1.6" stroke-linejoin="round"/>
  <!-- door knob — dull bronze, barely catches light -->
  <circle cx="83" cy="76" r="1.3" fill="#5a4a28"/>

  <!-- roof: near-black mossy shingled trapezoid -->
  <path d="M 10 60 L 26 22 L 134 22 L 150 60 Z" fill="#15110d" stroke="#000000" stroke-width="2" stroke-linejoin="round"/>
  <!-- shingle rows -->
  <path d="M 16 50 L 144 50" stroke="#000000" stroke-width="1.3" opacity="0.95"/>
  <path d="M 20 40 L 140 40" stroke="#000000" stroke-width="1.3" opacity="0.95"/>
  <path d="M 24 30 L 136 30" stroke="#000000" stroke-width="1.3" opacity="0.95"/>
  <!-- moss patches on the roof — cold dark green dabs -->
  <ellipse cx="44" cy="36" rx="8" ry="3" fill="#1a2818" opacity="0.7"/>
  <ellipse cx="98" cy="48" rx="10" ry="3.5" fill="#1a2818" opacity="0.7"/>
  <ellipse cx="118" cy="32" rx="6" ry="2.5" fill="#1a2818" opacity="0.7"/>
  <!-- roof ridge -->
  <line x1="26" y1="22" x2="134" y2="22" stroke="#000000" stroke-width="2.5"/>
</svg>`
