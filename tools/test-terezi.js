// Diagnostic tool — connects directly to the network scale (no 1C involved)
// and prints everything it sends back, in both raw hex and text form. You
// can also type lines and press Enter to send them to the scale, so we can
// experiment and figure out its protocol together.
//
// Usage:
//   node tools/test-terezi.js <tərəzinin IP ünvanı> [port]
//
// Example:
//   node tools/test-terezi.js 192.168.1.151
//   node tools/test-terezi.js 192.168.1.151 1111

const net = require("net");
const readline = require("readline");

const host = process.argv[2];
const port = parseInt(process.argv[3], 10) || 1111;

if (!host) {
  console.log("İstifadə: node tools/test-terezi.js <IP> [port]");
  console.log("Məsələn: node tools/test-terezi.js 192.168.1.151 1111");
  process.exit(1);
}

console.log(`Qoşulur: ${host}:${port} ...`);

const socket = net.createConnection({ host, port }, () => {
  console.log("✓ Qoşuldu!");
  console.log("- Tərəzidə bir şey çəksəniz, buraya nə gəldiyinə baxın.");
  console.log("- Sətir yazıb Enter etsəniz, onu olduğu kimi tərəziyə göndərəcəyik (sınaq üçün).");
  console.log("- Çıxmaq üçün Ctrl+C.\n");
});

socket.on("data", (chunk) => {
  const stamp = new Date().toLocaleTimeString("az-AZ");
  console.log(`[${stamp}] GƏLDİ (hex):  ${chunk.toString("hex")}`);
  console.log(`[${stamp}] GƏLDİ (mətn): ${JSON.stringify(chunk.toString("utf8"))}`);
  console.log("---");
});

socket.on("error", (err) => {
  console.error("Xəta:", err.message);
  console.error("Yoxlayın: IP ünvanı düzgündürmü, tərəzi eyni şəbəkədədirmi, port düzgündürmü.");
});

socket.on("close", () => {
  console.log("Bağlantı bağlandı.");
  process.exit(0);
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", (line) => {
  if (!line) return;
  socket.write(line + "\r\n", "utf8");
  console.log(`→ GÖNDƏRİLDİ: ${JSON.stringify(line + "\\r\\n")}`);
});

process.on("SIGINT", () => {
  socket.end();
  process.exit(0);
});
