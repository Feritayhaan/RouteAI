import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge Tailwind class strings safely, avoiding duplicates/conflicts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
