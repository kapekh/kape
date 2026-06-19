import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, Grid, Card } from "@/components/SubPage";

export const Route = createFileRoute("/opportunities/volunteer")({
  head: () => ({
    meta: [
      { title: "Volunteer with KAPE" },
      { name: "description", content: "Volunteer with KAPE — locally or remotely." },
    ],
  }),
  component: () => (
    <SubPage section="Opportunities" title="Volunteer with KAPE" lead="Give your time and skills to Cambodian education — on the ground or remotely." badge="Make time count">
      <Section title="Volunteer roles">
        <Grid cols={2}>
          <Card title="Field volunteer" accent>Spend a season working alongside teachers in NGS or HCC partner schools.</Card>
          <Card title="Reading coach" accent>Help us run library and read-aloud sessions in primary schools.</Card>
          <Card title="Digital mentor" accent>Coach students and teachers on digital literacy — onsite or online.</Card>
          <Card title="Translation & content" accent>Translate stories and reports between Khmer and English from anywhere.</Card>
        </Grid>
      </Section>
      <Section title="Express interest">
        <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => e.preventDefault()}>
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Full name" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" placeholder="Email" />
          <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm sm:col-span-2" placeholder="Skills or interests" />
          <button className="rounded-xl bg-[var(--accent)] text-accent-foreground px-5 py-3 text-sm font-semibold sm:col-span-2">Send</button>
        </form>
      </Section>
    </SubPage>
  ),
});