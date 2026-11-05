#!/data/data/com.termux/files/usr/bin/bash
# Fix: wrap TRUE branch ternary galeri dengan fragment <>...</>
set -e

FILE="${1:-src/pages/galeri.astro}"

if [ ! -f "$FILE" ]; then
  echo "[ERROR] File tidak ditemukan: $FILE"
  echo "Jalankan dari root project, atau: bash fix-galeri.sh /path/ke/galeri.astro"
  exit 1
fi

# Cek Python tersedia
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 tidak ada. Install dulu: pkg install python"
  exit 1
fi

# Backup
BACKUP="${FILE}.bak.$(date +%Y%m%d_%H%M%S)"
cp "$FILE" "$BACKUP"
echo "[OK] Backup: $BACKUP"

python3 - "$FILE" <<'PYEOF'
import sys, io

path = sys.argv[1]
with io.open(path, encoding='utf-8') as f:
    src = f.read()

# Marker pembuka: setelah "? (" dari ternary galeri.length > 0
open_old = "        {galeri.length > 0 ? (\n"
open_new = "        {galeri.length > 0 ? (\n        <>\n"

# Marker penutup: sebelum ") : (" menuju empty state
close_old = '        ) : (\n          <p class="gallery-empty-state"'
close_new = '        </>\n        ) : (\n          <p class="gallery-empty-state"'

changed = False

if "<>\n" in src and "galeri.length > 0 ? (\n        <>" in src:
    print("[=] Fragment pembuka sudah ada, skip.")
else:
    if open_old in src:
        src = src.replace(open_old, open_new, 1)
        changed = True
        print("[OK] Menambahkan <> setelah ternary pembuka.")
    else:
        print("[!] Marker pembuka tidak ditemukan — cek manual.")

if '        </>\n        ) : (' in src and 'gallery-empty-state' in src:
    print("[=] Fragment penutup sudah ada, skip.")
else:
    if close_old in src:
        src = src.replace(close_old, close_new, 1)
        changed = True
        print("[OK] Menambahkan </> sebelum ternary penutup.")
    else:
        print("[!] Marker penutup tidak ditemukan — cek manual.")

if changed:
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print("[OK] File berhasil ditulis:", path)
else:
    print("[=] Tidak ada perubahan pada file.")
PYEOF

echo ""
echo "=== Verifikasi konteks di file ==="
grep -n 'galeri.length > 0 ? (' "$FILE" || true
grep -n 'gallery-empty-state' "$FILE" || true
grep -n '^        <>$' "$FILE" || true
grep -n '^        </>$' "$FILE" || true

echo ""
echo "Selesai. Coba jalankan: npm run build"
