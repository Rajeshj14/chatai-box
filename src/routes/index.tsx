import { createFileRoute } from "@tanstack/react-router";
import { HakaConsultation } from "../components/HakaConsultation";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "HAKA.media — Premium Digital Strategy",
    meta: [
      {
        name: "description",
        content:
          "A private consultation with HAKA.media. Bespoke digital strategy, design, and development crafted for distinguished brands.",
      },
      {
        property: "og:title",
        content: "HAKA.media — Premium Digital Strategy",
      },
      {
        property: "og:description",
        content:
          "A private consultation with HAKA.media. Bespoke digital strategy for distinguished brands.",
      },
    ],
  }),
});

function Index() {
  return <HakaConsultation />;
}
