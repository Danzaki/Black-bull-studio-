import { notFound } from "next/navigation";

// Dev-only pages (sample data). Hidden on production deployments.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <>{children}</>;
}
