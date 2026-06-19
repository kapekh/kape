import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, Grid, Card } from "@/components/SubPage";

export const Route = createFileRoute("/opportunities/partner")({
  head: () => ({
    meta: [
      { title: "Partner with KAPE" },
      { name: "description", content: "Become a strategic partner or donor for Cambodian education." },
    ],
  }),
  component: () => (
    <SubPage section="Opportunities" title="Partner with KAPE" lead="Co-create lasting impact for Cambodian children, teachers and communities." badge="Collaborate">
      <Section title="Ways to partner">
        <Grid cols={2}>
          <Card title="Strategic donors" accent>Multi-year funding for flagship programs like NGS, HCC and DEP.</Card>
          <Card title="Technical partners" accent>Joint research, curriculum development and teacher training.</Card>
          <Card title="Corporate partners" accent>CSR partnerships, in-kind support and employee engagement.</Card>
          <Card title="Implementation partners" accent>Local NGOs co-delivering interventions on the ground.</Card>
        </Grid>
      </Section>
      <Section title="Get in touch">
        <p>
          Email our partnership team at <a href="mailto:kape@kapekh.org" className="text-[var(--accent)] font-semibold hover:underline">kape@kapekh.org</a> to
          explore how we can create lasting impact together.
        </p>
      </Section>
    </SubPage>
  ),
});