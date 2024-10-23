import { useLocation } from "react-router-dom";

import { Sticker } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useRelayChannels } from "@/lib/nostr/chat";
import { normalizeRelayURL } from "@/lib/relay";
import type { Relay } from "@/lib/types";
import { useNavigate } from "@/lib/navigation";

export function RelayNavigation({ relay }: { relay: Relay }) {
  const { data: channels } = useRelayChannels(relay);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const relayURL = `/r/${normalizeRelayURL(relay.url)}`;
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Feed"
            isActive={pathname === relayURL}
            onClick={() => navigate(relayURL)}
          >
            <Sticker />
            <span>Feed</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarGroupLabel>Channels</SidebarGroupLabel>
        {channels?.map((chan) => (
          <SidebarMenuItem key={chan}>
            <SidebarMenuButton
              tooltip={chan}
              isActive={pathname.endsWith(`/${chan}`)}
              onClick={() => navigate(`${relayURL}/${chan}`)}
            >
              <span className="text-muted-foreground">#</span>
              <span>{chan}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {channels && channels.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="text-muted-foreground">No channels</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  );
}
