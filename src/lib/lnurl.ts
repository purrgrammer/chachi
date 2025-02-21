import { useQuery } from "@tanstack/react-query";
import {
  requestPayServiceParams,
  requestInvoiceWithServiceParams,
} from "lnurl-pay";

export type LNURLParams = any;

export function useLnurl(lnurl?: string) {
  return useQuery({
    enabled: Boolean(lnurl),
    queryKey: ["lnurl", lnurl],
    queryFn: () => fetchLnurl(lnurl!),
  });
}

export function fetchLnurl(url: string): Promise<LNURLParams> {
  return requestPayServiceParams({ lnUrlOrAddress: url });
}

export function fetchInvoice(
  params: LNURLParams,
  tokens: number,
  comment: string,
) {
  // @ts-expect-error: dafuq
  return requestInvoiceWithServiceParams({ params, tokens, comment }).then(
    (r) => r.invoice,
  );
}
