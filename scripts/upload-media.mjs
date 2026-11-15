import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const manifestArg = args.find((value) => value !== '--dry-run');
const sourceManifest = manifestArg || process.env.MEDIA_MANIFEST || 'supabase/seed/media-manifest.json';
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'astro';
const sourceRoot = path.resolve(process.env.MEDIA_SOURCE_DIR || process.cwd());
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_MANIFEST_ITEMS = 1000;

const FORMATS = {
  '.png': { mime: 'image/png', signature: (b) => b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) },
  '.jpg': { mime: 'image/jpeg', signature: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.jpeg': { mime: 'image/jpeg', signature: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.webp': { mime: 'image/webp', signature: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  '.gif': { mime: 'image/gif', signature: (b) => ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)) },
  '.avif': { mime: 'image/avif', signature: (b) => { const head = b.toString('ascii', 0, Math.min(b.length, 64)); return head.slice(4, 8) === 'ftyp' && (head.includes('avif') || head.includes('avis')); } },
  '.ico': { mime: 'image/x-icon', signature: (b) => b.length >= 4 && b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0 },
  '.mp3': { mime: 'audio/mpeg', signature: (b) => b.length >= 4 && (b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) },
  '.wav': { mime: 'audio/wav', signature: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE' },
  '.ogg': { mime: 'audio/ogg', signature: (b) => b.length >= 4 && b.toString('ascii', 0, 4) === 'OggS' },
  '.m4a': { mime: 'audio/mp4', signature: (b) => b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp' && /^(M4A |M4B |mp4|isom|iso[2-9])/.test(b.toString('ascii', 8, 12)) },
  '.aac': { mime: 'audio/aac', signature: (b) => b.length >= 2 && b[0] === 0xff && ((b[1] & 0xf6) === 0xf0) },
  '.weba': { mime: 'audio/webm', signature: (b) => b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  '.flac': { mime: 'audio/flac', signature: (b) => b.length >= 4 && b.toString('ascii', 0, 4) === 'fLaC' },
  '.pdf': { mime: 'application/pdf', signature: (b) => b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-' },
};

function safeTargetPath(value) {
  if (typeof value !== 'string' || !value || value.length > 500 || value.startsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return false;
  const parts = value.split('/');
  return parts.every((part) => part && part !== '.' && part !== '..' && part !== '_thumbnails');
}

function resolveSafeSource(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const source = path.resolve(sourceRoot, value);
  const relative = path.relative(sourceRoot, source);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  try {
    const realRoot = fs.realpathSync(sourceRoot);
    const realSource = fs.realpathSync(source);
    const realRelative = path.relative(realRoot, realSource);
    if (!realRelative || realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) return null;
    return realSource;
  } catch {
    return null;
  }
}

function readManifest(filePath) {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { throw new Error(`Manifest JSON tidak dapat dibaca: ${error instanceof Error ? error.message : 'format tidak valid'}`); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.files) || parsed.files.length > MAX_MANIFEST_ITEMS) {
    throw new Error(`Manifest harus memiliki array files dengan maksimum ${MAX_MANIFEST_ITEMS} item.`);
  }
  return parsed.files;
}

let files;
try { files = readManifest(sourceManifest); }
catch (error) { console.error(error.message); process.exit(1); }

if (!dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)) {
  console.error('SUPABASE_URL atau SUPABASE_SERVICE_KEY belum terbaca. Gunakan --dry-run untuk validasi lokal tanpa kredensial.');
  process.exit(1);
}

let supabase = null;
if (!dryRun) {
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}
const seenTargets = new Set();
let success = 0;
let failed = 0;

for (const [index, item] of files.entries()) {
  if (!item || typeof item !== 'object' || Array.isArray(item) || !safeTargetPath(item.targetPath)) {
    console.error(`Item ${index + 1}: targetPath tidak valid.`);
    failed++;
    continue;
  }
  if (seenTargets.has(item.targetPath)) {
    console.error(`Item ${index + 1}: targetPath duplikat (${item.targetPath}).`);
    failed++;
    continue;
  }
  seenTargets.add(item.targetPath);

  const source = resolveSafeSource(item.source);
  if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) {
    console.error(`Item ${index + 1}: file sumber tidak ditemukan atau berada di luar MEDIA_SOURCE_DIR.`);
    failed++;
    continue;
  }

  const extension = path.extname(source).toLowerCase();
  const targetExtension = path.posix.extname(item.targetPath).toLowerCase();
  const format = FORMATS[extension];
  if (!format || targetExtension !== extension) {
    console.error(`Item ${index + 1}: ekstensi file tidak diizinkan atau berbeda dengan target (${extension || 'tanpa ekstensi'}).`);
    failed++;
    continue;
  }

  const stats = fs.statSync(source);
  if (stats.size <= 0 || stats.size > MAX_FILE_BYTES) {
    console.error(`Item ${index + 1}: ukuran file harus 1 byte hingga 20 MiB.`);
    failed++;
    continue;
  }

  const bytes = fs.readFileSync(source);
  if (!format.signature(bytes.subarray(0, 64))) {
    console.error(`Item ${index + 1}: signature file tidak cocok dengan ${extension}; file dilewati.`);
    failed++;
    continue;
  }

  if (dryRun) {
    console.log(`VALID: ${item.targetPath} (${format.mime}, ${stats.size} bytes)`);
    success++;
    continue;
  }

  const { error } = await supabase.storage.from(bucket).upload(item.targetPath, bytes, {
    contentType: format.mime,
    upsert: false,
  });
  if (error) {
    console.error(`GAGAL: ${item.targetPath} — ${error.message}`);
    failed++;
  } else {
    console.log(`BERHASIL: ${item.targetPath}`);
    success++;
  }
}

console.log(`${dryRun ? 'Validasi selesai' : 'Upload selesai'}: ${success} berhasil, ${failed} gagal.`);
if (failed > 0) process.exitCode = 1;
