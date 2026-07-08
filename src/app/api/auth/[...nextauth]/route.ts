import { handlers } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 15;

export const { GET, POST } = handlers;
