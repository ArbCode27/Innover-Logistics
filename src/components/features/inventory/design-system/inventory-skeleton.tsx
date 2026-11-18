import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "./surface";

export const InventoryKpiSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Surface key={i} variant="glass" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <div className="flex items-end justify-between pt-1">
            <div className="space-y-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
            <Skeleton className="h-6 w-16 rounded-md hidden sm:block" />
          </div>
        </Surface>
      ))}
    </div>
  );
};

export const InventoryTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 6,
}) => {
  return (
    <Surface variant="glass" className="overflow-hidden p-0 border border-border/50">
      {/* Fake Header Toolbar */}
      <div className="p-4 border-b border-border/40 flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-full sm:w-72 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Fake Table Header */}
      <div className="grid grid-cols-6 gap-4 p-3.5 bg-muted/40 border-b border-border/30 text-xs font-semibold">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20 hidden sm:block" />
        <Skeleton className="h-4 w-24 hidden md:block" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-14 ml-auto" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-4 p-4 items-center animate-pulse"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
            <Skeleton className="h-4 w-28 hidden md:block" />
            <Skeleton className="h-6 w-12 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </Surface>
  );
};
