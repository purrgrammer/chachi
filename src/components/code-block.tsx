import { CopyIcon, CheckIcon } from "lucide-react";
import { cn, getPrismLanguage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { useTheme } from "@/components/theme-provider";

// Create a type for supported languages
type SupportedLanguage =
  | "abap"
  | "abnf"
  | "actionscript"
  | "ada"
  | "agda"
  | "al"
  | "antlr4"
  | "apacheconf"
  | "apex"
  | "apl"
  | "applescript"
  | "aql"
  | "arduino"
  | "arff"
  | "asciidoc"
  | "asm6502"
  | "asmatmel"
  | "aspnet"
  | "autohotkey"
  | "autoit"
  | "bash"
  | "basic"
  | "batch"
  | "bbcode"
  | "birb"
  | "bison"
  | "bnf"
  | "brainfuck"
  | "brightscript"
  | "bro"
  | "bsl"
  | "c"
  | "cil"
  | "clike"
  | "clojure"
  | "cmake"
  | "coffeescript"
  | "concurnas"
  | "coq"
  | "cpp"
  | "crystal"
  | "csharp"
  | "cshtml"
  | "csp"
  | "css"
  | "css-extras"
  | "csv"
  | "cypher"
  | "d"
  | "dart"
  | "dataweave"
  | "dax"
  | "dhall"
  | "diff"
  | "django"
  | "dns-zone-file"
  | "docker"
  | "dot"
  | "ebnf"
  | "editorconfig"
  | "eiffel"
  | "ejs"
  | "elixir"
  | "elm"
  | "erb"
  | "erlang"
  | "etlua"
  | "excel-formula"
  | "factor"
  | "false"
  | "firestore-security-rules"
  | "flow"
  | "fortran"
  | "fsharp"
  | "ftl"
  | "gcode"
  | "gdscript"
  | "gedcom"
  | "gherkin"
  | "git"
  | "glsl"
  | "gml"
  | "go"
  | "graphql"
  | "groovy"
  | "haml"
  | "handlebars"
  | "haskell"
  | "haxe"
  | "hcl"
  | "hlsl"
  | "hoon"
  | "hpkp"
  | "hsts"
  | "http"
  | "ichigojam"
  | "icon"
  | "icu-message-format"
  | "idris"
  | "iecst"
  | "ignore"
  | "inform7"
  | "ini"
  | "io"
  | "j"
  | "java"
  | "javadoc"
  | "javadoclike"
  | "javascript"
  | "javastacktrace"
  | "jexl"
  | "jolie"
  | "jq"
  | "jsdoc"
  | "js-extras"
  | "json"
  | "json5"
  | "jsonp"
  | "jsstacktrace"
  | "js-templates"
  | "jsx"
  | "julia"
  | "keyman"
  | "kotlin"
  | "kumir"
  | "latex"
  | "latte"
  | "less"
  | "lilypond"
  | "liquid"
  | "lisp"
  | "livescript"
  | "llvm"
  | "log"
  | "lolcode"
  | "lua"
  | "makefile"
  | "markdown"
  | "markup"
  | "markup-templating"
  | "matlab"
  | "mel"
  | "mermaid"
  | "mizar"
  | "mongodb"
  | "monkey"
  | "moonscript"
  | "n1ql"
  | "n4js"
  | "nand2tetris-hdl"
  | "naniscript"
  | "nasm"
  | "neon"
  | "nevod"
  | "nginx"
  | "nim"
  | "nix"
  | "nsis"
  | "objectivec"
  | "ocaml"
  | "opencl"
  | "openqasm"
  | "oz"
  | "parigp"
  | "parser"
  | "pascal"
  | "pascaligo"
  | "pcaxis"
  | "peoplecode"
  | "perl"
  | "php"
  | "phpdoc"
  | "php-extras"
  | "plsql"
  | "powerquery"
  | "powershell"
  | "processing"
  | "prolog"
  | "promql"
  | "properties"
  | "protobuf"
  | "psl"
  | "pug"
  | "puppet"
  | "pure"
  | "purebasic"
  | "purescript"
  | "python"
  | "q"
  | "qml"
  | "qore"
  | "qsharp"
  | "r"
  | "racket"
  | "reason"
  | "regex"
  | "rego"
  | "renpy"
  | "rest"
  | "rip"
  | "roboconf"
  | "robotframework"
  | "ruby"
  | "rust"
  | "sas"
  | "sass"
  | "scala"
  | "scheme"
  | "scss"
  | "shell-session"
  | "smali"
  | "smalltalk"
  | "smarty"
  | "sml"
  | "solidity"
  | "solution-file"
  | "soy"
  | "sparql"
  | "splunk-spl"
  | "sqf"
  | "sql"
  | "squirrel"
  | "stan"
  | "stylus"
  | "swift"
  | "t4-cs"
  | "t4-templating"
  | "t4-vb"
  | "tap"
  | "tcl"
  | "textile"
  | "toml"
  | "tremor"
  | "tsx"
  | "tt2"
  | "turtle"
  | "twig"
  | "typescript"
  | "typoscript"
  | "unrealscript"
  | "uri"
  | "v"
  | "vala"
  | "vbnet"
  | "velocity"
  | "verilog"
  | "vhdl"
  | "vim"
  | "visual-basic"
  | "warpscript"
  | "wasm"
  | "web-idl"
  | "wiki"
  | "wolfram"
  | "wren"
  | "xeora"
  | "xml-doc"
  | "xojo"
  | "xquery"
  | "yaml"
  | "yang"
  | "zig"
  | "text"; // Fallback

// Create monochrome themes for light and dark modes
const monochromeThemeLight: PrismTheme = {
  plain: {
    color: "hsl(var(--foreground))",
    backgroundColor: "hsl(var(--background))",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["string", "attr-value"],
      style: { color: "hsl(var(--primary))" },
    },
    {
      types: ["number"],
      style: { color: "hsl(var(--primary))" },
    },
    {
      types: ["punctuation", "operator"],
      style: { color: "#4d4d4d" },
    },
    {
      types: ["entity", "symbol"],
      style: { color: "hsl(var(--primary))" },
    },
    {
      types: ["url", "boolean", "variable", "constant", "regex", "inserted"],
      style: { color: "hsl(var(--muted-foreground))" },
    },
    {
      types: ["atrule", "keyword", "attr-name", "selector"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["function", "deleted", "tag"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["function-variable"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["tag", "selector", "keyword", "null"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["property"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
  ],
};

const monochromeThemeDark: PrismTheme = {
  plain: {
    color: "hsl(var(--foreground))",
    backgroundColor: "hsl(var(--background))",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "hsl(var(--muted-foreground))", fontStyle: "italic" },
    },
    {
      types: ["namespace"],
      style: { opacity: 0.7 },
    },
    {
      types: ["string", "attr-value"],
      style: { color: "hsl(var(--muted-foreground))" },
    },
    {
      types: ["number"],
      style: { color: "hsl(var(--muted-foreground))" },
    },
    {
      types: ["punctuation", "operator"],
      style: { color: "hsl(var(--muted-foreground))" },
    },
    {
      types: ["entity", "symbol"],
      style: { color: "hsl(var(--foreground))" },
    },
    {
      types: ["url", "boolean", "variable", "constant", "regex", "inserted"],
      style: { color: "hsl(var(--muted-foreground))" },
    },
    {
      types: ["atrule", "keyword", "attr-name", "selector"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["function", "deleted", "tag"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["function-variable"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["tag", "selector", "keyword", "null"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
    },
    {
      types: ["property"],
      style: { color: "hsl(var(--foreground))", fontWeight: "bold" },
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
  className?: string;
}) {
  const [copied, copy] = useCopy();
  const { theme: resolvedTheme } = useTheme();

  const mappedLanguage = getPrismLanguage(language);
  const theme =
    resolvedTheme === "dark" ? monochromeThemeDark : monochromeThemeLight;
  const codeToDisplay = (code || "").trim();

  return (
    <div
      className={cn(
        "rounded relative overflow-hidden my-2 text-xs min-w-32",
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
            style={{ ...style }}
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
