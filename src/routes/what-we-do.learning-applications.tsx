import { createFileRoute } from "@tanstack/react-router";
import { SubPage, Section, Grid, Card } from "@/components/SubPage";

export const Route = createFileRoute("/what-we-do/learning-applications")({
  head: () => ({
    meta: [
      { title: "Learning Applications — KAPE" },
      { name: "description", content: "Digital learning apps developed and deployed by KAPE for Cambodian learners." },
    ],
  }),
  component: () => (
    <SubPage section="What We Do" title="Learning Applications" lead="Mobile and web learning tools built for Cambodian teachers and students." badge="EdTech">
      <Section title="Application catalogue">
        <Grid cols={2}>
          <Card title="Early Grade Reading App" accent>Khmer literacy practice for Grade 1–3 learners with audio and self-quizzes.</Card>
          <Card title="STEM Practice Hub" accent>Interactive science and math exercises aligned with the MoEYS curriculum.</Card>
          <Card title="Teacher Mentor App" accent>Lesson plans, coaching videos and reflection prompts for novice teachers.</Card>
          <Card title="Life Skills Toolkit" accent>Activities covering health, finance and digital citizenship for adolescents.</Card>
        </Grid>
      </Section>
    </SubPage>
  ),
});