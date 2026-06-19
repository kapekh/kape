import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, Grid, Card } from "@/components/SubPage";
import students from "@/assets/students.jpg.asset.json";

export const Route = createFileRoute("/opportunities/scholarship")({
  head: () => ({
    meta: [
      { title: "Scholarship Program — KAPE" },
      { name: "description", content: "KAPE Scholarship Program — empowering the future of Cambodian children." },
    ],
  }),
  component: () => (
    <SubPage section="Opportunities" title="Scholarship Program" lead="Empowering the future of Cambodian children through merit and need-based scholarships." heroImage={students.url} badge="Apply now">
      <Section title="What's covered">
        <Grid cols={3}>
          <Card title="School fees" accent>Full tuition for primary, lower-secondary and upper-secondary years.</Card>
          <Card title="Learning materials" accent>Books, uniforms, stationery and digital devices where needed.</Card>
          <Card title="Mentorship" accent>One-to-one mentor and quarterly check-ins.</Card>
        </Grid>
      </Section>
      <Section title="Eligibility">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Currently enrolled in a KAPE-partner school.</li>
          <li>From a vulnerable or low-income household.</li>
          <li>Demonstrated commitment to learning.</li>
        </ul>
      </Section>
      <Section title="Online registration">
        <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => e.preventDefault()}>
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Student full name" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="School" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Grade" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Guardian phone" />
          <textarea className="rounded-xl border border-border bg-background px-4 py-3 text-sm sm:col-span-2" rows={3} placeholder="Tell us briefly why you are applying" />
          <button className="rounded-xl bg-[var(--accent)] text-accent-foreground px-5 py-3 text-sm font-semibold sm:col-span-2">Submit application</button>
        </form>
      </Section>
    </SubPage>
  ),
});