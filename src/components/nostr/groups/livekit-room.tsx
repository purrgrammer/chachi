import { useState, useCallback, useRef, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useConnectionState,
  useLocalParticipant,
  DisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState } from "livekit-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { useLivekitToken } from "@/lib/livekit";
import { usePubkey } from "@/lib/account";
import { useLivekitParticipants } from "@/lib/nostr/groups";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

const pubkeyFromIdentity = (id: string) => id.slice(0, 64);

// --- Compact bar components (used when LiveKit is inline above chat) ---

function CompactParticipantAvatar({ identity }: { identity: string }) {
  const pubkey = pubkeyFromIdentity(identity);
  const tracks = useTracks(
    [Track.Source.Microphone],
    { onlySubscribed: false },
  );
  const audioTrack = tracks.find(
    (t) => t.participant.identity === identity && t.source === Track.Source.Microphone,
  );
  const isSpeaking = audioTrack?.participant.isSpeaking;

  return (
    <div className={`relative shrink-0 ${isSpeaking ? "ring-2 ring-primary rounded-full" : ""}`}>
      <Avatar pubkey={pubkey} className="size-8" />
    </div>
  );
}

function CompactParticipantTile({ identity }: { identity: string }) {
  const pubkey = pubkeyFromIdentity(identity);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.Microphone],
    { onlySubscribed: false },
  );

  const participantTracks = tracks.filter(
    (t) => t.participant.identity === identity,
  );
  const videoTrack = participantTracks.find(
    (t) => t.source === Track.Source.Camera,
  );
  const audioTrack = participantTracks.find(
    (t) => t.source === Track.Source.Microphone,
  );

  const isSpeaking = audioTrack?.participant.isSpeaking;
  const hasVideo =
    videoTrack?.publication?.track && !videoTrack.publication.isMuted;
  const isMuted = !audioTrack?.publication?.track || audioTrack.publication.isMuted;

  useEffect(() => {
    const el = videoRef.current;
    const track = videoTrack?.publication?.track;
    if (!el || !track || videoTrack?.publication?.isMuted) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [videoTrack?.publication?.track, videoTrack?.publication?.isMuted]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center ${
        isSpeaking ? "ring-2 ring-primary" : ""
      }`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={videoTrack.participant.isLocal}
        />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <Avatar pubkey={pubkey} className="size-10" />
          <span className="text-xs text-muted-foreground">
            <Name pubkey={pubkey} short />
          </span>
        </div>
      )}
      <div className="absolute bottom-0.5 left-0.5 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white flex items-center gap-0.5">
        <Name pubkey={pubkey} short />
        {isMuted ? <MicOff className="size-2.5 text-red-400" /> : null}
      </div>
    </div>
  );
}

function CompactRoomView() {
  const { t } = useTranslation();
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const [expanded, setExpanded] = useState(false);

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b bg-muted/30 min-h-12">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("livekit.connecting")}</span>
      </div>
    );
  }

  if (connectionState === ConnectionState.Disconnected) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30">
      {expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2">
          {participants.map((p) => (
            <CompactParticipantTile key={p.identity} identity={p.identity} />
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground flex-1 min-w-0"
        >
          <div className="flex -space-x-1.5 shrink-0">
            {participants.slice(0, 4).map((p) => (
              <CompactParticipantAvatar key={p.identity} identity={p.identity} />
            ))}
          </div>
          {participants.length > 4 ? (
            <span className="text-xs">+{participants.length - 4}</span>
          ) : null}
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={localParticipant.isMicrophoneEnabled ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)}
          >
            {localParticipant.isMicrophoneEnabled ? (
              <Mic className="size-3.5" />
            ) : (
              <MicOff className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant={localParticipant.isCameraEnabled ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled)}
          >
            {localParticipant.isCameraEnabled ? (
              <Video className="size-3.5" />
            ) : (
              <VideoOff className="size-3.5" />
            )}
          </Button>
          <DisconnectButton className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <PhoneOff className="size-3.5" />
          </DisconnectButton>
        </div>
      </div>
    </div>
  );
}

export function LivekitBar({ group }: { group: Group }) {
  const { t } = useTranslation();
  const pubkey = usePubkey();
  const shouldReduceMotion = useReducedMotion();
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(false);
  const [joinOpts, setJoinOpts] = useState<{ audio: boolean; video: boolean } | null>(null);
  const wantsToJoin = joinOpts !== null;
  const { data: tokenData, error: tokenError, isLoading } = useLivekitToken(group, wantsToJoin);
  const { data: liveParticipants } = useLivekitParticipants(group, !wantsToJoin);
  const maxAvatars = 3;

  const handleDisconnected = useCallback(() => {
    setJoinOpts(null);
  }, []);

  if (!pubkey) return null;

  // Not in call: compact join bar with audio/video toggles
  if (!wantsToJoin) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        {liveParticipants && liveParticipants.length > 0 ? (
          <>
            <div className="flex -space-x-1.5">
              {liveParticipants.slice(0, maxAvatars).map((pk) => (
                <Avatar key={pk} pubkey={pk} className="size-6 ring-2 ring-background" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground flex-1">
              {t("livekit.participants-in-room", { count: liveParticipants.length })}
            </span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground flex-1">
            {t("content.type.room")}
          </span>
        )}
        <Button
          type="button"
          variant={audio ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setAudio((v) => !v)}
          aria-label={audio ? t("livekit.mute-mic") : t("livekit.unmute-mic")}
        >
          {audio ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </Button>
        <Button
          type="button"
          variant={video ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setVideo((v) => !v)}
          aria-label={video ? t("livekit.disable-camera") : t("livekit.enable-camera")}
        >
          {video ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
        </Button>
        <Button className="h-8 px-3 text-sm" onClick={() => setJoinOpts({ audio, video })}>
          <Phone className="size-3.5 mr-1.5" />
          {t("livekit.join")}
        </Button>
      </div>
    );
  }

  // Fetching token
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 border-b bg-muted/30 min-h-12">
        <Loader2 className={`size-4 text-muted-foreground ${shouldReduceMotion ? "" : "animate-spin"}`} />
        <span className="text-sm text-muted-foreground">{t("livekit.connecting")}</span>
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 min-h-12">
        <span className="text-sm text-muted-foreground flex-1">{t("livekit.token-error")}</span>
        <Button className="h-8 px-3 text-sm" variant="outline" onClick={() => setJoinOpts(null)}>
          {t("back")}
        </Button>
      </div>
    );
  }

  // In call: LiveKitRoom wrapping compact view
  return (
    <LiveKitRoom
      serverUrl={tokenData.url}
      token={tokenData.token}
      connect={true}
      audio={joinOpts.audio}
      video={joinOpts.video}
      onDisconnected={handleDisconnected}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <CompactRoomView />
    </LiveKitRoom>
  );
}
