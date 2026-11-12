import { Card } from "../../../atoms/Card/index.ts";
import { CardContent } from "../../../atoms/CardContent/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { EntityRef } from "../../types.ts";

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
  copy: GoToCardCopy;
}

/** The pinned "Go to page" card above the result tabs: the entity, how it is identified, and a link to its page. */
export function GoToCard({ entity, href, copy }: GoToCardProps) {
  return (
    <Card component="section" variant="outlined" aria-label={copy.heading}>
      <CardContent>
        <Typography variant="overline" component="h2">
          {copy.heading}
        </Typography>
        <Typography variant="h6" component="p">
          {entity.displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {entity.identity === "CUI" ? `${copy.cui} ${entity.key}` : copy.nameOnly}
        </Typography>
        <Link href={href} aria-label={`${copy.open}: ${entity.displayName}`}>
          {copy.open}
        </Link>
      </CardContent>
    </Card>
  );
}
