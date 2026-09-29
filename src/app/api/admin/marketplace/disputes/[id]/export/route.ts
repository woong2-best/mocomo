import { exportMarketplaceDisputeLegalBundle } from "@/actions/marketplace-admin";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const result = await exportMarketplaceDisputeLegalBundle(id);
  if ("error" in result && result.error) {
    return new Response(result.error, { status: 404 });
  }
  if (!("body" in result) || !result.body) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(result.body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
