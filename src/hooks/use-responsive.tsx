import { useState, useEffect } from "react";

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
  height: number;
  breakpoint: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    width: 0,
    height: 0,
    breakpoint: "md",
  });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isLargeDesktop = width >= 1920;

      let breakpoint: "sm" | "md" | "lg" | "xl" | "2xl" = "md";
      if (width < 640) breakpoint = "sm";
      else if (width < 768) breakpoint = "md";
      else if (width < 1024) breakpoint = "lg";
      else if (width < 1920) breakpoint = "xl";
      else breakpoint = "2xl";

      setState({
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        width,
        height,
        breakpoint,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, []);

  return state;
};
