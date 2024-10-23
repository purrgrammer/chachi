import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dedupeBy<T>(arr: T[], key: keyof T) {
  return arr.reduce((acc, item) => {
    if (!acc.find((i) => i[key] === item[key])) {
      acc.push(item);
    }
    return acc;
  }, [] as T[]);
}
