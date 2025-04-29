import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { useAtom } from "jotai";
import { privateMessagesEnabledAtom } from "@/app/store";

export function useNavigate() {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useRouterNavigate();
  const [privateMessagesEnabled] = useAtom(privateMessagesEnabledAtom);

  return async (url: string) => {
    // Redirect from DM routes if private messages are disabled
    if (!privateMessagesEnabled && (url.startsWith("/dm") || url === "/zaps")) {
      navigate("/");
    } else {
      navigate(url);
    }
    
    if (isMobile) {
      setOpenMobile(false);
    }
  };
}
