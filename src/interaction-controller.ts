import { type ActionTrigger, DOUBLE_TAP_DELAY_MS, HOLD_ACTION_DELAY_MS } from "./card-actions";

interface ActionInteractionOptions {
  entityId?: string;
  hasDoubleTap: boolean;
  hasHold: boolean;
  dispatch: (entityId: string, trigger: ActionTrigger) => void;
}

interface PendingHold {
  entityId: string;
  timer: number;
}

export class EntityActionController {
  private readonly pendingTapTimers = new Map<string, number>();
  private pendingHold?: PendingHold;
  private suppressedClickEntityId?: string;
  private suppressedClickResetTimer?: number;

  public handleClick(event: MouseEvent, options: ActionInteractionOptions): void {
    event.stopPropagation();
    const entityId = options.entityId;
    if (!entityId) {
      return;
    }
    if (this.consumeSuppressedClick(entityId)) {
      return;
    }
    if (!options.hasDoubleTap) {
      options.dispatch(entityId, "tap");
      return;
    }
    if (this.clearPendingTap(entityId)) {
      options.dispatch(entityId, "double_tap");
      return;
    }
    const timer = window.setTimeout(() => {
      this.pendingTapTimers.delete(entityId);
      options.dispatch(entityId, "tap");
    }, DOUBLE_TAP_DELAY_MS);
    this.pendingTapTimers.set(entityId, timer);
  }

  public handleDoubleClick(event: MouseEvent, options: ActionInteractionOptions): void {
    event.preventDefault();
    event.stopPropagation();
    const entityId = options.entityId;
    if (!entityId || !options.hasDoubleTap || !this.clearPendingTap(entityId)) {
      return;
    }
    options.dispatch(entityId, "double_tap");
  }

  public handlePointerDown(event: PointerEvent, options: ActionInteractionOptions): void {
    const entityId = options.entityId;
    if (!entityId || !options.hasHold || !isPrimaryPointer(event)) {
      return;
    }
    this.clearPendingHold();
    this.clearSuppressedClick();
    const timer = window.setTimeout(() => {
      this.clearPendingTap(entityId);
      this.suppressedClickEntityId = entityId;
      this.pendingHold = undefined;
      options.dispatch(entityId, "hold");
    }, HOLD_ACTION_DELAY_MS);
    this.pendingHold = { entityId, timer };
  }

  public handlePointerEnd(): void {
    this.clearPendingHold();
    if (this.suppressedClickEntityId) {
      this.scheduleSuppressedClickReset();
    }
  }

  public clear(): void {
    for (const timer of this.pendingTapTimers.values()) {
      window.clearTimeout(timer);
    }
    this.pendingTapTimers.clear();
    this.clearPendingHold();
    this.clearSuppressedClick();
  }

  private clearPendingTap(entityId: string): boolean {
    const timer = this.pendingTapTimers.get(entityId);
    if (timer === undefined) {
      return false;
    }
    window.clearTimeout(timer);
    this.pendingTapTimers.delete(entityId);
    return true;
  }

  private clearPendingHold(): void {
    if (this.pendingHold) {
      window.clearTimeout(this.pendingHold.timer);
      this.pendingHold = undefined;
    }
  }

  private consumeSuppressedClick(entityId: string): boolean {
    if (this.suppressedClickEntityId !== entityId) {
      return false;
    }
    this.clearSuppressedClick();
    return true;
  }

  private scheduleSuppressedClickReset(): void {
    this.clearSuppressedClickResetTimer();
    this.suppressedClickResetTimer = window.setTimeout(() => {
      this.suppressedClickEntityId = undefined;
      this.suppressedClickResetTimer = undefined;
    }, DOUBLE_TAP_DELAY_MS + 100);
  }

  private clearSuppressedClick(): void {
    this.suppressedClickEntityId = undefined;
    this.clearSuppressedClickResetTimer();
  }

  private clearSuppressedClickResetTimer(): void {
    if (this.suppressedClickResetTimer !== undefined) {
      window.clearTimeout(this.suppressedClickResetTimer);
      this.suppressedClickResetTimer = undefined;
    }
  }
}

function isPrimaryPointer(event: PointerEvent): boolean {
  return (!("button" in event) || event.button === 0) && event.isPrimary !== false;
}
