import { Prisma } from "@prisma/client";

export function prismaErrorMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "이미 같은 이름·주소의 커뮤니티가 있어요. 이름을 바꿔 주세요.";
    if (e.code === "P2021" || e.code === "P2022") {
      return "DB에 커뮤니티 테이블이 없습니다. Supabase SQL(섹션 N) 실행 후 다시 시도해 주세요.";
    }
    if (e.code === "P2003") return "계정 정보를 찾을 수 없습니다. 다시 로그인해 주세요.";
    if (e.code === "P2024") {
      return "서버가 바쁩니다. 잠시 후 다시 시도해 주세요.";
    }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return "DB 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (e instanceof Error) {
    if (/max client connections|EMAXCONN|Too many connections/i.test(e.message)) {
      return "DB 연결 한도에 도달했습니다. 1~2분 후 다시 시도해 주세요.";
    }
    if (e.message === "UNAUTHORIZED") return "로그인이 필요합니다.";
    if (e.message === "BANNED") return "계정 제한으로 이용할 수 없습니다.";
    return e.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}
