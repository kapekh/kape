import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { RoleForm, type RoleFormValue } from "#/components/admin/RoleForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/roles/new")({
	component: NewRole,
});

function NewRole() {
	const navigate = useNavigate();
	const [saving, setSaving] = useState(false);

	async function onSubmit(v: RoleFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminRoles.create.mutate({
				name: v.name,
				permissions: v.permissions,
			});
			toast("Role created.", "success");
			navigate({ to: "/admin/roles" });
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not create this role.",
				"error",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<RoleForm
			initial={null}
			onSubmit={onSubmit}
			saving={saving}
			title="New role"
		/>
	);
}
