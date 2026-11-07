/* Admin CMS — Anggota */
import { $, api, safeText, setStatus, state } from "./core.js";
import { loadDashboard } from "./shell.js";
import { appendImageThumbnail } from "./assets.js";

function resetMemberForm() {
  $("member-form").reset();
  $("original_nis").value = "";
  $("member-kelas").value = "XII-9";
  $("member-visible").checked = true;
  $("member-form-title").textContent = "Tambah anggota";
  $("save-member").textContent = "Simpan anggota";
  setStatus("member-status", "");
  $("member-dirty").classList.add("hidden");
}

$("reset-member").addEventListener("click", resetMemberForm);

export async function loadMembers() {
  const payload = await api("/api/admin/anggota");
  state.members = payload.data || [];
  renderMembers();
}

function renderMembers() {
  const q = $("member-search").value.toLowerCase().trim();
  const rows = state.members.filter((m) =>
    [m.nama, m.nis, m.kelas, m.jabatan].join(" ").toLowerCase().includes(q),
  );
  $("members-count").textContent =
    `${state.members.length} anggota · ${rows.length} ditampilkan`;
  const body = $("members-table");
  body.replaceChildren();
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Tidak ada anggota yang cocok.";
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const m of rows) {
    const tr = document.createElement("tr");
    for (const v of [m.nama, m.nis, m.kelas, m.jabatan || "Anggota"])
      tr.append(safeText("td", v || "—"));
    const status = document.createElement("td");
    status.append(
      safeText(
        "span",
        m.visible === false ? "Disembunyikan" : "Tampil",
        `badge ${m.visible === false ? "off" : "ok"}`,
      ),
    );
    tr.append(status);
    const actions = document.createElement("td");
    const edit = safeText("button", "Edit", "btn ghost small-btn");
    edit.type = "button";
    edit.setAttribute("aria-label", `Edit anggota ${m.nama}`);
    edit.addEventListener("click", () => editMember(m));
    const del = safeText("button", "Hapus", "btn danger small-btn");
    del.type = "button";
    del.setAttribute("aria-label", `Hapus anggota ${m.nama}`);
    del.addEventListener("click", () => deleteMember(m.nis));
    actions.append(edit, del);
    tr.append(actions);
    body.append(tr);
  }
}

$("member-search").addEventListener("input", renderMembers);

$("refresh-members").addEventListener("click", () =>
  loadMembers().catch((e) => setStatus("member-status", e.message)),
);

function editMember(m) {
  $("original_nis").value = m.nis || "";
  $("member-photo-file").value = "";
  $("member-nama").value = m.nama || "";
  $("member-nis").value = m.nis || "";
  $("member-kelas").value = m.kelas || "XII-9";
  $("member-jabatan").value = m.jabatan || "";
  $("member-foto").value = m.foto_url || m.foto || "";
  $("member-audio").value = m.audio_url || m.audio || "";
  $("member-audio-nama").value = m.audio_nama || m.namaAudio || "";
  $("member-foto-audio").value = m.foto_audio_url || m.fotoAudio || "";
  $("member-desc").value = m.deskripsi || m.desc || "";
  $("member-desc-audio").value = m.deskripsi_audio || m.descAudio || "";
  $("member-skills").value = Array.isArray(m.skills) ? m.skills.join(", ") : "";
  $("member-social").value = JSON.stringify(m.social || {}, null, 2);
  $("member-order").value = m.urutan ?? 0;
  $("member-visible").checked = m.visible !== false;
  $("member-form-title").textContent = `Edit anggota: ${m.nama}`;
  $("save-member").textContent = "Simpan perubahan";
  $("member-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("member-form").addEventListener("input", () =>
  $("member-dirty").classList.remove("hidden"),
);

$("member-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let social = {};
  try {
    social = JSON.parse($("member-social").value || "{}");
    if (!social || Array.isArray(social) || typeof social !== "object")
      throw Error();
  } catch {
    setStatus(
      "member-status",
      "Format media sosial harus JSON object yang valid.",
    );
    return;
  }
  const old = $("original_nis").value;
  const photoFile = $("member-photo-file").files?.[0];
  const data = {
    nama: $("member-nama").value,
    nis: $("member-nis").value,
    kelas: $("member-kelas").value,
    jabatan: $("member-jabatan").value,
    foto_url: $("member-foto").value,
    audio_url: $("member-audio").value,
    audio_nama: $("member-audio-nama").value,
    foto_audio_url: $("member-foto-audio").value,
    deskripsi: $("member-desc").value,
    deskripsi_audio: $("member-desc-audio").value,
    skills: $("member-skills")
      .value.split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    social,
    urutan: Number($("member-order").value) || 0,
    visible: $("member-visible").checked,
    original_nis: old,
  };
  $("save-member").disabled = true;
  try {
    await api("/api/admin/anggota", {
      method: old ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (photoFile) {
      const form = new FormData();
      form.append("file", photoFile);
      form.append("category", "anggota");
      form.append("member_nis", data.nis);
      await appendImageThumbnail(form, photoFile);
      await api("/api/admin/media", { method: "POST", body: form });
    }
    setStatus("member-status", "Anggota berhasil disimpan.", true);
    resetMemberForm();
    await loadMembers();
    await loadDashboard();
  } catch (e) {
    setStatus("member-status", e.message);
  } finally {
    $("save-member").disabled = false;
  }
});

async function deleteMember(nis) {
  if (
    !confirm(
      `Hapus anggota dengan NIS ${nis}? Tindakan ini tidak dapat dibatalkan.`,
    )
  )
    return;
  try {
    await api("/api/admin/anggota", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nis, confirm: true }),
    });
    await loadMembers();
    await loadDashboard();
    setStatus("member-status", "Anggota berhasil dihapus.", true);
  } catch (e) {
    setStatus("member-status", e.message);
  }
}
