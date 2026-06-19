export default function StudioGuidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-pink-700">Bondee 스타일 가이드</h1>
        <p className="mt-2 text-muted-foreground">MoCoMo Studio에서 제작하는 모든 콘텐츠는 아래 규칙을 따라야 합니다.</p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold text-pink-600">디자인 원칙</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li><strong>파스텔 색감</strong> — 부드럽고 밝은 톤</li>
          <li><strong>귀여운 디자인</strong> — 과하지 않은 카툰 비율</li>
          <li><strong>둥근 형태</strong> — 날카로운 모서리 지양</li>
          <li><strong>저폴리곤</strong> — 50,000 폴리곤 이하</li>
          <li><strong>카툰 렌더링</strong> — PBR 과다·사실 조명 지양</li>
          <li><strong>아늑한 분위기</strong> — APT·홈 씬과 조화</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold text-pink-600">기술 규격</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>형식: .glb, .gltf, .obj, .fbx (OBJ/FBX는 자동 GLB 변환)</li>
          <li>최대 파일: 50MB</li>
          <li>텍스처: 2048px 이하</li>
          <li>미리보기 프리셋으로 APT 홈 분위기 확인 권장</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold text-pink-600">검수 · 배포</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          업로드 → 자동 검사 → 검수 제출 → 운영 승인 → 마켓 배포 → MoCoMo 인벤토리 등록
        </p>
      </section>
    </div>
  );
}
