import { customAlphabet } from "nanoid";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAppUrl } from "@/lib/env"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");

export function absoluteUrl(path: string) {
  return `${getAppUrl()}${path}`;
}