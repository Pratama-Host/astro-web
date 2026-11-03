/**
 * Validasi format berdasarkan signature file (magic bytes), bukan MIME dari browser.
 * SVG sengaja tidak diterima oleh endpoint upload karena file SVG aktif dapat membawa
 * script/event handler dan memerlukan sanitizer XML khusus.
 */
export type VerifiedMediaKind = 'image' | 'audio' | 'document';
export interface VerifiedMediaFile {
  extension: string;
  mimeType: string;
  kind: VerifiedMediaKind;
}

const FORMATS: Record<string, { mimeType: string; kind: VerifiedMediaKind }> = {
  png: { mimeType: 'image/png', kind: 'image' },
  jpg: { mimeType: 'image/jpeg', kind: 'image' },
  jpeg: { mimeType: 'image/jpeg', kind: 'image' },
  webp: { mimeType: 'image/webp', kind: 'image' },
  gif: { mimeType: 'image/gif', kind: 'image' },
  avif: { mimeType: 'image/avif', kind: 'image' },
  ico: { mimeType: 'image/x-icon', kind: 'image' },
  mp3: { mimeType: 'audio/mpeg', kind: 'audio' },
  wav: { mimeType: 'audio/wav', kind: 'audio' },
  ogg: { mimeType: 'audio/ogg', kind: 'audio' },
  m4a: { mimeType: 'audio/mp4', kind: 'audio' },
  aac: { mimeType: 'audio/aac', kind: 'audio' },
  weba: { mimeType: 'audio/webm', kind: 'audio' },
  flac: { mimeType: 'audio/flac', kind: 'audio' },
  pdf: { mimeType: 'application/pdf', kind: 'document' },
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

function hasSignature(extension: string, bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  switch (extension) {
    case 'png':
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v);
    case 'jpg':
    case 'jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'webp':
      return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP';
    case 'gif':
      return ['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6));
    case 'avif': {
      const head = ascii(bytes, 0, Math.min(bytes.length, 64));
      return head.slice(4, 8) === 'ftyp' && (head.includes('avif') || head.includes('avis'));
    }
    case 'ico':
      return bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00;
    case 'mp3':
      return ascii(bytes, 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    case 'wav':
      return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE';
    case 'ogg':
      return ascii(bytes, 0, 4) === 'OggS';
    case 'm4a':
      return ascii(bytes, 4, 4) === 'ftyp' && /^(M4A |M4B |mp4|isom|iso[2-9])/.test(ascii(bytes, 8, 4));
    case 'aac':
      return bytes[0] === 0xff && ((bytes[1] & 0xf6) === 0xf0);
    case 'weba':
      return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    case 'flac':
      return ascii(bytes, 0, 4) === 'fLaC';
    case 'pdf':
      return ascii(bytes, 0, 5) === '%PDF-';
    default:
      return false;
  }
}

export async function inspectMediaFile(file: File): Promise<VerifiedMediaFile | null> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const format = FORMATS[extension];
  if (!format || file.size <= 0) return null;
  const signature = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (!hasSignature(extension, signature)) return null;

  // MIME browser boleh kosong atau tidak akurat pada beberapa perangkat; signature + ekstensi
  // menjadi sumber kebenaran. Nilai MIME yang disimpan selalu berasal dari allowlist di atas.
  return { extension, mimeType: format.mimeType, kind: format.kind };
}

export async function isVerifiedWebpThumbnail(file: File): Promise<boolean> {
  if (file.size <= 0 || file.size > 1_500_000) return false;
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return hasSignature('webp', signature);
}
