// PROTOTYPE, throwaway. Answers "what does a visitor see on drilling into a SEAP hit?" (issue #8).
// Main-screen variants (?variant=A|B|C) and entity-page variants (?page=A|B|C),
// routed by hash: #/authority/<cui>, #/supplier/<cui>, #/record/<i>; empty hash = main screen.
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Switcher from "./Switcher";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";
import EntityA from "./EntityA";
import EntityB from "./EntityB";
import EntityC from "./EntityC";
import RecordPage from "./RecordPage";
import { profile } from "./entity";

const VARIANTS = { A: "Choropleth + drawer", B: "Coverage tiles + master-detail", C: "Flows + ranked suppliers" };
const PAGES = { A: "Dossier", B: "Ledger", C: "Relationships" };
const theme = createTheme({ palette: { mode: "dark", primary: { main: "#F2B33D" }, background: { default: "#0f1115", paper: "#171a21" } } });
const param = (k, d) => new URLSearchParams(location.search).get(k) || d;
const setParam = (k, v) => { const u = new URL(location.href); u.searchParams.set(k, v); history.replaceState(null, "", u); };

function Entity({ type, id, v }) {
  const p = useMemo(() => profile(type, id), [type, id]);
  if (!p.ent) return <p style={{ padding: 20 }}>Unknown {type} {id}</p>;
  const E = { A: EntityA, B: EntityB, C: EntityC }[v] || EntityA;
  return <E key={type + id} p={p} />;
}

function App() {
  const [hash, setHash] = useState(location.hash);
  const [v, setV] = useState(param("variant", "A"));
  const [pg, setPg] = useState(param("page", "A"));
  useEffect(() => { const h = () => { setHash(location.hash); scrollTo(0, 0); }; addEventListener("hashchange", h); return () => removeEventListener("hashchange", h); }, []);
  const [, type, id] = hash.split("/");
  let body, sw;
  if (type === "authority" || type === "supplier") {
    body = <Entity type={type} id={decodeURIComponent(id)} v={pg} />;
    sw = <Switcher variants={PAGES} current={pg} onChange={(k) => { setParam("page", k); setPg(k); }} />;
  } else if (type === "record") {
    body = <RecordPage i={+id} />;
  } else {
    const C = { A: VariantA, B: VariantB, C: VariantC }[v] || VariantA;
    body = <C />;
    sw = <Switcher variants={VARIANTS} current={v} onChange={(k) => { setParam("variant", k); setV(k); }} />;
  }
  return (<ThemeProvider theme={theme}><CssBaseline />{body}{sw}</ThemeProvider>);
}
createRoot(document.getElementById("root")).render(<App />);
