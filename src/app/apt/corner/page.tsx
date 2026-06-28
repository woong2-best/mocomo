import { Suspense } from "react";
import { CornerSceneViewer } from "./corner-scene-viewer";

export const metadata = {
  title: "APT Corner Scene | MoCoMo",
  description: "Scene Polish #4 — live 3D corner room",
};

export default function AptCornerPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#1a1612]" />}>
      <CornerSceneViewer />
    </Suspense>
  );
}
