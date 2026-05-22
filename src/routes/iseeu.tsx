import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/iseeu")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      replace: true,
    });
  },
});
