import React, { useState, useEffect, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
    Pipette,
    RotateCcw,
    History,
    Palette,
    Check,
    Copy,
    ChevronDown,
} from "lucide-react";
import "./AdvancedColorPicker.css";

// Color utility functions
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return (
        "#" +
        [r, g, b]
            .map((x) => {
                const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
    );
};

const rgbToHsl = (
    r: number,
    g: number,
    b: number
): { h: number; s: number; l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
};

const hslToRgb = (
    h: number,
    s: number,
    l: number
): { r: number; g: number; b: number } => {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
};

const getContrastColor = (hex: string): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#000000";
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
};

// Default preset colors
const DEFAULT_PRESETS = [
    "#ffffff", "#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da",
    "#adb5bd", "#6c757d", "#495057", "#343a40", "#212529",
    "#000000", "#f8d7da", "#f1aeb5", "#ea868f", "#dc3545",
    "#b02a37", "#842029", "#fff3cd", "#ffe69c", "#ffda6a",
    "#ffc107", "#cc9a06", "#997404", "#d1e7dd", "#a3cfbb",
    "#75b798", "#198754", "#146c43", "#0f5132", "#cff4fc",
    "#9eeaf9", "#6edff6", "#0dcaf0", "#0aa2c0", "#087990",
    "#cfe2ff", "#9ec5fe", "#6ea8fe", "#0d6efd", "#0a58ca",
    "#084298", "#e2d9f3", "#c5b3e6", "#a98eda", "#6f42c1",
    "#59359a", "#432874", "#f8d7da", "#f1aeb5", "#e685b5",
    "#d63384", "#ab296a", "#801f4f",
];

// Local storage key for color history
const COLOR_HISTORY_KEY = "advanced-color-picker-history";

interface AdvancedColorPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    description?: string;
    showAlpha?: boolean;
    presets?: string[];
    showHistory?: boolean;
    className?: string;
}

