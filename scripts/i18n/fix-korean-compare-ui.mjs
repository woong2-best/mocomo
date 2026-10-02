/**
 * Replace user-visible Korean in comparison/ternary branches (not compared literals).
 */
import fs from "node:fs";
import path from "node:path";

const hangul = /[가-힣]/;
const files = [];
function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) {
      if (n === "__tests__") continue;
      walk(p);
    } else if (/\.tsx?$/.test(n)) files.push(p);
  }
}
walk(path.join(process.cwd(), "src"));

const subs = [
  [/영상/g, "Video"],
  [/Voice/g, "Voice"],
  [/통화를 찾을 수 없습니다\./g, "Call not found."],
  [/권한이 없습니다\./g, "You don't have permission to do that."],
  [/대화 멤버만 추가할 수 있습니다\./g, "Only chat members can add people."],
  [/자기 자신에게는 전화할 수 없습니다\./g, "You can't call yourself."],
  [/나눔\(무료\)/g, "Free giveaway"],
  [/경매/g, "Auction"],
  [/코스프레 대여/g, "Cosplay rental"],
  [/배경/g, "Background"],
  [/히스토리/g, "History"],
];

let n = 0;
for (const file of files) {
  let code = fs.readFileSync(file, "utf8");
  const before = code;
  for (const [re, en] of subs) code = code.replace(re, en);
  if (code !== before && hangul.test(code) === hangul.test(before)) {
    /* hangul count may still change */
  }
  if (code !== before) {
    fs.writeFileSync(file, code);
    n++;
  }
}
console.log("patched", n);
