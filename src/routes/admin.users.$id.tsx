import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fieldInput, fieldLabel } from "#/components/admin/form-ui";
import { UserForm, type UserFormValue } from "#/components/admin/UserForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/users/$id")({
	component: EditUser,
});

type Initial = Awaited<ReturnType<typeof trpcClient.adminUsers.get.query>>;

function EditUser() {
	const { id } = Route.useParams();
	const uid = Number(id);
	const navigate = useNavigate();
	const [initial, setInitial] = useState<Initial | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.adminUsers.get.query({ id: uid }).then(setInitial);
	}, [uid]);

	async function onSubmit(v: UserFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminUsers.update.mutate({
				id: uid,
				email: v.email,
				name: v.name,
				role: v.role,
			});
			toast("User saved.", "success");
			navigate({ to: "/admin/users" });
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not save this user.",
				"error",
			);
		} finally {
			setSaving(false);
		}
	}

	if (!initial)
		return <div className="p-6 text-muted-foreground">Loading…</div>;
	return (
		<div>
			<UserForm
				initial={initial}
				onSubmit={onSubmit}
				saving={saving}
				title="Edit user"
			/>
			<div className="mx-auto mt-6 max-w-5xl">
				<ResetPasswordCard userId={uid} />
			</div>
		</div>
	);
}

function ResetPasswordCard({ userId }: { userId: number }) {
	const [pw, setPw] = useState("");
	const [busy, setBusy] = useState(false);

	async function reset(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		try {
			await trpcClient.adminUsers.resetPassword.mutate({
				id: userId,
				password: pw,
			});
			setPw("");
			toast(
				"Password reset. The user has been signed out everywhere.",
				"success",
			);
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not reset the password.",
				"error",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<form
			onSubmit={reset}
			className="rounded-2xl border border-border bg-card overflow-hidden"
		>
			<div className="border-b border-border px-5 py-4">
				<h2 className="font-display text-base font-semibold text-primary">
					Reset password
				</h2>
				<p className="text-xs text-muted-foreground mt-0.5">
					Set a new password for this user. It signs them out of all sessions.
				</p>
			</div>
			<div className="flex flex-wrap items-end gap-3 p-5">
				<div className="flex-1 min-w-[220px]">
					<label className="block">
						<span className={fieldLabel}>New password</span>
						<input
							className={fieldInput}
							type="text"
							value={pw}
							onChange={(e) => setPw(e.target.value)}
							placeholder="At least 8 characters"
							minLength={8}
							autoComplete="new-password"
						/>
					</label>
				</div>
				<button
					type="submit"
					disabled={busy || pw.length < 8}
					className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
				>
					{busy ? "Resetting…" : "Reset password"}
				</button>
			</div>
		</form>
	);
}
