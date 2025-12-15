import React from "react";
import { cn } from "@/lib/utils";

interface ScrollbarProps {
  children: React.ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal" | "both";
  hideScrollbar?: boolean;
}

export const Scrollbar: React.FC<ScrollbarProps> = ({
  children,
  className,
  orientation = "vertical",
  hideScrollbar = false,
}) => {
  const orientationClasses = {
    vertical: "overflow-y-auto overflow-x-hidden",
    horizontal: "overflow-x-auto overflow-y-hidden",
    both: "overflow-auto",
  };

  const scrollbarClasses = hideScrollbar
    ? "scrollbar-hide"
    : "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/20 hover:scrollbar-thumb-border/40";

  return (
    <div
      className={cn(
        orientationClasses[orientation],
        scrollbarClasses,
        "scrollbar-thumb-rounded-full scrollbar-track-rounded-full",
        className
      )}
    >
      {children}
    </div>
  );
};

// Preset scrollbar variants
export const ScrollbarVertical: React.FC<
  Omit<ScrollbarProps, "orientation">
> = (props) => <Scrollbar {...props} orientation="vertical" />;

export const ScrollbarHorizontal: React.FC<
  Omit<ScrollbarProps, "orientation">
> = (props) => <Scrollbar {...props} orientation="horizontal" />;

export const ScrollbarBoth: React.FC<Omit<ScrollbarProps, "orientation">> = (
  props
) => <Scrollbar {...props} orientation="both" />;

// Hidden scrollbar variant
export const ScrollbarHidden: React.FC<
  Omit<ScrollbarProps, "hideScrollbar">
> = (props) => <Scrollbar {...props} hideScrollbar={true} />;
