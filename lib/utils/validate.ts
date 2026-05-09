const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUUID = (id: string | undefined): id is string =>
  typeof id === "string" && UUID_RE.test(id);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isValidDate = (d: string | undefined): d is string =>
  typeof d === "string" && DATE_RE.test(d);
