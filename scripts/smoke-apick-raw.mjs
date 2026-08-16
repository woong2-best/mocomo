import { config } from "dotenv";
config();
const KEY = process.env.APICK_API_KEY?.trim();
const form = new FormData();
form.append("account_num", "00000123456789");
form.append("bank_code", "004");
for (const path of ["/account_realname", "/transfer_1won"]) {
  const f = new FormData();
  form.forEach((v, k) => f.append(k, v));
  if (path === "/transfer_1won") f.append("memo", "MoCoMo-TEST");
  const res = await fetch(`https://apick.app/rest${path}`, {
    method: "POST",
    headers: { CL_AUTH_KEY: KEY },
    body: f,
  });
  console.log("\n===", path, "status", res.status, "===");
  console.log(await res.text());
}
