import {
	Blocks,
	BookMarked,
	BookOpen,
	Briefcase,
	CalendarDays,
	ChartColumn,
	ClipboardList,
	Coins,
	FileText,
	Files,
	FolderKanban,
	GalleryThumbnails,
	Handshake,
	HeartHandshake,
	Image,
	Images,
	LayoutDashboard,
	type LucideIcon,
	Languages,
	MapPin,
	Megaphone,
	Menu,
	MessageSquare,
	Newspaper,
	PanelBottom,
	ScrollText,
	Settings,
	Tag,
	Target,
	Users,
	UsersRound,
	Video,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
	dashboard: LayoutDashboard,
	modules: Blocks,
	posts: FileText,
	pages: Files,
	projects: FolderKanban,
	nav: Menu,
	hero: Image,
	stats: ChartColumn,
	announcements: Megaphone,
	partners: Handshake,
	donors: HeartHandshake,
	donations: Coins,
	campaigns: Target,
	offices: MapPin,
	staff: Users,
	media: Images,
	languages: Languages,
	settings: Settings,
	tag: Tag,
	news: Newspaper,
	story: BookOpen,
	video: Video,
	gallery: GalleryThumbnails,
	team: UsersRound,
	publication: BookMarked,
	career: Briefcase,
	event: CalendarDays,
	document: ScrollText,
	footer: PanelBottom,
	message: MessageSquare,
	forms: ClipboardList,
};

export function AdminIcon({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	const Icon = ICONS[name] ?? Tag;
	return (
		<Icon
			strokeWidth={1.7}
			className={className}
			aria-hidden="true"
			focusable="false"
		/>
	);
}

/** The names the nav may ask for. Exported for the test that proves none blank. */
export const ADMIN_ICON_NAMES = Object.keys(ICONS);
