import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { useDirtyGuard } from "#/components/admin/useDirty";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/account")({ component: Account });

function Account() {
	const [me, setMe] = useState<{
		email: string;
		name: string | null;
		role: string;
	} | null>(null);
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirmPw, setConfirmPw] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		trpcClient.auth.me
			.query()
			.then((u) => u && setMe({ email: u.email, name: u.name, role: u.role }));
	}, []);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (next !== confirmPw) {
			toast("The new passwords don't match.", "error");
			return;
		}
		setBusy(true);
		try {
			await trpcClient.auth.changePassword.mutate({
				currentPassword: current,
				newPassword: next,
			});
			setCurrent("");
			setNext("");
			setConfirmPw("");
			toast("Your password has been changed.", "success");
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not change your password.",
				"error",
			);
		} finally {
			setBusy(false);
		}
	}

	const dirty = useDirtyGuard(JSON.stringify({ current, next, confirmPw }));

	return (
		<div className="mx-auto max-w-2xl">
			<h1 className="font-display text-2xl font-semibold text-primary">
				My account
			</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Manage your own login.
			</p>

			{me && (
				<div className="mt-6 rounded-2xl border border-border bg-card p-5">
					<dl className="space-y-2 text-sm">
						<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
							<dt className="text-muted-foreground">Email</dt>
							<dd className="font-medium text-foreground">{me.email}</dd>
						</div>
						{me.name && (
							<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
								<dt className="text-muted-foreground">Name</dt>
								<dd className="font-medium text-foreground">{me.name}</dd>
							</div>
						)}
						<div className="flex justify-between gap-4">
							<dt className="text-muted-foreground">Role</dt>
							<dd className="font-medium capitalize text-foreground">
								{me.role}
							</dd>
						</div>
					</dl>
				</div>
			)}

			<form
				onSubmit={submit}
				className="mt-6 rounded-2xl border border-border bg-card overflow-hidden"
			>
				<div className="border-b border-border px-5 py-4">
					<h2 className="font-display text-base font-semibold text-primary">
						Change password
					</h2>
				</div>
				<div className="space-y-4 p-5">
					<label className="block">
						<span className={fieldLabel}>Current password</span>
						<input
							className={fieldInput}
							type="password"
							value={current}
							onChange={(e) => setCurrent(e.target.value)}
							autoComplete="current-password"
							required
						/>
					</label>
					<label className="block">
						<span className={fieldLabel}>New password</span>
						<input
							className={fieldInput}
							type="password"
							value={next}
							onChange={(e) => setNext(e.target.value)}
							minLength={8}
							autoComplete="new-password"
							placeholder="At least 8 characters"
							required
						/>
					</label>
					<label className="block">
						<span className={fieldLabel}>Confirm new password</span>
						<input
							className={fieldInput}
							type="password"
							value={confirmPw}
							onChange={(e) => setConfirmPw(e.target.value)}
							minLength={8}
							autoComplete="new-password"
							required
						/>
					</label>
					<button
						type="submit"
						disabled={busy || !dirty}
						className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
					>
						{busy ? "Saving…" : "Change password"}
					</button>
				</div>
			</form>
		</div>
	);
}
