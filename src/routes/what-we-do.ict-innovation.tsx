import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, Grid, Card } from "@/components/SubPage";
import computerlab from "@/assets/computerlab.jpg.asset.json";

export const Route = createFileRoute("/what-we-do/ict-innovation")({
  head: () => ({
    meta: [
      { title: "ICT Innovation — KAPE" },
      { name: "description", content: "ICT labs, digital literacy and AI training across KAPE's network of schools." },
    ],
  }),
  component: () => (
    <SubPage section="What We Do" title="ICT Innovation" lead="From the first computer labs to AI literacy — bringing 21st-century skills into every classroom." heroImage={computerlab.url} badge="Digital + AI">
      <Section title="Our digital pillars">
        <Grid cols={2}>
          <Card title="ICT labs in every NGS" accent>Dedicated spaces where students learn coding, digital research and online safety.</Card>
          <Card title="Teacher digital literacy" accent>Hands-on training in modern teaching tools, productivity software and online pedagogy.</Card>
          <Card title="AI literacy" accent>Workshops introducing teachers and students to responsible AI use in education.</Card>
          <Card title="Online safety" accent>Helping students protect their accounts and recognize digital risks.</Card>
        </Grid>
      </Section>
    </SubPage>
  ),
});