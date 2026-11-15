import { Box, Button } from "@grivei/ui";

export interface MapBackLinkProps {
  /** "Back to Romania". */
  children: string;
  onClick: () => void;
}

/** The way out of a zoomed county: a quiet button with a chevron, in the map panel's header strip. */
export function MapBackLink({ children, onClick }: MapBackLinkProps) {
  return (
    <Button
      size="small"
      color="inherit"
      onClick={onClick}
      startIcon={
        <Box component="svg" aria-hidden="true" viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </Box>
      }
      sx={{ fontWeight: 600 }}
    >
      {children}
    </Button>
  );
}
