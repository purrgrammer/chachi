/**
 * Nostr event kind constants
 *
 * This module provides a centralized definition of all Nostr event kinds used in the application.
 * It imports standard kinds from nostr-tools and supplements them with additional kinds from
 * various NIPs (particularly NIP-29 for groups) that aren't in nostr-tools yet.
 */

// Import available kinds from nostr-tools
import {
  Metadata,
  ShortTextNote,
  RecommendRelay,
  Contacts,
  EncryptedDirectMessage,
  EventDeletion,
  Repost,
  Reaction,
  BadgeAward,
  Seal,
  PrivateDirectMessage,
  GenericRepost,
  ChannelCreation,
  ChannelMetadata,
  ChannelMessage,
  ChannelHideMessage,
  ChannelMuteUser,
  GiftWrap,
  FileMetadata,
  LiveChatMessage,
  Report,
  Label,
  CommunityPostApproval,
  ZapRequest,
  Zap,
  Highlights,
  Mutelist,
  Pinlist,
  RelayList,
  BookmarkList,
  CommunitiesList,
  PublicChatsList,
  BlockedRelaysList,
  SearchRelaysList,
  InterestsList,
  UserEmojiList,
  DirectMessageRelaysList,
  FileServerPreference,
  ClientAuth,
  NostrConnect,
  HTTPAuth,
  Followsets,
  Genericlists,
  Relaysets,
  Bookmarksets,
  Curationsets,
  ProfileBadges,
  BadgeDefinition,
  Interestsets,
  LongFormArticle,
  Emojisets,
  Application,
  LiveEvent,
  Calendar,
  CalendarEventRSVP,
  Handlerinformation,
  Handlerrecommendation,
  CommunityDefinition,
} from "nostr-tools/kinds";

// Additional kinds not in nostr-tools (primarily NIP-29 and media types)
export const GroupChat = 9;
export const Thread = 11;
export const GroupReply = 12;
export const GenericReply = 1111;

// Media kinds
export const Image = 20;
export const Video = 21;
export const ShortVideo = 22;
export const HorizontalVideo = 34235;
export const VerticalVideo = 34236;

// NIP-29: Relay-based Groups
export const GroupAdminAddUser = 9000;
export const GroupAdminRemoveUser = 9001;
export const GroupAdminEditMetadata = 9002;
export const GroupAdminCreateGroup = 9007;
export const GroupAdminRequestJoin = 9021;
export const GroupMetadata = 39000;
export const GroupAdmins = 39001;
export const GroupMembers = 39002;

// List kinds
export const SimpleGroupList = 10009;
export const EmojiList = 10030;
export const BlossomList = 10063;
export const CashuMintList = 10019;
export const CashuWallet = 17375;

// Cashu/Ecash kinds
export const CashuToken = 7375;
export const Nutzap = 9321;

// Additional kinds
export const Wiki = 30818;
export const EmojiSet = 30030;
export const Highlight = 9802;

// Re-export all nostr-tools kinds
export {
  Metadata,
  ShortTextNote as Text, // Alias for consistency
  RecommendRelay,
  Contacts,
  EncryptedDirectMessage,
  EventDeletion,
  Repost,
  Reaction,
  BadgeAward,
  Seal,
  PrivateDirectMessage,
  GenericRepost,
  ChannelCreation,
  ChannelMetadata,
  ChannelMessage,
  ChannelHideMessage,
  ChannelMuteUser,
  GiftWrap,
  FileMetadata,
  LiveChatMessage,
  Report,
  Label,
  CommunityPostApproval,
  ZapRequest,
  Zap,
  Highlights,
  Mutelist,
  Pinlist,
  RelayList,
  BookmarkList,
  CommunitiesList,
  PublicChatsList,
  BlockedRelaysList,
  SearchRelaysList,
  InterestsList,
  UserEmojiList,
  DirectMessageRelaysList,
  FileServerPreference,
  ClientAuth,
  NostrConnect,
  HTTPAuth,
  Followsets,
  Genericlists,
  Relaysets,
  Bookmarksets,
  Curationsets,
  ProfileBadges,
  BadgeDefinition,
  Interestsets,
  LongFormArticle as Article, // Alias for consistency
  Emojisets,
  Application as AppSpecificData, // Alias for consistency
  LiveEvent,
  Calendar,
  CalendarEventRSVP,
  Handlerinformation as AppHandler, // Alias for consistency
  Handlerrecommendation as AppRecommendation, // Alias for consistency
  CommunityDefinition,
};

// Convenience aliases for backwards compatibility
export const PinList = Pinlist;
export const MuteList = Mutelist;

// Additional list kinds with consistent naming
export const CategorizedPeopleList = 30000;
export const RelaySet = 30002;

/**
 * Type representing all valid event kinds
 */
export type EventKind = number;

/**
 * Helper to check if a number is a valid event kind
 */
export function isValidKind(kind: number): kind is EventKind {
  return typeof kind === "number" && kind >= 0 && Number.isInteger(kind);
}
