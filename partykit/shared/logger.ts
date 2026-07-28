export function logWorkerError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  console.error(
    JSON.stringify({
      event,
      error: error instanceof Error ? error.message : String(error),
      ...context,
    }),
  );
}
