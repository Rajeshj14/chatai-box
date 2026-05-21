import { createFileRoute } from "@tanstack/react-router";
import { GrowMedicoConsultation } from "../components/GrowMedicoConsultation";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "Grow Medico — Consultation",
    meta: [
      {
        name: "description",
        content:
          "A private consultation with Grow Medico for personal branding, digital marketing, and growth.",
      },
      {
        property: "og:title",
        content: "Grow Medico — Consultation",
      },
      {
        property: "og:description",
        content:
          "A private consultation with Grow Medico for personal branding and digital growth.",
      },
    ],
  }),
});

function Index() {
  return <GrowMedicoConsultation />;
}