export const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({
    label,
    value,
    onChange,
    description,
    showAlpha = false,
    presets = DEFAULT_PRESETS,
    showHistory = true,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hexInput, setHexInput] = useState(value);
    const [copied, setCopied] = useState(false);
    const [colorHistory, setColorHistory] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState("picker");

    // HSL state for the spectrum picker
    const [hsl, setHsl] = useState(() => {
        const rgb = hexToRgb(value);
        return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : { h: 0, s: 100, l: 50 };
    });

    // RGB state
    const [rgb, setRgb] = useState(() => {
        return hexToRgb(value) || { r: 255, g: 255, b: 255 };
    });

    // Refs for the color area
    const colorAreaRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Load color history from localStorage
    useEffect(() => {
        if (showHistory) {
            const stored = localStorage.getItem(COLOR_HISTORY_KEY);
            if (stored) {
                try {
                    setColorHistory(JSON.parse(stored));
                } catch {
                    setColorHistory([]);
                }
            }
        }
    }, [showHistory]);

    // Save color to history
    const saveToHistory = useCallback(
        (color: string) => {
            if (!showHistory) return;
            setColorHistory((prev) => {
                const filtered = prev.filter((c) => c.toLowerCase() !== color.toLowerCase());
                const updated = [color, ...filtered].slice(0, 12);
                localStorage.setItem(COLOR_HISTORY_KEY, JSON.stringify(updated));
                return updated;
            });
        },
        [showHistory]
    );

    // Sync value changes
    useEffect(() => {
        setHexInput(value);
        const rgbVal = hexToRgb(value);
        if (rgbVal) {
            setRgb(rgbVal);
            setHsl(rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b));
        }
    }, [value]);

    // Update from hex input
    const handleHexChange = (hex: string) => {
        setHexInput(hex);
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            const rgbVal = hexToRgb(hex);
            if (rgbVal) {
                setRgb(rgbVal);
                setHsl(rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b));
                onChange(hex);
            }
        }
    };

    // Update from RGB inputs
    const handleRgbChange = (component: "r" | "g" | "b", val: number) => {
        const newRgb = { ...rgb, [component]: Math.max(0, Math.min(255, val)) };
        setRgb(newRgb);
        const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHexInput(hex);
        setHsl(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
        onChange(hex);
    };

    // Update from HSL inputs
    const handleHslChange = (component: "h" | "s" | "l", val: number) => {
        const newHsl = { ...hsl, [component]: val };
        setHsl(newHsl);
        const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
        setRgb(newRgb);
        const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHexInput(hex);
        onChange(hex);
    };

    // Handle color area interaction
    const handleColorAreaClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
            if (!colorAreaRef.current) return;
            const rect = colorAreaRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

            const newS = Math.round(x * 100);
            const newL = Math.round(100 - y * 100);

            const newHsl = { ...hsl, s: newS, l: newL };
            setHsl(newHsl);
            const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
            setRgb(newRgb);
            const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            setHexInput(hex);
            onChange(hex);
        },
        [hsl, onChange]
    );

    // Handle mouse down on color area
    const handleColorAreaMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
        handleColorAreaClick(e);

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                handleColorAreaClick(e);
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Handle touch events for mobile
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDragging.current = true;
        const touch = e.touches[0];
        if (!colorAreaRef.current) return;
        const rect = colorAreaRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
        updateColorFromPosition(x, y);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!isDragging.current || !colorAreaRef.current) return;
        const touch = e.touches[0];
        const rect = colorAreaRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
        updateColorFromPosition(x, y);
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
    };

    // Helper function to update color from position
    const updateColorFromPosition = (x: number, y: number) => {
        const newS = Math.round(x * 100);
        const newL = Math.round(100 - y * 100);
        const newHsl = { ...hsl, s: newS, l: newL };
        setHsl(newHsl);
        const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
        setRgb(newRgb);
        const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHexInput(hex);
        onChange(hex);
    };

    // Handle hue slider change
    const handleHueChange = (values: number[]) => {
        handleHslChange("h", values[0]);
    };

    // Copy color to clipboard
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy color:", err);
        }
    };

    // Use native eyedropper if available
    const useEyedropper = async () => {
        // @ts-ignore - EyeDropper API is not yet in TypeScript types
        if (typeof window !== "undefined" && "EyeDropper" in window) {
            try {
                // @ts-ignore
                const eyeDropper = new window.EyeDropper();
                const result = await eyeDropper.open();
                const hex = result.sRGBHex;
                handleHexChange(hex);
                saveToHistory(hex);
            } catch (err) {
                // User cancelled or error
                console.log("Eyedropper cancelled or not supported");
            }
        }
    };

    // Check if eyedropper is supported
    // @ts-ignore
    const eyedropperSupported = typeof window !== "undefined" && "EyeDropper" in window;

    // Select preset color
    const selectPreset = (color: string) => {
        handleHexChange(color);
        saveToHistory(color);
    };

    // Handle popover close
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open && value) {
            saveToHistory(value);
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <Label className="text-sm font-medium">{label}</Label>
            {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
            <Popover open={isOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-between gap-3 h-12 px-3"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-8 h-8 rounded-lg border-2 shadow-sm transition-all hover:scale-105"
                                style={{
                                    backgroundColor: value,
                                    borderColor: getContrastColor(value) === "#ffffff" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)",
                                }}
                            />
                            <span className="font-mono text-sm uppercase">{value}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 max-w-80 p-0 max-h-[80vh] overflow-y-auto" align="start" sideOffset={8}>
                    <div className="p-4 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Color Picker</span>
                            <div className="flex items-center gap-1">
                                {eyedropperSupported && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={useEyedropper}
                                        title="Pick color from screen"
                                    >
                                        <Pipette className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={copyToClipboard}
                                    title="Copy color"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="picker" className="text-xs">
                                    <Palette className="h-3 w-3 mr-1" />
                                    Picker
                                </TabsTrigger>
                                <TabsTrigger value="presets" className="text-xs">
                                    Presets
                                </TabsTrigger>
                                {showHistory && (
                                    <TabsTrigger value="history" className="text-xs">
                                        <History className="h-3 w-3 mr-1" />
                                        History
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            <TabsContent value="picker" className="space-y-4 mt-4">
                                <div
                                    ref={colorAreaRef}
                                    className="color-area relative w-full h-32 sm:h-40 rounded-lg cursor-crosshair overflow-hidden"
                                    style={{
                                        background: `linear-gradient(to top, #000, transparent),
                                 linear-gradient(to right, #fff, hsl(${hsl.h}, 100%, 50%))`,
                                    }}
                                    onMouseDown={handleColorAreaMouseDown}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <div
                                        className="color-picker-thumb absolute w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
                                        style={{
                                            left: `${hsl.s}%`,
                                            top: `${100 - hsl.l}%`,
                                            transform: "translate(-50%, -50%)",
                                            backgroundColor: value,
                                            boxShadow: "0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)",
                                        }}
                                    />
                                </div>

                                {/* Hue Slider */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Hue</Label>
                                    <div className="hue-slider-container">
                                        <Slider
                                            value={[hsl.h]}
                                            min={0}
                                            max={360}
                                            step={1}
                                            onValueChange={handleHueChange}
                                            className="hue-slider"
                                        />
                                    </div>
                                </div>

                                {/* Input Fields */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <Label className="text-xs text-muted-foreground">HEX</Label>
                                        <Input
                                            value={hexInput}
                                            onChange={(e) => handleHexChange(e.target.value)}
                                            className="h-10 sm:h-8 text-sm sm:text-xs font-mono"
                                            placeholder="#000000"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">R</Label>
                                        <Input
                                            type="number"
                                            value={rgb.r}
                                            min={0}
                                            max={255}
                                            onChange={(e) => handleRgbChange("r", parseInt(e.target.value) || 0)}
                                            className="h-10 sm:h-8 text-sm sm:text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">G</Label>
                                        <Input
                                            type="number"
                                            value={rgb.g}
                                            min={0}
                                            max={255}
                                            onChange={(e) => handleRgbChange("g", parseInt(e.target.value) || 0)}
                                            className="h-10 sm:h-8 text-sm sm:text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">B</Label>
                                        <Input
                                            type="number"
                                            value={rgb.b}
                                            min={0}
                                            max={255}
                                            onChange={(e) => handleRgbChange("b", parseInt(e.target.value) || 0)}
                                            className="h-10 sm:h-8 text-sm sm:text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Contrast Preview */}
                                <div className="flex items-center gap-2 p-2 rounded-lg border">
                                    <div
                                        className="flex-1 p-2 rounded text-center text-sm font-medium transition-all"
                                        style={{
                                            backgroundColor: value,
                                            color: getContrastColor(value),
                                        }}
                                    >
                                        Sample Text
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Contrast Preview
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="presets" className="mt-4">
                                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 sm:gap-1.5">
                                    {presets.map((color, index) => (
                                        <button
                                            key={index}
                                            className={cn(
                                                "w-9 h-9 sm:w-7 sm:h-7 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 active:scale-95",
                                                value.toLowerCase() === color.toLowerCase()
                                                    ? "ring-2 ring-ring ring-offset-1"
                                                    : "border-transparent"
                                            )}
                                            style={{ backgroundColor: color }}
                                            onClick={() => selectPreset(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            {showHistory && (
                                <TabsContent value="history" className="mt-4">
                                    {colorHistory.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {colorHistory.map((color, index) => (
                                                    <button
                                                        key={index}
                                                        className={cn(
                                                            "w-12 h-12 sm:w-10 sm:h-10 rounded-lg border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 active:scale-95",
                                                            value.toLowerCase() === color.toLowerCase()
                                                                ? "ring-2 ring-ring ring-offset-1"
                                                                : "border-transparent"
                                                        )}
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => selectPreset(color)}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => {
                                                    setColorHistory([]);
                                                    localStorage.removeItem(COLOR_HISTORY_KEY);
                                                }}
                                            >
                                                <RotateCcw className="h-3 w-3 mr-1" />
                                                Clear History
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                            <History className="h-8 w-8 mb-2 opacity-50" />
                                            <p className="text-sm">No color history yet</p>
                                            <p className="text-xs">Colors you pick will appear here</p>
                                        </div>
                                    )}
                                </TabsContent>
                            )}
                        </Tabs>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default AdvancedColorPicker;
