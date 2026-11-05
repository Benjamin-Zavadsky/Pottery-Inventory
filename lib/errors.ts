export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error ? err.message : ((err as { message?: string })?.message ?? fallback);
}

export class ConflictError extends Error {
  constructor() {
    super('This piece was changed by someone else. Reload to see the latest version.');
    this.name = 'ConflictError';
  }
}
