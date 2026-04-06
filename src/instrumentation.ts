export async function onRequestError() {
  // Required by Next.js instrumentation API — intentionally empty
}

export async function register() {
  // Only start the worker on the server side (not in Edge runtime or client)
  if (typeof globalThis.process !== "undefined") {
    const { startWorker } = await import("@/worker/runner");
    startWorker();
  }
}
