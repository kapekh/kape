import { describe, expect, it } from "vitest";
import { MIN, STEP } from "./DonateForm";

/**
 * A `<input type="number">` accepts a value only when it is `min + n*step` for
 * a whole n. Ship a step that does not divide the gap to a round amount and the
 * browser rejects every round amount with `stepMismatch`, so nobody can donate
 * $25 - which is what `min={0.03} step={1}` did.
 */
const roundAmounts: Record<string, number[]> = {
	USD: [1, 5, 25, 100, 250],
	KHR: [4000, 20000, 100000, 400000],
};

const stepsFrom = (amount: number, currency: string) =>
	(amount - MIN[currency]) / STEP[currency];

describe("donation amount input", () => {
	for (const currency of Object.keys(roundAmounts)) {
		it(`accepts round ${currency} amounts`, () => {
			for (const amount of roundAmounts[currency]) {
				const n = stepsFrom(amount, currency);
				expect(
					Math.abs(n - Math.round(n)),
					`${currency} ${amount} is not min + n*step`,
				).toBeLessThan(1e-6);
			}
		});

		it(`keeps every round ${currency} amount above the minimum`, () => {
			for (const amount of roundAmounts[currency]) {
				expect(amount).toBeGreaterThanOrEqual(MIN[currency]);
			}
		});
	}
});
