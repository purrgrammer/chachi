import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, ScanQrCode } from "lucide-react";

export function QRScanner({ onScan }: { onScan: (result: string) => void }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setError(null);
    }
    setIsOpen(open);
  }

  function onError(err: unknown) {
    console.error(err);
  }

  function onScanned(detectedCodes: { rawValue: string }[]) {
    for (const code of detectedCodes) {
      onScan(code.rawValue);
    }
    handleOpenChange(false);
    setIsLoading(false);
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button
          aria-label={t("qr.scan")}
          variant="outline"
          size="bigIcon"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <ScanQrCode />}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex items-center justify-center">
        <DrawerHeader>
          <DrawerTitle>
            <div className="flex flex-row items-center gap-2">
              <QrCode className="text-muted-foreground size-4" />

              <span>{t("qr.scan")}</span>
            </div>
          </DrawerTitle>
        </DrawerHeader>
        <div className="pb-4">
          {error ? (
            <span className="text-sm text-red-500">
              {error.message || t("qr.scan-error")}
            </span>
          ) : isOpen ? (
            <Scanner
              allowMultiple={false}
              styles={{ finderBorder: 0 }}
              classNames={{
                container: "qr-scanner",
              }}
              scanDelay={100}
              onError={onError}
              onScan={onScanned}
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
