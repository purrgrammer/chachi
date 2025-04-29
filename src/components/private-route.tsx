import { Navigate } from "react-router-dom";
import { useAtom } from "jotai";
import { privateMessagesEnabledAtom } from "@/app/store";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const [privateMessagesEnabled] = useAtom(privateMessagesEnabledAtom);

  if (!privateMessagesEnabled) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
