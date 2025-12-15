import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "title" | "card" | "button" | "avatar" | "table-row";
}

export const Skeleton = ({ className, variant = "text" }: SkeletonProps) => {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  const variants = {
    text: "h-4 w-full",
    title: "h-8 w-3/4",
    card: "h-32 w-full",
    button: "h-12 w-24",
    avatar: "h-12 w-12 rounded-full",
    "table-row": "h-16 w-full"
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonCard = () => (
  <div className="bg-gradient-card rounded-2xl p-6 md:p-8 shadow-card border border-border/50 animate-pulse">
    <div className="space-y-4">
      <Skeleton variant="title" className="mx-auto" />
      <Skeleton variant="text" className="mx-auto w-2/3" />
      <div className="space-y-3">
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-4/6" />
      </div>
      <Skeleton variant="button" className="mx-auto" />
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="space-y-4">
    <Skeleton variant="title" className="w-48" />
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  </div>
);

export const SkeletonHeader = () => (
  <div className="text-center space-y-4">
    <Skeleton variant="title" className="h-16 w-96 mx-auto" />
    <Skeleton variant="text" className="h-1 w-32 mx-auto" />
    <Skeleton variant="title" className="h-12 w-80 mx-auto" />
    <Skeleton variant="text" className="h-1 w-24 mx-auto" />
    <Skeleton variant="text" className="h-6 w-64 mx-auto" />
    <Skeleton variant="text" className="h-5 w-48 mx-auto" />
    <Skeleton variant="text" className="h-4 w-32 mx-auto" />
  </div>
);
