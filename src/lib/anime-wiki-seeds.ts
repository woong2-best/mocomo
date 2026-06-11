import type { AnimeGenre, PrismaClient } from "@prisma/client";
import { animeSlugFromTitle, isValidAnimeSlug } from "@/lib/utils";
import { KABANERI_INFOBOX } from "@/lib/anime-wiki-infobox";

export type AnimeWikiSeed = {
  title: string;
  titleEn: string;
  genre: AnimeGenre;
  studio: string;
  coverUrl?: string;
  bannerUrl?: string;
  synopsis: string;
  worldInfo?: string;
  infobox?: string;
  characters: string[];
  tags: string[];
  isProtected?: boolean;
};

export const ANIME_WIKI_SEEDS: AnimeWikiSeed[] = [
  {
    title: "갑철성의 카바네리",
    titleEn: "Kabaneri of the Iron Fortress",
    genre: "ACTION",
    studio: "WIT STUDIO",
    coverUrl: "https://cdn.myanimelist.net/images/anime/12/79164.jpg",
    synopsis: `# 개요

[[갑철성의 카바네리]]는 2016년 방영된 오리지널 TV 애니메이션이다. 좀비(카바네)가 창궐한 에도풍 일본에서 **철로를 달리는 요새 열차**를 중심으로 생존과 저항을 그린 스팀펑크·액션 작품이다.

# 줄거리

불명의 바이러스에 감염된 인간은 **카바네**가 되어 인간을 공격한다. 생존자들은 **갑철성**이라 불리는 무장 열차 안에서만 안전을 유지한다. 주인공 **생驹**는 카바네에게 물린 뒤에도 인간의 이성을 유지하는 **카바네리**가 되어, 인간과 괴물 사이의 경계에서 싸운다.

# 특징

| 항목 | 내용 |
| --- | --- |
| 감독 | Araki Tetsuro |
| 제작 | WIT STUDIO |
| 방영 | 2016년 4월~6월 |
| 장르 | 액션, 스팀펑크, 호러 |

{{collapse|스포일러|최종적으로 생驹 일행은 카바네의 근원과 연결된 비밀을 파헤치며, 갑철성 네트워크 전체의 운명을 건 전투에 휘말린다.}}`,
    worldInfo: `# 세계관

**카바네** — 감염 후 인간성을 잃고 공격적인 괴물로 변한다. 심장을 관통하지 않으면 죽지 않는다.

**갑철성** — 증기 기관과 철판으로 무장한 열차 도시. 역마다 교역·정비·방어가 이루어진다.

**카바네리** — 감염됐으나 인간의 의지를 유지하는 존재. 인간과 카바네 양쪽에서 적대받기 쉽다.`,
    characters: ["생驹", "無名(이름 없는)", "美馬", "菖蒲", "来栖"],
    tags: ["액션", "스팀펑크", "좀비", "WIT STUDIO", "오리지널"],
    infobox: KABANERI_INFOBOX,
  },
  {
    title: "귀멸의 칼날",
    titleEn: "Demon Slayer Kimetsu no Yaiba",
    genre: "ACTION",
    studio: "ufotable",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
    synopsis: `# 개요

[[귀멸의 칼날]]은 2019년부터 대히트를 기록한 **ufotable** 제작 액션 판타지 애니메이션이다. 타이토야마 코요하루의 동명 만화를 원작으로 한다.

# 줄거리

가족을 **鬼(오니)**에게 살해당한 **竈門炭治郎**는 마지막으로 살아남은 동생 **禰豆子**가 오니로 변한 것을 발견한다. 그녀의 인간성을 되찾고 가족의 복수를 위해 **鬼殺隊**에 입대한다.

# 수록편

| 시즌 | 내용 |
| --- | --- |
| 1기 | 본편 (竈門炭治郎 立志編) |
| 無限列車編 | 극장판·TV 재편집 |
| 遊郭編 | TV 시리즈 |
| 刀鍛冶の里編 | TV 시리즈 |`,
    worldInfo: `# 호흡의 검

鬼殺隊원은 각기 **呼呼吸法**을 익혀 오니와 맞선다. 水·雷·炎·風·岩 등 다양한 유파가 존재한다.

# 血鬼術

上弦·下弦 오니는 고유한 **血鬼術**을 사용한다. 태양에 약한 오니는 인간을 사냥해 자신을 강화한다.`,
    characters: ["竈門炭治郎", "竈門禰豆子", "我妻善逸", "嘴平伊之助", "冨岡義勇", "煉獄杏寿郎"],
    tags: ["액션", "판타지", "ufotable", "Jump", "대히트"],
  },
  {
    title: "진격의 거인",
    titleEn: "Attack on Titan",
    genre: "ACTION",
    studio: "MAPPA / WIT STUDIO",
    coverUrl: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
    synopsis: `# 개요

[[진격의 거인]]은 **諫山創**의 만화를 원작으로 한 다크 판타지·액션 작품이다. 거인에 둘러싸인 인류의 생존과 진실을 다룬다.

# 줄거리

100년 전 거인의 출현 이후 인류는 **三重の壁** 안에 갇혀 살아간다. 어느 날 초대형 거인이 벽을 파괴하고, **エレン** 일행의 고향이 멸망한다. 그는 거인의 힘을 얻어 벽 밖의 세계와 진실에 다가선다.

# 핵심 테마

자유, 복수, 전쟁, 역사 왜곡, 세대 간 갈등.`,
    worldInfo: `# 거인

**九大の巨人** — 엘디아와 마르의 역사를 관통하는 힘. 각 거인은 고유한 능력을 지닌다.

# 조사병단

벽 밖 조사와 진실 규명을 담당. **立体機動装置**로 거인의 약점인 목덜미를 공격한다.`,
    characters: ["エレン・イェーガー", "ミカサ・アッカーマン", "アルミン・アルレルト", "リヴァイ", "エルヴィン・スミス"],
    tags: ["액션", "다크", "거인", "WIT", "MAPPA"],
    isProtected: true,
  },
  {
    title: "그 비스크 돌은 사랑을 한다",
    titleEn: "My Dress-Up Darling",
    genre: "ROMANCE",
    studio: "CloverWorks",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1884/120708.jpg",
    synopsis: `# 개요

[[그 비스크 돌은 사랑을 한다]]는 2022년 방영된 로맨스·일상 코미디 애니메이션이다. **코스프레**와 **옷 만들기**를 소재로 두 주인공의 성장과 사랑을 그린다.

# 줄거리

인형 만들기를 좋아하지만 비밀로 하던 **五条新菜**는 인기 코스player **喜多川海夢**에게 자신의 취미를 들키고, 그녀의 코스프레 의상 제작 파트너가 된다. 서로 다른 열정이 맞물리며 가까워진다.

# 특징

| 항목 | 내용 |
| --- | --- |
| 원작 | 福田晋一 (Young Gangan) |
| 방영 | 2022년 1월~3월 |
| 키워드 | 코스프레, DIY, 로맨스 |`,
    worldInfo: `# 코스프레 문화

작품은 실제 코스프레 커뮤니티의 **의상 제작·촬영·SNS** 문화를 사실적으로 묘사한다. 헤ア·메이크·소품까지 세심하게 다룬다.`,
    characters: ["五条新菜", "喜多川海夢", "乾紗寿叶", "乾心寿", "五条薫"],
    tags: ["로맨스", "코스프레", "CloverWorks", "일상"],
  },
  {
    title: "너의 이름은.",
    titleEn: "Your Name",
    genre: "ROMANCE",
    studio: "CoMix Wave Films",
    coverUrl: "https://cdn.myanimelist.net/images/anime/5/87048.jpg",
    synopsis: `# 개요

[[너의 이름은.]]은 **新海誠** 감독의 2016년 극장판 애니메이션이다. 도쿄의 소년과 시골 소녀의 **몸이 바뀌는** 판타지 로맨스로 전 세계 흥행 1위급 기록을 세웠다.

# 줄거리

**立花瀧**과 **宮水三葉**는 날마다 서로의 몸으로 깨어난다. 메모와 습관으로 소통하다 점차 감정이 깊어지지만, 시간과 장소의 간격이 그들을 가로막는다.

# OST

RADWIMPS의 **「前前前世」** 등 OST가 작품과 함께 대히트했다.`,
    worldInfo: `# 糸守町

三葉가 사는 가공의 시골 마을. **口噛み酒**와 신사 의식, 유성과 연결된 비밀을 품는다.`,
    characters: ["立花瀧", "宮水三葉", "奥寺美紀", "勅使河原克彦", "阿部"],
    tags: ["로맨스", "신해성", "극장판", "RADWIMPS"],
  },
  {
    title: "토라도라!",
    titleEn: "Toradora",
    genre: "ROMANCE",
    studio: "J.C.STAFF",
    coverUrl: "https://cdn.myanimelist.net/images/anime/13/22128.jpg",
    synopsis: `# 개요

[[토라도라!]]는 2008년 방영된 학원 로맨스 코미디의 대표작이다. **竹井オプンチ** 원작 라이트 노벨을 애니메이션화했다.

# 줄거리

**高須龍児**와 **逢坂大河**는 각각 짝사랑 상대의 집에 자주 드나든다. 우연히 서로의 비밀을 알게 된 두 사람은 연애 작전을 돕기로 하지만, 관계는 점점 복잡해진다.

# 별명

大河는 **「掌中のタイガー」**라 불리며, 작품 제목 Toradora(호랑이+도라)의 유래가 된다.`,
    characters: ["逢坂大河", "高須龍児", "櫛枝実乃梨", "川嶋亜美", "北村祐作"],
    tags: ["로맨스", "학원", "J.C.STAFF", "명작"],
  },
  {
    title: "케이온!",
    titleEn: "K-On",
    genre: "COMEDY",
    studio: "Kyoto Animation",
    coverUrl: "https://cdn.myanimelist.net/images/anime/10/76121.jpg",
    synopsis: `# 개요

[[케이온!]]은 **京都アニメーション** 제작의 밴드·일상 코미디 애니메이션이다. 2009년 방영 후 **「けいおん！」** 붐을 일으켰다.

# 줄거리

졸업을 앞둔 **軽音部**에 **平沢唯**가 입부하면서, 미오·リツ·純·憂の 다섯 명이 밴드 활동과 학교생활을 보낸다.

# 음악

「Don't say lazy」「Go! Go! Maniac」 등 극중 밴드 **放課後ティータイム**의 곡이 실제로 발매되었다.`,
    characters: ["平沢唯", "秋山澪", "田井中律", "琴吹紬", "中野梓"],
    tags: ["코미디", "음악", "KyoAni", "밴드", "治癒"],
  },
  {
    title: "스파이 패밀리",
    titleEn: "Spy x Family",
    genre: "COMEDY",
    studio: "WIT STUDIO / CloverWorks",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1441/122795.jpg",
    synopsis: `# 개요

[[스파이 패밀리]]는 2022년부터 방영 중인 액션·가족 코미디 애니메이션이다. 스파이·암살자·초능력자가 **가짜 가족**을 이루는 설정이 인기를 끌었다.

# 줄거리

스파이 **ロイド**는 평화를 위해 가짜 가족을 꾸리고, 입양한 아이 **アーニャ**는 마음을 읽는 능력, 아내 **ヨル**는 암살자다. 서로 정체를 숨긴 채 **フォージャー家**를 유지한다.

# 특징

| 항목 | 내용 |
| --- | --- |
| 원작 | 遠藤達哉 (Jump+) |
| 키워드 | 가족, 코미디, Cold War |`,
    characters: ["ロイド・フォージャー", "アーニャ・フォージャー", "ヨル・フォージャー", "ボンド", "フランキー"],
    tags: ["코미디", "스파이", "가족", "Jump", "WIT"],
  },
  {
    title: "장송의 프리렌",
    titleEn: "Frieren Beyond Journeys End",
    genre: "FANTASY",
    studio: "Madhouse",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
    synopsis: `# 개요

[[장송의 프리렌]]은 2023년 방영된 판타지 애니메이션으로, **마왕 토벌 후**의 시간과 기억을 다룬다. **마법사 프리렌**의 여행기.

# 줄거리

영웅 파티가 마왕을 쓰러뜨린 뒤, 엘프 **フリーレン**은 인간 동료들의 수명을 목격하며 **감정과 시간**의 무게를 깨닫는다. 수십 년 후, 스승 **フランメ**의 유언을 따라 동료의 기억을 되새기는 여행을 떠난다.

# 수상

2024년 애니·만화 어wards에서 다수 수상.`,
    worldInfo: `# 마법

마법은 **상상력과 연구**로 습득한다. 프리렌은 수백 년에 걸쳐 마법을 수집·분석한다.

# 마족

인간의 감정을 이해하지 못하는 존재로 묘사되며, 작품의 철학적 대립축을 이룬다.`,
    characters: ["フリーレン", "フェルン", "シュタルク", "ヒンメル", "ハイター", "エーヴァ"],
    tags: ["판타지", "명작", "Madhouse", "2023"],
    isProtected: true,
  },
  {
    title: "Re:ゼロから始める異世界生活",
    titleEn: "Re Zero Starting Life in Another World",
    genre: "ISEKAI",
    studio: "White Fox",
    coverUrl: "https://cdn.myanimelist.net/images/anime/11/79410.jpg",
    synopsis: `# 개요

[[Re:ゼロから始める異世界生活]]는 **이세계**·**타임루프** 장르의 대표작. **ナツキ・スバル**가 죽음마다 시간을 되돌리는 **「死亡回归」** 능력을 갖는다.

# 줄거리

편의점에서 귀가하던 스바루가 이세계로 소환된다. **エミリア**를 돕다가 살해당하고, **Return by Death**로 같은 날 아침으로 돌아온다. 반복되는 죽음 속에서 진실과 구원을 찾는다.

# 애칭

팬덤에서는 **リゼロ**로 줄여 부른다.`,
    worldInfo: `# 마법·대역

**魔女**들과 연관된 세계관. **試煉**과 **大罪** Motif가 시즌마다 전개된다.`,
    characters: ["ナツキ・スバル", "エミリア", "レム", "ラム", "ベアトリス", "ロズワール"],
    tags: ["이세계", "타임루프", "White Fox", "대히트"],
  },
  {
    title: "슈타인즈 게이트",
    titleEn: "Steins Gate",
    genre: "SCI_FI",
    studio: "White Fox",
    coverUrl: "https://cdn.myanimelist.net/images/anime/5/73199.jpg",
    synopsis: `# 개요

[[슈타인즈 게이트]]는 2011년 방영된 SF·스릴러 애니메이션. **세계선(世界線)** 이동과 **D-mail**을 소재로 한 **5pb.**·**MAGES.** 계열 명작.

# 줄거리

오타쿠 **岡部倫太郎**는 우연히 과거로 문자를 보내는 **전화기rowave(仮)** 를 완성한다. 작은 변경이 **수렴**을 바꾸며 비극적 결과를 낳고, **Steins Gate**라는 이상 세계선을 목표로 싸운다.

# 명대사

**「エル・プサイ・コングルゥ」** — 작품을 상징하는 인사.`,
    worldInfo: `# 세계선

**α·β** 등 수많은 세계선이 존재. **Reading Steiner** 능력자만은 세계선 변경의 기억을 유지한다.`,
    characters: ["岡部倫太郎", "牧瀬紅莉栖", "椎名まゆり", "橋田至", "阿万音鈴羽"],
    tags: ["SF", "타임트래블", "명작", "White Fox"],
    isProtected: true,
  },
  {
    title: "PSYCHO-PASS",
    titleEn: "Psycho-Pass",
    genre: "SCI_FI",
    studio: "Production I.G",
    coverUrl: "https://cdn.myanimelist.net/images/anime/8/65539.jpg",
    synopsis: `# 개요

[[PSYCHO-PASS]]는 **Production I.G** 제작의 SF·범죄 스릴러. **시블 시스템**이 국민의 **心身指数**를 측정해 범죄를 예측·억압하는 디스토피아.

# 줄거리

**公安** 소속 **常守朱**와 **執行官** **狡啎慎也**가 사건을 추적하며, 시스템의 정당성과 인간성을 질문한다.

# 특징

| 항목 | 내용 |
| --- | --- |
| 감독 | 本広克行, 塩谷直紀 |
| 키워드 | 디스토피아, AI, 범죄 |`,
    characters: ["常守朱", "狡啎慎也", "槙島聖護", "征陸離", "縢秀星"],
    tags: ["SF", "Production IG", "범죄", "디스토피아"],
  },
  {
    title: "보치 더 록!",
    titleEn: "Bocchi the Rock",
    genre: "SLICE_OF_LIFE",
    studio: "CloverWorks",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1447/127086.jpg",
    synopsis: `# 개요

[[보치 더 록!]]은 2022년 방영된 음악·일상 코미디. **극도의 소 introvert** **後藤ひとり**가 밴드 **結束バンド**에서 성장하는 이야기.

# 줄거리

ひとり는 중학교 때 쓴 곡이 SNS에서 화제가 되지만, 대면 연주는 두려워한다. **伊地知虹夏**에게 스카우트되어 **下北沢**의 라이브 하우스 무대에 서기 시작한다.

# 밴드

**結束バンド** — ぼっちちゃん(기타·보컬), にじika(드럼), 喜多(보컬·기타), 虹夏(베이스).`,
    characters: ["後藤ひとり", "伊地知虹夏", "喜多郁代", "山田リョウ", "PAさん"],
    tags: ["일상", "음악", "밴드", "CloverWorks", "2022"],
  },
  {
    title: "바이올렛 에버가든",
    titleEn: "Violet Evergarden",
    genre: "SLICE_OF_LIFE",
    studio: "Kyoto Animation",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1795/95088.jpg",
    synopsis: `# 개요

[[바이올렛 에버가든]]은 **京都アニメーション** 제작의 드라마·판타지. 전쟁에서 **「武器」**로 쓰였던 소녀 **ヴァイオレット**가 **「愛」**의 의미를 찾는다.

# 줄거리

전쟁 종료 후 **ヴァイオレット・エヴァーガーデン**은 **代筆屋** CH Postal에서 사람들의 마음을 글로 전하는 일을 배운다. **ギルベルト**少佐가 남긴 **「愛してる」**의 의미를 추적한다.

# 극장판

**外伝**·**劇場版**으로 이야기가 완결된다.`,
    characters: ["ヴァイオレット・エヴァーガーデン", "ギルベルト・ブーガンビリア", "クラウディア・ホプキンス", "リト", "カトレア"],
    tags: ["드라마", "KyoAni", "代筆", "명작"],
  },
  {
    title: "Another",
    titleEn: "Another",
    genre: "HORROR",
    studio: "P.A.WORKS",
    coverUrl: "https://cdn.myanimelist.net/images/anime/4/75509.jpg",
    synopsis: `# 개요

[[Another]]는 2012년 방영된 학원 미스터리·호러 애니메이션. **綾辻行人** 원작.

# 줄거리

1998년 **夜見北中学校** 3년3조. 전학생 **榊原恒一**는 **見崎鳴**이라는 한 명의 「존재하지 않는」 동급생과 관련된 **연쇄 사망** 규칙에 휘말린다.

# 규칙

{{collapse|스포일러|클래스에 **「余り者(extra)」**가 한 명 섞이면, 그 해 반 친구·가족이 비극적 사고로 죽어간다고 전해진다.}}`,
    characters: ["榊原恒一", "見崎鳴", "赤沢泉美", "望月優", "勅使河原直哉"],
    tags: ["호러", "미스터리", "학원", "PA WORKS"],
  },
  {
    title: "기생수",
    titleEn: "Parasyte",
    genre: "HORROR",
    studio: "Madhouse",
    coverUrl: "https://cdn.myanimelist.net/images/anime/3/73178.jpg",
    synopsis: `# 개요

[[기생수]]는 **岩明均** 만화 원작. 지구에 침입한 **寄生生物**가 인간의 뇌를 장악하는 SF·호러.

# 줄거리

**泉新一**의 오른손에 기생충 **ミギー**가 붙지만, 뇌를 잡지 못해 공존한다. 다른 기생충과의 전투 속에서 인간성과 생존을 고민한다.

# 애칭

한국 팬덤에서는 **「똥손」** 등으로 유머러스하게 부르기도 한다.`,
    characters: ["泉新一", "ミギー", "島田秀雄", "田宮良子", "君島加奈"],
    tags: ["호러", "SF", "Madhouse", "명작"],
  },
  {
    title: "하이큐!!",
    titleEn: "Haikyuu",
    genre: "SPORTS",
    studio: "Production I.G",
    coverUrl: "https://cdn.myanimelist.net/images/anime/7/76014.jpg",
    synopsis: `# 개요

[[하이큐!!]]는 **古舘春一** 원작 배구 스포츠 애니메이션. **Production I.G**가 2014년부터 2020년까지 4기+극장판을 방영했다.

# 줄거리

키가 작은 **日向翔陽**는 **影山飛雄**와 라이벌·파트너 관계를 맺으며 **烏野高校** 배구부에서 **「小巨人」**를 꿈꾼다.

# 팀

| 학교 | 특징 |
| --- | --- |
| 烏野 | 주인공 팀, 까마귀 Motif |
| 音駒 | Nekoma, 고양이 vs 까마귀 |
| 白鳥沢 | 강호, **牛島若利** |`,
    characters: ["日向翔陽", "影山飛雄", "月島蛍", "西谷夕", "及川徹", "牛島若利"],
    tags: ["스포츠", "배구", "Production IG", "Jump"],
  },
  {
    title: "블루 록",
    titleEn: "Blue Lock",
    genre: "SPORTS",
    studio: "8bit",
    coverUrl: "https://cdn.myanimelist.net/images/anime/1079/141087.jpg",
    synopsis: `# 개요

[[블루 록]]은 2022년부터 방영된 축구 스포츠·심리 애니메이션. 일본 **월드컵 우승**을 목표로 한 **스트riker 육성 프로젝트**.

# 줄거리

**潔世一**는 포워드로 **「세계 최고의 스트라이커」**가 되기 위해 **ブルーロック** 시설에 갇힌 300명의 forwards와 생존 경쟁을 벌인다.

# 철학

**「エゴ」** — 팀플레이와 개인의 욕망 사이의 긴장.`,
    characters: ["潔世一", "蜂楽廻", "千切豹馬", "凪誠士郎", "糸師凛", "國神錬介"],
    tags: ["스포츠", "축구", "8bit", "2022"],
  },
];

