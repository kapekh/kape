import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Input } from "#/components/ui/input.tsx";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import {
	cancelButtonClass,
	EditorGrid,
	EditorHeader,
	Field,
	FormSection,
} from "./form-ui";
import { useDirtyGuard } from "./useDirty";
import { useFieldErrors } from "./useFieldErrors";

export type UserFormValue = {
	email: string;
	name: string | null;
	role: string;
	password?: string;
};

type Initial = { email: string; name: string | null; role: string } | null;
type RoleOption = { key: string; name: string };

const BUILTIN_DESC: Record<string, string> = {
	admin: "Full access to everything: content, site settings, users and roles.",
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
	const { errors, invalid } = useFieldErrors();

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

	const dirty = useDirtyGuard(JSON.stringify({ email, name, role, password }));

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
						split
						title="Account"
						description="The address this person signs in with."
					>
						<div className="space-y-6">
							<Field label="Email" required error={errors.email}>
								{(p) => (
									<Input
										{...p}
										{...invalid("email")}
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="person@example.org"
									/>
								)}
							</Field>
							<Field label="Name">
								{(p) => (
									<Input
										{...p}
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Full name"
									/>
								)}
							</Field>
							{isNew && (
								<Field
									label="Initial password"
									required
									error={errors.password}
									hint="Share it with them. They can change it from their own account page."
								>
									{(p) => (
										<Input
											{...p}
											{...invalid("password")}
											type="text"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="At least 8 characters"
											minLength={8}
											autoComplete="new-password"
										/>
									)}
								</Field>
							)}
						</div>
					</FormSection>
				}
				aside={
					<FormSection title="Role" description="What this account can reach.">
						<div className="space-y-2">
							{roles.map((r) => (
								<label
									key={r.key}
									className={`block cursor-pointer rounded-lg border p-3 transition-colors duration-150 ease-out ${role === r.key ? "border-admin-accent bg-admin-accent-soft" : "border-admin-border hover:bg-admin-panel-raised"}`}
								>
									<span className="flex items-center gap-2">
										<input
											type="radio"
											name="role"
											checked={role === r.key}
											onChange={() => setRole(r.key)}
											className="h-4 w-4 accent-[var(--admin-accent)]"
										/>
										<span className="text-sm font-medium text-admin-ink">
											{r.name}
										</span>
									</span>
									<span className="mt-1 block pl-6 text-[13px] text-admin-ink-muted">
										{BUILTIN_DESC[r.key] ??
											"Custom role. Access is limited to its granted areas."}
									</span>
								</label>
							))}
							<p className="pt-1 text-[13px] text-admin-ink-muted">
								Roles and what they reach are set in{" "}
								<Link
									to="/admin/roles"
									className="font-medium text-admin-accent hover:underline"
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
