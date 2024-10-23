import { useAtomValue } from "jotai";
import { BlossomClient } from "blossom-client-sdk";
import { getEventHash, EventTemplate } from "nostr-tools";
import { mediaServersAtom } from "@/app/store";
import { useAccount } from "@/lib/account";
import { useNDK } from "@/lib/ndk";

export function useMediaServers() {
  return useAtomValue(mediaServersAtom);
}

export function useUpload() {
  const ndk = useNDK();
  const [mainServer, ...mirrorServers] = useMediaServers();
  const account = useAccount();
  const pubkey = account?.pubkey;

  const signer = async (draft: EventTemplate) => {
    if (!pubkey) throw new Error("Not logged in");
    const event = { ...draft, pubkey };
    const sig = await ndk.signer!.sign(event);
    return { ...event, sig, id: getEventHash(event) };
  };

  const upload = async (file: File): Promise<string> => {
    const auth = await BlossomClient.getUploadAuth(
      file,
      signer,
      `Upload ${file.name}`,
    );
    const blob = await BlossomClient.uploadBlob(mainServer, file, auth);
    try {
      for (const server of mirrorServers) {
        await BlossomClient.mirrorBlob(server, blob.url, auth);
      }
    } catch (err) {
      console.error(err);
    }
    const extension = (blob.type ? `${blob.type.split("/")[1]}` : "").replace(
      "quicktime",
      "mov",
    );
    return extension ? `${blob.url}.${extension}` : blob.url;
  };

  return { upload, canSign: pubkey && !account.isReadOnly };
}
