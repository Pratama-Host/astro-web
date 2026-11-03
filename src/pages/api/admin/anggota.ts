import type { APIRoute } from 'astro';
import { isAdminRequest, unauthorizedResponse } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { isValidSocialLinks, logCmsAction, readJsonRequest, isPlainRecord, isValidOptionalMediaRef } from '../../../lib/cms-admin';

export const prerender = false;

function unavailable() {
  return Response.json({ error: 'Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_KEY.' }, { status: 503 });
}

function cleanMember(body: Record<string, unknown>, partial = false) {
  const member: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const textFields = ['nis', 'nama', 'kelas', 'jabatan', 'deskripsi', 'foto_url', 'audio_url', 'audio_nama', 'foto_audio_url', 'deskripsi_audio'] as const;
  for (const key of textFields) {
    if (partial && !(key in body) && !(key === 'nis' && 'nis' in body)) continue;
    const aliases: Record<string, string> = {
      deskripsi: 'desc', foto_url: 'foto', audio_url: 'audio', audio_nama: 'namaAudio',
      foto_audio_url: 'fotoAudio', deskripsi_audio: 'descAudio',
    };
    const raw = body[key] ?? (aliases[key] ? body[aliases[key]] : undefined);
    if (raw !== undefined || !partial) member[key] = String(raw ?? '').trim() || null;
  }
  if (partial && 'nis' in body) member.nis = String(body.nis || '').trim();
  if (partial && 'nama' in body) member.nama = String(body.nama || '').trim();
  if (!partial) {
    member.nis = String(body.nis || '').trim();
    member.nama = String(body.nama || '').trim();
    member.kelas = String(body.kelas || 'XII-9').trim();
    member.jabatan = String(body.jabatan || '').trim() || null;
    member.deskripsi = String(body.deskripsi || body.desc || '').trim() || null;
    member.foto_url = String(body.foto_url || body.foto || '').trim() || null;
    member.audio_url = String(body.audio_url || body.audio || '').trim() || null;
    member.audio_nama = String(body.audio_nama || body.namaAudio || '').trim() || null;
    member.foto_audio_url = String(body.foto_audio_url || body.fotoAudio || '').trim() || null;
    member.deskripsi_audio = String(body.deskripsi_audio || body.descAudio || '').trim() || null;
  }
  if (!partial || 'social' in body) member.social = body.social && typeof body.social === 'object' && !Array.isArray(body.social) ? body.social : {};
  if (!partial || 'skills' in body) member.skills = Array.isArray(body.skills) ? body.skills.slice(0, 30) : [];
  if (!partial || 'visible' in body) member.visible = body.visible !== false;
  if (!partial || 'urutan' in body) member.urutan = Number.isFinite(Number(body.urutan)) ? Number(body.urutan) : 0;
  return member;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const supabase = getSupabaseAdmin();
  if (!supabase) return unavailable();
  const { data, error } = await supabase.from('anggota').select('*').order('urutan', { ascending: true }).order('nama', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const supabase = getSupabaseAdmin();
  if (!supabase) return unavailable();
  const parsedBody = await readJsonRequest(request, 131072);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  if (body.visible !== undefined && typeof body.visible !== 'boolean') return Response.json({ error: 'Field visible harus berupa boolean.' }, { status: 400 });
  if (body.skills !== undefined && (!Array.isArray(body.skills) || body.skills.length > 30 || body.skills.some((item: unknown) => typeof item !== 'string'))) return Response.json({ error: 'Skills harus berupa daftar maksimal 30 teks.' }, { status: 400 });
  if (body.social !== undefined && !isValidSocialLinks(body.social)) {
    return Response.json({ error: 'Tautan sosial anggota harus berupa URL HTTP atau HTTPS yang valid.' }, { status: 400 });
  }
  for (const key of ['foto_url', 'foto', 'audio_url', 'audio', 'foto_audio_url', 'fotoAudio']) {
    if (key in body && !isValidOptionalMediaRef(body[key])) return Response.json({ error: `Referensi media ${key} tidak valid.` }, { status: 400 });
  }
  const member = cleanMember(body);
  if (!member.nis || !member.nama) return Response.json({ error: 'Nama dan NIS wajib diisi.' }, { status: 400 });
  const { data, error } = await supabase.from('anggota').upsert(member, { onConflict: 'nis' }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logCmsAction(supabase, 'create', 'anggota', member.nis, `Anggota ${member.nama} disimpan`);
  return Response.json({ data }, { status: 201 });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const supabase = getSupabaseAdmin();
  if (!supabase) return unavailable();
  const parsedBody = await readJsonRequest(request, 128 * 1024);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  if (body.visible !== undefined && typeof body.visible !== 'boolean') return Response.json({ error: 'Field visible harus berupa boolean.' }, { status: 400 });
  if (body.skills !== undefined && (!Array.isArray(body.skills) || body.skills.length > 30 || body.skills.some((item: unknown) => typeof item !== 'string'))) return Response.json({ error: 'Skills harus berupa daftar maksimal 30 teks.' }, { status: 400 });
  if (body.social !== undefined && !isValidSocialLinks(body.social)) {
    return Response.json({ error: 'Tautan sosial anggota harus berupa URL HTTP atau HTTPS yang valid.' }, { status: 400 });
  }
  for (const key of ['foto_url', 'foto', 'audio_url', 'audio', 'foto_audio_url', 'fotoAudio']) {
    if (key in body && !isValidOptionalMediaRef(body[key])) return Response.json({ error: `Referensi media ${key} tidak valid.` }, { status: 400 });
  }
  const originalNis = String(body.original_nis || '').trim();
  const member = cleanMember(body, true);
  if (!originalNis || !String(member.nis || originalNis).trim() || !String(member.nama || '').trim()) return Response.json({ error: 'NIS asal, NIS baru, dan nama wajib diisi.' }, { status: 400 });
  if (member.nis && String(member.nis).trim() !== originalNis) {
    const { data: collision } = await supabase.from('anggota').select('nis').eq('nis', String(member.nis).trim()).maybeSingle();
    if (collision) return Response.json({ error: 'NIS baru sudah digunakan anggota lain.' }, { status: 409 });
  }
  const { data, error } = await supabase.from('anggota').update(member).eq('nis', originalNis).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logCmsAction(supabase, 'update', 'anggota', member.nis, `Anggota ${member.nama} diperbarui`);
  return Response.json({ data });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdminRequest(request)) return unauthorizedResponse();
  const supabase = getSupabaseAdmin();
  if (!supabase) return unavailable();
  const parsedBody = await readJsonRequest(request, 8192);
  if (parsedBody.error === 'too_large') return Response.json({ error: 'Ukuran JSON melebihi batas yang diizinkan.' }, { status: 413 });
  if (parsedBody.error || !isPlainRecord(parsedBody.data)) return Response.json({ error: 'JSON tidak valid.' }, { status: 400 });
  const body = parsedBody.data as any;
  const nis = String(body.nis || '').trim();
  if (!nis || body.confirm !== true) return Response.json({ error: 'NIS dan konfirmasi penghapusan wajib diisi.' }, { status: 400 });
  const { error } = await supabase.from('anggota').delete().eq('nis', nis);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await logCmsAction(supabase, 'delete', 'anggota', nis, `Anggota dengan NIS ${nis} dihapus`);
  return Response.json({ ok: true });
};
