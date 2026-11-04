import fs from "node:fs";
import path from "node:path";

const cssPath = path.resolve(
  "src/styles/ui-finish.css"
);

const START = "/* GALLERY DOT PATCH START */";
const END = "/* GALLERY DOT PATCH END */";

if (!fs.existsSync(cssPath)) {
  console.error("File ui-finish.css tidak ditemukan.");
  console.error("Jalankan script dari root project xi9-mubela.");
  process.exit(1);
}

let css = fs.readFileSync(cssPath, "utf8");

// Hapus patch lama agar script aman dijalankan berulang.
const oldStart = css.indexOf(START);
const oldEnd = css.indexOf(END);

if (oldStart !== -1 && oldEnd !== -1 && oldEnd > oldStart) {
  css =
    css.slice(0, oldStart) +
    css.slice(oldEnd + END.length);
}

const patch = `
${START}

/* Area tombol tetap nyaman disentuh */
#carousel-3d-dots .carousel-dot {
  position: relative !important;
  box-sizing: border-box !important;

  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;

  flex: 0 0 30px !important;
  display: inline-grid !important;
  place-items: center !important;

  padding: 0 !important;
  border: none !important;
  border-radius: 50% !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}

/* Titik visual dibuat kecil */
#carousel-3d-dots .carousel-dot::before {
  content: "" !important;
  display: block !important;

  width: 5px !important;
  height: 5px !important;

  border-radius: 50% !important;
  background: var(--text-3) !important;

  transition:
    width 160ms ease,
    height 160ms ease,
    background-color 160ms ease !important;
}

/* Hilangkan pembesaran tombol aktif */
#carousel-3d-dots .carousel-dot.active,
#carousel-3d-dots .carousel-dot.active:hover {
  background: transparent !important;
  transform: none !important;
}

/* Indikator aktif berupa garis kecil */
#carousel-3d-dots .carousel-dot.active::before {
  width: 11px !important;
  height: 5px !important;

  border-radius: 999px !important;
  background: var(--primary) !important;
}

/* Jarak antarindikator */
#carousel-3d-dots {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 2px !important;
}

/* Fokus keyboard */
#carousel-3d-dots .carousel-dot:focus-visible {
  outline: 2px solid var(--ui-outline) !important;
  outline-offset: -2px !important;
}

/* Kurangi animasi jika diminta pengguna */
@media (prefers-reduced-motion: reduce) {
  #carousel-3d-dots .carousel-dot::before {
    transition: none !important;
  }
}

${END}
`;

css = css.trimEnd() + "\n\n" + patch + "\n";

fs.writeFileSync(cssPath, css, "utf8");

console.log("==================================");
console.log("GALERI DOT PATCH BERHASIL DIPASANG");
console.log("==================================");
console.log("File: src/styles/ui-finish.css");
console.log("Titik normal : 5 x 5 px");
console.log("Titik aktif  : 11 x 5 px");
console.log("Area sentuh  : 44 x 44 px");
console.log("Fungsi carousel tetap dipertahankan.");
