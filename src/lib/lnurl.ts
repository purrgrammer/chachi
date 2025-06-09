import { URL } from "url";
import { bech32 } from "bech32";
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

// todo: improve this
export function isLnInvoice(s: string) {
  return s.startsWith("lightning:lnbc") || s.startsWith("lnbc");
}

// yoinked from lnurl-pay https://github.com/GaloyMoney/lnurl-pay

const LNURL_REGEX =
  /^(?:http.*[&?]lightning=|lightning:)?(lnurl[0-9]{1,}[02-9ac-hj-np-z]+)/;

const LN_ADDRESS_REGEX =
  /^((?:[^<>()\[\]\\.,;:\s@"]+(?:\.[^<>()\[\]\\.,;:\s@"]+)*)|(?:".+"))@((?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const ONION_REGEX = /^(http:\/\/[^/:@]+\.onion(?::\d{1,5})?)(\/.*)?$/;

/**
 * Decode a bech32 encoded url (lnurl) or lightning address and return a url
 * @method decodeUrlOrAddress
 * @param  lnUrlOrAddress string to decode
 * @return  plain url or null if is an invalid url or lightning address
 */
export const decodeUrlOrAddress = (lnUrlOrAddress: string): string | null => {
  const bech32Url = parseLnUrl(lnUrlOrAddress);
  if (bech32Url) {
    const decoded = bech32.decode(bech32Url, 20000);
    return Buffer.from(bech32.fromWords(decoded.words)).toString();
  }

  const address = parseLightningAddress(lnUrlOrAddress);
  if (address) {
    const { username, domain } = address;
    const protocol = domain.match(/\.onion$/) ? "http" : "https";
    return `${protocol}://${domain}/.well-known/lnurlp/${username}`;
  }

  return null;
};

/**
 * Parse an url and return a bech32 encoded url (lnurl)
 * @method parseLnUrl
 * @param  url string to parse
 * @return  bech32 encoded url (lnurl) or null if is an invalid url
 */
export const parseLnUrl = (url: string): string | null => {
  if (!url) return null;
  const result = LNURL_REGEX.exec(url.toLowerCase());
  return result ? result[1] : null;
};

/**
 * Verify if a string is a valid lnurl value
 * @method isLnurl
 * @param  url string to validate
 * @return  true if is a valid lnurl value
 */
export const isLnurl = (url: string): boolean => {
  if (!url) return false;
  return LNURL_REGEX.test(url.toLowerCase());
};

/**
 * Verify if a string is a lightning adress
 * @method isLightningAddress
 * @param  address string to validate
 * @return  true if is a lightning address
 */
export const isLightningAddress = (address: string): boolean => {
  if (!address) return false;
  return LN_ADDRESS_REGEX.test(address.toLowerCase());
};

type LightningAddress = { username: string; domain: string };

/**
 * Parse an address and return username and domain
 * @method parseLightningAddress
 * @param  address string to parse
 * @return  LightningAddress { username, domain }
 */
export const parseLightningAddress = (
  address: string,
): LightningAddress | null => {
  if (!address) return null;
  const result = LN_ADDRESS_REGEX.exec(address.toLowerCase());
  return result ? { username: result[1], domain: result[2] } : null;
};

/**
 * Verify if a string is an url
 * @method isUrl
 * @param  url string to validate
 * @return  true if is an url
 */
export const isUrl = (url: string | null): url is string => {
  if (!url) return false;
  try {
    return !!new URL(url);
  } catch {
    return false;
  }
};

/**
 * Verify if a string is an onion url
 * @method isOnionUrl
 * @param  url string to validate
 * @return  true if is an onion url
 */
export const isOnionUrl = (url: string | null): boolean => {
  return isUrl(url) && ONION_REGEX.test(url.toLowerCase());
};

/**
 * Parse a number to Satoshis
 * @method checkedToSats
 * @param  value number to parse
 * @return  Satoshis or null
 */
export const checkedToSats = (value: number): number | null => {
  if (value && value >= 0) return value;
  return null;
};

export const isValidAmount = ({
  amount,
  min,
  max,
}: {
  amount: number;
  min: number;
  max: number;
}): boolean => {
  const isValid = amount > 0 && amount >= min && amount <= max;
  const isFixed = min === max;
  return isValid && isFixed ? amount === min : isValid;
};
