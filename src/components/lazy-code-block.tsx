import React, { Suspense } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

const CodeBlock = React.lazy(() =>
  import("./code-block").then((module) => ({
    default: module.CodeBlock,
  })),
);

function CodeBlockSkeleton() {
  return (
    <div className="rounded relative overflow-hidden my-2 border border-border/20 p-4 animate-pulse">
      <div className="h-4 bg-muted-foreground/20 rounded w-1/4 mb-2"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted-foreground/10 rounded"></div>
        <div className="h-3 bg-muted-foreground/10 rounded w-5/6"></div>
        <div className="h-3 bg-muted-foreground/10 rounded w-4/6"></div>
      </div>
    </div>
  );
}

export function LazyCodeBlock({ code, language, className }: CodeBlockProps) {
  return (
    <Suspense fallback={<CodeBlockSkeleton />}>
      <CodeBlock code={code} language={language} className={className} />
    </Suspense>
  );
}

export default LazyCodeBlock;
