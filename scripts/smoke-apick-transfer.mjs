import { config } from "dotenv";
config();
const KEY = process.env.APICK_API_KEY?.trim();
const form = new FormData();
form.append("account_num", "00000123456789");
form.append("bank_code", "004");
form.append("memo", "MoCoMo-TEST");
const res = await fetch("https://apick.app/rest/transfer_1won", {
  method: "POST",
  headers: { CL_AUTH_KEY: KEY },
  body: form,
});
console.log(await res.text());
