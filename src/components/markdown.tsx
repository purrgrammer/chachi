import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { RichText } from "@/components/rich-text";
import { Group } from "@/lib/types";

// todo: nostr embeds
// todo: <cite> element

export function Markdown({
  children,
  tags,
  group,
  className,
}: {
  children: string;
  group: Group;
  tags?: string[][];
  className?: string;
}) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm]}
      className={className}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-semibold mb-3">{children}</h1>
        ),
        h2: ({ children }) => (
          <h1 className="text-lg font-semibold mb-3">{children}</h1>
        ),
        h3: ({ children }) => (
          <h1 className="text-md font-semibold mb-3">{children}</h1>
        ),
        h4: ({ children }) => (
          <h1 className="text-sm font-semibold mb-3">{children}</h1>
        ),
        h5: ({ children }) => (
          <h1 className="text-xs font-semibold mb-3">{children}</h1>
        ),
        h6: ({ children }) => (
          <h1 className="text-xs font-semibold mb-3">{children}</h1>
        ),
        p: ({ children }) => (
          // todo: split blocks into multiple paragraphs
          <p className="font-serif text-md my-4 first:mt-0 leading-normal break-words">
            {typeof children === "string" ? (
              <RichText group={group} tags={tags} options={{ inline: true }}>
                {children}
              </RichText>
            ) : (
              children
            )}
          </p>
        ),
        pre: ({ children }) => (
          <pre className="text-xs font-mono overflow-y-auto pretty-scrollbar">
            {children}
          </pre>
        ),
        code: ({ children }) => (
          <code className="font-mono overflow-y-auto pretty-scrollbar">
            {children}
          </code>
        ),
        a: ({ children, href, ...props }) => {
          const isInternal = href?.startsWith("#");
          return isInternal ? (
            <a {...props} href={href} className="underline cursor-pointer">
              {children}
            </a>
          ) : (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline cursor-pointer"
            >
              {children}
            </a>
          );
        },
        img: ({ src }) => (
          <img
            src={src}
            className="w-full object-cover aspect-auto rounded-sm max-h-[420px]"
          />
        ),
        ul: ({ children }) => (
          <ul className="list-disc ml-8 mb-3">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal ml-8 mb-3">{children}</ol>
        ),
        li: ({ children, ...props }) => (
          <li {...props} className="font-serif my-2">
            {children}
          </li>
        ),
        // todo: margin/font of child paragraphs
        // todo: cite
        // todo: bottom notes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-accent p-2 my-3">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-muted my-6" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
