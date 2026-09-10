import fs from "fs";
import path from "path";

const dir = "src/lib/i18n/locales";
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const p = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  if (data["nav.market"] != null) {
    data["nav.market"] = file.startsWith("ko") ? "MCM" : "MCM";
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  console.log("updated", file);
}
