import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Smartphone, Monitor } from "lucide-react";
import { useResponsive } from "@/hooks/use-responsive";

interface SearchBoxProps {
  onSearch: (searchTerm: string) => void;
  isLoading?: boolean;
}

export const SearchBox = ({ onSearch, isLoading = false }: SearchBoxProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { isMobile, isTablet } = useResponsive();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in px-4 sm:px-0">
      <div className="bg-gradient-card rounded-3xl p-6 sm:p-8 md:p-10 shadow-elegant border border-border/50 backdrop-blur-sm relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-academic/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-academic/5 rounded-full translate-y-12 -translate-x-12"></div>

        <div className="relative z-10 text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 bg-academic/10 rounded-full px-4 py-2 mb-4 border border-academic/20">
            <Search className="h-4 w-4 text-academic" />
            <span className="text-xs sm:text-sm font-semibold text-academic uppercase tracking-wide">
              Result Search Portal
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <Label
              htmlFor="search"
              className="text-sm sm:text-base font-semibold text-foreground block text-center"
            >
              Register Number or Certificate Number
            </Label>
            <div className="relative group">
              <Input
                id="search"
                type="text"
                placeholder={
                  isMobile
                    ? "e.g., PDA2024065 or CERT123"
                    : "Enter register number"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-14 h-12 sm:h-14 text-base sm:text-lg md:text-xl bg-background/80 border-2 border-border focus:border-academic focus:ring-academic/20 focus:ring-4 transition-all duration-300 rounded-2xl font-mono tracking-wider text-center"
                disabled={isLoading}
                autoComplete="off"
                autoFocus={!isMobile}
                aria-label="Enter your register number or certificate number"
              />
              <Search className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 sm:h-6 sm:w-6 group-focus-within:text-academic transition-colors duration-300" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Enter your complete register number or certificate number as
              provided by the academy
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 sm:h-14 text-base sm:text-lg md:text-xl font-bold bg-gradient-primary hover:shadow-elegant hover:scale-105 transition-all duration-300 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group relative overflow-hidden"
            disabled={isLoading || !searchTerm.trim()}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            {isLoading ? (
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">
                  Searching for Results...
                </span>
                <span className="sm:hidden">Searching...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 relative z-10">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Search Result</span>
                <span className="sm:hidden">Search</span>
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
