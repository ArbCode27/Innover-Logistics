import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  flex?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  action,
  flex = true,
}) => {
  return (
    <div
      className={`${flex ? "flex flex-col" : "space-y-4"} gap-4 sm:flex-row sm:items-start sm:justify-between`}>
      <div className="min-w-0 space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {Icon ? (
            <Icon
              className="h-7 w-7 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : null}
          <span>{title}</span>
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
};