function seedSlug(seed: AnimeWikiSeed): string {
  return animeSlugFromTitle(seed.title, seed.titleEn);
}

async function uniqueSlug(prisma: PrismaClient, base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await prisma.anime.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function repairBrokenAnimeSlugs(prisma: PrismaClient): Promise<number> {
  const all = await prisma.anime.findMany({
    select: { id: true, slug: true, title: true, titleEn: true },
  });
  let fixed = 0;
  for (const row of all) {
    if (isValidAnimeSlug(row.slug)) continue;
    const base = animeSlugFromTitle(row.title, row.titleEn);
    const slug = await uniqueSlug(prisma, base, row.id);
    await prisma.anime.update({ where: { id: row.id }, data: { slug } });
    fixed += 1;
  }
  return fixed;
}

export async function ensureAnimeWikiSeeds(prisma: PrismaClient, creatorId: string): Promise<number> {
  let upserted = 0;

  for (const seed of ANIME_WIKI_SEEDS) {
    const slug = seedSlug(seed);
    const characters = seed.characters.map((name) => ({ name }));

    const existing =
      (await prisma.anime.findUnique({ where: { slug } })) ??
      (await prisma.anime.findFirst({ where: { title: seed.title } }));

    if (existing) {
      const needsSlugFix = !isValidAnimeSlug(existing.slug);
      const needsContent =
        !existing.synopsis?.trim() ||
        existing.synopsis.length < 80 ||
        (seed.isProtected && !existing.isProtected);
      const needsInfobox = !!seed.infobox && !existing.infobox?.trim();

      if (!needsSlugFix && !needsContent && !needsInfobox) continue;

      await prisma.anime.update({
        where: { id: existing.id },
        data: {
          ...(needsSlugFix ? { slug: await uniqueSlug(prisma, slug, existing.id) } : {}),
          ...(needsInfobox ? { infobox: seed.infobox } : {}),
          ...(needsContent
            ? {
                titleEn: existing.titleEn ?? seed.titleEn,
                genre: existing.genre === "OTHER" ? seed.genre : existing.genre,
                studio: existing.studio ?? seed.studio,
                synopsis: existing.synopsis?.trim() ? existing.synopsis : seed.synopsis,
                worldInfo: existing.worldInfo?.trim() ? existing.worldInfo : seed.worldInfo ?? null,
                coverUrl: existing.coverUrl ?? seed.coverUrl ?? null,
                bannerUrl: existing.bannerUrl ?? seed.bannerUrl ?? null,
                characters: existing.characters ? undefined : characters,
                tags: existing.tags.length ? existing.tags : seed.tags,
                isProtected: seed.isProtected ?? existing.isProtected,
              }
            : {}),
        },
      });
      upserted += 1;
      continue;
    }

    await prisma.anime.create({
      data: {
        title: seed.title,
        titleEn: seed.titleEn,
        slug: await uniqueSlug(prisma, slug),
        genre: seed.genre,
        studio: seed.studio,
        synopsis: seed.synopsis,
        worldInfo: seed.worldInfo ?? null,
        infobox: seed.infobox ?? null,
        coverUrl: seed.coverUrl ?? null,
        bannerUrl: seed.bannerUrl ?? null,
        characters,
        tags: seed.tags,
        isProtected: seed.isProtected ?? false,
        creatorId,
      },
    });
    upserted += 1;
  }

  return upserted;
}

export async function ensureAnimeWikiCatalog(prisma: PrismaClient): Promise<void> {
  try {
    const platform = await prisma.user.findFirst({
      where: { username: "mocomo_official" },
      select: { id: true },
    });
    if (!platform) return;

    const repaired = await repairBrokenAnimeSlugs(prisma);
    const seeded = await ensureAnimeWikiSeeds(prisma, platform.id);
    if (repaired > 0 || seeded > 0) {
      console.log(`[anime-wiki] slug repaired: ${repaired}, seeded/updated: ${seeded}`);
    }
  } catch (e) {
    console.error("[anime-wiki]", e);
  }
}
