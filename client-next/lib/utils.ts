import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Headline to show for an item: the Chinese title when the backend wrote one
 * that passed its source check, else the original title.
 */
export function displayTitle(item: { title: string; titleZh?: string | null }): string {
  return item.titleZh?.trim() || item.title;
}
