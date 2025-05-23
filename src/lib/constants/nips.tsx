import {
  FileText,
  Users,
  Clock,
  Lock,
  Globe,
  Key,
  Chrome,
  AtSign,
  Trash2,
  MessageSquare,
  Server,
  Hammer,
  BookText,
  Wallet,
  Barcode,
  Link2,
  MessageSquarePlus,
  Scroll,
  Tag,
  MessagesSquare,
  ThumbsUp,
  FileSignature,
  Bookmark,
  Share2,
  Sticker,
  Search,
  ListOrdered,
  Calendar,
  Radio,
  Github,
  FileVideo,
  Zap,
  Award,
  Gift,
  Bitcoin,
  Gamepad2,
  List,
  Activity,
  Shield,
  HelpCircle,
  AlertTriangle,
  UserCheck,
  Computer,
  UserCog,
  ExternalLink,
  Target,
  ShoppingBag,
  Database,
  FileImage,
  BookOpen,
  Cloud,
  ShieldCheck,
  Webhook,
  Store,
  Code,
} from "lucide-react";

/**
 * NIP information with icons and translation keys
 */
export const ContentNips = [
  {
    nip: "01",
    translationKey: "nips.01",
    icon: <FileText size={16} />,
    description: "Basic protocol flow description",
  },
  {
    nip: "02",
    translationKey: "nips.02",
    icon: <Users size={16} />,
    description: "Follow List",
  },
  {
    nip: "03",
    translationKey: "nips.03",
    icon: <Clock size={16} />,
    description: "OpenTimestamps Attestations for Events",
  },
  {
    nip: "04",
    translationKey: "nips.04",
    icon: <Lock size={16} />,
    description: "Encrypted Direct Message",
  },
  {
    nip: "05",
    translationKey: "nips.05",
    icon: <Globe size={16} />,
    description: "Mapping Nostr keys to DNS-based internet identifiers",
  },
  {
    nip: "06",
    translationKey: "nips.06",
    icon: <Key size={16} />,
    description: "Basic key derivation from mnemonic seed phrase",
  },
  {
    nip: "07",
    translationKey: "nips.07",
    icon: <Chrome size={16} />,
    description: "window.nostr capability for web browsers",
  },
  {
    nip: "08",
    translationKey: "nips.08",
    icon: <AtSign size={16} />,
    description: "Handling Mentions",
  },
  {
    nip: "09",
    translationKey: "nips.09",
    icon: <Trash2 size={16} />,
    description: "Event Deletion Request",
  },
  {
    nip: "10",
    translationKey: "nips.10",
    icon: <MessageSquare size={16} />,
    description: "Text Notes and Threads",
  },
  {
    nip: "11",
    translationKey: "nips.11",
    icon: <Server size={16} />,
    description: "Relay Information Document",
  },
  {
    nip: "13",
    translationKey: "nips.13",
    icon: <Hammer size={16} />,
    description: "Proof of Work",
  },
  {
    nip: "14",
    translationKey: "nips.14",
    icon: <BookText size={16} />,
    description: "Subject tag in text events",
  },
  {
    nip: "15",
    translationKey: "nips.15",
    icon: <ShoppingBag size={16} />,
    description: "Nostr Marketplace",
  },
  {
    nip: "17",
    translationKey: "nips.17",
    icon: <Lock size={16} />,
    description: "Private Direct Messages",
  },
  {
    nip: "18",
    translationKey: "nips.18",
    icon: <Share2 size={16} />,
    description: "Reposts",
  },
  {
    nip: "19",
    translationKey: "nips.19",
    icon: <Barcode size={16} />,
    description: "bech32-encoded entities",
  },
  {
    nip: "21",
    translationKey: "nips.21",
    icon: <Link2 size={16} />,
    description: "nostr: URI scheme",
  },
  {
    nip: "22",
    translationKey: "nips.22",
    icon: <MessageSquarePlus size={16} />,
    description: "Comment",
  },
  {
    nip: "23",
    translationKey: "nips.23",
    icon: <Scroll size={16} />,
    description: "Long-form Content",
  },
  {
    nip: "24",
    translationKey: "nips.24",
    icon: <Tag size={16} />,
    description: "Extra metadata fields and tags",
  },
  {
    nip: "25",
    translationKey: "nips.25",
    icon: <ThumbsUp size={16} />,
    description: "Reactions",
  },
  {
    nip: "26",
    translationKey: "nips.26",
    icon: <FileSignature size={16} />,
    description: "Delegated Event Signing",
  },
  {
    nip: "27",
    translationKey: "nips.27",
    icon: <AtSign size={16} />,
    description: "Text Note References",
  },
  {
    nip: "28",
    translationKey: "nips.28",
    icon: <MessagesSquare size={16} />,
    description: "Public Chat",
  },
  {
    nip: "29",
    translationKey: "nips.29",
    icon: <Users size={16} />,
    description: "Relay-based Groups",
  },
  {
    nip: "30",
    translationKey: "nips.30",
    icon: <Sticker size={16} />,
    description: "Custom Emoji",
  },
  {
    nip: "31",
    translationKey: "nips.31",
    icon: <HelpCircle size={16} />,
    description: "Dealing with Unknown Events",
  },
  {
    nip: "32",
    translationKey: "nips.32",
    icon: <Tag size={16} />,
    description: "Labeling",
  },
  {
    nip: "34",
    translationKey: "nips.34",
    icon: <Github size={16} />,
    description: "git stuff",
  },
  {
    nip: "35",
    translationKey: "nips.35",
    icon: <Share2 size={16} />,
    description: "Torrents",
  },
  {
    nip: "36",
    translationKey: "nips.36",
    icon: <AlertTriangle size={16} />,
    description: "Sensitive Content",
  },
  {
    nip: "37",
    translationKey: "nips.37",
    icon: <FileText size={16} />,
    description: "Draft Events",
  },
  {
    nip: "38",
    translationKey: "nips.38",
    icon: <Activity size={16} />,
    description: "User Statuses",
  },
  {
    nip: "39",
    translationKey: "nips.39",
    icon: <UserCheck size={16} />,
    description: "External Identities in Profiles",
  },
  {
    nip: "40",
    translationKey: "nips.40",
    icon: <Clock size={16} />,
    description: "Expiration Timestamp",
  },
  {
    nip: "42",
    translationKey: "nips.42",
    icon: <Shield size={16} />,
    description: "Authentication of clients to relays",
  },
  {
    nip: "44",
    translationKey: "nips.44",
    icon: <Lock size={16} />,
    description: "Encrypted Payloads (Versioned)",
  },
  {
    nip: "45",
    translationKey: "nips.45",
    icon: <ListOrdered size={16} />,
    description: "Counting results",
  },
  {
    nip: "46",
    translationKey: "nips.46",
    icon: <Key size={16} />,
    description: "Nostr Remote Signing",
  },
  {
    nip: "47",
    translationKey: "nips.47",
    icon: <Wallet size={16} />,
    description: "Nostr Wallet Connect",
  },
  {
    nip: "48",
    translationKey: "nips.48",
    icon: <ExternalLink size={16} />,
    description: "Proxy Tags",
  },
  {
    nip: "49",
    translationKey: "nips.49",
    icon: <Lock size={16} />,
    description: "Private Key Encryption",
  },
  {
    nip: "50",
    translationKey: "nips.50",
    icon: <Search size={16} />,
    description: "Search Capability",
  },
  {
    nip: "51",
    translationKey: "nips.51",
    icon: <List size={16} />,
    description: "Lists",
  },
  {
    nip: "52",
    translationKey: "nips.52",
    icon: <Calendar size={16} />,
    description: "Calendar Events",
  },
  {
    nip: "53",
    translationKey: "nips.53",
    icon: <Radio size={16} />,
    description: "Live Activities",
  },
  {
    nip: "54",
    translationKey: "nips.54",
    icon: <BookOpen size={16} />,
    description: "Wiki",
  },
  {
    nip: "55",
    translationKey: "nips.55",
    icon: <Computer size={16} />,
    description: "Android Signer Application",
  },
  {
    nip: "56",
    translationKey: "nips.56",
    icon: <AlertTriangle size={16} />,
    description: "Reporting",
  },
  {
    nip: "57",
    translationKey: "nips.57",
    icon: <Zap size={16} />,
    description: "Lightning Zaps",
  },
  {
    nip: "58",
    translationKey: "nips.58",
    icon: <Award size={16} />,
    description: "Badges",
  },
  {
    nip: "59",
    translationKey: "nips.59",
    icon: <Gift size={16} />,
    description: "Gift Wrap",
  },
  {
    nip: "60",
    translationKey: "nips.60",
    icon: <Bitcoin size={16} />,
    description: "Cashu Wallet",
  },
  {
    nip: "61",
    translationKey: "nips.61",
    icon: <Zap size={16} />,
    description: "Nutzaps",
  },
  {
    nip: "62",
    translationKey: "nips.62",
    icon: <Trash2 size={16} />,
    description: "Request to Vanish",
  },
  {
    nip: "64",
    translationKey: "nips.64",
    icon: <Gamepad2 size={16} />,
    description: "Chess (PGN)",
  },
  {
    nip: "65",
    translationKey: "nips.65",
    icon: <Server size={16} />,
    description: "Relay List Metadata",
  },
  {
    nip: "66",
    translationKey: "nips.66",
    icon: <Activity size={16} />,
    description: "Relay Discovery and Liveness Monitoring",
  },
  {
    nip: "68",
    translationKey: "nips.68",
    icon: <FileImage size={16} />,
    description: "Picture-first feeds",
  },
  {
    nip: "69",
    translationKey: "nips.69",
    icon: <ShoppingBag size={16} />,
    description: "Peer-to-peer Order events",
  },
  {
    nip: "70",
    translationKey: "nips.70",
    icon: <ShieldCheck size={16} />,
    description: "Protected Events",
  },
  {
    nip: "71",
    translationKey: "nips.71",
    icon: <FileVideo size={16} />,
    description: "Video Events",
  },
  {
    nip: "72",
    translationKey: "nips.72",
    icon: <UserCog size={16} />,
    description: "Moderated Communities",
  },
  {
    nip: "73",
    translationKey: "nips.73",
    icon: <ExternalLink size={16} />,
    description: "External Content IDs",
  },
  {
    nip: "75",
    translationKey: "nips.75",
    icon: <Target size={16} />,
    description: "Zap Goals",
  },
  {
    nip: "78",
    translationKey: "nips.78",
    icon: <Database size={16} />,
    description: "Application-specific data",
  },
  {
    nip: "7D",
    translationKey: "nips.7D",
    icon: <MessagesSquare size={16} />,
    description: "Threads",
  },
  {
    nip: "84",
    translationKey: "nips.84",
    icon: <Bookmark size={16} />,
    description: "Highlights",
  },
  {
    nip: "86",
    translationKey: "nips.86",
    icon: <Server size={16} />,
    description: "Relay Management API",
  },
  {
    nip: "88",
    translationKey: "nips.88",
    icon: <ListOrdered size={16} />,
    description: "Polls",
  },
  {
    nip: "89",
    translationKey: "nips.89",
    icon: <Computer size={16} />,
    description: "Recommended Application Handlers",
  },
  {
    nip: "90",
    translationKey: "nips.90",
    icon: <Database size={16} />,
    description: "Data Vending Machines",
  },
  {
    nip: "92",
    translationKey: "nips.92",
    icon: <FileImage size={16} />,
    description: "Media Attachments",
  },
  {
    nip: "94",
    translationKey: "nips.94",
    icon: <FileText size={16} />,
    description: "File Metadata",
  },
  {
    nip: "96",
    translationKey: "nips.96",
    icon: <Cloud size={16} />,
    description: "HTTP File Storage Integration",
  },
  {
    nip: "98",
    translationKey: "nips.98",
    icon: <Webhook size={16} />,
    description: "HTTP Auth",
  },
  {
    nip: "99",
    translationKey: "nips.99",
    icon: <Store size={16} />,
    description: "Classified Listings",
  },
  {
    nip: "B0",
    translationKey: "nips.B0",
    icon: <Bookmark size={16} />,
    description: "Web Bookmarks",
  },
  {
    nip: "B7",
    translationKey: "nips.B7",
    icon: <Cloud size={16} />,
    description: "Blossom",
  },
  {
    nip: "C0",
    translationKey: "nips.C0",
    icon: <Code size={16} />,
    description: "Code Snippets",
  },
  {
    nip: "C7",
    translationKey: "nips.C7",
    icon: <MessageSquare size={16} />,
    description: "Chats",
  },
];

/**
 * Get NIP info by NIP identifier
 */
export const getNipInfo = (nip: string) => {
  return ContentNips.find((n) => n.nip === nip);
};
