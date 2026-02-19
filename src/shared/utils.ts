import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes, resolving conflicts correctly.
 * Use instead of string concatenation whenever combining Tailwind classes.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
