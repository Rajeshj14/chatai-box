import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

/* ---------- 404 PAGE ---------- */
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- ROOT ROUTE ---------- */
export const Route = createRootRoute({
  head: () => ({
    title: "HAKA.media — Premium Digital Strategy",
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content:
          "Private consultation with HAKA.media. Bespoke digital strategy, design, and development.",
      },
      {
        property: "og:title",
        content: "HAKA.media — Premium Digital Strategy",
      },
      {
        property: "og:description",
        content: "Bespoke digital strategy, design, and development crafted for premium brands.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  /* IMPORTANT: No <html> or <body> here */
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

/* ---------- SHELL ---------- */
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeadContent />
      {children}
      <Scripts />
    </>
  );
}

/* ---------- MAIN OUTLET ---------- */
function RootComponent() {
  return <Outlet />;
}
