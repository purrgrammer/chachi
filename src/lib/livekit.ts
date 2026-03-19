import { useQuery } from "@tanstack/react-query";
import { getEventHash, EventTemplate } from "nostr-tools";
import { useNDK } from "@/lib/ndk";
import { useAccount } from "@/lib/account";
import { HTTPAuth } from "@/lib/nostr/kinds";
import type { Group } from "@/lib/types";

function relayToHttpUrl(relayUrl: string): string {
  return relayUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://").replace(/\/$/, "");
}

export async function checkRelayLivekitSupport(
  relayUrl: string,
): Promise<boolean> {
  try {
    const baseUrl = relayToHttpUrl(relayUrl);
    const res = await fetch(`${baseUrl}/.well-known/nip29/livekit`, {
      method: "GET",
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

interface LivekitTokenResponse {
  token: string;
  url: string;
}

async function fetchLivekitToken(
  relayUrl: string,
  groupId: string,
  signer: { sign: (event: { kind: number; content: string; tags: string[][]; created_at: number; pubkey: string }) => Promise<string> },
  pubkey: string,
): Promise<LivekitTokenResponse> {
  const baseUrl = relayToHttpUrl(relayUrl);
  const endpointUrl = `${baseUrl}/.well-known/nip29/livekit/${groupId}`;

  const draft: EventTemplate = {
    kind: HTTPAuth,
    content: "",
    tags: [
      ["u", endpointUrl],
      ["method", "GET"],
    ],
    created_at: Math.floor(Date.now() / 1000),
  };

  const event = { ...draft, pubkey };
  const sig = await signer.sign(event);
  const signedEvent = { ...event, sig, id: getEventHash(event) };
  const encodedEvent = btoa(JSON.stringify(signedEvent));

  const res = await fetch(endpointUrl, {
    method: "GET",
    headers: {
      Authorization: `Nostr ${encodedEvent}`,
    },
  });

  if (!res.ok) {
    throw new Error(`LiveKit token request failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    token: data.participant_token ?? data.token,
    url: data.server_url ?? data.url,
  };
}

export function useLivekitToken(group: Group, enabled: boolean = true) {
  const ndk = useNDK();
  const account = useAccount();
  const pubkey = account?.pubkey;

  return useQuery({
    queryKey: ["livekit-token", group.relay, group.id],
    queryFn: async () => {
      if (!pubkey || !ndk.signer) throw new Error("Not logged in");
      return fetchLivekitToken(group.relay, group.id, ndk.signer, pubkey);
    },
    enabled: enabled && !!pubkey && !!ndk.signer,
    staleTime: 4 * 60 * 1000,
    retry: 1,
  });
}
