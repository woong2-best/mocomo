import { Card, CardContent } from "@/components/ui/card";

export function EmailVerifySkeleton() {
  return (
    <Card className="w-full max-w-md rounded-2xl animate-pulse">
      <CardContent className="p-8 space-y-4">
        <div className="h-6 w-48 mx-auto rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
      </CardContent>
    </Card>
  );
}
