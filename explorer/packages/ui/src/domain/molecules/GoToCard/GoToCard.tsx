import { Card } from "../../../atoms/Card/index.ts";
import { CardContent } from "../../../atoms/CardContent/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color } from "../../../theme/tokens.ts";
import type { EntityRef } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";

export interface GoToCardCopy {
  /** The card's heading: "Go to page" / "Mergi la pagină". */
  heading: string;
  /** The link's text; the entity name is added to its accessible name. */
  open: string;
  /** What the entity is known by: "CUI" for a CUI entity (its key is the CUI), the name-only wording otherwise. */
  cui: string;
  nameOnly: string;
}

export interface GoToCardProps {
  /** `SeapSearch.goTo`: the one entity the query names exactly. */
  entity: EntityRef;
  href: string;
  /** A plain click on the link goes here instead of loading the page. */
  onNavigate?: ((href: string) => void) | undefined;
  copy: GoToCardCopy;
}

/** The pinned "Go to page" card above the result tabs: the entity, how it is identified, and a link to its page. */
export function GoToCard({ entity, href, onNavigate, copy }: GoToCardProps) {
  return (
    <Card component="section" variant="outlined" aria-label={copy.heading} sx={{ borderColor: color.accent }}>
      <CardContent>
        <Typography variant="meta" component="h2" sx={{ color: color.accent }}>
          {copy.heading}
        </Typography>
        <Typography variant="h6" component="p">
          {entity.displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {entity.identity === "CUI" ? `${copy.cui} ${entity.key}` : copy.nameOnly}
        </Typography>
        <Link href={href} onClick={followLink(href, onNavigate)} aria-label={`${copy.open}: ${entity.displayName}`}>
          {copy.open}
        </Link>
      </CardContent>
    </Card>
  );
}
