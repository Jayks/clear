import { getStreamSummary } from "@/lib/db/queries/stream";
import { StreamSummaryStripClient } from "./stream-summary-strip-client";

interface Props {
  userId: string;
}

/**
 * Async RSC — fetches stream summary and passes it to the client component.
 * Wrapped in <Suspense> at the call site (groups/page.tsx).
 * The log sheet state lives inside StreamSummaryStripClient.
 */
export async function StreamSummaryStrip({ userId }: Props) {
  const summary = await getStreamSummary(userId);
  return <StreamSummaryStripClient summary={summary} />;
}
