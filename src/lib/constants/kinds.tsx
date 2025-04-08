import {
  FileText as NoteIcon,
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
  Flame,
  Coins,
  Trophy,
  SmilePlus,
  Castle,
  ImagePlay,
} from "lucide-react";
import {
  STREAM,
  COMMENT,
  POLL,
  CALENDAR_EVENT,
  GIF_SET,
  BOOK,
  CODE_SNIPPET,
  GOAL,
  CASHU_MINT,
} from "@/lib/kinds";

/**
 * Content kind icons and translation keys
 */
export const ContentKinds = [
  { kind: 1, translationKey: "kinds.1", icon: <NoteIcon size={16} /> },
  { kind: 7, translationKey: "kinds.7", icon: <Heart size={16} /> },
  { kind: 11, translationKey: "kinds.11", icon: <Hash size={16} /> },
  { kind: 20, translationKey: "kinds.20", icon: <Image size={16} /> },
  { kind: 21, translationKey: "kinds.21", icon: <Video size={16} /> },
  {
    kind: 30023,
    translationKey: "kinds.30023",
    icon: <ScrollText size={16} />,
  },
  {
    kind: COMMENT,
    translationKey: "kinds.1111",
    icon: <MessageSquare size={16} />,
  },
  { kind: POLL, translationKey: "kinds.1068", icon: <Vote size={16} /> },
  { kind: STREAM, translationKey: "kinds.30311", icon: <Radio size={16} /> },
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
  { kind: 9735, translationKey: "kinds.9735", icon: <Zap size={16} /> },
  { kind: 9321, translationKey: "kinds.9321", icon: <Coins size={16} /> },
  { kind: GOAL, translationKey: "kinds.9041", icon: <Trophy size={16} /> },
  {
    kind: CASHU_MINT,
    translationKey: "kinds.38172",
    icon: <Bitcoin size={16} />,
  },
  { kind: 30015, translationKey: "kinds.30015", icon: <Flame size={16} /> },
  { kind: 30030, translationKey: "kinds.30030", icon: <SmilePlus size={16} /> },
  { kind: 10222, translationKey: "kinds.10222", icon: <Castle size={16} /> },
];

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
