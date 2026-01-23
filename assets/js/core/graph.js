import { fetchJson } from "../core/http.js";
import { ROUTES } from "../core/constants.js";

/**
 * Fetches *all* pages of Object Manager QuerySlim results.
 * Handles both { Objects, TotalCount } and { Data: { Objects, TotalCount } } shapes.
 */
export async function fetchAllQuerySlim(
  workspaceId,
  baseRequest,
  pageSize = 1000,
) {
  const url = ROUTES.querySlim(workspaceId);
  const getObjects = (resp) => resp?.Objects ?? resp?.Data?.Objects ?? [];
  const getTotal = (resp, fallback) =>
    typeof resp?.TotalCount === "number"
      ? resp.TotalCount
      : typeof resp?.Data?.TotalCount === "number"
        ? resp.Data.TotalCount
        : fallback;

  let start = 1;
  let totalCount = Infinity;
  const all = [];

  while (start <= totalCount) {
    const body = { ...baseRequest, start, length: pageSize };
    const resp = await fetchJson(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const objects = getObjects(resp);
    const pageCount = objects.length;

    if (!Number.isFinite(totalCount)) {
      totalCount = getTotal(resp, start + pageCount - 1);
      if (!Number.isFinite(totalCount) || totalCount < 0)
        totalCount = Number.POSITIVE_INFINITY;
    }

    if (pageCount === 0) break;

    all.push(...objects);

    if (!Number.isFinite(totalCount)) {
      if (pageCount < pageSize) break;
    } else if (all.length >= totalCount) {
      break;
    }

    start += pageCount;
  }

  return all;
}
