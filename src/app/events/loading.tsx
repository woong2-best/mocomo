import { RouteLoading } from "@/components/ui/route-loading";

/**
 * This page awaits auth + getEvents with no internal Suspense boundary, so
 * without a loading file the navigation blocks on the full server render —
 * measured around 1.5s of frozen previous page. The boundary lets Next stream
 * the shell immediately.
 */
export default function Loading() {
  return <RouteLoading chrome maxWidth="6xl" />;
}
