/** What a sortable list keys its items by. */
export type SortableId = string | number;

/** The list with one entry lifted out of `from` and dropped at `to`. Returns the
 *  same array when nothing moves, so a caller can skip a render. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
	if (from < 0 || from >= list.length) return list;
	const at = Math.min(Math.max(to, 0), list.length - 1);
	if (at === from) return list;
	const next = list.slice();
	next.splice(at, 0, next.splice(from, 1)[0]);
	return next;
}

/** True when two id lists hold the same ids in the same order. */
export function sameOrder<Id extends SortableId>(
	a: readonly Id[],
	b: readonly Id[],
): boolean {
	return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** The full order after a *subset* was reordered: the slots the subset occupied
 *  take its new order and every other id keeps its place. Ids not in `all` are
 *  ignored, so a stale page cannot corrupt an order. */
export function applyOrder<Id extends SortableId>(
	all: readonly Id[],
	ids: readonly Id[],
): Id[] {
	const known = new Set(all);
	const moving = new Set<Id>();
	const queue: Id[] = [];
	for (const id of ids) {
		if (!known.has(id) || moving.has(id)) continue;
		moving.add(id);
		queue.push(id);
	}
	const next = [...all];
	let taken = 0;
	for (let i = 0; i < next.length && taken < queue.length; i++)
		if (moving.has(next[i])) next[i] = queue[taken++];
	return next;
}
