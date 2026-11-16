import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { pick } from "../../../workbench/index.ts";
import { SignalMark } from "../../atoms/SignalMark/index.ts";
import { listRowSx, listSx } from "../../utils/listSx.ts";
import { Panel } from "./index.ts";

const meta = { title: "Domain/Panel", component: Panel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sentence = (locale: unknown) => pick(locale, { en: "Award notice CAN1145000 on e-licitatie.ro.", ro: "Anunț de atribuire CAN1145000 pe e-licitatie.ro." });

/** The header strip with the heading alone, over a padded body. */
export const Typical: Story = {
  render: (_args, { globals }) => (
    <Panel heading={pick(globals["locale"], { en: "Provenance", ro: "Proveniență" })}>
      <Typography>{sentence(globals["locale"])}</Typography>
    </Panel>
  ),
};

/** A meta line (mono 12, muted) at the header's right. */
export const WithMetaLine: Story = {
  render: (_args, { globals }) => (
    <Panel heading={pick(globals["locale"], { en: "Provenance", ro: "Proveniență" })} aside={pick(globals["locale"], { en: "3 sources", ro: "3 surse" })}>
      <Typography>{sentence(globals["locale"])}</Typography>
    </Panel>
  ),
};

/** One control at the header's right. */
export const WithControl: Story = {
  render: (_args, { globals }) => (
    <Panel
      heading={pick(globals["locale"], { en: "Provenance", ro: "Proveniență" })}
      aside={<Button size="small">{pick(globals["locale"], { en: "Show all", ro: "Arată tot" })}</Button>}
    >
      <Typography>{sentence(globals["locale"])}</Typography>
    </Panel>
  ),
};

/** A foot strip with a count at the left end and a link at the right. */
export const WithFoot: Story = {
  render: (_args, { globals }) => (
    <Panel
      heading={pick(globals["locale"], { en: "Subsequent contracts", ro: "Contracte subsecvente" })}
      foot={
        <>
          <span>{pick(globals["locale"], { en: "5 of 11 shown, by value", ro: "5 din 11 afișate, după valoare" })}</span>
          <Link href="#all">{pick(globals["locale"], { en: "Show all", ro: "Arată tot" })}</Link>
        </>
      }
    >
      <Typography>{sentence(globals["locale"])}</Typography>
    </Panel>
  ),
};

/** A foot that is one caveat sentence. */
export const FootCaveat: Story = {
  render: (_args, { globals }) => (
    <Panel
      heading={pick(globals["locale"], { en: "Financial statements", ro: "Situații financiare" })}
      foot={pick(globals["locale"], { en: "A first release may be revised later.", ro: "O primă publicare poate fi revizuită ulterior." })}
    >
      <Typography>{sentence(globals["locale"])}</Typography>
    </Panel>
  ),
};

/** A flush body for a list on a page other than the main screen: a `listSx` list whose rows take `listRowSx` (12 px 16 px, `raised` hover, a hairline between); the foot closes it. */
export const FlushList: Story = {
  render: (_args, { globals }) => {
    const rows = [
      { name: pick(globals["locale"], { en: "Alpha Construct SRL", ro: "Alpha Construct SRL" }), meta: pick(globals["locale"], { en: "12 Records · Brașov", ro: "12 Înregistrări · Brașov" }) },
      { name: pick(globals["locale"], { en: "Municipality of Cluj-Napoca", ro: "Municipiul Cluj-Napoca" }), meta: pick(globals["locale"], { en: "7 Records · Cluj", ro: "7 Înregistrări · Cluj" }) },
      { name: pick(globals["locale"], { en: "Beta Servicii SA", ro: "Beta Servicii SA" }), meta: pick(globals["locale"], { en: "3 Records · Iași", ro: "3 Înregistrări · Iași" }) },
    ];
    return (
      <Panel
        flush
        heading={pick(globals["locale"], { en: "Suppliers", ro: "Furnizori" })}
        aside={pick(globals["locale"], { en: `${rows.length} shown`, ro: `${rows.length} afișați` })}
        foot={pick(globals["locale"], { en: `Showing 1–${rows.length} of 54`, ro: `Se afișează 1–${rows.length} din 54` })}
      >
        <Box component="ul" sx={listSx}>
          {rows.map((row) => (
            <Box key={row.name} component="li" sx={listRowSx}>
              <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
              <Typography variant="meta">{row.meta}</Typography>
            </Box>
          ))}
        </Box>
      </Panel>
    );
  },
};

/** A flush list with no foot: the last row's hover fill is clipped to the card's bottom corners. */
export const FlushListNoFoot: Story = {
  render: (_args, { globals }) => (
    <Panel flush heading={pick(globals["locale"], { en: "Suppliers", ro: "Furnizori" })}>
      <Box component="ul" sx={listSx}>
        {["Alpha Construct SRL", "Beta Servicii SA"].map((name) => (
          <Box key={name} component="li" sx={listRowSx}>
            <Typography>{name}</Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  ),
};

/** Header content beyond a plain title, as the Signal card needs it: the ring, then the rule label in the card-title type and the text colour, with the meta line in `aside`. The region's name comes from `label`. */
export const HeaderWithRing: Story = {
  render: (_args, { globals }) => {
    const rule = pick(globals["locale"], { en: "Few bidders, same winner", ro: "Puțini ofertanți, același câștigător" });
    return (
      <Panel
        label={rule}
        aside={pick(globals["locale"], { en: "Latest Record: 3 Mar 2026 · 4 Records", ro: "Cea mai recentă înregistrare: 3 mar. 2026 · 4 Înregistrări" })}
        heading={
          <>
            <SignalMark />
            {rule}
          </>
        }
      >
        <Typography>{sentence(globals["locale"])}</Typography>
      </Panel>
    );
  },
};

/** A long title and a long meta line wrap inside the header strip instead of widening the panel. */
export const LongHeader: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 320 }}>
      <Panel
        heading={pick(globals["locale"], { en: "Contracts awarded without a competitive procedure", ro: "Contracte atribuite fără procedură concurențială" })}
        aside={pick(globals["locale"], { en: "11 contracts, from 2021 onward", ro: "11 contracte, din 2021 încoace" })}
        foot={pick(globals["locale"], { en: "Figures are as published and may be revised later.", ro: "Cifrele sunt cele publicate și pot fi revizuite ulterior." })}
      >
        <Typography>{sentence(globals["locale"])}</Typography>
      </Panel>
    </Box>
  ),
};
