// Core React imports
import { useCallback, useState, useRef, useEffect } from "react";

// State management
import { atom, useAtom, useAtomValue } from "jotai";

// UI components
import {
  PhoneIncoming,
  PhoneOff,
  Phone,
  VideoIcon,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";
import { User } from "@/components/nostr/user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

// Nostr related
import { NostrEvent } from "nostr-tools";
import { NDKEvent, NDKRelaySet, NDKUser } from "@nostr-dev-kit/ndk";
import { usePubkey } from "@/lib/account";
import ndk, { useNDK } from "@/lib/ndk";
import { giftWrap } from "@/lib/nip-59";
import db from "@/lib/db";
import { fetchDirectMessageRelays } from "@/lib/nostr/dm";

// WebRTC types
type WebRTCSignalType =
  | "offer"
  | "candidate"
  | "answer"
  | "connect"
  | "disconnect";

interface WebRTCOffer {
  description: {
    sdp: string;
    type: "offer";
  };
  media: "audio " | "video";
  session_id: string;
}

interface Candidate {
  sdpMid: string;
  sdpMLineIndex: number;
  candidate: string;
}

interface WebRTCCandidate {
  candidate: Candidate;
  session_id: string;
}

// Constants
const WEBRTC_KIND = 25050;

// State atoms
const eventsAtom = atom<NostrEvent[]>([]);
const sessionAtom = atom<string | null>(null);
const offerAtom = atom<{
  id: string;
  pubkey: string;
  offer: WebRTCOffer;
} | null>(null);
const candidateAtom = atom<Candidate | null>(null);
const participantsAtom = atom<Record<string, "connected" | "disconnected">>({});
const peerConnectionAtom = atom<RTCPeerConnection | null>(null);
const localStreamAtom = atom<MediaStream | null>(null);
const remoteStreamAtom = atom<MediaStream | null>(null);

// For debugging
function logEvent(event: NostrEvent) {
  const type = event.tags.find((t) => t[0] === "type")?.[1];
  return `${type} ${event.id.slice(0, 8)}`;
}

// Basic WebRTC Video component using DOM methods directly
function VideoPlayer({
  stream,
  muted = false,
  controls = false,
  title,
  className = "",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  controls?: boolean;
  title?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoTracks, setHasVideoTracks] = useState(false);
  const [hasAudioTracks, setHasAudioTracks] = useState(false);

  // Set up video stream when component mounts or stream changes
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream) {
      setHasVideoTracks(false);
      setHasAudioTracks(false);
      return;
    }

    // Update track state
    setHasVideoTracks(stream.getVideoTracks().length > 0);
    setHasAudioTracks(stream.getAudioTracks().length > 0);

    console.log(
      `Setting up ${title} video element with tracks:`,
      stream.getTracks().map((t) => `${t.kind} (enabled: ${t.enabled})`),
    );

    // Unmute all tracks to make sure they're enabled
    stream.getTracks().forEach((track) => {
      track.enabled = true;
    });

    // Set stream to video element
    videoElement.srcObject = stream;
    videoElement.muted = muted;

    // Play the video
    const playPromise = videoElement.play();
    if (playPromise) {
      playPromise
        .then(() => {
          console.log(`${title} video started playing`);
        })
        .catch((err) => {
          console.error(`${title} video play failed:`, err);
          // Try enabling autoplay
          videoElement.setAttribute("autoplay", "true");
          videoElement.setAttribute("playsinline", "true");
        });
    }

    // Monitor play state
    const handleCanPlay = () => {
      console.log(`${title} video can play`);
      videoElement
        .play()
        .catch((e) => console.error("Play failed on canplay event:", e));
    };

    videoElement.addEventListener("canplay", handleCanPlay);

    // Cleanup
    return () => {
      videoElement.removeEventListener("canplay", handleCanPlay);
      videoElement.pause();
      videoElement.srcObject = null;
    };
  }, [stream, muted, title]);

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[150px] ${className}`}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={muted}
        playsInline
        autoPlay
        controls={controls}
      />

      {(!stream || (!hasVideoTracks && !hasAudioTracks)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-lg">
          <div className="mb-2">{title || "No Media"}</div>
          <VideoOff className="w-10 h-10" />
        </div>
      )}

      {/* Status indicators */}
      {stream && (
        <div className="absolute bottom-2 left-2 flex space-x-2">
          {hasVideoTracks ? (
            <div className="bg-green-500 rounded-full p-1">
              <VideoIcon className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="bg-red-500 rounded-full p-1">
              <VideoOff className="w-4 h-4 text-white" />
            </div>
          )}

          {hasAudioTracks ? (
            <div className="bg-green-500 rounded-full p-1">
              <Mic className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="bg-red-500 rounded-full p-1">
              <MicOff className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to handle incoming WebRTC signal events
 */
export function useOnWebRTCSignal() {
  const pubkey = usePubkey();
  const [events, setEvents] = useAtom(eventsAtom);
  const [offer, setOffer] = useAtom(offerAtom);
  const [candidate, setCandidate] = useAtom(candidateAtom);
  const [session, setSession] = useAtom(sessionAtom);
  const [, setParticipants] =
    useAtom<Record<string, "connected" | "disconnected">>(participantsAtom);

  return useCallback(
    async (event: NostrEvent) => {
      try {
        setEvents([...events, event]);
        const t = event.tags.find(
          (tag) => tag[0] === "type",
        )?.[1] as WebRTCSignalType;
        const isUs = event.pubkey === pubkey;

        if (!isUs && t === "offer") {
          const offer = JSON.parse(event.content) as WebRTCOffer;
          if (!session) {
            setSession(offer.session_id);
            setOffer({ id: event.id, pubkey: event.pubkey, offer });
          }
        }

        if (!isUs && t === "candidate") {
          const candidate = JSON.parse(event.content) as WebRTCCandidate;
          const offerId = event.tags.find((t) => t[0] === "e")?.[1];
          if (!offerId) return;
          if (!offer) {
            const cachedOffer = await db.dms.get({ id: offerId });
            if (!cachedOffer) return;
            setOffer({
              id: offerId,
              pubkey: cachedOffer.pubkey,
              offer: JSON.parse(cachedOffer.content) as WebRTCOffer,
            });
          }
          if (candidate.session_id === session) {
            setCandidate(candidate.candidate);
          }
        }

        if (isUs && t === "disconnect") {
          setSession(null);
          setOffer(null);
          setCandidate(null);
          setParticipants((prev) => ({ ...prev, [pubkey]: "disconnected" }));
        }

        if (!isUs && t === "disconnect") {
          setParticipants((prev) => ({
            ...prev,
            [event.pubkey]: "disconnected",
          }));
        }

        if (t === "connect") {
          setParticipants((prev) => ({ ...prev, [event.pubkey]: "connected" }));
        }

        if (t === "answer") {
          setParticipants((prev) => ({ ...prev, [event.pubkey]: "connected" }));
        }
      } catch (err) {
        console.error(err);
      }
    },
    [events, offer, session, candidate],
  );
}

/**
 * Helper function to publish WebRTC signal events to the appropriate relays
 */
async function publishToRelays(ndkEvent: NDKEvent, recipientPubkey: string) {
  try {
    const relays = await fetchDirectMessageRelays(ndk, recipientPubkey);
    const allRelays = Array.from(new Set([...relays.dm, ...relays.fallback]));
    const relaySet = NDKRelaySet.fromRelayUrls(allRelays, ndk);
    // Gift wrap the event
    const recipient = new NDKUser({ pubkey: recipientPubkey });
    const gift = await giftWrap(ndkEvent, recipient);

    console.log(
      `Publishing ${logEvent(ndkEvent.rawEvent() as NostrEvent)} to ${allRelays.length} relays`,
    );

    // Publish the wrapped event
    return gift.publish(relaySet);
  } catch (err) {
    console.error("Failed to publish to relays:", err);
  }
}

/**
 * Decline an incoming call
 */
function decline(
  setSession: (session: string | null) => void,
  setOffer: (
    offer: { id: string; pubkey: string; offer: WebRTCOffer } | null,
  ) => void,
  setCandidate: (candidate: Candidate | null) => void,
) {
  setSession(null);
  setOffer(null);
  setCandidate(null);
}

/**
 * End a call and clean up resources
 */
async function endCall(
  pubkey: string | undefined,
  ndk: ReturnType<typeof useNDK>,
  offer: { id: string; pubkey: string; offer: WebRTCOffer } | null,
  peerConnection: RTCPeerConnection | null,
  localStream: MediaStream | null,
  setPeerConnection: (pc: RTCPeerConnection | null) => void,
  setLocalStream: (stream: MediaStream | null) => void,
  setRemoteStream: (stream: MediaStream | null) => void,
  setSession: (session: string | null) => void,
  setOffer: (
    offer: { id: string; pubkey: string; offer: WebRTCOffer } | null,
  ) => void,
  setCandidate: (candidate: Candidate | null) => void,
) {
  if (!pubkey || !ndk || !offer) return;

  try {
    // Send disconnect signal
    const disconnectEvent = new NDKEvent(ndk, {
      kind: WEBRTC_KIND,
      tags: [
        ["type", "disconnect"],
        ["p", offer.pubkey],
      ],
      content: "",
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
    });

    await publishToRelays(disconnectEvent, offer.pubkey);

    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped local ${track.kind} track`);
      });
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
      console.log("Closed peer connection");
    }

    // Reset state
    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStream(null);
    setSession(null);
    setOffer(null);
    setCandidate(null);
  } catch (err) {
    console.error("Error ending call:", err);
  }
}

