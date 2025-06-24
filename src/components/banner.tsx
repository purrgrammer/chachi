import { useTranslation } from "react-i18next";

export default function Banner({ imgSrc }: { imgSrc?: string }) {
  const { t } = useTranslation();
  return (
    <img
      src={imgSrc || "/favicon.png"}
      alt={t("profile.banner.alt", "Profile Banner")}
      className="pt-1 rounded-md h-[18em] aspect-image object-cover"
    />
  );
}
