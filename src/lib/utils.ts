import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dedupe(arr: (string | number)[]) {
  return Array.from(new Set(arr));
}

export function dedupeBy<T>(arr: T[], key: keyof T) {
  return arr.reduce((acc, item) => {
    if (!acc.find((i) => i[key] === item[key])) {
      acc.push(item);
    }
    return acc;
  }, [] as T[]);
}

export function groupBy<T>(arr: T[], callback: (t: T) => string) {
  return arr.reduce(
    (acc, item) => {
      const key = callback(item);
      acc[key] ??= [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

export function once<A, B>(fn: (v: A) => B) {
  let called = false;
  return function (...args: A[]) {
    if (called) return;
    called = true;
    if (args.length === 1) {
      return fn.apply(window, args as [v: A]);
    }
    throw new Error("Wrong number of arguments");
  };
}
