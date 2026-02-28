/**
 * Builds a flat list of interactions in tree order (roots first, then children indented).
 * Items with parent_interaction_id pointing to another item in the list are rendered as children.
 */
export function buildInteractionTree<T extends { id: string; parent_interaction_id: string | null }>(
  interactions: T[]
): { item: T; depth: number }[] {
  if (interactions.length === 0) return [];
  const byId = new Map(interactions.map((i) => [i.id, i]));
  const roots = interactions.filter(
    (i) => !i.parent_interaction_id || !byId.has(i.parent_interaction_id!)
  );
  const childrenByParent = new Map<string, T[]>();
  for (const i of interactions) {
    if (i.parent_interaction_id && byId.has(i.parent_interaction_id)) {
      const list = childrenByParent.get(i.parent_interaction_id) ?? [];
      list.push(i);
      childrenByParent.set(i.parent_interaction_id, list);
    }
  }
  const result: { item: T; depth: number }[] = [];
  function walk(item: T, depth: number) {
    result.push({ item, depth });
    const children = childrenByParent.get(item.id) ?? [];
    children.forEach((c) => walk(c, depth + 1));
  }
  roots.forEach((r) => walk(r, 0));
  return result;
}
