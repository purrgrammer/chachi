import { useTranslation } from "react-i18next";
import { Button, ButtonProps } from "./ui/button";
import { HandHeart } from "lucide-react";

export function Donate({ size = "lg", ...props }: ButtonProps) {
  const { t } = useTranslation();

  return (
    <Button size={size} {...props} disabled>
      <HandHeart />
      <span className="font-normal">{t("user.donate")}</span>
    </Button>
  );
}
