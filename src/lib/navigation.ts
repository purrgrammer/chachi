import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";

export function useNavigate() {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useRouterNavigate();

  return async (url: string) => {
    navigate(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
}
