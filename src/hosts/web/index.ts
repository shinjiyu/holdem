/** Simple H5 table — manual clicks + hosting toggle. No game rules here. */
export const hostId = "web" as const;

export { WebTableHost } from "./web-table";
export type { WebClickActRequest, WebSetControlRequest } from "./web-table";
export { TABLE_HTML } from "./table-page";
