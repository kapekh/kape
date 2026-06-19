import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, MediaPlaceholder, Grid, Card } from "@/components/SubPage";

export const Route = createFileRoute("/media/life-skills")({
  head: () => ({
    meta: [
      { title: "Life Skills Education — KAPE" },
      { name: "description", content: "Resources and curricula on life skills education." },
    ],
  }),
  component: () => (
    <SubPage section="Media & Publications" title="Life Skills Education" lead="Curricula and toolkits to support adolescents' health, citizenship and livelihoods." badge="LLSE + LSLAG">
      <Section title="Themes">
        <Grid cols={3}>
          <Card title="Health & well-being" accent>Hygiene, nutrition, reproductive health.</Card>
          <Card title="Financial literacy" accent>Saving, budgeting, livelihood skills.</Card>
          <Card title="Digital citizenship" accent>Online safety, AI awareness, media literacy.</Card>
        </Grid>
      </Section>
      <Section title="Downloads">
        <div className="grid md:grid-cols-2 gap-3">
          {["LLSE Facilitator Guide", "LSLAG Adolescent Girls Curriculum", "Life Skills Posters Pack"].map((t) => (
            <MediaPlaceholder key={t} kind="pdf" title={t} />
          ))}
        </div>
      </Section>
    </SubPage>
  ),
});