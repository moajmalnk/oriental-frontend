import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Reusable Building Blocks

export const PageHeaderSkeleton: React.FC<{ buttonCount?: number }> = ({
  buttonCount = 4,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
        {Array.from({ length: buttonCount }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-32" />
        ))}
      </div>
    </div>
  );
};

export const StatsCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SearchBarSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Skeleton className="h-10 w-full sm:flex-1" />
        </div>
      </CardContent>
    </Card>
  );
};

export const CardItemSkeleton: React.FC<{
  showAvatar?: boolean;
  contentLines?: number;
  showBadges?: number;
  showActions?: boolean;
}> = ({
  showAvatar = true,
  contentLines = 2,
  showBadges = 0,
  showActions = true,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              {showAvatar && (
                <Skeleton className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex-shrink-0" />
              )}
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: showBadges }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-32 rounded-full" />
                  ))}
                </div>
                {Array.from({ length: contentLines }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={`h-4 ${i === 0 ? "w-full" : "w-3/4"}`}
                  />
                ))}
              </div>
            </div>
          </div>
          {showActions && (
            <div className="flex sm:flex-col items-center gap-2 sm:gap-3">
              <Skeleton className="h-9 w-32" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const PaginationSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({
  columns = 5,
}) => {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? "w-32" : "flex-1"}`} />
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 10,
  columns = 5,
}) => {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 border-b">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                className={`h-4 ${i === 0 ? "w-32" : "flex-1"}`}
              />
            ))}
          </div>
          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
