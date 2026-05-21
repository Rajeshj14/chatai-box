import { createFileRoute } from "@tanstack/react-router";
import { createLead, listLeads } from "../../lib/leads";

export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      GET: async () => {
        const leads = await listLeads();
        return Response.json({
          success: true,
          leads,
          pagination: {
            page: 1,
            limit: 100,
            total: leads.length,
            totalPages: 1,
          },
        });
      },
      POST: async ({ request }) => {
        try {
          const lead = await createLead(await request.json());
          return Response.json({ success: true, leadId: lead.id, databaseSaved: true });
        } catch (error) {
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Failed to save lead",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
