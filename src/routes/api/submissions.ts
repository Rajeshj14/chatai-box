import { createFileRoute } from "@tanstack/react-router";
import { createLead } from "../../lib/leads";

export const Route = createFileRoute("/api/submissions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json();

        try {
          const lead = await createLead(payload);
          return Response.json({
            success: true,
            databaseSaved: true,
            leadId: lead.id,
          });
        } catch (error) {
          console.error("Database save failed:", error);
          return Response.json(
            {
              success: false,
              databaseSaved: false,
              error: error instanceof Error ? error.message : "Failed to save submission",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
