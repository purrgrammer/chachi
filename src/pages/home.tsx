import { Header } from "@/components/header";
import { Dashboard } from "@/components/dashboard";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  return (
    <>
      <Header>
        <h2 className="text-lg">{t("home")}</h2>
      </Header>
      <div className="flex flex-col p-2">
        <Dashboard />
      </div>
    </>
  );
}
