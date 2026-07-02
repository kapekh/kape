import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { UserForm, type UserFormValue } from "#/components/admin/UserForm";
import { toast } from "@/components/Dialogs";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";

export const Route = createFileRoute("/admin/users/new")({ component: NewUser });

function NewUser() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);

	async function onSubmit(v: UserFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminUsers.create.mutate({ email: v.email, name: v.name, role: v.role, password: v.password ?? "" });
			toast("User created.", "success");
			navigate({ to: "/admin/users" });
		} catch (e) {
			toast(e instanceof Error ? e.message : "Could not create this user.", "error");
		} finally {
			setSaving(false);
		}
	}

	return <UserForm initial={null} onSubmit={onSubmit} saving={saving} title="New user" />;
}
