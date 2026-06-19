import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, MediaPlaceholder, Grid, Card } from "@/components/SubPage";
import computerlab from "@/assets/computerlab.jpg.asset.json";

export const Route = createFileRoute("/media/ai-digital")({
  head: () => ({
    meta: [
      { title: "AI & Digital Education — KAPE" },
      { name: "description", content: "Resources on AI literacy and digital education in Cambodia." },
    ],
  }),
  component: () => (
    <SubPage section="Media & Publications" title="AI and Digital Education" lead="Tools, training and research for responsible AI integration in classrooms." heroImage={computerlab.url} badge="DEP · AIR ASEAN">
      <Section title="Focus areas">
        <Grid cols={3}>
          <Card title="AI literacy" accent>Foundational AI concepts for teachers and students.</Card>
          <Card title="Digital pedagogy" accent>Blending classroom and online learning.</Card>
          <Card title="Responsible use" accent>Ethics, privacy and safety in the AI era.</Card>
        </Grid>
      </Section>
      <Section title="Resources">
        <div className="grid md:grid-cols-2 gap-3">
          {["AI for Teachers — Starter Pack", "Digital Education Framework 2026", "Khmer AI Literacy Curriculum (Grade 7-9)"].map((t) => (
            <MediaPlaceholder key={t} kind="pdf" title={t} />
          ))}
        </div>
      </Section>
    </SubPage>
  ),
});