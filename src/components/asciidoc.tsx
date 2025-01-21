import { useMemo } from "react";
import asciidoctor from "@asciidoctor/core";
import {
  prepareDocument,
  Asciidoc as BaseAsciidoc,
} from "@oxide/react-asciidoc";

const asciidocOptions = {
  sectlinks: "true",
  icons: "font",
  stem: "latexmath",
  stylesheet: false,
};
const ad = asciidoctor();

export default function Asciidoc({ content }: { content: string }) {
  const doc = useMemo(
    () =>
      ad.load(content, {
        standalone: true,
        attributes: asciidocOptions,
      }),
    [content],
  );
  return (
    <div className="asciidoc">
      {" "}
      <BaseAsciidoc document={prepareDocument(doc)} />
    </div>
  );
}
