import { useResponsive } from "@/hooks/use-responsive";

interface ProfessionalLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "academic" | "success";
}

export const ProfessionalLoader = ({ 
  message = "Loading...", 
  size = "md",
  variant = "default"
}: ProfessionalLoaderProps) => {
  const { isMobile } = useResponsive();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const variantClasses = {
    default: "border-academic/30 border-t-academic",
    academic: "border-academic/30 border-t-academic",
    success: "border-success/30 border-t-success"
  };

  const messageSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
      {/* Main Spinner */}
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 ${variantClasses[variant]} rounded-full animate-spin`} />
        
        {/* Pulsing Ring */}
        <div className={`${sizeClasses[size]} absolute inset-0 border-2 border-academic/20 rounded-full animate-pulse`} />
        
        {/* Center Dot */}
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className={`w-2 h-2 bg-academic rounded-full animate-ping`} />
        </div>
      </div>

      {/* Loading Message */}
      {message && (
        <div className="text-center space-y-2">
          <p className={`${messageSize[size]} font-medium text-foreground`}>
            {message}
          </p>
          
          {/* Animated Dots */}
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-academic rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-academic rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-academic rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Progress Bar (for larger loaders) */}
      {size === "lg" && (
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-academic to-academic-light rounded-full animate-pulse loading-shimmer" />
        </div>
      )}
    </div>
  );
};

// Specialized loader variants
export const AcademicLoader = ({ message, size }: { message?: string; size?: "sm" | "md" | "lg" }) => (
  <ProfessionalLoader 
    message={message || "Processing academic data..."} 
    size={size} 
    variant="academic" 
  />
);

export const SuccessLoader = ({ message, size }: { message?: string; size?: "sm" | "md" | "lg" }) => (
  <ProfessionalLoader 
    message={message || "Operation successful!"} 
    size={size} 
    variant="success" 
  />
);

// Inline loader for buttons and small spaces
export const InlineLoader = ({ size = "sm" }: { size?: "sm" | "md" }) => (
  <div className={`${size === "sm" ? "w-4 h-4" : "w-5 h-5"} border-2 border-current border-t-transparent rounded-full animate-spin`} />
);
