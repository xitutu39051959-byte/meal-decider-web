export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatDayKey(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function joinClasses(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

