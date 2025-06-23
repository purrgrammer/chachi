import { motion } from "framer-motion";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ErrorPage = () => {
  const { t } = useTranslation();

  const handleReload = () => {
    window.location.reload();
  };

  const handleReportProblem = () => {
    window.open("https://github.com/bandarra/chachi/issues", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        gap: "1.5rem",
        padding: "2rem",
      }}
      className="bg-background"
    >
      <img
        src="/favicon.png"
        className="w-32 h-32 rounded-tl-full rounded-tr-full rounded-br-full grayscale"
        alt="Error"
      />

      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <span>{t("error.something-went-wrong")}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleReportProblem}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          {t("error.report-problem")}
        </button>

        <button
          onClick={handleReload}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t("error.reload-page")}
        </button>
      </div>
    </motion.div>
  );
};
