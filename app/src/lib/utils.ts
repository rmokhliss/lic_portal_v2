// ==============================================================================
// LIC v2 — Helper cn() pour shadcn/ui (F-09)
//
// Combine clsx (compose className conditionnels) + tailwind-merge (résout les
// conflits Tailwind, ex: "p-2 p-4" → "p-4"). Pattern shadcn standard.
// ==============================================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
