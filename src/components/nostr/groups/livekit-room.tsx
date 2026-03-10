import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  LiveKitRoom,
  useTracks,
  useParticipants,
  useConnectionState,
  useLocalParticipant,
  TrackToggle,
  DisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState, createLocalVideoTrack } from "livekit-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { useLivekitToken } from "@/lib/livekit";
import { usePubkey, useCanSign } from "@/lib/account";
import {
  useRequestedToJoin,
  useJoinRequest,
  useFetchGroupParticipants,
} from "@/lib/nostr/groups";
import { queryClient, GROUP_PARTICIPANTS } from "@/lib/query";
import { groupId } from "@/lib/groups";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

function Spinner({ label }: { label?: string }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <Loader2
        className={`size-8 text-muted-foreground ${!shouldReduceMotion ? "animate-spin" : ""}`}
      />
      {label ? (
        <span className="text-sm text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}

function ParticipantTile({ identity }: { identity: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  const isLocal = audioTrack?.participant.isLocal;
  const isSpeaking = audioTrack?.participant.isSpeaking;
  const hasVideo =
    videoTrack?.publication?.track && !videoTrack.publication.isMuted;
  const isMuted = !audioTrack?.publication?.track || audioTrack.publication.isMuted;

  // Attach/detach video track properly
  useEffect(() => {
    const el = videoRef.current;
    const track = videoTrack?.publication?.track;
    if (!el || !track || videoTrack?.publication?.isMuted) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [videoTrack?.publication?.track, videoTrack?.publication?.isMuted]);

  // Attach/detach audio track for remote participants
  useEffect(() => {
    const el = audioRef.current;
    const track = audioTrack?.publication?.track;
    if (!el || !track || isLocal || audioTrack?.publication?.isMuted) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [audioTrack?.publication?.track, audioTrack?.publication?.isMuted, isLocal]);

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
        <div className="flex flex-col items-center gap-2">
          <Avatar pubkey={identity} className="size-16" />
          <span className="text-xs text-muted-foreground">
            <Name pubkey={identity} short />
          </span>
        </div>
      )}
      <div className="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white flex items-center gap-1">
        <Name pubkey={identity} short />
        {isMuted ? <MicOff className="size-3 text-red-400" /> : null}
      </div>
      {!isLocal ? <audio ref={audioRef} autoPlay /> : null}
    </div>
  );
}

function RoomView() {
  const { t } = useTranslation();
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();

  if (connectionState === ConnectionState.Connecting) {
    return <Spinner label={t("livekit.connecting")} />;
  }

  if (connectionState === ConnectionState.Disconnected) {
    return null;
  }

  const remoteParticipants = participants.filter((p) => !p.isLocal);

  return (
    <div className="flex flex-col flex-1 p-2">
      <div className="flex flex-col flex-1 items-center justify-center">
        {remoteParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
            <Users className="size-8" />
            <span className="text-sm">{t("livekit.no-participants")}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
          {participants.map((p) => (
            <ParticipantTile key={p.identity} identity={p.identity} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 p-2 border-t mt-auto">
        <TrackToggle
          source={Track.Source.Microphone}
          showIcon={false}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          {localParticipant.isMicrophoneEnabled ? (
            <Mic className="size-4" />
          ) : (
            <MicOff className="size-4 text-red-500" />
          )}
        </TrackToggle>
        <TrackToggle
          source={Track.Source.Camera}
          showIcon={false}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          {localParticipant.isCameraEnabled ? (
            <Video className="size-4" />
          ) : (
            <VideoOff className="size-4 text-red-500" />
          )}
        </TrackToggle>
        <DisconnectButton className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90">
          <PhoneOff className="size-4 mr-1" />
          {t("livekit.leave")}
        </DisconnectButton>
      </div>
    </div>
  );
}

function JoinGroupGate({
  group,
  pubkey,
}: {
  group: Group;
  pubkey: string;
}) {
  const { t } = useTranslation();
  const canSign = useCanSign();
  const { events } = useRequestedToJoin(group, pubkey);
  const joinRequest = useJoinRequest(group);
  const { isBookmarked, bookmarkGroup } = useBookmarkGroup(group);
  const [requested, setRequested] = useState(events.length > 0);

  async function sendJoinRequest() {
    try {
      await joinRequest();
      toast.success(t("chat.join.request.success"));
      setRequested(true);
      if (!isBookmarked) {
        await bookmarkGroup();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("chat.join.request.error"));
    }
  }

  if (!canSign) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <Users className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center">
        {t("group.metadata.join-the-conversation")}
      </p>
      <Button onClick={sendJoinRequest} disabled={requested}>
        {requested ? t("chat.join.request.pending") : t("chat.join.request.action")}
      </Button>
    </div>
  );
}

function VideoPreview({ enabled, pubkey }: { enabled: boolean; pubkey: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<Awaited<ReturnType<typeof createLocalVideoTrack>> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    createLocalVideoTrack().then((t) => {
      if (stopped) {
        t.stop();
        return;
      }
      trackRef.current = t;
      if (videoRef.current) t.attach(videoRef.current);
    });

    return () => {
      stopped = true;
      if (trackRef.current) {
        trackRef.current.stop();
        trackRef.current = null;
      }
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="w-64 h-36 sm:w-80 sm:h-48 rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
        <Avatar pubkey={pubkey} className="size-16" />
        <span className="text-sm text-muted-foreground">
          <Name pubkey={pubkey} short />
        </span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-64 h-36 sm:w-80 sm:h-48 rounded-lg bg-muted object-cover"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}

function PreJoinLobby({
  onJoin,
  pubkey,
}: {
  onJoin: (opts: { audio: boolean; video: boolean }) => void;
  pubkey: string;
}) {
  const { t } = useTranslation();
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <VideoPreview enabled={video} pubkey={pubkey} />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={audio ? "default" : "outline"}
          size="icon"
          onClick={() => setAudio((v) => !v)}
          aria-label={audio ? t("livekit.mute-mic") : t("livekit.unmute-mic")}
        >
          {audio ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </Button>
        <Button
          type="button"
          variant={video ? "default" : "outline"}
          size="icon"
          onClick={() => setVideo((v) => !v)}
          aria-label={video ? t("livekit.disable-camera") : t("livekit.enable-camera")}
        >
          {video ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </Button>
      </div>
      <Button onClick={() => onJoin({ audio, video })} size="lg">
        <Phone className="size-4 mr-2" />
        {t("livekit.join")}
      </Button>
    </div>
  );
}

export function LivekitRoomView({ group }: { group: Group }) {
  const { t } = useTranslation();
  const pubkey = usePubkey();
  const { data: participants } = useFetchGroupParticipants(group);
  const members = participants?.members ?? [];
  const admins = participants?.admins ?? [];
  const [joinOpts, setJoinOpts] = useState<{ audio: boolean; video: boolean } | null>(null);
  const wantsToJoin = joinOpts !== null;
  const { data: tokenData, error: tokenError, isLoading } = useLivekitToken(group, wantsToJoin);

  const isMember =
    !members.length && !admins.length
      ? true // If no participant data, allow (open group)
      : pubkey
        ? members.includes(pubkey) || admins.includes(pubkey)
        : false;

  // Poll for membership changes when user is not yet a member
  useEffect(() => {
    if (isMember) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: [GROUP_PARTICIPANTS, groupId(group)],
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isMember, group]);

  const handleDisconnected = useCallback(() => {
    setJoinOpts(null);
  }, []);

  if (!pubkey) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <AlertCircle className="size-8" />
        <span className="text-sm">{t("livekit.error")}</span>
      </div>
    );
  }

  if (!isMember) {
    return <JoinGroupGate group={group} pubkey={pubkey} />;
  }

  // Pre-join lobby — pick audio/video before entering
  if (!wantsToJoin) {
    return <PreJoinLobby onJoin={setJoinOpts} pubkey={pubkey} />;
  }

  // Fetching token after user clicked join
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Spinner label={t("livekit.connecting")} />
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <AlertCircle className="size-8" />
        <span className="text-sm">{t("livekit.token-error")}</span>
        <Button variant="outline" onClick={() => setJoinOpts(null)}>
          {t("back")}
        </Button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={tokenData.url}
      token={tokenData.token}
      connect={true}
      audio={joinOpts.audio}
      video={joinOpts.video}
      onDisconnected={handleDisconnected}
      data-lk-theme="default"
      className="flex flex-col flex-1 bg-background"
    >
      <RoomView />
    </LiveKitRoom>
  );
}
