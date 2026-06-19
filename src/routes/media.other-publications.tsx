import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, MediaPlaceholder } from "@/components/SubPage";

export const Route = createFileRoute("/media/other-publications")({
  head: () => ({
    meta: [
      { title: "Other Publications — KAPE" },
      { name: "description", content: "Manuals, toolkits and other publications from KAPE." },
    ],
  }),
  component: () => (
    <SubPage section="Media & Publications" title="Other Publications" lead="Manuals, toolkits, posters and supplementary materials." badge="Library">
      <Section title="Recently published">
        <div className="grid md:grid-cols-2 gap-3">
          {["Teacher Mentoring Manual", "School Director Handbook", "Parent Engagement Toolkit", "Khmer Reading Posters", "Child Protection Guide", "STEM Lab Setup Guide"].map((t) => (
            <MediaPlaceholder key={t} kind="pdf" title={t} />
          ))}
        </div>
      </Section>
    </SubPage>
  ),
});