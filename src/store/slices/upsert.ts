/** Replace the item with the same id, or append it. */
export function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((i) => i.id === item.id);
  if (index === -1) return [...items, item];
  return items.map((i, n) => (n === index ? item : i));
}
