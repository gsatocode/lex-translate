export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatTokens(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function truncateId(value: string, visible = 8): string {
  if (value.length <= visible) {
    return value;
  }

  return `${value.slice(0, visible)}...`;
}

export function labelForStage(stage: string | null | undefined): string {
  if (!stage) {
    return "Queued";
  }

  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
