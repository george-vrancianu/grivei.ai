/** The address as a reader would cite it: the URL without its scheme ("grivei.ai/explore/record/CAN1145000"). */
export function withoutScheme(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
}
