import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	FormSection,
	fieldInput,
	fieldLabel,
} from "./form-ui";
import { useDirty } from "./useDirty";

export type UserFormValue = {
	email: string;
	name: string | null;
	role: string;
	password?: string;
};

type Initial = { email: string; name: string | null; role: string } | null;
type RoleOption = { key: string; name: string };

const BUILTIN_DESC: Record<string, string> = {
	admin:
		"Full access to everything — content, site settings, users, and roles.",
	staff:
		"Internal staff portal only (/internalsources). No access to the admin.",
};

export function UserForm({
	initial,
	onSubmit,
	saving,
	title,
}: {
	initial: Initial;
	onSubmit: (v: UserFormValue) => void;
	saving?: boolean;
	title: string;
}) {
	const isNew = !initial;
	const [email, setEmail] = useState(initial?.email ?? "");
	const [name, setName] = useState(initial?.name ?? "");
	const [role, setRole] = useState<string>(initial?.role ?? "staff");
	const [password, setPassword] = useState("");
	const [roles, setRoles] = useState<RoleOption[]>([]);

	useEffect(() => {
		trpcClient.adminUsers.roles
			.query()
			.then(setRoles)
			.catch(() => {});
	}, []);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		onSubmit({
			email: email.trim(),
			name: name.trim() || null,
			role,
			...(isNew ? { password } : {}),
		});
	}

	const dirty = useDirty(JSON.stringify({ email, name, role, password }));

	return (
		<form onSubmit={submit}>
			<EditorHeader
				title={title}
				saving={saving}
				saveLabel="Save user"
				dirty={dirty}
			>
				<Link to="/admin/users" className={cancelButtonClass}>
					Cancel
				</Link>
			</EditorHeader>
			<EditorGrid
				main={
					<FormSection
						title="Account"
						description="Login details for this person."
					>
						<div className="space-y-4">
							<div>
								<label className={fieldLabel}>Email</label>
								<input
									className={fieldInput}
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="person@kapekh.org"
									required
								/>
							</div>
							<div>
								<label className={fieldLabel}>Name</label>
								<input
									className={fieldInput}
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Full name"
								/>
							</div>
							{isNew && (
								<div>
									<label className={fieldLabel}>Initial password</label>
									<input
										className={fieldInput}
										type="text"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="At least 8 characters"
										minLength={8}
										required
										autoComplete="new-password"
									/>
									<p className="mt-1 text-xs text-muted-foreground">
										Share it with them; they can change it from their account
										page.
									</p>
								</div>
							)}
						</div>
					</FormSection>
				}
				aside={
					<FormSection title="Role" description="What this account can access.">
						<div className="space-y-2">
							{roles.map((r) => (
								<label
									key={r.key}
									className={`block cursor-pointer rounded-xl border p-3 transition ${role === r.key ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-border hover:border-[var(--accent)]/50"}`}
								>
									<span className="flex items-center gap-2">
										<input
											type="radio"
											name="role"
											checked={role === r.key}
											onChange={() => setRole(r.key)}
											className="h-4 w-4 accent-[var(--accent)]"
										/>
										<span className="text-sm font-semibold text-foreground">
											{r.name}
										</span>
									</span>
									<span className="mt-1 block pl-6 text-xs text-muted-foreground">
										{BUILTIN_DESC[r.key] ??
											"Custom role — access limited to its granted areas."}
									</span>
								</label>
							))}
							<p className="pt-1 text-xs text-muted-foreground">
								Manage roles &amp; their permissions in{" "}
								<Link
									to="/admin/roles"
									className="font-medium text-[var(--accent)] hover:underline"
								>
									Roles
								</Link>
								.
							</p>
						</div>
					</FormSection>
				}
			/>
		</form>
	);
}
