import { lazy, Suspense } from "react";
import { Loading } from "@/components/loading";
import type { UploadedBlob } from "@/lib/media";

const UploadImage = lazy(() => 
  import("@/components/upload-image").then(module => ({
    default: module.UploadImage
  }))
);

const UploadVideo = lazy(() => 
  import("@/components/upload-video").then(module => ({
    default: module.UploadVideo
  }))
);

const UploadFile = lazy(() => 
  import("@/components/upload-file").then(module => ({
    default: module.UploadFile
  }))
);

interface LazyUploadImageProps {
  defaultImage?: string;
  onUpload: (url: UploadedBlob) => void;
}

interface LazyUploadVideoProps {
  onUpload: (url: UploadedBlob) => void;
}

interface LazyUploadFileProps {
  onUpload: (url: UploadedBlob) => void;
}

export function LazyUploadImage(props: LazyUploadImageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <UploadImage {...props} />
    </Suspense>
  );
}

export function LazyUploadVideo(props: LazyUploadVideoProps) {
  return (
    <Suspense fallback={<Loading />}>
      <UploadVideo {...props} />
    </Suspense>
  );
}

export function LazyUploadFile(props: LazyUploadFileProps) {
  return (
    <Suspense fallback={<Loading />}>
      <UploadFile {...props} />
    </Suspense>
  );
}