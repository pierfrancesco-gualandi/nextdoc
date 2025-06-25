import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Custom styles for Material Icons
const materialIconsLink = document.createElement("link");
materialIconsLink.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
materialIconsLink.rel = "stylesheet";
document.head.appendChild(materialIconsLink);

// Custom fonts (Roboto)
const robotoFontLink = document.createElement("link");
robotoFontLink.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap";
robotoFontLink.rel = "stylesheet";
document.head.appendChild(robotoFontLink);

// Set document title
document.title = "N@xtDoc";

createRoot(document.getElementById("root")!).render(<App />);
