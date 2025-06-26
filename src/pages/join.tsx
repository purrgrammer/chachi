import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, Users } from "lucide-react";

export default function Join() {
  const { t } = useTranslation();
  const { code, relay, groupId } = useParams<{
    code: string;
    relay: string;
    groupId: string;
  }>();

  const fullRelayUrl = relay ? `wss://${relay}` : "";

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Ticket className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {t("join.title", "Join Group")}
          </CardTitle>
          <CardDescription>
            {t("join.description", "You've been invited to join a group")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Group Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-medium">
                {t("join.group_info", "Group Information")}
              </h3>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("join.group_id", "Group ID")}:
                </span>
                <code className="ml-2 text-sm font-mono bg-muted px-2 py-1 rounded">
                  {groupId}
                </code>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("join.relay", "Relay")}:
                </span>
                <code className="ml-2 text-sm font-mono bg-muted px-2 py-1 rounded">
                  {fullRelayUrl}
                </code>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("join.invite_code", "Invite Code")}:
                </span>
                <code className="ml-2 text-sm font-mono bg-muted px-2 py-1 rounded">
                  {code}
                </code>
              </div>
            </div>
          </div>

          {/* Action Area - Placeholder for now */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                {t(
                  "join.placeholder",
                  "Join functionality will be implemented here",
                )}
              </p>
            </div>
          </div>

          {/* Navigation Button */}
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.history.back()}
            >
              {t("join.go_back", "Go Back")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
