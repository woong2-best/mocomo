export default function StudioGuidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-pink-700">Bondee-style guide</h1>
        <p className="mt-2 text-muted-foreground">All content made in MoCoMo Studio must follow these rules.</p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold text-pink-600">Design principles</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li><strong>Pastel palette</strong> — 부드럽고 밝은 톤</li>
          <li><strong>Cute design</strong> — restrained cartoon proportions</li>
          <li><strong>둥근 형태</strong> — avoid sharp corners</li>
          <li><strong>Low poly</strong> — 50,000 polygons or fewer</li>
          <li><strong>카툰 렌더링</strong> — PBR 과다·사실 조명 지양</li>
          <li><strong>아늑한 분위기</strong> — APT·홈 씬과 조화</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold text-pink-600">Technical specs</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          <li>Formats: .glb, .gltf, .obj, .fbx (OBJ/FBX auto-convert to GLB)</li>
          <li>Max file size: 50MB</li>
          <li>Textures: 2048px or smaller</li>
          <li>Preview with APT home presets to check the vibe</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold text-pink-600">Review · distribution</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          업로드 → 자동 검사 → 검수 제출 → 운영 승인 → 마켓 배포 → MoCoMo 인벤토리 등록
        </p>
      </section>
    </div>
  );
}
