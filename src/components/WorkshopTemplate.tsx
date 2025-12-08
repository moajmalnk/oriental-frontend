import React, { useRef, useState } from "react";
import { Workshop } from "@/types";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkshopTemplateProps {
  workshop: Workshop;
  participantName?: string;
  className?: string;
  showDownload?: boolean;
}

// Certificate dimensions (Standard A4 Landscape pixel ratio)
const CERT_WIDTH = 1536; // 200% of standard screen width for high res
const CERT_HEIGHT = 1086;

export const WorkshopTemplate: React.FC<WorkshopTemplateProps> = ({
  workshop,
  participantName = "ABIDA TP",
  className = "",
  showDownload = false,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // --- Logic Helpers ---

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getDateRange = () => {
    const startDate = new Date(workshop.start_date);
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString("en-US", { month: "long" });
    const startYear = startDate.getFullYear();

    if (workshop.end_date) {
      const endDate = new Date(workshop.end_date);
      const endDay = endDate.getDate();
      const endMonth = endDate.toLocaleDateString("en-US", { month: "long" });
      const endYear = endDate.getFullYear();

      if (startMonth === endMonth && startYear === endYear) {
        return `${startDay} to ${endDay}, ${startMonth} ${startYear}`;
      }
      return `${startDay} ${startMonth} ${startYear} to ${endDay} ${endMonth} ${endYear}`;
    }
    return `${startDay}, ${startMonth} ${startYear}`;
  };

  const getDurationText = () => {
    const days = workshop.duration_days || 1;
    return days === 1 ? "One Day" : days === 2 ? "Two Day" : `${days} Day`;
  };

  // --- Design Helpers ---

  const backgroundColor = workshop.background_color || "#ffffff";
  const borderColor = workshop.border_color || "#4b9164";
  const titleColor = workshop.title_color || "#4b9164";
  const nameColor = workshop.name_color || "#4b9164";
  const textColor = workshop.text_color || "#333333";
  const locationName = workshop.place || "IAH Academy";

  const signatoryTitle = workshop.chief_trainer_title?.trim() || "";
  const signatoryName = workshop.chief_trainer_name?.trim() || "";
  const showSignatory = Boolean(signatoryTitle || signatoryName);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // --- Download Logic ---

  const createFullSizeClone = async (): Promise<HTMLDivElement> => {
    const original = certificateRef.current;
    if (!original) throw new Error("Certificate ref not found");

    const clone = original.cloneNode(true) as HTMLDivElement;
    clone.style.transform = "none";
    clone.style.width = `${CERT_WIDTH}px`;
    clone.style.height = `${CERT_HEIGHT}px`;
    clone.style.position = "fixed";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    clone.style.zIndex = "-9999";

    document.body.appendChild(clone);

    const images = clone.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 200));

    return clone;
  };

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);
    let clone: HTMLDivElement | null = null;

    try {
      clone = await createFullSizeClone();
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor,
        width: CERT_WIDTH,
        height: CERT_HEIGHT,
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [CERT_WIDTH, CERT_HEIGHT],
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, 0, CERT_WIDTH, CERT_HEIGHT, undefined, "FAST");
      pdf.save(`Certificate-${participantName}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      if (clone) document.body.removeChild(clone);
      setIsDownloading(false);
      setIsDownloadDialogOpen(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {/* Controls */}
      {showDownload && (
        <div className="flex gap-3">
          <Button onClick={() => setIsDownloadDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      )}

      {/* Certificate Preview Container */}
      <div className="relative shadow-2xl bg-white overflow-hidden">
        <div
          ref={certificateRef}
          style={{
            width: CERT_WIDTH,
            height: CERT_HEIGHT,
            backgroundColor,
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* --- DECORATIVE WAVES (BACKGROUND ONLY) --- */}

          {/* Top Left Wave Group */}
          <div className="absolute top-0 left-0 w-[520px] h-[440px] z-0 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 600 500" preserveAspectRatio="none">
              <path
                d="M0,0 L600,0 Q400,100 300,300 Q200,500 0,500 Z"
                fill={hexToRgba(borderColor, 0.1)}
              />
              <path
                d="M0,0 L500,0 Q350,80 250,250 Q150,420 0,420 Z"
                fill={hexToRgba(borderColor, 0.4)}
              />
              <path
                d="M0,0 L400,0 Q280,60 180,200 Q80,340 0,340 Z"
                fill={borderColor}
              />
            </svg>
          </div>

          {/* Bottom Right Wave Group */}
          <div className="absolute bottom-0 right-0 w-[620px] h-[440px] z-0 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 700 500" preserveAspectRatio="none">
              <path
                d="M700,500 L0,500 Q150,450 300,250 Q450,50 700,0 Z"
                fill={hexToRgba(borderColor, 0.1)}
              />
              <path
                d="M700,500 L100,500 Q250,450 400,280 Q550,110 700,80 Z"
                fill={hexToRgba(borderColor, 0.4)}
              />
              <path
                d="M700,500 L250,500 Q380,450 500,320 Q620,190 700,160 Z"
                fill={borderColor}
              />
            </svg>
          </div>

          {/* --- INNER BORDERED CARD (ALL TEXT STAYS INSIDE THIS) --- */}
          <div
            className="absolute inset-10 rounded-[40px] border-[10px] z-[5] shadow-[0_0_40px_rgba(0,0,0,0.06)]"
            style={{
              borderColor: hexToRgba(borderColor, 0.5),
              background: "rgba(255,255,255,0.97)",
            }}
          />

          {/* --- CONTENT LAYER --- */}
          <div className="relative z-20 w-full h-full flex flex-col px-28 pt-24 pb-20">
            {/* 1. Header Section */}
            <div className="flex justify-between items-start w-full">
              <div className="w-[140px]" />

              <div className="flex-1 flex flex-col items-center text-center">
                <h1
                  className="text-[48px] font-extrabold leading-none tracking-tight uppercase"
                  style={{ color: textColor }}
                >
                  KUG Oriental Academy
                </h1>
                <p
                  className="text-[20px] font-medium mt-2"
                  style={{ color: textColor, opacity: 0.8 }}
                >
                  of Alternative Medicines Allied Sciences Foundation
                </p>
                <p
                  className="text-[18px] mt-1 font-semibold"
                  style={{ color: textColor, opacity: 0.85 }}
                >
                  Thoppil square, Malappuram Road{" "}
                  <span className="font-bold" style={{ color: textColor }}>
                    Kottakkal
                  </span>
                </p>

                {/* Contact Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    marginTop: "8px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: textColor,
                    whiteSpace: "nowrap",
                    lineHeight: "1.5",
                  }}
                >
                  <span style={{ whiteSpace: "nowrap", opacity: 0.85 }}>
                    www.kugoriental-academy.com
                  </span>
                  <span style={{ color: textColor, fontSize: "16px", opacity: 0.6 }}>
                    |
                  </span>
                  <span style={{ whiteSpace: "nowrap", opacity: 0.85 }}>
                    8921728267,9961046666
                  </span>
                </div>
              </div>

              {/* Right Logo */}
              <div className="w-[140px] flex justify-end">
                {workshop.logo_url && (
                  <img
                    src={workshop.logo_url}
                    alt="Logo"
                    className="w-24 h-24 object-contain drop-shadow-lg rounded-full bg-white p-1"
                    crossOrigin="anonymous"
                  />
                )}
              </div>
            </div>

            {/* 2. Certificate Title */}
            <div className="w-full text-center mt-10 mb-4">
              <h2
                className="text-[80px] font-bold leading-none tracking-tighter"
                style={{
                  color: titleColor,
                  textShadow: "2px 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                CERTIFICATE
              </h2>
              <p
                className="text-[30px] uppercase tracking-[0.25em] font-light mt-3"
                style={{ color: textColor, opacity: 0.7 }}
              >
                Of PARTICIPATION
              </p>
            </div>

            {/* 3. Recipient Section */}
            <div className="w-full text-center mb-6">
              <p
                className="text-[22px] italic mb-3"
                style={{ color: textColor, opacity: 0.7 }}
              >
                This certificate is proudly presented to
              </p>

              <div className="relative inline-block min-w-[520px]">
                <h3
                  className="text-[60px] font-bold uppercase z-10 relative px-6"
                  style={{
                    color: nameColor,
                    fontFamily: "Georgia, serif",
                    textShadow: "1px 1px 0px rgba(0,0,0,0.1)",
                  }}
                >
                  {participantName}
                </h3>

                {/* Decorative Line with Diamonds */}
                <div className="flex items-center justify-center gap-0 w-full mt-3">
                  <div
                    className="w-2.5 h-2.5 rotate-45"
                    style={{ backgroundColor: nameColor }}
                  />
                  <div
                    className="h-[2px] flex-1 mx-[-4px]"
                    style={{ backgroundColor: nameColor }}
                  />
                  <div
                    className="w-2.5 h-2.5 rotate-45"
                    style={{ backgroundColor: nameColor }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Body Text */}
            <div className="w-full text-center max-w-5xl mx-auto space-y-2">
              <p className="text-[22px] leading-relaxed" style={{ color: textColor }}>
                has successfully participated in the {getDurationText()}{" "}
                <span className="font-extrabold" style={{ color: textColor }}>
                  {workshop.name}
                </span>
              </p>
              <p className="text-[22px] leading-relaxed" style={{ color: textColor }}>
                held on{" "}
                <span className="font-semibold">{getDateRange()}</span> at{" "}
                {locationName}
              </p>

              {workshop.description && (
                <p
                  className="text-[19px] mt-4 max-w-4xl mx-auto leading-normal"
                  style={{ color: textColor, opacity: 0.8 }}
                >
                  {workshop.description}
                </p>
              )}
            </div>

            {/* 5. Footer / Signatures */}
            <div className="mt-auto w-full flex justify-between items-end px-16 gap-6">
              {/* Left: Chairman */}
              <div className="flex flex-col items-center">
                <div className="h-16 w-48 flex items-end justify-center" />
                <div className="w-48 h-[2px] bg-gray-700 mt-1" />
                <p
                  className="text-[18px] font-bold uppercase mt-2 tracking-wide"
                  style={{ color: textColor, opacity: 0.8 }}
                >
                  Chairman
                </p>
                <p className="text-[20px] font-extrabold" style={{ color: textColor }}>
                  P.Ummer Gurukkal
                </p>
              </div>

              {/* Center: Date */}
              <div className="flex flex-col items-center">
                <p className="text-[22px] font-bold" style={{ color: textColor }}>
                  DATE :{" "}
                  <span
                    className="font-semibold"
                    style={{ color: textColor, opacity: 0.8 }}
                  >
                    {formatDate(workshop.start_date)}
                  </span>
                </p>
              </div>

              {/* Right: Dynamic Signatory */}
              {showSignatory && (
                <div className="flex flex-col items-center">
                  <div className="h-16 w-56 flex items-end justify-center" />
                  <div className="w-56 h-[2px] bg-gray-700 mt-1" />

                  {signatoryTitle && (
                    <p
                      className="text-[18px] font-bold uppercase mt-2 tracking-wide text-center"
                      style={{ color: textColor, opacity: 0.8 }}
                    >
                      {signatoryTitle}
                    </p>
                  )}

                  {signatoryName && (
                    <p
                      className="text-[20px] font-extrabold text-center"
                      style={{ color: textColor }}
                    >
                      {signatoryName}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downloading Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Preparing your PDF download. This ensures high print quality.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDownloading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? "Generating..." : "Download"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkshopTemplate;