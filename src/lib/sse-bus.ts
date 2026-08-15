// In-memory SSE connection bus.
// Keyed by org so events are scoped — hospital staff never see agedcare events.
//
// Uses a Node.js global so the Map survives Next.js route-handler hot reloads
// in development (each reload re-executes the module but the global persists).
// In production (standalone) there is a single Node process, so this is fine.
// For a multi-instance deployment, swap this for Redis Pub/Sub.

export type SSEClient = ReadableStreamDefaultController<Uint8Array>;

declare global {
  var __tracewellSSE: Map<string, Set<SSEClient>> | undefined;
}

function bus(): Map<string, Set<SSEClient>> {
  if (!global.__tracewellSSE) global.__tracewellSSE = new Map();
  return global.__tracewellSSE;
}

export function sseSubscribe(org: string, ctrl: SSEClient): () => void {
  const b = bus();
  if (!b.has(org)) b.set(org, new Set());
  b.get(org)!.add(ctrl);
  return () => b.get(org)?.delete(ctrl);
}

export function sseBroadcast(org: string, payload: unknown): void {
  const clients = bus().get(org);
  if (!clients?.size) return;

  const encoder = new TextEncoder();
  const chunk = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

  const dead = new Set<SSEClient>();
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      dead.add(ctrl);
    }
  }
  dead.forEach((c) => clients.delete(c));
}
