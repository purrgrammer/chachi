import { createRoot } from "react-dom/client";
import App from "@/app.tsx";
import "@/index.css";
import "./i18n";
// Import PrismJS language definitions
import "@/lib/prism-languages";

createRoot(document.getElementById("root")!).render(<App />);
