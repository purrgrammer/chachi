import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export const EVENT = "event";
export const ADDRESS = "address";
export const PROFILE = "profile";
export const RELAY_LIST = "relay-list";
export const USER_GROUPS = "user-groups";
export const GROUPS = "groups";
export const CLOSE_GROUPS = "close-groups";
export const GROUP_METADATA = "group-metadata";
export const GROUP_MEMBERS = "group-members";
export const GROUP_ADMINS = "group-admins";
export const GROUP_ROLES = "group-roles";
export const LNURL = "lnurl";
export const WALLET_INFO = "wallet-info";
export const WALLET_BALANCE = "wallet-balance";
export const WALLET_TXS = "wallet-txs";
export const MINT_INFO = "cashu:mint-info";
export const MINT_KEYS = "cashu:mint-keys";
export const MINT_LIST = "cashu:mint-list";
