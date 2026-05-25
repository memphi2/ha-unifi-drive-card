type SelectorValueDetail = {
  value?: unknown;
  device_id?: unknown;
  deviceId?: unknown;
};

export function checkedFromEvent(event: Event): boolean {
  const source = event.currentTarget || event.target;
  return Boolean((source as { checked?: boolean }).checked);
}

export function inputStringFromEvent(event: Event): string {
  const value = (event.target as { value?: unknown } | null)?.value;
  return typeof value === "string" ? value : "";
}

export function textValueFromEvent(event: Event): string {
  const detailValue = (event as CustomEvent<SelectorValueDetail>).detail?.value;
  if (typeof detailValue === "string") {
    return detailValue;
  }
  return inputStringFromEvent(event);
}

export function pickerValueFromEvent(event: Event): string | undefined {
  const detail = (event as CustomEvent<SelectorValueDetail>).detail;
  const detailValue = detail?.value ?? detail?.["device_id"] ?? detail?.deviceId;
  if (typeof detailValue === "string") {
    return detailValue || undefined;
  }
  const targetValue = (event.target as { value?: unknown } | null)?.value;
  return typeof targetValue === "string" ? targetValue || undefined : undefined;
}

export function textInputValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
