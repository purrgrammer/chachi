import { CopyIcon, CheckIcon } from "lucide-react";
import { cn, getPrismLanguage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { useTheme } from "next-themes";

// Create a type for supported languages
type SupportedLanguage =
  | "javascript"
  | "jsx"
  | "typescript"
  | "tsx"
  | "css"
  | "html"
  | "json"
  | "markdown"
  | "python"
  | "bash"
  | "shell"
  | "text"
  | "json";

// Create monochrome themes for light and dark modes
const monochromeThemeLight: PrismTheme = {
  plain: {
    color: "#1a1a1a",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#636363", fontStyle: "italic" },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["string", "attr-value"],
      style: { color: "#404040" },
    },
    {
      types: ["punctuation", "operator"],
      style: { color: "#4d4d4d" },
    },
    {
      types: [
        "entity",
        "url",
        "symbol",
        "number",
        "boolean",
        "variable",
        "constant",
        "property",
        "regex",
        "inserted",
      ],
      style: { color: "#333333" },
    },
    {
      types: ["atrule", "keyword", "attr-name", "selector"],
      style: { color: "#000000", fontWeight: "bold" },
    },
    {
      types: ["function", "deleted", "tag"],
      style: { color: "#1a1a1a" },
    },
    {
      types: ["function-variable"],
      style: { color: "#000000", fontWeight: "bold" },
    },
    {
      types: ["tag", "selector", "keyword", "null"],
      style: { color: "#333333" },
    },
    {
      types: ["property"],
      style: { color: "#000000", fontWeight: "bold" },
    },
  ],
};

const monochromeThemeDark: PrismTheme = {
  plain: {
    color: "#e0e0e0",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#999999", fontStyle: "italic" },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["string", "attr-value"],
      style: { color: "#c7c7c7" },
    },
    {
      types: ["punctuation", "operator"],
      style: { color: "#b3b3b3" },
    },
    {
      types: [
        "entity",
        "url",
        "symbol",
        "number",
        "boolean",
        "variable",
        "constant",
        "property",
        "regex",
        "inserted",
      ],
      style: { color: "#d9d9d9" },
    },
    {
      types: ["atrule", "keyword", "attr-name", "selector"],
      style: { color: "#ffffff", fontWeight: "bold" },
    },
    {
      types: ["function", "deleted", "tag"],
      style: { color: "#e6e6e6" },
    },
    {
      types: ["function-variable"],
      style: { color: "#ffffff", fontWeight: "bold" },
    },
    {
      types: ["tag", "selector", "keyword", "null"],
      style: { color: "#d1d1d1" },
    },
    {
      types: ["property"],
      style: { color: "#ffffff", fontWeight: "bold" },
    },
  ],
};

export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className: string;
}) {
  const [copied, copy] = useCopy();
  const { resolvedTheme } = useTheme();

  // Map the provided language to a Prism-supported language and cast it
  const mappedLanguage = getPrismLanguage(language);

  // Choose monochrome theme based on the current color mode
  const theme =
    resolvedTheme === "dark" ? monochromeThemeDark : monochromeThemeLight;

  // Handle error cases - provide a fallback if code is undefined and trim both leading and trailing newlines
  const codeToDisplay = (code || "").trim();

  return (
    <div
      className={cn(
        "rounded relative overflow-hidden my-2 border",
        resolvedTheme === "dark" ? "border-border/30" : "border-border/20",
        "text-xs bg-background dark:bg-white",
        className,
      )}
    >
      {language ? (
        <Badge variant="language" className="absolute left-2 top-2 z-10">
          {language}
        </Badge>
      ) : null}
      <Button
        variant="ghost"
        size="smallIcon"
        className="absolute right-1 top-1 z-10"
        onClick={() => copy(codeToDisplay)}
        aria-label="Copy code to clipboard"
        title="Copy code to clipboard"
      >
        {copied ? (
          <CheckIcon className="text-green-500" />
        ) : (
          <CopyIcon className="text-muted-foreground" />
        )}
      </Button>

      <Highlight
        theme={theme}
        code={codeToDisplay}
        language={mappedLanguage as SupportedLanguage}
      >
        {({
          className: highlightClassName,
          style,
          tokens,
          getLineProps,
          getTokenProps,
        }) => (
          <pre
            className={cn(
              highlightClassName,
              "pt-9 pb-2 overflow-auto code-block-thin-scrollbar",
            )}
            style={{ ...style, background: "transparent" }}
            aria-label={`Code block${language ? ` in ${language}` : ""}`}
          >
            <code className="px-4 block">
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line, key: i });
                return (
                  <div key={i} {...lineProps}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
