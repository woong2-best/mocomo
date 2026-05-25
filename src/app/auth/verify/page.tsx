"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    if (!token || !email) {
      setStatus("error");
      setError("잘못된 인증 링크입니다.");
      return;
    }

    verifyEmail({ token, email })
      .then((result) => {
        if (result.error) {
          setStatus("error");
          setError(result.error);
        } else {
          setStatus("ok");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("인증 처리 중 오류가 발생했습니다.");
      });
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle>
          {status === "loading" && "인증 확인 중..."}
          {status === "ok" && "이메일 인증 완료"}
          {status === "error" && "인증 실패"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-sm">
        {status === "loading" && <p className="text-muted-foreground">잠시만 기다려 주세요.</p>}
        {status === "ok" && (
          <>
            <p className="text-muted-foreground">이제 로그인할 수 있습니다.</p>
            <Button asChild className="w-full rounded-xl">
              <Link href="/auth/signin">로그인하기</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-destructive">{error}</p>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/auth/email-verify">인증 코드 입력</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
