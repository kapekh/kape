// a key with no km falls back to English; invented Khmer is not honest
export const sections: Record<string, { en: string; km?: string }> = {
	"albums.count": { en: "{n} photos" },

	"cta.donateNow": { en: "Donate now" },
	"cta.learnMore": { en: "Learn more" },

	// One key per empty state, not one per call site: the marquee and the
	// category layouts of the partners section share `empty.partners`.
	"empty.albums": { en: "No photo albums yet." },
	"empty.certificates": { en: "No accreditations listed yet." },
	"empty.map": { en: "No places to show on the map yet." },
	"empty.orgchart": { en: "No organizational chart yet." },
	"empty.partners": { en: "No partners listed yet." },
	"empty.people": { en: "No team members listed yet." },
	"empty.posts": { en: "Nothing published here yet." },
	"empty.projects": { en: "No projects listed yet." },
	"empty.publications": { en: "No publications in this category yet." },
	"empty.resources": { en: "No resources published yet." },
	"empty.sitemap": { en: "No navigation published yet." },
	"empty.videos": { en: "No videos yet." },

	"hero.slide": { en: "Slide {n}" },

	"home.news.all": { en: "See all →", km: "មើលទាំងអស់ →" },
	"home.news.readmore": { en: "Read more →", km: "អានបន្ថែម →" },
	"home.video.all": { en: "All videos →", km: "វីដេអូទាំងអស់ →" },

	"jobs.apply": { en: "Apply" },
	"jobs.closed": { en: "Closed" },
	"jobs.closedOn": { en: "This closed on {date}." },
	"jobs.col.deadline": { en: "Deadline" },
	"jobs.col.location": { en: "Location" },
	"jobs.col.position": { en: "Position" },
	"jobs.view": { en: "View" },

	"pager.label": { en: "Pagination" },
	"pager.next": { en: "Next" },
	"pager.prev": { en: "Previous" },

	"partners.uncategorised": { en: "Partners" },

	"project.current": { en: "Current project" },
	"project.donors": { en: "Supported by" },
	"project.endDate": { en: "End date" },
	"project.notfound.body": { en: "This project doesn't exist or was moved." },
	"project.notfound.title": { en: "Project not found" },
	"project.openEnded": { en: "Open-ended" },
	"project.past": { en: "Past project" },
	"project.snapshots": { en: "Snapshots" },
	"project.startDate": { en: "Start date" },
	"project.targetAreas": { en: "Target areas" },

	"publications.download": { en: "Download", km: "ទាញយក" },
	"publications.downloadFile": { en: "Download {title}" },
	// Two keys, not a suffix built in JSX: Khmer cannot express `download` + `s`.
	"publications.downloads": { en: "{n} downloads" },
	"publications.downloadsOne": { en: "{n} download" },
	"publications.reads": { en: "{n} reads" },
	"publications.readsOne": { en: "{n} read" },

	"related.more": { en: "More from" },

	"resources.kindDefault": { en: "file" },
};
