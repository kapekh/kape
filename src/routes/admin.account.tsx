import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { FormSection, fieldLabel } from "#/components/admin/form-ui";
import { useDirtyGuard } from "#/components/admin/useDirty";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { PageHeader } from "#/components/ui/page-header";
import { Skeleton } from "#/components/ui/skeleton";
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

	const field = (
		id: string,
		label: string,
		value: string,
		onChange: (v: string) => void,
		extra: React.ComponentProps<typeof Input>,
	) => (
		<div>
			<label className={fieldLabel} htmlFor={id}>
				{label}
			</label>
			<Input
				id={id}
				type="password"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				{...extra}
			/>
		</div>
	);

	return (
		<div className="mx-auto max-w-2xl">
			<PageHeader
				title="My account"
				description="Who you are signed in as, and your own password."
				breadcrumb={[{ label: "Admin", to: "/admin" }, { label: "My account" }]}
			/>

			{/* two scopes: what the account is, and the one thing on this screen that
			    changes it */}
			<Card padding="none" className="mb-6">
				<div className="border-b border-admin-border px-4 py-4">
					<h2 className="text-base font-semibold text-admin-ink">
						Signed in as
					</h2>
					<p className="mt-1 text-[13px] text-admin-ink-muted">
						Your email and role are set by an administrator, not here.
					</p>
				</div>
				<dl className="divide-y divide-admin-border">
					{me ? (
						<>
							<div className="flex justify-between gap-4 px-4 py-3">
								<dt className="text-[13px] text-admin-ink-muted">Email</dt>
								<dd className="text-sm font-medium text-admin-ink">
									{me.email}
								</dd>
							</div>
							{me.name && (
								<div className="flex justify-between gap-4 px-4 py-3">
									<dt className="text-[13px] text-admin-ink-muted">Name</dt>
									<dd className="text-sm font-medium text-admin-ink">
										{me.name}
									</dd>
								</div>
							)}
							<div className="flex items-center justify-between gap-4 px-4 py-3">
								<dt className="text-[13px] text-admin-ink-muted">Role</dt>
								<dd>
									<Badge tone="accent" dot={false}>
										{me.role}
									</Badge>
								</dd>
							</div>
						</>
					) : (
						<div className="space-y-3 px-4 py-3">
							<output className="sr-only">Loading your account…</output>
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-32" />
						</div>
					)}
				</dl>
			</Card>

			<form onSubmit={submit} data-tour="account-password">
				<FormSection
					title="Change password"
					description="At least 8 characters. You stay signed in on this device."
				>
					<div className="space-y-4">
						{field("account-current", "Current password", current, setCurrent, {
							autoComplete: "current-password",
							required: true,
						})}
						{field("account-next", "New password", next, setNext, {
							minLength: 8,
							autoComplete: "new-password",
							placeholder: "At least 8 characters",
							required: true,
						})}
						{field(
							"account-confirm",
							"Confirm new password",
							confirmPw,
							setConfirmPw,
							{
								minLength: 8,
								autoComplete: "new-password",
								required: true,
							},
						)}
						<Button
							type="submit"
							disabled={busy || !dirty}
							disabledReason={dirty ? undefined : "Fill the three boxes first."}
						>
							{busy ? "Saving…" : "Change password"}
						</Button>
					</div>
				</FormSection>
			</form>
		</div>
	);
}
