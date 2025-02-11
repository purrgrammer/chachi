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
