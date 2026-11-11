// PROTOTYPE, throwaway. Three main-screen variants switchable via ?variant=A|B|C.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Switcher from "./Switcher";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";

const VARIANTS = { A: "Choropleth + drawer", B: "Coverage tiles + master-detail", C: "Flows + ranked suppliers" };
const theme = createTheme({ palette: { mode: "dark", primary: { main: "#F2B33D" }, background: { default: "#0f1115", paper: "#171a21" } } });

function App() {
  const [v, setV] = useState(new URLSearchParams(location.search).get("variant") || "A");
  const change = (k) => { const u = new URL(location.href); u.searchParams.set("variant", k); history.replaceState(null, "", u); setV(k); };
  const C = { A: VariantA, B: VariantB, C: VariantC }[v] || VariantA;
  return (<ThemeProvider theme={theme}><CssBaseline /><C /><Switcher variants={VARIANTS} current={v} onChange={change} /></ThemeProvider>);
}
createRoot(document.getElementById("root")).render(<App />);
