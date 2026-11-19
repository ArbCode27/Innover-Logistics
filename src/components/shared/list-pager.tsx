"use client";

import { Button } from "@/components/ui/button";
import { buttons } from "@/lib/glossary";

interface ListPagerProps {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}

export const ListPager: React.FC<ListPagerProps> = ({
  page,
  pageCount,
  total,
  onPage,
}) => {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "resultado" : "resultados"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          {buttons.previous}
        </Button>
        <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
          Página {page} de {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          {buttons.next}
        </Button>
      </div>
    </div>
  );
};
