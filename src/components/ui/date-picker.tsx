import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

// This is the key to fixing the root cause.
const parseISOLocal = (dateString: string): Date | null => {
  if (!dateString) return null;
  // Split the string and create date with new Date(year, monthIndex, day)
  // This constructor ALWAYS uses local time.
  const parts = dateString.split("-").map(Number);
  if (
    parts.length === 3 &&
    !isNaN(parts[0]) &&
    !isNaN(parts[1]) &&
    !isNaN(parts[2])
  ) {
    // parts[1] - 1 because month is 0-indexed
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null; // Invalid format
};

const DatePicker: React.FC<DatePickerProps> = ({
  value = "",
  onChange,
  placeholder = "Select date",
  disabled = false,
  className,
  minDate,
  maxDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? parseISOLocal(value) : null // USE NEW PARSER
  );

  const [currentMonth, setCurrentMonth] = useState<Date>(
    selectedDate || new Date()
  );
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Format date for display
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // month is 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date for input display
  const formatInputDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const parseInputDate = (dateString: string): Date | null => {
    // Try our YYYY-MM-DD parser first
    let date = parseISOLocal(dateString);
    if (date) return date;

    // Fallback for other user inputs (e.g., "12/20/2024")
    date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Get days in month
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (minDate) {
      const min = parseISOLocal(minDate); // USE NEW PARSER
      if (min && date < min) return true;
    }
    if (maxDate) {
      const max = parseISOLocal(maxDate); // USE NEW PARSER
      if (max && date > max) return true;
    }
    return false;
  };

  // Check if date is selected
  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;

    setSelectedDate(date);
    const formattedDate = formatDate(date);
    setInputValue(formattedDate);
    onChange?.(formattedDate);
    setIsOpen(false);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const date = parseInputDate(value);
    if (date && !isDateDisabled(date)) {
      setSelectedDate(date);
      setCurrentMonth(date);
      onChange?.(formatDate(date)); // <-- Send the formatted string
    } else if (!value) {
      // Handle clearing the input
      setSelectedDate(null);
      onChange?.("");
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    if (inputValue && selectedDate) {
      setInputValue(formatDate(selectedDate));
    }
  };

  // Navigate months
  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // Clear date
  const clearDate = () => {
    setSelectedDate(null);
    setInputValue("");
    onChange?.("");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (value) {
      const date = parseISOLocal(value); // USE NEW PARSER
      if (date) {
        setSelectedDate(date);
        setCurrentMonth(date);
        // Ensure input value is also in sync if it's different
        setInputValue(formatDate(date));
      }
    } else {
      setSelectedDate(null);
      setInputValue("");
    }
  }, [value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowLeft":
        e.preventDefault();
        navigateMonth("prev");
        break;
      case "ArrowRight":
        e.preventDefault();
        navigateMonth("next");
        break;
      case "Enter":
        e.preventDefault();
        if (selectedDate) {
          handleDateSelect(selectedDate);
        }
        break;
    }
  };

  // Update selected date when value prop changes
  useEffect(() => {
    if (value) {
      const date = parseInputDate(value);
      if (date) {
        setSelectedDate(date);
        setCurrentMonth(date);
      }
    } else {
      setSelectedDate(null);
      setInputValue("");
    }
  }, [value]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Previous month days
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthDays = getDaysInMonth(prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
      days.push(
        <button
          key={`prev-${day}`}
          className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:bg-muted rounded-sm text-xs"
          disabled
        >
          {day}
        </button>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const disabled = isDateDisabled(date);
      const selected = isDateSelected(date);
      const today = isToday(date);

      days.push(
        <button
          key={day}
          className={cn(
            "h-5 w-5 sm:h-6 sm:w-6 rounded-sm text-xs transition-colors",
            "hover:bg-primary hover:text-primary-foreground",
            selected && "bg-primary text-primary-foreground",
            today && !selected && "bg-muted font-semibold",
            disabled &&
              "text-muted-foreground cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
          )}
          onClick={() => handleDateSelect(date)}
          disabled={disabled}
          aria-label={`Select ${date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`}
          aria-pressed={selected}
        >
          {day}
        </button>
      );
    }

    // Next month days
    const totalCells = 42; // 6 weeks * 7 days
    const remainingCells = totalCells - days.length;

    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        day
      );
      days.push(
        <button
          key={`next-${day}`}
          className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:bg-muted rounded-sm text-xs"
          disabled
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const currentYear = currentMonth.getFullYear();

  // Generate year options for the dropdown
  const yearOptions = [];
  // You can adjust this range.
  // Let's go from 10 years in the future to 100 years in the past.
  const startYear = new Date().getFullYear() + 10;
  const endYear = startYear - 100;

  for (let i = startYear; i >= endYear; i--) {
    yearOptions.push(i);
  }

  // Handler for Month dropdown
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(parseInt(e.target.value));
    setCurrentMonth(newMonth);
  };

  // Handler for Year dropdown
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(parseInt(e.target.value));
    setCurrentMonth(newMonth);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 pr-16 text-xs"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Select date"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDate}
              className="h-5 w-5 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="h-5 w-5 p-0 hover:bg-muted"
          >
            <Calendar className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg p-2 w-56 sm:w-64 max-w-[calc(100vw-2rem)]"
          role="dialog"
          aria-label="Calendar"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="h-5 w-5 sm:h-6 sm:w-6 p-0"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>

            <div className="flex-1 flex justify-center gap-1 sm:gap-2">
              {/* Month Dropdown */}
              <Select
                value={String(currentMonth.getMonth())}
                onValueChange={(val) => {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(parseInt(val));
                  setCurrentMonth(newMonth);
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-5 sm:h-6 text-xs font-medium w-24 px-1",
                    "bg-transparent"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {months.map((month, index) => (
                    <SelectItem
                      key={month}
                      value={String(index)}
                      className="py-1 text-xs"
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Dropdown */}
              <Select
                value={String(currentYear)}
                onValueChange={(val) => {
                  const newMonth = new Date(currentMonth);
                  newMonth.setFullYear(parseInt(val));
                  setCurrentMonth(newMonth);
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-5 sm:h-6 text-xs font-medium w-20 px-1",
                    "bg-transparent"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {yearOptions.map((year) => (
                    <SelectItem
                      key={year}
                      value={String(year)}
                      className="py-1 text-xs"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="h-5 w-5 sm:h-6 sm:w-6 p-0"
              aria-label="Next month"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="h-4 sm:h-5 flex items-center justify-center text-[10px] font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0.5">
            {generateCalendarDays()}
          </div>

          {/* Today button */}
          <div className="mt-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDateSelect(new Date())}
              className="w-full h-6 sm:h-7 text-xs"
            >
              Today
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { DatePicker };
