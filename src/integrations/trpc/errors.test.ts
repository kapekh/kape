import { describe, expect, it } from "vitest";
import { z } from "zod";

import { readableInputError } from "./errors";

const refuse = (schema: z.ZodType, value: unknown) =>
	schema.safeParse(value).error;

describe("readableInputError", () => {
	it("names the field and says what is wrong with it", () => {
		const err = refuse(z.object({ email: z.email() }), {
			email: "editor1@localhost",
		});
		expect(readableInputError(err)).toBe("Email: Invalid email address");
	});

	it("lists every refused field once, in words", () => {
		const err = refuse(
			z.object({
				email: z.email(),
				newPassword: z.string().min(8, "At least 8 characters"),
			}),
			{ email: "x", newPassword: "short" },
		);
		expect(readableInputError(err)).toBe(
			"Email: Invalid email address. New password: At least 8 characters",
		);
	});

	it("leaves other errors alone", () => {
		expect(readableInputError(new Error("boom"))).toBeNull();
		expect(readableInputError(undefined)).toBeNull();
	});
});
