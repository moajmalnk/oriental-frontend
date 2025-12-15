import React from "react";
import { Layout } from "@/components/Layout";
import {
  PageHeaderSkeleton,
  StatsCardSkeleton,
  SearchBarSkeleton,
  CardItemSkeleton,
  PaginationSkeleton,
} from "./PageSkeletons";

export const BatchPageSkeleton: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <PageHeaderSkeleton buttonCount={4} />

        {/* Statistics Card */}
        <StatsCardSkeleton />

        {/* Search Bar */}
        <SearchBarSkeleton />

        {/* Batches Grid/List */}
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <CardItemSkeleton
              key={i}
              showAvatar={false}
              contentLines={3}
              showBadges={2}
              showActions={true}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        <PaginationSkeleton />
      </div>
    </Layout>
  );
};
