import type { ReactNode } from "react";
import { useMemo } from "react";

export function Highlight({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) {
  const parts = useMemo(() => {
    let result: ReactNode[] = [];
    if (!highlight || !text) {
      return [text];
    }

    const termRegex = new RegExp(
      highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "ig",
    );
    const matches = text.match(termRegex);

    if (highlight && matches) {
      const { indexes } = (matches || []).reduce(
        (acc, m) => {
          const { last, indexes } = acc;
          const newIndex = text.indexOf(m, last + 1) ?? 0;
          return {
            last: newIndex,
            indexes: indexes.concat([newIndex]),
          };
        },
        { last: -1, indexes: [] } as { last: number; indexes: number[] },
      );

      result = indexes.reduce((acc: ReactNode[], i: number, idx: number) => {
        const lastI = indexes[idx - 1] ?? -1;
        const prefix = text.slice(lastI + highlight.length, i);
        if (idx !== 0) {
          acc.push(prefix);
        } else if (i > 0) {
          acc.push(text.slice(0, i));
        }

        const term = text.slice(i, i + highlight.length);
        acc.push(
          <mark key={idx} className="bg-primary text-primary-foreground">
            {term}
          </mark>,
        );

        if (idx === indexes.length - 1) {
          acc.push(text.slice(i + highlight.length));
        }

        return acc;
      }, [] as ReactNode[]);
    } else {
      result = [text];
    }
    return result;
  }, [text, highlight]);

  return parts;
}
