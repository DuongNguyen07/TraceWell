// SSE endpoint — clients connect here to receive real-time events.
// Each connection is registered in the global SSE bus keyed by org,
// and is automatically cleaned up when the client disconnects.
//
// Docker / single-process: the in-memory bus in sse-bus.ts is shared
// across all connections — this is the fully-functional path.
//
// Vercel serverless: each function invocation runs in its own isolated
// context, so the shared bus doesn't exist. Connections will be silently
// closed when the function times out. The app falls back to BroadcastChannel
// for same-device cross-tab sync, so the UX degrades gracefully.
// For true cross-device push on Vercel, replace sse-bus with Redis Pub/Sub.

import { NextRequest } from "next/server";
import { sseSubscribe } from "@/lib/sse-bus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get("org") ?? "hospital";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      const unsub = sseSubscribe(org, ctrl);

      // Send an initial comment to confirm the connection is open.
      // SSE comments (lines starting with ":") are ignored by EventSource.
      ctrl.enqueue(encoder.encode(": connected\n\n"));

      // Clean up when the client tab closes or navigates away.
      req.signal.addEventListener("abort", () => {
        unsub();
        try { ctrl.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // disable Nginx buffering if behind a proxy
    },
  });
}
