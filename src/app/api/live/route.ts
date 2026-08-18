


import { NextRequest } from "next/server";
import { sseSubscribe } from "@/lib/sse-bus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const org = req.nextUrl.searchParams.get("org") ?? "hospital";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      const unsub = sseSubscribe(org, ctrl);

      
      
      ctrl.enqueue(encoder.encode(": connected\n\n"));

      
      req.signal.addEventListener("abort", () => {
        unsub();
        try { ctrl.close(); } catch {  }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", 
    },
  });
}
