import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Egg, MessageSquare, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GroupAvatar, GroupName } from "@/components/nostr/groups/metadata";
import { useNstart, useCanSign } from "@/lib/account";
import { useJoinRequest } from "@/lib/nostr/groups";
import { useBookmarkGroup } from "@/components/nostr/groups/bookmark";
import { groupURL } from "@/lib/groups";
import { toast } from "sonner";
import type { Group } from "@/lib/types";

export default function Join() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canSign = useCanSign();
  const [isJoining, setIsJoining] = useState(false);
  const { createAccount } = useNstart(window.location.pathname);

  const { code, relay, groupId } = useParams<{
    code: string;
    relay: string;
    groupId: string;
  }>();

  const fullRelayUrl = relay ? `wss://${relay}` : "";
  const group: Group = {
    id: groupId || "",
    relay: fullRelayUrl,
  };

  const joinRequest = useJoinRequest(group);
  const { bookmarkGroup } = useBookmarkGroup(group);

  function onboard() {
    createAccount();
  }

  async function joinGroup() {
    if (!code || !groupId) {
      toast.error(
        t("join.error.missing_params", "Missing invite code or group ID"),
      );
      return;
    }

    try {
      setIsJoining(true);
      await joinRequest(code);
      await bookmarkGroup();
      navigate(groupURL(group), { replace: true });
      toast.success(t("join.success", "Successfully joined group"));
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error(t("join.error.failed", "Failed to join group"));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {t("join.title", "Join Group")}
          </CardTitle>
          <CardDescription>
            {t("join.description", "You've been invited to join a group")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <GroupAvatar group={group} className="size-32" />
            <GroupName group={group} className="text-2xl" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Button
              className="w-full"
              onClick={joinGroup}
              disabled={!canSign || isJoining}
            >
              {isJoining ? (
                <RotateCw className="animate-spin" />
              ) : (
                <MessageSquare />
              )}
              {t("join.join_group", "Join Group")}
            </Button>
            {!canSign ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={onboard}
                disabled={isJoining}
              >
                {isJoining ? <RotateCw className="animate-spin" /> : <Egg />}
                {t("join.onboard", "Get Started")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
