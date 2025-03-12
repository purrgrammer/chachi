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

// Map common language names to Prism language identifiers
export function getPrismLanguage(language: string | undefined): string {
  if (!language) return "text";

  // Lowercase the language name for case-insensitive matching
  const lang = language.toLowerCase();

  const languageMap: Record<string, string> = {
    // Common languages
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    jsx: "jsx",
    tsx: "tsx",
    md: "markdown",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    bash: "bash",
    sh: "bash",
    shell: "bash",
    sql: "sql",
    graphql: "graphql",
    swift: "swift",
    kt: "kotlin",
    kotlin: "kotlin",
    dart: "dart",
    clj: "clojure",
    clojure: "clojure",
    elm: "elm",
    elixir: "elixir",
    ex: "elixir",
    erlang: "erlang",
    erl: "erlang",
    haskell: "haskell",
    hs: "haskell",
  };

  // Check if the language is supported in our map
  const mappedLang = languageMap[lang] || lang;

  // List of supported languages in prism-react-renderer (basic set)
  const supportedLanguages = [
    "bash",
    "css",
    "diff",
    "go",
    "graphql",
    "handlebars",
    "javascript",
    "js",
    "jsx",
    "markup",
    "html",
    "markdown",
    "md",
    "python",
    "scss",
    "sql",
    "tsx",
    "typescript",
    "ts",
    "text",
    "json",
    "yaml",
    "yml",
  ];

  // Return the mapped language if supported, otherwise return 'text'
  return supportedLanguages.includes(mappedLang) ? mappedLang : "text";
}
