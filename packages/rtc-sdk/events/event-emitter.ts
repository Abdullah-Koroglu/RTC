export type EventMap = Record<string, unknown>;

export class TypedEventEmitter<TEvents extends EventMap> {
  private readonly listeners = new Map<keyof TEvents, Set<(payload: any) => void>>();

  on<TKey extends keyof TEvents>(event: TKey, handler: (payload: TEvents[TKey]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const bucket = this.listeners.get(event);
    bucket?.add(handler as (payload: any) => void);

    return () => {
      bucket?.delete(handler as (payload: any) => void);
      if (bucket?.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }

    for (const handler of bucket) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
