import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EditorSkeleton } from "#/components/admin/EditorSkeleton";
import { Field } from "#/components/admin/form-ui";
import { UserForm, type UserFormValue } from "#/components/admin/UserForm";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
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

	if (!initial) return <EditorSkeleton />;
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
		<Card padding="none" className="overflow-hidden">
			<div className="border-b border-admin-border p-4">
				<h2 className="text-base font-semibold text-admin-ink">
					Reset password
				</h2>
				<p className="mt-1 text-[13px] text-admin-ink-muted">
					A second, separate save. It takes effect on its own, and it signs this
					person out of every session they have open.
				</p>
			</div>
			<form onSubmit={reset} className="flex flex-wrap items-end gap-3 p-4">
				<div className="min-w-[220px] flex-1">
					<Field label="New password">
						{(p) => (
							<Input
								{...p}
								type="text"
								value={pw}
								onChange={(e) => setPw(e.target.value)}
								placeholder="At least 8 characters"
								minLength={8}
								autoComplete="new-password"
							/>
						)}
					</Field>
				</div>
				<Button
					type="submit"
					disabled={busy || pw.length < 8}
					disabledReason="Type at least 8 characters first."
				>
					{busy ? "Resetting…" : "Reset password"}
				</Button>
			</form>
		</Card>
	);
}
