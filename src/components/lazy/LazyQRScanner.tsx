import { lazy, Suspense } from "react";
import { Loading } from "@/components/loading";

const QRScanner = lazy(() => 
  import("@/components/qr-scanner").then(module => ({
    default: module.QRScanner
  }))
);

interface LazyQRScannerProps {
  onScan: (result: string) => void;
}

export function LazyQRScanner(props: LazyQRScannerProps) {
  return (
    <Suspense fallback={<Loading />}>
      <QRScanner {...props} />
    </Suspense>
  );
}