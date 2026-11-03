/* ================================================================
   halaman/tkj/skrip.js — TKJ XI-9
   Alat Bantu Jaringan (TKJ Tools) — konten halaman di-render oleh Astro SSG
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initTkjTools();
});

/**
 * Menginisialisasi Alat Bantu TKJ (Subnet & Ping)
 */
function initTkjTools() {
  // Helper IP Functions
  const isValidIPv4 = (ip) => {
    const parts = ip.split(".");
    return parts.length === 4 && parts.every((part) => {
      if (!/^(?:0|[1-9]\d{0,2})$/.test(part)) return false;
      const value = Number(part);
      return value >= 0 && value <= 255;
    });
  };
  const ipToInt = (ip) =>
    ip.split(".").map(Number).reduce((acc, n) => (acc << 8) + n, 0) >>> 0;
  const intToIp = (int) => [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join(".");
  const maskFromCidr = (cidr) => cidr === 0 ? 0 : ~((1 << (32 - cidr)) - 1) >>> 0;

  // --- Subnet Calculator ---
  const subInput = document.getElementById("subnet-input");
  const subBtn = document.getElementById("subnet-calc-tombol");
  const subResult = document.getElementById("subnet-result");

  if (subBtn && subInput && subResult) {
    subBtn.addEventListener("click", () => {
      const val = subInput.value.trim();
      const parts = val.split("/");

      if (parts.length !== 2) {
        const error = document.createElement("span");
        error.style.color = "var(--accent)";
        error.textContent = "Format salah! Gunakan: IP/CIDR (e.g. 192.168.1.1/24)";
        subResult.replaceChildren(error);
        return;
      }

      try {
        const ip = parts[0].trim();
        if (!isValidIPv4(ip)) throw new Error("IPv4 tidak valid. Gunakan empat oktet 0-255.");
        if (!/^(?:0|[1-9]\d{0,1}|[12]\d|3[0-2])$/.test(parts[1].trim())) throw new Error("CIDR tidak valid.");
        const cidr = Number(parts[1]);
        if (cidr < 0 || cidr > 32) throw new Error("CIDR tidak valid");

        const ipInt = ipToInt(ip);
        const mask = maskFromCidr(cidr);
        const network = ipInt & mask;
        const broadcast = network | (~mask >>> 0);
        let first = network;
        let last = broadcast;
        if (cidr <= 30) {
          first = network + 1;
          last = broadcast - 1;
        } else if (cidr === 31) {
          // RFC 3021: both addresses in a /31 point-to-point subnet are usable.
          first = network;
          last = broadcast;
        }

        const section = document.createElement("div");
        section.style.cssText = "margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border-mid)";
        const details = document.createElement("div");

        const addLine = (container, label, value) => {
          const line = document.createElement("div");
          const labelNode = document.createTextNode(`${label}: `);
          const valueNode = document.createElement("span");
          valueNode.className = "hl";
          valueNode.textContent = value;
          line.append(labelNode, valueNode);
          container.appendChild(line);
        };

        addLine(section, "Network", intToIp(network));
        addLine(section, "Netmask", intToIp(mask));
        addLine(details, "Broadcast", intToIp(broadcast));
        addLine(details, "Host Range", `${intToIp(first)} - ${intToIp(last)}`);
        subResult.replaceChildren(section, details);
      } catch (error) {
        const errorNode = document.createElement("span");
        errorNode.style.color = "var(--accent)";
        errorNode.textContent = `Error: ${error instanceof Error ? error.message : "Perhitungan gagal."}`;
        subResult.replaceChildren(errorNode);
      }
    });
  }

  // --- Ping Simulator ---
  const pingBtn = document.getElementById("ping-tombol");
  const pingHost = document.getElementById("ping-host");
  const pingLog = document.getElementById("ping-log");

  if (pingBtn && pingHost && pingLog) {
    pingBtn.addEventListener("click", () => {
      const host = pingHost.value.trim() || "tkj-xi9.local";
      pingBtn.disabled = true;
      pingBtn.textContent = "Pinging...";

      const connecting = document.createElement("span");
      connecting.className = "typing";
      connecting.textContent = `Connecting to ${host}...`;
      pingLog.replaceChildren(connecting);

      setTimeout(() => {
        const success = Math.random() > 0.15;
        const latency = Math.floor(Math.random() * 150) + 5;
        pingLog.replaceChildren();

        if (success) {
          const reply = document.createElement("div");
          reply.style.color = "var(--accent-2)";
          reply.textContent = `Reply from ${host}: bytes=32 time=${latency}ms TTL=64`;

          const packetInfo = document.createElement("div");
          packetInfo.style.fontSize = "0.8rem";
          packetInfo.style.marginTop = "4px";
          packetInfo.textContent = "Packets: Sent = 1, Received = 1, Lost = 0 (0% loss)";
          pingLog.append(reply, packetInfo);
        } else {
          const errorNode = document.createElement("div");
          errorNode.style.color = "var(--accent)";
          errorNode.textContent = `Request timed out. Unable to reach ${host}.`;
          pingLog.appendChild(errorNode);
        }

        pingBtn.disabled = false;
        pingBtn.textContent = "Ping";
      }, 1200 + Math.random() * 1000);
    });
  }
}
