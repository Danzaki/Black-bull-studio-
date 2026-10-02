import { renderBrandIcon } from "@/lib/brandIcon";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  return renderBrandIcon(size === "512" ? 512 : 192);
}
