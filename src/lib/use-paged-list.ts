"use client";

import * as React from "react";

export const usePagedList = <T,>(
  items: T[],
  resetKey: string,
  pageSize = 25
) => {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageCount,
    total: items.length,
    rows: items.slice(start, start + pageSize),
    setPage,
    pageSize,
  };
};
