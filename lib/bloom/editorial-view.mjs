export function editorialItemFor(editorial, destinationId) {
  return editorial?.items?.find((item) => item.destinationId === destinationId && item.text) || null;
}
