import { useState, useEffect, useRef, ReactNode } from "react";
import { Skeleton } from "./Skeleton";

interface LazyLoadProps {
  children: ReactNode;
  placeholder?: ReactNode;
  threshold?: number;
  className?: string;
}

export const LazyLoad = ({ 
  children, 
  placeholder = <Skeleton variant="card" />, 
  threshold = 0.1,
  className = ""
}: LazyLoadProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "50px"
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  useEffect(() => {
    if (isVisible) {
      // Simulate loading delay for better UX
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div ref={ref} className={className}>
        {placeholder}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        {placeholder}
      </div>
    );
  }

  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};

// Specialized lazy load components
export const LazyCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <LazyLoad 
    placeholder={<Skeleton variant="card" />} 
    className={className}
  >
    {children}
  </LazyLoad>
);

export const LazyTable = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <LazyLoad 
    placeholder={<Skeleton variant="table-row" />} 
    className={className}
  >
    {children}
  </LazyLoad>
);
