import { describe, expect, it } from "vitest";
import { MIN, STEP } from "./DonateForm";

// <input type=number> only accepts min + n*step, so min={0.03} step={1} rejected every round amount
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
