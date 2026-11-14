import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { donations, donationsCopy, donationsUndated } from "../../samples/donations.ts";
import type { FirmDonationsData } from "../../types.ts";
import { FirmDonationsSection } from "./index.ts";

const meta = { title: "Domain/FirmDonationsSection", component: FirmDonationsSection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const section = (data: FirmDonationsData, supplier: boolean): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <FirmDonationsSection donations={data} supplier={supplier} locale={locale} copy={donationsCopy[locale]} />;
  },
});

/** A supplier that is also a firm donor: the context line first, a donation with a readable date and a loan whose cell lists two dates. */
export const SupplierAlsoADonor = section(donations, true);
/** The same list on an authority's page: no "also a firm donor" line. */
export const OnAnotherPage = section(donations, false);
/** No date cell (the year stands in), neither date nor year ("not stated"), a party in the case BaniPartide published it, no licence in the metadata. */
export const UndatedRows = section(donationsUndated, true);
export const OneDonation = section({ ...donations, donationCount: 1, loanCount: 0, items: [donations.items[1]!] }, true);
