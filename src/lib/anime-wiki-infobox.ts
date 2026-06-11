/** 나무위키 스타일 작품 정보표 — 텍스트 파서 */

export type WikiInfoboxRow = {
  label: string;
  value: string;
};

export type WikiInfoboxSection = {
  title: string;
  rows: WikiInfoboxRow[];
};

export function parseWikiInfobox(source: string | null | undefined): WikiInfoboxSection[] {
  if (!source?.trim()) return [];

  const sections: WikiInfoboxSection[] = [];
  let current: WikiInfoboxSection | null = null;
  let lastRow: WikiInfoboxRow | null = null;

  for (const rawLine of source.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    const sectionMatch = trimmed.match(/^===\s*(.+?)\s*===$/);
    if (sectionMatch) {
      current = { title: sectionMatch[1], rows: [] };
      sections.push(current);
      lastRow = null;
      continue;
    }

    if (trimmed.startsWith("|") && lastRow && current) {
      const cont = trimmed.replace(/^\|\s?/, "");
      lastRow.value = lastRow.value ? `${lastRow.value}\n${cont}` : cont;
      continue;
    }

    const rowMatch = trimmed.match(/^([^|]+)\|\s*(.*)$/);
    if (rowMatch) {
      if (!current) {
        current = { title: "작품 정보", rows: [] };
        sections.push(current);
      }
      const row = { label: rowMatch[1].trim(), value: rowMatch[2].trim() };
      current.rows.push(row);
      lastRow = row;
    }
  }

  return sections.filter((s) => s.rows.length > 0);
}

export const WIKI_INFOBOX_HELP = `=== 섹션 제목 ===
라벨 | 값
방송국 | 🇯🇵 후지 TV — 금 24:55~
| 🇰🇷 2016. 7. ~ 9.  (| 로 같은 칸 줄바꿈)
스트리밍 | [LAFTEL](https://laftel.net) · [TVING](https://tving.com)
[[다른 위키 글]] · **굵게** · [링크](URL) · {{방송사}} 뱃지 지원`;

export const KABANERI_INFOBOX = `=== 작품 정보 ===
장르 | 좀비 아포칼립스, 스팀펑크, 액션
캐릭터 원안 | 미키모토 하루히코(美樹本晴彦)
감독 | 아라키 테츠로(荒木哲郎)
조감독 | 타나카 히로유키(田中洋之)
시리즈 구성 | 오코우치 이치로(大河内一楼)
캐릭터 디자인 | 에바라 야스유키(江原康之)
총 작화감독 | 에바라 야스유키, 마루후지 히로타카(丸藤広貴), 아사노 쿄지
액션 애니메이터 | 카와노 타츠로, 세라 유코(世良悠子)
치프 메이크업 | 마츠모토 사치코(松本幸子)
설정 총괄 | 카사오카 준페이(笠岡淳平)
컨셉 아트 | 모리야마 요우(森山洋)
디자인 웍스 | 교부 잇페이(江部井ペイ)
컨셉 보드 | 요시다 시로(吉田史朗)
프롭 디자인 | 츠네키 시노부(常木志伸)
미술 감독 | 요시하라 슌이치로(吉原俊一郎)
미술 디자인 | 타니우치 유호(谷内優穂), 소노 요시히로(曽野由大), 아오키 카오루(青木薫)
색채 설계 | 하시모토 사토시(橋本賢)

=== 제작 · 방영 ===
애니메이션 제작 | **WIT STUDIO**
제작 | 카바네리 제작위원회
방영 기간 | 🇯🇵 2016. 4. 8. ~ 2016. 6. 17.
| 🇰🇷 2016. 7. ~ 9.
방송국 | 🇯🇵 후지 TV系 — 금 24:55~ (2화 연속)
스트리밍 | [LAFTEL](https://laftel.net) · [TVING](https://tving.com) · [WATCHA](https://watcha.com)
편당 러닝타임 | 22분
화수 | 12화
시청 등급 | 🇰🇷 15세 이상 (주제, 폭력성)

=== 스태프 (후반) ===
촬영 감독 | 오오타케 타카히로(大竹悦子)
CG 디렉터 | 후지노 마사히코(藤野正彦)
편집 | 후지타 테츠uya(藤田輝)
음향 감독 | 하시모토 유스케(橋本裕介)
음향 효과 | 오오타니 이쿠요(大谷育江)
음악 | **Hiroyuki SAWANO**
제작총괄 | 이시카와 미츠hiro(石川光久)
프로듀서 | 마에다 겐(前田健) {{후지 TV}} · 이시카와 미츠hiro · 오오카와 신(大川慎) {{후지 TV}} · 오오카와 신 · 코바야시 타카시(小林隆) {{후지 TV}}
애니메이션 프로듀서 | 오오카와 신 · 코바야시 타카시`;
