import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { RoleForm, type RoleFormValue } from "#/components/admin/RoleForm";
import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { toast } from "@/components/Dialogs";

export const Route = createFileRoute("/admin/roles/$id")({
	component: EditRole,
});

type RoleData = NonNullable<
	Awaited<ReturnType<typeof trpcClient.adminRoles.get.query>>
>;

function EditRole() {
	const { id } = useParams({ from: "/admin/roles/$id" });
	const navigate = useNavigate();
	const [role, setRole] = useState<RoleData | null | undefined>(undefined);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		trpcClient.adminRoles.get
			.query({ id: Number(id) })
			.then(setRole)
			.catch(() => setRole(null));
	}, [id]);

	async function onSubmit(v: RoleFormValue) {
		setSaving(true);
		try {
			await trpcClient.adminRoles.update.mutate({
				id: Number(id),
				name: v.name,
				permissions: v.permissions,
			});
			toast("Role saved.", "success");
			navigate({ to: "/admin/roles" });
		} catch (e) {
			toast(
				e instanceof Error ? e.message : "Could not save this role.",
				"error",
			);
		} finally {
			setSaving(false);
		}
	}

	if (role === undefined)
		return <div className="text-sm text-muted-foreground">Loading…</div>;
	if (role === null)
		return <div className="text-sm text-muted-foreground">Role not found.</div>;

	return (
		<RoleForm
			initial={role}
			onSubmit={onSubmit}
			saving={saving}
			title={`Edit ${role.name}`}
		/>
	);
}
