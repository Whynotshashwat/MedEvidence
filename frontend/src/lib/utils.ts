import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + (d.endsWith("Z") ? "" : "Z")).toLocaleString();
}

export function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export function getInitials(firstName?: string, lastName?: string): string {
  const a = firstName || "?";
  const b = lastName || "?";
  return (a[0] + b[0]).toUpperCase();
}
