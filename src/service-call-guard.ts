type BusyChangeListener = (keys: ReadonlySet<string>) => void;

export class ServiceCallGuard {
  private readonly activeKeys = new Map<string, symbol>();

  public constructor(private readonly onChange: BusyChangeListener = () => undefined) {}

  public isBusy(key: string): boolean {
    return this.activeKeys.has(key);
  }

  public isEntityBusy(entityId: string): boolean {
    const prefix = `${entityId}:`;
    for (const key of this.activeKeys.keys()) {
      if (key.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  public async run(key: string, action: () => Promise<unknown>): Promise<unknown> {
    if (this.activeKeys.has(key)) {
      return undefined;
    }
    const invocation = Symbol(key);
    this.activeKeys.set(key, invocation);
    this.emit();
    try {
      return await action();
    } finally {
      if (this.activeKeys.get(key) === invocation) {
        this.activeKeys.delete(key);
        this.emit();
      }
    }
  }

  public clear(): void {
    if (!this.activeKeys.size) {
      return;
    }
    this.activeKeys.clear();
    this.emit();
  }

  private emit(): void {
    this.onChange(new Set(this.activeKeys.keys()));
  }
}

export function serviceActionKey(entityId: string, action: string): string {
  return `${entityId}:${action}`;
}
