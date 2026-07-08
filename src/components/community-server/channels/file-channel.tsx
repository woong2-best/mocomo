import { FileText } from "lucide-react";

export function FileChannelView() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          파일
        </h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center max-w-md">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            파일을 여기에 드래그앤드롭하거나 채팅 채널에서 업로드하세요.
          </p>
          <p className="text-xs text-muted-foreground mt-2">사진 · 동영상 · PDF 지원 (채팅 연동)</p>
        </div>
      </div>
    </div>
  );
}
