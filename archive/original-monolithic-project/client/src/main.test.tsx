import { createRoot } from "react-dom/client";
import "./index.css";

function SimpleTestApp() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>React App Test</h1>
      <p>If you can see this, React is working!</p>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<SimpleTestApp />);
}