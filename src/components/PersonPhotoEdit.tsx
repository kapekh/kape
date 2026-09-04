import { trpcClient } from "#/integrations/tanstack-query/root-provider";
import { useInlineEdit } from "#/lib/inline-edit";

import { InlineImageEdit } from "./InlineImageEdit";

export function useMayEditPeople(): boolean {
	const { editing, may } = useInlineEdit();
	return editing && may("people");
}

const SHAPES = {
	avatar: {
		button:
			"absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full group-hover:scale-105",
		tint: "absolute inset-0 rounded-full bg-primary/0 transition group-hover:bg-primary/45",
		badge: "absolute bottom-0 right-0",
	},
	portrait: {
		button: "absolute inset-0",
		tint: "absolute inset-0 bg-primary/0 transition group-hover:bg-primary/35",
		badge: "absolute bottom-3 right-3",
	},
};

export function PersonPhotoEdit({
	personId,
	name,
	hasPhoto,
	shape = "avatar",
}: {
	personId: number;
	name: string;
	hasPhoto: boolean;
	/** The photo's own shape: a circle in the team grid, the box on a profile. */
	shape?: keyof typeof SHAPES;
}) {
	const { button, tint, badge } = SHAPES[shape];
	return (
		<InlineImageEdit
			label={`${name || "Team member"} photo`}
			hasImage={hasPhoto}
			className={button}
			badgeClassName={badge}
			save={async (media) => {
				await trpcClient.adminPeople.setPhoto.mutate({
					id: personId,
					photoMediaId: media.id,
				});
			}}
		>
			<span className={tint} />
		</InlineImageEdit>
	);
}
