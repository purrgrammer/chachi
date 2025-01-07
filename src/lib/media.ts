import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { BlossomClient, BlobDescriptor } from "blossom-client-sdk";
import { getEventHash, EventTemplate } from "nostr-tools";
import { mediaServersAtom } from "@/app/store";
import { useAccount } from "@/lib/account";
import { useNDK } from "@/lib/ndk";

export interface Nip94 {
  url: string;
  m: string;
  x: string;
  dim?: string;
  size?: string;
}

export interface Imeta {
  url: string;
  x: string;
  width?: number;
  height?: number;
  blurhash?: string;
  type?: string;
  alt?: string;
  fallback?: string;
}

export function parseImeta(imeta: string[]): Imeta | null {
  const url = getImetaValue(imeta, "url");
  if (url) {
    return {
      url,
      width: parseInt(getImetaValue(imeta, "width")),
      height: parseInt(getImetaValue(imeta, "height")),
      blurhash: getImetaValue(imeta, "blurhash"),
      x: getImetaValue(imeta, "x"),
      type: getImetaValue(imeta, "m"),
      alt: getImetaValue(imeta, "alt"),
      // todo: more than one fallback
      fallback: getImetaValue(imeta, "fallback"),
    };
  }
  return null;
}

export function getImetaValue(imeta: string[], item: string): string {
  const value = imeta.find((t) => t.startsWith(item));
  return value ? value.split(" ")[1] : "";
}

export function blobToImeta(blob: UploadedBlob): string[] {
  return [
    "imeta",
    `url ${blob.url || blob.nip94?.url}`,
    `x ${blob.sha256 || blob.nip94?.x}`,
    `m ${blob.type || blob.nip94?.m}`,
    `size ${blob.size || blob.nip94?.size}`,
    ...(blob.nip94?.dim ? [`dim ${blob.nip94.dim}`] : []),
  ];
}

export function useMediaServers() {
  return useAtomValue(mediaServersAtom);
}

export interface UploadedBlob extends BlobDescriptor {
  extension: string;
  nip94?: Nip94;
}

export function useUpload() {
  const ndk = useNDK();
  const [mainServer] = useMediaServers();
  const account = useAccount();
  const pubkey = account?.pubkey;

  const signer = async (draft: EventTemplate) => {
    if (!pubkey) throw new Error("Not logged in");
    const event = { ...draft, pubkey };
    const sig = await ndk.signer!.sign(event);
    return { ...event, sig, id: getEventHash(event) };
  };

  const upload = async (file: File): Promise<UploadedBlob> => {
    const auth = await BlossomClient.getUploadAuth(
      file,
      signer,
      `Upload ${file.name}`,
    );
    const blob = await BlossomClient.uploadBlob(mainServer, file, auth);
    toast.success(`File uploaded to ${mainServer}`);
    const type = blob.type?.replace("quicktime", "mov") || "";
    const extension = type ? `${type.split("/")[1]}` : "";
    return { ...blob, type, extension };
  };

  return { upload, canSign: pubkey && !account.isReadOnly };
}
