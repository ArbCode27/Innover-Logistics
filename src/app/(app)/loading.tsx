export default function AppLoading() {
  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-md animate-pulse" />
          <div className="h-4 w-72 bg-muted/60 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-muted/70 animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="rounded-xl border bg-card/60 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="h-9 w-64 bg-muted rounded-md animate-pulse" />
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 w-full bg-muted/40 rounded-lg animate-pulse flex items-center px-4 justify-between"
            >
              <div className="h-4 w-1/4 bg-muted/80 rounded" />
              <div className="h-4 w-1/6 bg-muted/60 rounded" />
              <div className="h-4 w-1/6 bg-muted/60 rounded" />
              <div className="h-4 w-1/12 bg-muted/80 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
