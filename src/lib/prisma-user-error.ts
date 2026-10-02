import { Prisma } from "@prisma/client";

export function prismaErrorMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "A community with the same name or address already exists. Choose a different name.";
    if (e.code === "P2021" || e.code === "P2022") {
      return "Community tables are missing in the DB. Run the Supabase SQL (section N) and try again.";
    }
    if (e.code === "P2003") return "Account not found. Please sign in again.";
    if (e.code === "P2024") {
      return "Server is busy. Try again in a moment.";
    }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return "DB connection failed. Try again in a moment.";
  }
  if (e instanceof Error) {
    if (/max client connections|EMAXCONN|Too many connections/i.test(e.message)) {
      return "DB connection limit reached. Try again in 1–2 minutes.";
    }
    if (e.message === "UNAUTHORIZED") return "Sign-in required.";
    if (e.message === "BANNED") return "Unavailable due to account restrictions.";
    return e.message;
  }
  return "An unknown error occurred.";
}
