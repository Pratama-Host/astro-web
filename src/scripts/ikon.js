// Ikon sosial SVG lokal (tanpa CDN). Path berupa konstanta tepercaya.
const P = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  youtube: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
  tiktok: '<path d="M14 3v11.2a4 4 0 1 1-3-3.9M14 3c.6 3 2.5 4.8 5 5"/>',
  facebook: '<path d="M14 8h3V4h-3a5 5 0 0 0-5 5v2H6v4h3v5h4v-5h3l1-4h-4V9a1 1 0 0 1 1-1Z"/>',
  github: '<path d="M9 19c-4.5 1.5-4.5-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.2-.4-3.7 1.4a13 13 0 0 0-6.7 0C5.8 1.2 4.6 1.6 4.6 1.6a4.8 4.8 0 0 0-.1 3.6 5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.1 6.4 6.1 6.7a3.4 3.4 0 0 0-.9 2.6V22"/>',
  linkedin: '<path d="M5 9v10M5 5v.01M10 19v-6a3 3 0 0 1 6 0v6M10 10v9"/>',
  whatsapp: '<path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.1A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8.2 7.8c-.5.5-.8 1-.7 1.7.2 1.5 2.3 4 4.5 5.1.9.5 1.8.6 2.4.2l1.1-.9-1.8-1.4-1 .7c-.9-.4-1.7-1.1-2.2-2l.7-.9-1.3-1.8-1.7 1.3Z"/>',
  x: '<path d="m5 4 14 16M19 4 5 20"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
};
P.twitter = P.x;
export function buatIkon(nama, ukuran = "1em") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ width: ukuran, height: ukuran, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: "ikon" })) svg.setAttribute(k, v);
  svg.innerHTML = P[nama] || P.globe;
  return svg;
}
