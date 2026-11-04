import { notFound } from "next/navigation";
import DevUiPreview from "@/components/ui/DevUiPreview";

export const dynamic = "force-dynamic";

export default function DevUiPage() {
  // Hidden on the production domain; visible on Vercel previews and locally.
  if (process.env.VERCEL_ENV === "production") notFound();
  return <DevUiPreview />;
}
