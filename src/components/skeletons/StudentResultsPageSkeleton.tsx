import React from "react";
import { Layout } from "@/components/Layout";
import {
  PageHeaderSkeleton,
  StatsCardSkeleton,
  SearchBarSkeleton,
  TableSkeleton,
  PaginationSkeleton,
} from "./PageSkeletons";

export const StudentResultsPageSkeleton: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <PageHeaderSkeleton buttonCount={3} />

        {/* Statistics Card */}
        <StatsCardSkeleton />

        {/* Search Bar */}
        <SearchBarSkeleton />

        {/* Results Table */}
        <TableSkeleton rows={10} columns={7} />

        {/* Pagination Controls */}
        <PaginationSkeleton />
      </div>
    </Layout>
  );
};
