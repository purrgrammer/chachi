import { motion, useReducedMotion } from "framer-motion";

export const LoadingScreen = () => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: [0.215, 0.61, 0.355, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <img
        src="/favicon.png"
        className="w-32 h-32 rounded-tl-full rounded-tr-full rounded-br-full"
      />
    </motion.div>
  );
};
