import { createFileRoute } from "@tanstack/react-router";
import LeadsTable from "../admin-dashboard/page";

export const Route = createFileRoute("/admin-dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return <LeadsTable />;
}
