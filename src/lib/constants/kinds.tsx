import { NDKKind } from "@nostr-dev-kit/ndk";
import {
  FileText as NoteIcon,
  Server as ServerIcon,
  Image,
  Video,
  Hash,
  ScrollText,
  Code,
  Vote,
  Radio,
  Calendar,
  MessageSquare,
  Zap,
  Heart,
  BookOpen,
  Bitcoin,
  Coins,
  Trophy,
  SmilePlus,
  Castle,
  ImagePlay,
  Quote,
  Bug,
  FolderCode,
  AppWindow,
  Award,
  Users,
} from "lucide-react";
import {
  STREAM,
  COMMENT,
  POLL,
  CALENDAR_EVENT,
  GIF_SET,
  COMMUNIKEY,
  BOOK,
  CODE_SNIPPET,
  GOAL,
  CASHU_MINT,
  ISSUE,
  REPO,
  FOLLOW_PACK,
} from "@/lib/kinds";

/**
 * Content kind icons and translation keys
 */
export const ContentKinds = [
  {
    kind: NDKKind.GroupChat,
    translationKey: "kinds.9",
    icon: <MessageSquare size={16} />,
  },
  {
    kind: NDKKind.Text,
    translationKey: "kinds.1",
    icon: <NoteIcon size={16} />,
  },
  {
    kind: NDKKind.Reaction,
    translationKey: "kinds.7",
    icon: <Heart size={16} />,
  },
  {
    kind: NDKKind.GroupNote,
    translationKey: "kinds.11",
    icon: <Hash size={16} />,
  },
  {
    kind: NDKKind.Image,
    translationKey: "kinds.20",
    icon: <Image size={16} />,
  },
  {
    kind: NDKKind.VerticalVideo,
    translationKey: "kinds.34236",
    icon: <Video size={16} />,
  },
  {
    kind: NDKKind.AppRecommendation,
    translationKey: "kinds.31989",
    icon: <AppWindow size={16} />,
  },
  {
    kind: NDKKind.AppHandler,
    translationKey: "kinds.31990",
    icon: <AppWindow size={16} />,
  },
  {
    kind: NDKKind.HorizontalVideo,
    translationKey: "kinds.34235",
    icon: <Video size={16} />,
  },
  {
    kind: NDKKind.Article,
    translationKey: "kinds.30023",
    icon: <ScrollText size={16} />,
  },
  {
    kind: COMMENT,
    translationKey: "kinds.1111",
    icon: <MessageSquare size={16} />,
  },
  { kind: ISSUE, translationKey: "kinds.1621", icon: <Bug size={16} /> },
  {
    kind: REPO,
    translationKey: "kinds.30617",
    icon: <FolderCode size={16} />,
  },
  {
    kind: NDKKind.RelayList,
    translationKey: "kinds.10002",
    icon: <ServerIcon size={16} />,
  },
  { kind: POLL, translationKey: "kinds.1068", icon: <Vote size={16} /> },
  { kind: STREAM, translationKey: "kinds.30311", icon: <Radio size={16} /> },
  {
    kind: NDKKind.Highlight,
    translationKey: "kinds.9802",
    icon: <Quote size={16} />,
  },
  {
    kind: CALENDAR_EVENT,
    translationKey: "kinds.31923",
    icon: <Calendar size={16} />,
  },
  {
    kind: GIF_SET,
    translationKey: "kinds.30169",
    icon: <ImagePlay size={16} />,
  },
  { kind: BOOK, translationKey: "kinds.30040", icon: <BookOpen size={16} /> },
  {
    kind: CODE_SNIPPET,
    translationKey: "kinds.1337",
    icon: <Code size={16} />,
  },
  { kind: NDKKind.Zap, translationKey: "kinds.9735", icon: <Zap size={16} /> },
  {
    kind: NDKKind.Nutzap,
    translationKey: "kinds.9321",
    icon: <Coins size={16} />,
  },
  { kind: GOAL, translationKey: "kinds.9041", icon: <Trophy size={16} /> },
  {
    kind: CASHU_MINT,
    translationKey: "kinds.38172",
    icon: <Bitcoin size={16} />,
  },
  {
    kind: NDKKind.EmojiSet,
    translationKey: "kinds.30030",
    icon: <SmilePlus size={16} />,
  },
  {
    kind: COMMUNIKEY,
    translationKey: "kinds.10222",
    icon: <Castle size={16} />,
  },
  {
    kind: NDKKind.BadgeDefinition,
    translationKey: "kinds.30009",
    icon: <Award size={16} />,
  },
  {
    kind: FOLLOW_PACK,
    translationKey: "kinds.39089",
    icon: <Users size={16} />,
  },
  {
    kind: NDKKind.FollowSet,
    translationKey: "kinds.30000",
    icon: <Users size={16} />,
  },
];

export const SupportedKinds = ContentKinds.map((k) => k.kind);

/**
 * Content categories for grouping kinds
 */
export const ContentCategories = {
  posts: [1, COMMENT, 11],
  media: [20, 21, GIF_SET],
  interactive: [POLL, STREAM, CALENDAR_EVENT],
  monetization: [9735, 9321, GOAL, CASHU_MINT],
};

/**
 * Get kind info by kind number
 */
export const getKindInfo = (kind: number) => {
  return ContentKinds.find((k) => k.kind === kind);
};
