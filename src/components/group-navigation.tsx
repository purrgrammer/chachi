"use client";

import { useLocation } from "react-router-dom";
import {
  MessagesSquare,
  StickyNote,
  Newspaper,
  Youtube,
  AudioLines,
  Library,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getRelayHost } from "@/lib/relay";
import type { Group } from "@/lib/types";
import { useNavigate } from "@/lib/navigation";

const groupItems = [
  { title: "Chat", icon: MessagesSquare, unread: 0 },
  {
    title: "Posts",
    icon: StickyNote,
    url: "/posts",
    disabled: true,
    badge: "Coming soon",
  },
  {
    title: "Articles",
    icon: Newspaper,
    url: "/articles",
    disabled: true,
    hidden: true,
  },
  {
    title: "Video",
    icon: Youtube,
    url: "/video",
    disabled: true,
    hidden: true,
  },
  {
    title: "Music",
    icon: AudioLines,
    url: "/music",
    disabled: true,
    hidden: true,
  },
  {
    title: "Books",
    icon: Library,
    url: "/books",
    disabled: true,
    hidden: true,
  },
];

export function GroupNavigation({ group }: { group: Group }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const groupURL = `/${getRelayHost(group.relay)}/${group.id}`;

  // todo: relay
  // same categories but chat is collapsible
  // channels on subitems
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Content</SidebarGroupLabel>
      <SidebarMenu>
        {groupItems
          .filter((item) => !item.hidden)
          .map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                disabled={item.disabled}
                tooltip={item.title}
                isActive={
                  item.url
                    ? pathname.endsWith(item.url)
                    : pathname.endsWith(group.id)
                }
                onClick={() =>
                  navigate(`${groupURL}${item.url ? item.url : ""}`)
                }
              >
                <div className="flex flex-row justify-between items-center w-full">
                  <div className="flex flex-row items-center gap-2">
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                  </div>
                  {item.unread ? (
                    <Badge variant="counter">{item.unread}</Badge>
                  ) : item.badge ? (
                    <Badge variant="secondary">{item.badge}</Badge>
                  ) : null}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