/**
 * Main WebRTC component that handles incoming and outgoing calls
 */
export function WebRTC() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const events = useAtomValue(eventsAtom);
  const [offer, setOffer] = useAtom(offerAtom);
  const [session, setSession] = useAtom(sessionAtom);
  const [candidate, setCandidate] = useAtom(candidateAtom);
  const [isCalling, setIsCalling] = useState(false);
  const [peerConnection, setPeerConnection] = useAtom(peerConnectionAtom);
  const [localStream, setLocalStream] = useAtom(localStreamAtom);
  const [remoteStream, setRemoteStream] = useAtom(remoteStreamAtom);
  const pubkey = usePubkey();

  // For debug visualization
  const [connectionState, setConnectionState] = useState<string>("");
  const [iceConnectionState, setIceConnectionState] = useState<string>("");

  // Handle peer connection state changes
  useEffect(() => {
    if (!peerConnection) {
      setConnectionState("");
      setIceConnectionState("");
      return;
    }

    setConnectionState(peerConnection.connectionState);
    setIceConnectionState(peerConnection.iceConnectionState);

    const handleConnectionStateChange = () => {
      setConnectionState(peerConnection.connectionState);
      console.log(
        "PeerConnection state changed:",
        peerConnection.connectionState,
      );
    };

    const handleIceConnectionStateChange = () => {
      setIceConnectionState(peerConnection.iceConnectionState);
      console.log(
        "ICE connection state changed:",
        peerConnection.iceConnectionState,
      );
    };

    peerConnection.addEventListener(
      "connectionstatechange",
      handleConnectionStateChange,
    );
    peerConnection.addEventListener(
      "iceconnectionstatechange",
      handleIceConnectionStateChange,
    );

    return () => {
      peerConnection.removeEventListener(
        "connectionstatechange",
        handleConnectionStateChange,
      );
      peerConnection.removeEventListener(
        "iceconnectionstatechange",
        handleIceConnectionStateChange,
      );
    };
  }, [peerConnection]);

  // Render connected call, call dialog, or nothing
  return peerConnection ? (
    <AlertDialog open>
      <AlertDialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <div className="flex flex-row items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Phone className="size-5 text-green-300 dark:text-green-100" />
                <span>{t("private-group.webrtc.ongoing-call")}</span>
              </div>
              <User
                pubkey={offer?.pubkey || ""}
                classNames={{
                  avatar: "size-7",
                  name: "text-sm",
                }}
              />
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col w-full flex-grow overflow-auto space-y-4 p-2">
          {/* Remote Video (larger) */}
          <VideoPlayer
            stream={remoteStream}
            title="Remote"
            controls
            className="flex-grow min-h-[300px]"
          />

          {/* Local Video (smaller) */}
          <VideoPlayer
            stream={localStream}
            muted
            title="Local"
            className="h-[120px]"
          />

          {/* Connection status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className={`rounded px-2 py-1 text-center ${getConnectionStatusColor(connectionState)}`}
            >
              Connection: {connectionState || "none"}
            </div>
            <div
              className={`rounded px-2 py-1 text-center ${getIceStatusColor(iceConnectionState)}`}
            >
              ICE: {iceConnectionState || "none"}
            </div>
          </div>

          {/* Debugging info */}
          <div className="text-xs text-gray-500 overflow-auto max-h-[60px] bg-black/10 p-1 rounded">
            <p>
              Local:{" "}
              {localStream
                ? localStream
                    .getTracks()
                    .map((t) => `${t.kind} (${t.readyState})`)
                    .join(", ")
                : "none"}
            </p>
            <p>
              Remote:{" "}
              {remoteStream
                ? remoteStream
                    .getTracks()
                    .map((t) => `${t.kind} (${t.readyState})`)
                    .join(", ")
                : "none"}
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex justify-center">
          <AlertDialogAction
            onClick={() =>
              endCall(
                pubkey,
                ndk,
                offer,
                peerConnection,
                localStream,
                setPeerConnection,
                setLocalStream,
                setRemoteStream,
                setSession,
                setOffer,
                setCandidate,
              )
            }
            className="bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="size-5 mr-2" />
            {t("private-group.webrtc.end-call")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : offer ? (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <div className="flex flex-row items-center gap-2">
              <PhoneIncoming className="size-5 text-green-300 dark:text-green-100" />
              {t("private-group.webrtc.incoming-call")}
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="flex flex-col items-center gap-2">
          <User
            pubkey={offer.pubkey}
            classNames={{
              avatar: "size-9",
              name: "text-lg",
            }}
          />
          <p className="text-sm">
            {t("private-group.webrtc.incoming-call-description")}
          </p>
        </div>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            disabled={isCalling}
            onClick={() => decline(setSession, setOffer, setCandidate)}
          >
            <PhoneOff className="size-5 text-red-300 dark:text-red-100" />
            {t("private-group.webrtc.decline")}
          </AlertDialogAction>
          <AlertDialogCancel
            disabled={isCalling}
            onClick={() =>
              accept(
                offer,
                session,
                pubkey,
                ndk,
                setIsCalling,
                setPeerConnection,
              )
            }
          >
            <Phone className="size-5 text-green-300 dark:text-green-100" />
            {t("private-group.webrtc.accept")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : (
    <pre className="absolute top-0 right-0 z-10 bg-accent opacity-0 overflow-auto max-h-[80vh] max-w-[30vw]">
      {JSON.stringify({ offer, session, candidate, events }, null, 2)}
    </pre>
  );
}

// Helper functions for UI
function getConnectionStatusColor(state: string): string {
  switch (state) {
    case "connected":
      return "bg-green-500 text-white";
    case "connecting":
      return "bg-yellow-500 text-white";
    case "disconnected":
      return "bg-red-500 text-white";
    case "failed":
      return "bg-red-700 text-white";
    case "closed":
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-300 text-gray-700";
  }
}

function getIceStatusColor(state: string): string {
  switch (state) {
    case "connected":
      return "bg-green-500 text-white";
    case "completed":
      return "bg-green-600 text-white";
    case "checking":
      return "bg-yellow-500 text-white";
    case "disconnected":
      return "bg-orange-500 text-white";
    case "failed":
      return "bg-red-700 text-white";
    case "closed":
      return "bg-gray-500 text-white";
    default:
      return "bg-gray-300 text-gray-700";
  }
}

/**
 * Component for displaying WebRTC events in the chat interface
 */
export function WebRTCEvent({
  event,
  setReplyingTo,
  scrollTo,
}: {
  event: NostrEvent;
  setReplyingTo?: (event: NostrEvent) => void;
  scrollTo?: NostrEvent;
}) {
  const { t } = useTranslation();
  const type = event.tags.find((t) => t[0] === "type")?.[1] as WebRTCSignalType;
  const isFocused = scrollTo?.id === event.id;
  const ref = useRef<HTMLDivElement | null>(null);
  const pubkey = usePubkey();
  const isFromMe = event.pubkey === pubkey;

  // Handle scrolling to focused event
  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isFocused]);

  if (!type) return null;

  // Determine which icon and message to display based on the event type
  let icon = null;
  let message = "";

  switch (type) {
    case "offer":
      icon = <PhoneIncoming className="size-4 text-green-500" />;
      message = isFromMe
        ? t("private-group.webrtc.outgoing-call-started")
        : t("private-group.webrtc.incoming-call-received");
      break;
    case "answer":
      icon = <Phone className="size-4 text-green-500" />;
      message = t("private-group.webrtc.call-answered");
      break;
    case "disconnect":
      icon = <PhoneOff className="size-4 text-red-500" />;
      message = t("private-group.webrtc.call-ended");
      break;
    case "connect":
      icon = <Phone className="size-4 text-green-500" />;
      message = t("private-group.webrtc.call-connected");
      break;
    default:
      return null; // Don't show technical events like 'candidate'
  }

  // Format timestamp
  const timestamp = new Date(event.created_at * 1000);
  const timeString = timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={ref}
      className={`flex justify-center my-2 w-full ${isFocused ? "bg-accent/30 rounded-lg p-1" : ""}`}
      onClick={() => setReplyingTo?.(event)}
    >
      <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-sm">
        {icon}
        <span>{message}</span>
        <span className="text-xs text-muted-foreground">{timeString}</span>
      </div>
    </div>
  );
}

async function accept(
  offer: { id: string; pubkey: string; offer: WebRTCOffer } | null,
  session: string | null,
  pubkey: string | undefined,
  ndk: ReturnType<typeof useNDK>,
  setIsCalling: (calling: boolean) => void,
  setPeerConnection: (pc: RTCPeerConnection | null) => void,
) {
  if (!offer || !pubkey || !ndk || !session) return;
  setIsCalling(true);

  try {
    // Create peer connection with STUN servers
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
    const pc = new RTCPeerConnection(config);
    console.log("Created RTCPeerConnection");

    // Initialize WebRTC and handle the connection
    // This is where your WebRTC implementation goes
    // ...

    setPeerConnection(pc);
  } catch (error) {
    console.error("Failed to accept call:", error);
    setIsCalling(false);
  }
}
