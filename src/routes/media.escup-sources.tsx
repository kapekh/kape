import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, MediaPlaceholder } from "@/components/SubPage";

export const Route = createFileRoute("/media/escup-sources")({
  head: () => ({
    meta: [
      { title: "ESCUP Sources — KAPE" },
      { name: "description", content: "Archive of materials from the ESCUP (Educational Support to Children of Underserved Populations) project." },
    ],
  }),
  component: () => (
    <SubPage section="Media & Publications" title="ESCUP Sources" lead="Archive of curricula, training materials and reports from the ESCUP project." badge="Archive">
      <Section title="ESCUP archive">
        <div className="grid md:grid-cols-2 gap-3">
          {["ESCUP Final Evaluation Report", "ESCUP Teacher Training Modules", "ESCUP Curriculum Pack", "ESCUP Lessons Learned"].map((t) => (
            <MediaPlaceholder key={t} kind="pdf" title={t} meta="Legacy project" />
          ))}
        </div>
      </Section>
    </SubPage>
  ),
});