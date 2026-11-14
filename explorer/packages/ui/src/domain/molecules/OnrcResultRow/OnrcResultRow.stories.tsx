import { fixtures } from "@grivei/contract/fixtures";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import type { OnrcResultData } from "../../types.ts";
import { listSx } from "../../utils/listSx.ts";
import { OnrcResultRow } from "./index.ts";

const meta = { title: "Domain/OnrcResultRow" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const [alfa, beta] = fixtures.OnrcSearch[0]!.data.onrc.search.organisations.rows as OnrcResultData[];
const [zeta, , legacy] = fixtures.OnrcSearch[1]!.data.onrc.search.organisations.rows as OnrcResultData[];

const rows = (list: (OnrcResultData | undefined)[], linked = true): Story["render"] => (_args, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return (
    <Stack component="ul" sx={listSx}>
      {list.map((row) => row && <OnrcResultRow key={row.registrationNumber} row={row} href={linked && row.entity ? `/explore/supplier/${row.entity.key}` : undefined} locale={locale} copy={sampleOnrcCopy.row(locale)} />)}
    </Stack>
  );
};

/** A name hit (highlighted), a SEAP counterparty with two statuses, and a hit on an earlier name. */
export const NameAndAliasHits: Story = { render: rows([alfa, beta]) };
/** No county, a status the nomenclature does not name, no CAEN; and a registration with no date and no entity page. */
export const SparseRegistrations: Story = { render: rows([zeta, legacy]) };
/** Without an entity link (the Records tab of the entity's own page). */
export const Unlinked: Story = { render: rows([alfa], false) };
