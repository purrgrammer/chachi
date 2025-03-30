import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { Image } from "@/components/image";
import { Video } from "@/components/video";
import { Audio } from "@/components/audio";
import { useState, useEffect } from "react";
import { ImageOff, Loader2 } from "lucide-react";

export default function EncryptedFile({ event, className }: { event: NostrEvent, className?: string }) {
  const { t } = useTranslation();
  const fileType = event.tags.find((t) => t[0] === "file-type")?.[1];
  const encryptionAlgorithm = event.tags.find(
    (t) => t[0] === "encryption-algorithm"
  )?.[1];
  const decryptionKey = event.tags.find((t) => t[0] === "decryption-key")?.[1];
  const decryptionNonce = event.tags.find(
    (t) => t[0] === "decryption-nonce"
  )?.[1];
  const url = event.content;

  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function decryptFile() {
      if (!url || !fileType || !encryptionAlgorithm || !decryptionKey || !decryptionNonce) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch the encrypted file
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch encrypted file: ${response.statusText}`);
        }
        
        // Get encrypted data as ArrayBuffer
        const encryptedData = await response.arrayBuffer();
        
        // Decrypt the data
        let decryptedData: ArrayBuffer;
        
        const algorithm = encryptionAlgorithm.toLowerCase();
        if (algorithm === "aes-256-gcm" || algorithm === "aes-gcm") {
          decryptedData = await decryptAESGCM(encryptedData, decryptionKey, decryptionNonce);
        } else {
          throw new Error(`Unsupported encryption algorithm: ${encryptionAlgorithm}`);
        }

        // Create a blob URL from the decrypted data
        const blob = new Blob([decryptedData], { type: fileType });
        const blobUrl = URL.createObjectURL(blob);
        setDecryptedUrl(blobUrl);
      } catch (err) {
        console.error("Error decrypting file:", err);
        setError(err instanceof Error ? err.message : "Unknown error decrypting file");
      } finally {
        setLoading(false);
      }
    }
    
    decryptFile();
    
    // Clean up the blob URL on unmount
    return () => {
      if (decryptedUrl) {
        URL.revokeObjectURL(decryptedUrl);
      }
    };
  }, [url, fileType, encryptionAlgorithm, decryptionKey, decryptionNonce]);

  // Helper function for AES-GCM decryption using Web Crypto API
  async function decryptAESGCM(
    encryptedData: ArrayBuffer,
    keyHex: string,
    nonceHex: string
  ): Promise<ArrayBuffer> {
    try {
      const keyBytes = hexToUint8Array(keyHex);
      const iv = prepareIV(nonceHex ? hexToUint8Array(nonceHex) : undefined);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      return await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv
        },
        cryptoKey,
        encryptedData
      );
    } catch (error) {
      console.error("AES-GCM decryption failed:", error);
      throw new Error(`AES-GCM decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function prepareIV(nonce?: Uint8Array): Uint8Array {
    if (!nonce) {
      return new Uint8Array(16);
    }
    const iv = new Uint8Array(16);
    iv.set(nonce.subarray(0, 16));
    return iv;
  }
  
  // Helper function to convert Hex to Uint8Array
  function hexToUint8Array(hex: string): Uint8Array {
    // Remove '0x' prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    
    // Ensure even length
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;
    
    // Convert hex to bytes
    const bytes = new Uint8Array(paddedHex.length / 2);
    for (let i = 0; i < paddedHex.length; i += 2) {
      bytes[i / 2] = parseInt(paddedHex.substring(i, i + 2), 16);
    }
    
    return bytes;
  }

  if (!url) return null;
  if (!fileType || !encryptionAlgorithm || !decryptionKey || !decryptionNonce) {
    return (
      <span className="text-muted-foreground">
        {t("encrypted-file.missing-metadata")}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1 p-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("encrypted-file.decrypting")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1 p-2">
        <ImageOff className="h-4 w-4 text-red-500 dark:text-red-300" />
        <span className="text-sm text-muted-foreground">{t("encrypted-file.error")}: {error}</span>
      </div>
    );
  }

  if (!decryptedUrl) {
    return null;
  }

  // Render the appropriate element based on file type
  if (fileType && fileType.startsWith("image/")) {
    return (
      <Image
        className={className}
        url={decryptedUrl} 
      />
    );
  } else if (fileType && fileType.startsWith("video/")) {
    return (
      <Video
        className={className}
        url={decryptedUrl} 
      />
    );
  } else if (fileType && fileType.startsWith("audio/")) {
    return (
      <Audio
        className={className}
        url={decryptedUrl} 
      />
    );
  }

  // For other file types, show a download link
  return (
    <div className="p-2 border rounded-md">
      <p className="text-sm text-muted-foreground mb-2">{t("encrypted-file.unknown-type")}</p>
      <a 
        href={decryptedUrl} 
        download={fileType ? `file.${fileType.split('/')[1]}` : 'file'}
        className="text-primary underline"
      >
        {t("encrypted-file.download")}
      </a>
    </div>
  );
}
