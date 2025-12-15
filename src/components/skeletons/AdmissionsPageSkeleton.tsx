import React from "react";
import { Layout } from "@/components/Layout";
import {
  PageHeaderSkeleton,
  StatsCardSkeleton,
  SearchBarSkeleton,
  CardItemSkeleton,
} from "./PageSkeletons";

export const AdmissionsPageSkeleton: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <PageHeaderSkeleton buttonCount={1} />
        <StatsCardSkeleton />
        <SearchBarSkeleton />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardItemSkeleton
              key={index}
              showAvatar
              contentLines={1}
              showBadges={4}
              showActions
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

