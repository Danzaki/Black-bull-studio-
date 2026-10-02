import { renderBrandIcon } from "@/lib/brandIcon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return renderBrandIcon(64);
}
