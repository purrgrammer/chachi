import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useCopy(): [boolean, (text: string) => Promise<void>] {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("copy.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("copy.error"));
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);
  return [copied, copy];
}

export function useHost(url: string) {
  return useMemo(() => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }, [url]);
}

export function useFavicon(server: string) {
  const url = useMemo(() => {
    try {
      return new URL(server);
    } catch {
      return null;
    }
  }, [server]);
  const hostname = url?.hostname || "";
  const faviconUrl = useMemo(() => {
    const parts = hostname.split(".");
    const topLevelDomain =
      parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
    if (topLevelDomain) {
      return `https://${topLevelDomain}/favicon.ico`;
    }
    return null;
  }, [hostname]);
  return faviconUrl;
}
