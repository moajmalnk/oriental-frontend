import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Award } from "lucide-react";
import jsPDF from "jspdf";
import { Student } from "@/types";
import { useResponsive } from "@/hooks/use-responsive";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PrintPDFButtonsProps {
  student: Student;
}

export const PrintPDFButtons = ({ student }: PrintPDFButtonsProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      // Add a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Hide theme toggle and other UI elements during print
      const themeToggle = document.querySelector("[data-print-hide]");
      if (themeToggle) {
        themeToggle.classList.add("print:hidden");
      }

      window.print();

      toast({
        title: "Print Ready",
        description: "Print dialog opened successfully",
      });
    } catch (error) {
      toast({
        title: "Print Error",
        description: "Failed to open print dialog",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);

      // Restore theme toggle visibility
      const themeToggle = document.querySelector("[data-print-hide]");
      if (themeToggle) {
        themeToggle.classList.remove("print:hidden");
      }
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      // Show loading toast
      toast({
        title: "Generating PDF",
        description: "Please wait while we create your result document...",
      });

      // Wait for any animations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add letterhead background with compression
      try {
        const letterheadImg = new Image();
        letterheadImg.crossOrigin = "anonymous";
        letterheadImg.src = "/letterhead.jpg";

        await new Promise((resolve, reject) => {
          letterheadImg.onload = () => {
            // Create a canvas to compress the image
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Set canvas size to a reasonable resolution (max 1200px width)
            const maxWidth = 3000; // ~300 DPI for A4 width
            const maxHeight = 4243.55;
            const imgWidth = letterheadImg.width;
            const imgHeight = letterheadImg.height;

            // Calculate new dimensions maintaining aspect ratio
            let newWidth = imgWidth;
            let newHeight = imgHeight;

            if (imgWidth > maxWidth) {
              newWidth = maxWidth;
              newHeight = (imgHeight * maxWidth) / imgWidth;
            }

            if (newHeight > maxHeight) {
              newHeight = maxHeight;
              newWidth = (imgWidth * maxHeight) / imgHeight;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            // Draw and compress the image
            ctx?.drawImage(letterheadImg, 0, 0, newWidth, newHeight);

            // Convert to compressed data URL with optimized quality
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6); // 60% quality for better compression

            // Create new image from compressed data
            const compressedImg = new Image();
            compressedImg.onload = () => {
              // Scale to fit the page
              const scale = Math.min(
                pdfWidth / compressedImg.width,
                pdfHeight / compressedImg.height,
              );
              const finalWidth = compressedImg.width * scale;
              const finalHeight = compressedImg.height * scale;

              // Center the letterhead
              const x = (pdfWidth - finalWidth) / 2;
              const y = (pdfHeight - finalHeight) / 2;

              pdf.addImage(
                compressedImg,
                "JPEG",
                x,
                y,
                finalWidth,
                finalHeight,
              );
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          letterheadImg.onerror = reject;
        });
      } catch (error) {
        console.warn(
          "Could not load letterhead image, continuing without it:",
          error,
        );
      }

      // Add MARK LIST title
      pdf.setFontSize(23);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("times", "bold");
      pdf.text("MARK LIST", pdfWidth / 2, 85, { align: "center" });

      // Add student information section
      const startY = 96;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");

      pdf.text(`Register Number : ${student.RegiNo}`, 19, startY);
      pdf.text(`Name of Candidate : ${student.Name}`, 19, startY + 8);
      pdf.text(`Course Name : ${student.Course}`, 19, startY + 16);

      // Convert result to Qualified/Not Qualified
      const displayResult =
        student.Result === "Pass" ||
        student.Result === "PASS" ||
        student.Result === "pass"
          ? "Qualified"
          : "Not Qualified";
      pdf.text(`Result : ${displayResult}`, 19, startY + 24);

      // Add marks table
      const tableStartY = startY + 34;
      const colWidths = [80, 25, 25, 25]; // SUBJECT, TE, CE, TOTAL
      const totalTableWidth =
        colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]; // Total table width
      const tableStartX = (pdfWidth - totalTableWidth) / 2; // Center the table

      // Detect active practical fields for use in both tables
      const allPracticalFields = [
        { key: "PE", label: "P.E", maxKey: "PE_Max" },
        { key: "PW", label: "P.W", maxKey: "PW_Max" },
        { key: "PR", label: "P.R", maxKey: "PR_Max" },
        { key: "Project", label: "Proj", maxKey: "Project_Max" },
        { key: "Viva", label: "Viva", maxKey: "Viva_Max" },
        { key: "PL", label: "PL", maxKey: "PL_Max" },
      ];

      const practicalSubjectsList =
        student.Subjects?.filter(
          (subject: any) => subject?.SubjectType === "Practical",
        ) || [];

      // Determine all columns (Standard + Combined)
      let activeColumns: Array<{
        type: "standard" | "combined";
        key: string;
        label: string;
        maxKey?: string;
      }> = [];

      // Add Standard Fields
      allPracticalFields.forEach((field) => {
        const isActive = practicalSubjectsList.some((s: any) => {
          // Check if field has data
          const hasData =
            (s[field.key] !== null && s[field.key] !== undefined) ||
            (s[field.maxKey] !== null &&
              s[field.maxKey] !== undefined &&
              s[field.maxKey] !== 0);

          // Check if field is hidden by combination
          const isHidden =
            s.practical_settings?.combination?.fields?.includes(
              field.key.toLowerCase(),
            ) || s.practical_settings?.combination?.fields?.includes(field.key); // check both cases

          return hasData && !isHidden; // Only show if used and NOT hidden
        });

        if (isActive) {
          activeColumns.push({ ...field, type: "standard" });
        }
      });

      // Add Combined Fields
      const uniqueCombinedNames = new Set<string>();
      practicalSubjectsList.forEach((s: any) => {
        if (s.practical_settings?.combination?.name) {
          uniqueCombinedNames.add(s.practical_settings.combination.name);
        }
      });

      uniqueCombinedNames.forEach((name) => {
        activeColumns.push({
          type: "combined",
          key: name,
          label: name,
        });
      });

      // Default to PE and PW if no fields are active (legacy behavior fallback)
      if (activeColumns.length === 0) {
        activeColumns = [
          { type: "standard", key: "PE", label: "P.E", maxKey: "PE_Max" },
          { type: "standard", key: "PW", label: "P.W", maxKey: "PW_Max" },
        ];
      }

      // Calculate column widths
      const practNameColWidth = 80;
      const practTotalColWidth = 25;
      const availableWidthForMarks = 50;
      const markColWidth = availableWidthForMarks / activeColumns.length;

      // Table header
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");

      // Set border color to #a16a2b
      pdf.setDrawColor(161, 106, 43);

      // Draw rounded rectangles for table header
      pdf.roundedRect(tableStartX, tableStartY - 5, colWidths[0], 8, 1.5, 1.5);
      pdf.roundedRect(
        tableStartX + colWidths[0],
        tableStartY - 5,
        colWidths[1],
        8,
        1.5,
        1.5,
      );
      pdf.roundedRect(
        tableStartX + colWidths[0] + colWidths[1],
        tableStartY - 5,
        colWidths[2],
        8,
        1.5,
        1.5,
      );
      pdf.roundedRect(
        tableStartX + colWidths[0] + colWidths[1] + colWidths[2],
        tableStartY - 5,
        colWidths[3],
        8,
        1.5,
        1.5,
      );

      pdf.text("SUBJECT-THEORY", tableStartX + 3, tableStartY);
      pdf.text(
        "TE",
        tableStartX + colWidths[0] + colWidths[1] / 2,
        tableStartY,
        { align: "center" },
      );
      pdf.text(
        "CE",
        tableStartX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
        tableStartY,
        { align: "center" },
      );
      pdf.text(
        "TOTAL",
        tableStartX +
          colWidths[0] +
          colWidths[1] +
          colWidths[2] +
          colWidths[3] / 2,
        tableStartY,
        { align: "center" },
      );

      let currentY = tableStartY + 8;

      // Add subject rows using actual backend data (only theory subjects)
      if (student.Subjects && student.Subjects.length > 0) {
        // Filter only theory subjects for the theory section
        const theorySubjects = student.Subjects.filter(
          (subject: any) => subject?.SubjectType === "Theory",
        );

        // Use actual backend subjects data (only theory subjects)
        const subjects = theorySubjects.map((subject: any) => ({
          name: subject?.SubjectName || "-",
          ce: subject?.CE || null,
          te: subject?.TE || null,
          pe: subject?.PE || null,
          pw: subject?.PW || null,
          theoryTotal: subject?.TheoryTotal || null,
          practicalTotal: subject?.PracticalTotal || null,
          overallObtained: subject?.OverallObtained || null,
          subjectType: subject?.SubjectType || "Theory",
          // Maximum scores from subject configuration
          ceMax: subject?.CE_Max || null,
          teMax: subject?.TE_Max || null,
          peMax: subject?.PE_Max || null,
          pwMax: subject?.PW_Max || null,
          theoryTotalMax: subject?.TheoryTotal_Max || null,
          practicalTotalMax: subject?.PracticalTotal_Max || null,
          overallTotalMax: subject?.OverallTotal_Max || null,
        }));

        subjects.forEach((subject, index) => {
          const rowY = currentY + index * 8;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);

          // Draw cell borders with rounded corners
          pdf.roundedRect(tableStartX, rowY - 5, colWidths[0], 8, 1.5, 1.5);
          pdf.roundedRect(
            tableStartX + colWidths[0],
            rowY - 5,
            colWidths[1],
            8,
            1.5,
            1.5,
          );
          pdf.roundedRect(
            tableStartX + colWidths[0] + colWidths[1],
            rowY - 5,
            colWidths[2],
            8,
            1.5,
            1.5,
          );
          pdf.roundedRect(
            tableStartX + colWidths[0] + colWidths[1] + colWidths[2],
            rowY - 5,
            colWidths[3],
            8,
            1.5,
            1.5,
          );

          // Add text
          pdf.text(subject.name || "-", tableStartX + 3, rowY);
          pdf.text(
            subject.te?.toString() || "-",
            tableStartX + colWidths[0] + colWidths[1] / 2,
            rowY,
            { align: "center" },
          );
          pdf.text(
            subject.ce?.toString() || "-",
            tableStartX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
            rowY,
            { align: "center" },
          );
          pdf.text(
            subject.overallObtained?.toString() || "-",
            tableStartX +
              colWidths[0] +
              colWidths[1] +
              colWidths[2] +
              colWidths[3] / 2,
            rowY,
            { align: "center" },
          );
        });

        currentY += subjects.length * 8 + 5;

        // Practical section with merged first column

        // Draw the merged PRACTICAL cell spanning 2 rows
        pdf.roundedRect(
          tableStartX,
          currentY - 5,
          practNameColWidth,
          16,
          1.5,
          1.5,
        ); // Height of 16 for 2 rows

        // Draw Header Rectangles and Text
        let currentX = tableStartX + practNameColWidth;

        activeColumns.forEach((col) => {
          pdf.roundedRect(currentX, currentY - 5, markColWidth, 8, 1.5, 1.5);
          pdf.text(col.label, currentX + markColWidth / 2, currentY, {
            align: "center",
          });
          currentX += markColWidth;
        });

        // Draw Total Header
        pdf.roundedRect(
          currentX,
          currentY - 5,
          practTotalColWidth,
          8,
          1.5,
          1.5,
        );
        pdf.text("TOTAL", currentX + practTotalColWidth / 2, currentY, {
          align: "center",
        });

        // Draw "PRACTICAL" label (or subject name) in the merged cell
        const practLabel =
          practicalSubjectsList.length > 0
            ? practicalSubjectsList[0].SubjectName || "PRACTICAL"
            : "PRACTICAL";
        pdf.text(practLabel, tableStartX + 3, currentY + 4);

        currentY += 8;

        // Draw Data Rectangles
        currentX = tableStartX + practNameColWidth;
        activeColumns.forEach(() => {
          pdf.roundedRect(currentX, currentY - 5, markColWidth, 8, 1.5, 1.5);
          currentX += markColWidth;
        });
        pdf.roundedRect(
          currentX,
          currentY - 5,
          practTotalColWidth,
          8,
          1.5,
          1.5,
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);

        if (practicalSubjectsList.length > 0) {
          const practicalSubject = practicalSubjectsList[0]; // Using first practical subject

          currentX = tableStartX + practNameColWidth;
          activeColumns.forEach((col) => {
            let cellValue = "-";

            if (col.type === "standard") {
              const pSettings = practicalSubject.practical_settings;
              const isCombined = !!pSettings?.combination;
              const isHidden =
                isCombined &&
                (pSettings.combination.fields.includes(col.key.toLowerCase()) ||
                  pSettings.combination.fields.includes(col.key));

              if (!isHidden) {
                cellValue = practicalSubject[col.key]?.toString() || "-";
              }
            } else if (col.type === "combined") {
              const pSettings = practicalSubject.practical_settings;
              if (
                pSettings?.combination &&
                pSettings.combination.name === col.key
              ) {
                // Calculate combo value
                const comboFields = pSettings.combination.fields;
                const total = comboFields.reduce((sum: number, f: string) => {
                  const fk = f.toUpperCase();
                  let val = 0;
                  if (fk === "PE") val = practicalSubject.PE || 0;
                  if (fk === "PW") val = practicalSubject.PW || 0;
                  if (fk === "PR") val = practicalSubject.PR || 0;
                  if (fk === "PROJECT") val = practicalSubject.Project || 0;
                  if (fk === "VIVA") val = practicalSubject.Viva || 0;
                  if (fk === "PL") val = practicalSubject.PL || 0;
                  return sum + val;
                }, 0);
                cellValue = total.toString();
              }
            }

            pdf.text(cellValue, currentX + markColWidth / 2, currentY, {
              align: "center",
            });
            currentX += markColWidth;
          });

          pdf.text(
            practicalSubject?.PracticalTotal?.toString() || "-",
            currentX + practTotalColWidth / 2,
            currentY,
            { align: "center" },
          );
        } else {
          // Empty row
          currentX = tableStartX + practNameColWidth;
          activeColumns.forEach(() => {
            pdf.text("-", currentX + markColWidth / 2, currentY, {
              align: "center",
            });
            currentX += markColWidth;
          });
          pdf.text("-", currentX + practTotalColWidth / 2, currentY, {
            align: "center",
          });
        }
      }

      // Add abbreviation
      currentY += 14;
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Abbreviation: CE-Continuous Evaluation, TE-Terminal Evaluation, P.E-Practical Evaluation, P.W-Practical Work",
        pdfWidth / 2,
        currentY,
        { align: "center" },
      );
      currentY += 4;
      pdf.text(
        "P.R-Practical Record, Proj-Project, Viva-Viva Voce, PL-Practical Lab",
        pdfWidth / 2,
        currentY,
        { align: "center" },
      );

      // Add maximum scores section
      currentY += 12;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("MAXIMUM SCORES", pdfWidth / 2, currentY, { align: "center" });

      currentY += 10;

      // Maximum scores table header
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");

      // Ensure border color is set for maximum scores table
      pdf.setDrawColor(161, 106, 43);

      pdf.roundedRect(tableStartX, currentY - 5, colWidths[0], 8, 1.5, 1.5);
      pdf.roundedRect(
        tableStartX + colWidths[0],
        currentY - 5,
        colWidths[1],
        8,
        1.5,
        1.5,
      );
      pdf.roundedRect(
        tableStartX + colWidths[0] + colWidths[1],
        currentY - 5,
        colWidths[2],
        8,
        1.5,
        1.5,
      );
      pdf.roundedRect(
        tableStartX + colWidths[0] + colWidths[1] + colWidths[2],
        currentY - 5,
        colWidths[3],
        8,
        1.5,
        1.5,
      );

      pdf.text("SUBJECT-THEORY", tableStartX + 3, currentY);
      pdf.text("TE", tableStartX + colWidths[0] + colWidths[1] / 2, currentY, {
        align: "center",
      });
      pdf.text(
        "CE",
        tableStartX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
        currentY,
        { align: "center" },
      );
      pdf.text(
        "TOTAL",
        tableStartX +
          colWidths[0] +
          colWidths[1] +
          colWidths[2] +
          colWidths[3] / 2,
        currentY,
        { align: "center" },
      );

      currentY += 8;

      // Add maximum scores rows using backend data (only theory subjects)
      if (student.Subjects && student.Subjects.length > 0) {
        // Filter only theory subjects for maximum scores
        const theorySubjects = student.Subjects.filter(
          (subject: any) => subject?.SubjectType === "Theory",
        );

        // Use actual backend subjects data for maximum scores (only theory subjects)
        const maxSubjects = theorySubjects.map((subject: any) => ({
          name: subject?.SubjectName || "-",
          ce: subject?.CE_Max || null,
          te: subject?.TE_Max || null,
          overallObtained: subject?.OverallTotal_Max || null,
        }));

        maxSubjects.forEach((subject, index) => {
          const rowY = currentY + index * 8;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);

          // Draw cell borders with rounded corners
          pdf.roundedRect(tableStartX, rowY - 5, colWidths[0], 8, 1.5, 1.5);
          pdf.roundedRect(
            tableStartX + colWidths[0],
            rowY - 5,
            colWidths[1],
            8,
            1.5,
            1.5,
          );
          pdf.roundedRect(
            tableStartX + colWidths[0] + colWidths[1],
            rowY - 5,
            colWidths[2],
            8,
            1.5,
            1.5,
          );
          pdf.roundedRect(
            tableStartX + colWidths[0] + colWidths[1] + colWidths[2],
            rowY - 5,
            colWidths[3],
            8,
            1.5,
            1.5,
          );

          // Add text
          pdf.text(subject.name || "-", tableStartX + 3, rowY);
          pdf.text(
            subject.te?.toString() || "-",
            tableStartX + colWidths[0] + colWidths[1] / 2,
            rowY,
            { align: "center" },
          );
          pdf.text(
            subject.ce?.toString() || "-",
            tableStartX + colWidths[0] + colWidths[1] + colWidths[2] / 2,
            rowY,
            { align: "center" },
          );
          pdf.text(
            subject.overallObtained?.toString() || "-",
            tableStartX +
              colWidths[0] +
              colWidths[1] +
              colWidths[2] +
              colWidths[3] / 2,
            rowY,
            { align: "center" },
          );
        });

        currentY += maxSubjects.length * 8 + 5;

        // Practical maximum scores with merged first column
        // Draw the merged PRACTICAL cell spanning 2 rows
        pdf.roundedRect(
          tableStartX,
          currentY - 5,
          practNameColWidth,
          16,
          1.5,
          1.5,
        ); // Height of 16 for 2 rows

        // Draw Header Rectangles and Text
        let maxCurrentX = tableStartX + practNameColWidth;

        activeColumns.forEach((col) => {
          pdf.roundedRect(maxCurrentX, currentY - 5, markColWidth, 8, 1.5, 1.5);
          pdf.text(col.label, maxCurrentX + markColWidth / 2, currentY, {
            align: "center",
          });
          maxCurrentX += markColWidth;
        });

        // Draw Total Header
        pdf.roundedRect(
          maxCurrentX,
          currentY - 5,
          practTotalColWidth,
          8,
          1.5,
          1.5,
        );
        pdf.text("TOTAL", maxCurrentX + practTotalColWidth / 2, currentY, {
          align: "center",
        });

        // Draw "PRACTICAL" label (or subject name) in the merged cell
        const practLabel =
          practicalSubjectsList.length > 0
            ? practicalSubjectsList[0].SubjectName || "PRACTICAL"
            : "PRACTICAL";
        pdf.text(practLabel, tableStartX + 3, currentY + 4);

        currentY += 8;

        // Draw Data Rectangles
        maxCurrentX = tableStartX + practNameColWidth;
        activeColumns.forEach(() => {
          pdf.roundedRect(maxCurrentX, currentY - 5, markColWidth, 8, 1.5, 1.5);
          maxCurrentX += markColWidth;
        });
        pdf.roundedRect(
          maxCurrentX,
          currentY - 5,
          practTotalColWidth,
          8,
          1.5,
          1.5,
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);

        if (practicalSubjectsList.length > 0) {
          const practicalSubject = practicalSubjectsList[0]; // Using first practical subject

          maxCurrentX = tableStartX + practNameColWidth;
          activeColumns.forEach((col) => {
            let cellValue = "-";

            if (col.type === "standard") {
              // For standard fields, use maxKey to get the max score
              if (col.maxKey) {
                // Check if hidden (shouldn't happen here as activeColumns filters them out, but good safety)
                const pSettings = practicalSubject.practical_settings;
                const isCombined = !!pSettings?.combination;
                const isHidden =
                  isCombined &&
                  (pSettings.combination.fields.includes(
                    col.key.toLowerCase(),
                  ) ||
                    pSettings.combination.fields.includes(col.key));

                if (!isHidden) {
                  cellValue = practicalSubject[col.maxKey]?.toString() || "-";
                }
              }
            } else if (col.type === "combined") {
              // For combined fields, sum the max scores of constituent fields
              const pSettings = practicalSubject.practical_settings;
              if (
                pSettings?.combination &&
                pSettings.combination.name === col.key
              ) {
                const comboFields = pSettings.combination.fields;
                // Map field codes to their MAX key counterparts
                // PE -> PE_Max, etc.
                const totalMax = comboFields.reduce(
                  (sum: number, f: string) => {
                    const fk = f.toUpperCase();
                    let val = 0;
                    if (fk === "PE") val = practicalSubject.PE_Max || 0;
                    if (fk === "PW") val = practicalSubject.PW_Max || 0;
                    if (fk === "PR") val = practicalSubject.PR_Max || 0;
                    if (fk === "PROJECT")
                      val = practicalSubject.Project_Max || 0;
                    if (fk === "VIVA") val = practicalSubject.Viva_Max || 0;
                    if (fk === "PL") val = practicalSubject.PL_Max || 0;
                    return sum + val;
                  },
                  0,
                );
                cellValue = totalMax.toString();
              }
            }

            pdf.text(cellValue, maxCurrentX + markColWidth / 2, currentY, {
              align: "center",
            });
            maxCurrentX += markColWidth;
          });

          pdf.text(
            practicalSubject?.PracticalTotal_Max?.toString() || "-",
            maxCurrentX + practTotalColWidth / 2,
            currentY,
            { align: "center" },
          );
        } else {
          // Empty row
          maxCurrentX = tableStartX + practNameColWidth;
          activeColumns.forEach(() => {
            pdf.text("-", maxCurrentX + markColWidth / 2, currentY, {
              align: "center",
            });
            maxCurrentX += markColWidth;
          });
          pdf.text("-", maxCurrentX + practTotalColWidth / 2, currentY, {
            align: "center",
          });
        }
      }

      // Add footer fields centered within two equal halves of the page
      currentY += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Calculate centers for left and right halves
      const leftCenterX = pdfWidth / 4;
      const rightCenterX = (pdfWidth * 3) / 4;

      // Display certificate number centered in left half
      const certificateNo = student.CertificateNumber || "Not Assigned";
      pdf.text(`CERTIFICATE NO: ${certificateNo}`, leftCenterX, currentY, {
        align: "center",
      });

      // Display date centered in right half
      let displayDate = "";
      if (student.PublishedDate) {
        displayDate = new Date(student.PublishedDate)
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, "-");
      } else {
        displayDate = new Date()
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, "-");
      }
      pdf.text(`DATE: ${displayDate}`, rightCenterX, currentY, {
        align: "center",
      });
      const sealSize = 15; // Reduced from 21mm for smaller seal
      const sealX = pdfWidth * 0.52 - sealSize / 2;
      const sealY = pdfHeight - 12.91 - sealSize;
      // Add KUG seal - positioned below signatures
      // Based on CSS: .kug-seal left: 52%, bottom: 3% - 80px x 80px (90px on larger screens)
      try {
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.src = "/kug seal.png";

        await new Promise((resolve, reject) => {
          sealImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            // Use higher resolution multiplier for seal (8x for 300 DPI quality)
            canvas.width = sealSize * 24;
            canvas.height = sealSize * 24;
            ctx?.drawImage(sealImg, 0, 0, canvas.width, canvas.height);
            // Use maximum quality (1.0) for PNG seal to maintain transparency and crisp details
            const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

            const compressedImg = new Image();
            compressedImg.onload = () => {
              // Use different width and height for rectangular seal if needed
              const sealWidth = 21;
              const sealHeight = 28;
              pdf.addImage(
                compressedImg,
                "PNG",
                sealX - 4,
                sealY - 9.5,
                sealWidth,
                sealHeight,
              );
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          sealImg.onerror = () => {
            console.warn("Could not load KUG seal");
            resolve(true);
          };
        });
      } catch (error) {
        console.warn("Could not load KUG seal:", error);
      }

      // Save the PDF
      pdf.save(
        `${student.RegiNo}_${student.Name.replace(/\s+/g, "_")}_MarkList.pdf`,
      );

      toast({
        title: "PDF Downloaded",
        description: "Your mark list document has been saved successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error creating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setIsGeneratingCertificate(true);

    try {
      // Show loading toast
      toast({
        title: "Generating Certificate",
        description: "Please wait while we create your certificate...",
      });

      // Wait for any animations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Load and add certificate template background with compression
      try {
        const templateImg = new Image();
        templateImg.crossOrigin = "anonymous";
        templateImg.src = "/Course Certificate Model WEB .jpg";

        await new Promise((resolve, reject) => {
          templateImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Use higher resolution for certificate template (300 DPI equivalent)
            const maxWidth = 3000; // ~300 DPI for A4 width
            const maxHeight = 4243.55; // ~300 DPI for A4 height
            const imgWidth = templateImg.width;
            const imgHeight = templateImg.height;

            let newWidth = imgWidth;
            let newHeight = imgHeight;

            if (imgWidth > maxWidth) {
              newWidth = maxWidth;
              newHeight = (imgHeight * maxWidth) / imgWidth;
            }

            if (newHeight > maxHeight) {
              newHeight = maxHeight;
              newWidth = (imgWidth * maxHeight) / imgHeight;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx?.drawImage(templateImg, 0, 0, newWidth, newHeight);
            // Use high quality (0.95) for certificate template to maintain crisp details
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

            const compressedImg = new Image();
            compressedImg.onload = () => {
              const scale = Math.min(
                pdfWidth / compressedImg.width,
                pdfHeight / compressedImg.height,
              );
              const finalWidth = compressedImg.width * scale;
              const finalHeight = compressedImg.height * scale;
              const x = (pdfWidth - finalWidth) / 2;
              const y = (pdfHeight - finalHeight) / 2;

              pdf.addImage(
                compressedImg,
                "JPEG",
                x,
                y,
                finalWidth,
                finalHeight,
              );
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          templateImg.onerror = reject;
        });
      } catch (error) {
        console.warn(
          "Could not load certificate template, continuing without it:",
          error,
        );
      }

      // Calculate positions based on Certificate.css percentages
      // PDF dimensions: 210mm x 297mm (A4)

      // Reference numbers: left: 8%, top: 45% -> x: 16.8mm, y: 133.65mm
      const refX = 16.8;
      const refStartY = 133.65;

      // Student photo: right: 8%, top: 45% -> x: 193.2 - photoWidth, y: 133.65
      const photoSize = 21; // 80px approximately = 21mm
      const photoX = pdfWidth - 16.8 - photoSize;
      const photoY = 133.65;

      // Course conferred: center horizontally, top: 50% -> x: 105mm, y: 148.5mm
      const courseX = pdfWidth / 2;
      const courseStartY = 148.5;

      // Student name: center horizontally, top: 60% -> x: 105mm, y: 178.2mm
      const nameY = 185;

      // Completion statement: positioned for better text wrapping
      // Based on Certificate.css: left: 40%, top: 66%, translateX(-33%)
      // This means text should start at left: 40% and width should be about 70% of page
      const statementStartY = 196;

      // Bottom signatures: bottom: 14% -> y: 255.42mm
      const bottomY = 255.42;

      // KUG seal: center horizontally (52%), bottom: 3% -> x: 109.2mm, y: 288mm
      const sealSize = 15; // Reduced from 21mm for smaller seal
      const sealX = pdfWidth * 0.52 - sealSize / 2;
      const sealY = pdfHeight - 12.91 - sealSize;

      // Load and add student photo
      try {
        if (student.Photo) {
          const photoUrl = student.Photo.startsWith("http")
            ? student.Photo
            : `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}${
                student.Photo
              }`;

          const photoImg = new Image();
          photoImg.crossOrigin = "anonymous";
          photoImg.src = photoUrl;

          await new Promise((resolve, reject) => {
            photoImg.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              // Use higher resolution multiplier for photos (8x instead of 4x for 300 DPI quality)
              canvas.width = photoSize * 16;
              canvas.height = (photoSize * 16 * 90) / 80;
              ctx?.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
              // Use high quality (0.95) for student photos to maintain clarity
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

              const compressedPhoto = new Image();
              compressedPhoto.onload = () => {
                // Match CSS: 80px x 90px aspect ratio
                pdf.addImage(
                  compressedPhoto,
                  "JPEG",
                  photoX - 2,
                  photoY - 8,
                  photoSize,
                  photoSize * 1.2,
                );
                resolve(true);
              };
              compressedPhoto.src = compressedDataUrl;
            };
            photoImg.onerror = () => {
              console.warn("Could not load student photo");
              resolve(true);
            };
          });
        }
      } catch (error) {
        console.warn("Could not load student photo:", error);
      }

      // Load and add chairman signature
      try {
        const chairmanImg = new Image();
        chairmanImg.crossOrigin = "anonymous";
        chairmanImg.src = "/UMMER SIR SIGN.png";

        await new Promise((resolve, reject) => {
          chairmanImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const signWidth = 21;
            const signHeight = 15;
            // Use higher resolution multiplier for signatures (8x for 300 DPI quality)
            canvas.width = signWidth * 24;
            canvas.height = signHeight * 24;
            ctx?.drawImage(chairmanImg, 0, 0, canvas.width, canvas.height);
            // Use maximum quality (1.0) for PNG signatures to maintain transparency and crisp edges
            const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

            const compressedImg = new Image();
            compressedImg.onload = () => {
              // Chairman signature positioned at center with proper spacing
              pdf.addImage(
                compressedImg,
                "PNG",
                courseX - signWidth / 2 - 5,
                bottomY - 25,
                signWidth + 12,
                (signWidth * compressedImg.height) / compressedImg.width + 12,
              );
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          chairmanImg.onerror = () => {
            console.warn("Could not load chairman signature");
            resolve(true);
          };
        });
      } catch (error) {
        console.warn("Could not load chairman signature:", error);
      }

      // Load and add controller signature
      try {
        const controllerImg = new Image();
        controllerImg.crossOrigin = "anonymous";
        controllerImg.src = "/Nargees teacher Sign.png";

        await new Promise((resolve, reject) => {
          controllerImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const signWidth = 24;
            const signHeight = 15;
            // Use higher resolution multiplier for signatures (8x for 300 DPI quality)
            canvas.width = signWidth * 24;
            canvas.height = signHeight * 24;
            ctx?.drawImage(controllerImg, 0, 0, canvas.width, canvas.height);
            // Use maximum quality (1.0) for PNG signatures to maintain transparency and crisp edges
            const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

            const compressedImg = new Image();
            compressedImg.onload = () => {
              // Controller signature positioned on right side
              pdf.addImage(
                compressedImg,
                "PNG",
                pdfWidth - refX - signWidth - 15,
                bottomY - 26,
                signWidth + 12,
                (signWidth * compressedImg.height) / compressedImg.width + 12,
              );
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          controllerImg.onerror = () => {
            console.warn("Could not load controller signature");
            resolve(true);
          };
        });
      } catch (error) {
        console.warn("Could not load controller signature:", error);
      }

      // Load and add KUG seal
      try {
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.src = "/kug seal.png";

        await new Promise((resolve, reject) => {
          sealImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            // Use higher resolution multiplier for seal (8x for 300 DPI quality)
            canvas.width = sealSize * 24;
            canvas.height = sealSize * 24;
            ctx?.drawImage(sealImg, 0, 0, canvas.width, canvas.height);
            // Use maximum quality (1.0) for PNG seal to maintain transparency and crisp details
            const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

            const compressedImg = new Image();
            compressedImg.onload = () => {
              // Use different width and height for rectangular seal if needed
              const sealWidth = 23;
              const sealHeight = 33;
              pdf.addImage(
                compressedImg,
                "PNG",
                sealX - 4,
                sealY - 13,
                sealWidth,
                sealHeight,
              );
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          sealImg.onerror = () => {
            console.warn("Could not load KUG seal");
            resolve(true);
          };
        });
      } catch (error) {
        console.warn("Could not load KUG seal:", error);
      }

      // Add reference numbers matching Certificate.tsx structure
      pdf.setFontSize(11);
      pdf.setFont("times", "bold");

      // Register No.
      pdf.setTextColor(139, 69, 19); // #8b4513 (brown)
      pdf.text("Register No.", refX, refStartY);
      pdf.setTextColor(198, 40, 40); // #c62828 (deep red)
      pdf.text(`: ${student.RegiNo}`, refX + 22, refStartY);

      // Certificate No.
      pdf.setTextColor(139, 69, 19); // #8b4513 (brown)
      pdf.text("Certificate No.", refX, refStartY + 8);
      pdf.setTextColor(17, 17, 17); // #111 (dark gray)
      pdf.text(
        `: ${student.CertificateNumber || "2025" + student.RegiNo.slice(-4)}`,
        refX + 25,
        refStartY + 8,
      );

      // Add course conferred section
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("times", "normal");
      pdf.text("The certificate of", courseX, courseStartY, {
        align: "center",
      });

      pdf.setFontSize(20);
      pdf.setFont("times", "bold");
      pdf.text(student.Course, courseX, courseStartY + 10, { align: "center" });

      pdf.setFontSize(14);
      pdf.setFont("times", "normal");
      pdf.text("has been conferred upon", courseX, courseStartY + 20, {
        align: "center",
      });

      // Add student name with letter-spacing matching CSS
      pdf.setFontSize(30);
      pdf.setFont("times", "bold");
      pdf.setTextColor(0, 0, 0);
      // Convert letter-spacing: 1px to PDF units (1px ≈ 0.264mm)
      const nameWithSpacing = student.Name.toUpperCase();
      pdf.text(nameWithSpacing, courseX, nameY, { align: "center" });

      // Add completion statement
      pdf.setFontSize(11);
      pdf.setFont("times", "normal");
      pdf.setTextColor(0, 0, 0);

      const startDate = new Date(student.Batch.start_date);
      const batchStartDate = startDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });

      const getEndDate = (
        startDate: string,
        durationMonths?: number | null,
      ) => {
        if (!durationMonths) return null;
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + durationMonths);
        return end.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });
      };

      const endDate = getEndDate(
        student.Batch.start_date,
        student.Batch.duration_months,
      );

      // Add completion statement with text wrapping
      pdf.setFontSize(11); // Match CSS font-size: 14px
      pdf.setFont("times", "normal");
      pdf.setTextColor(0, 0, 0);

      const completionLines = [
        "who successfully completed the course at the Kug Oriental Academy of",
        "Alternative Medicines Allied Sciences Foundation from " +
          batchStartDate +
          " to ",
        endDate + " " + "and passed the final examination administered by the",
        "Central Board of Examinations of the Kug Oriental Academy of",
        "Alternative Medicines Allied Sciences Foundation.",
      ];

      // Add lines with proper spacing, using splitTextToSize for wrapping
      // Match CSS line-height: 1.5 (14px * 1.5 = 21px ≈ 5.55mm)
      const maxWidth = 140; // Maximum width in mm
      let currentStatementY = statementStartY;

      completionLines.forEach((line) => {
        const wrappedLines = pdf.splitTextToSize(line, maxWidth);
        wrappedLines.forEach((wrappedLine, index) => {
          pdf.text(wrappedLine, courseX, currentStatementY, {
            align: "center",
          });
          currentStatementY += 3; // Line spacing matching line-height: 1.5
        });
        currentStatementY += 3; // Extra space between paragraphs
      });

      // Add date
      pdf.setFontSize(10);
      pdf.setFont("times", "bold");
      pdf.setTextColor(0, 0, 0);

      const displayDate = student.PublishedDate
        ? new Date(student.PublishedDate)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            .replace(/\//g, "-")
        : new Date()
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            .replace(/\//g, "-");

      pdf.text(`Date: ${displayDate}`, refX + 12, bottomY);

      // Add chairman title below signature
      pdf.setFontSize(10);
      pdf.setFont("times", "bold");
      pdf.text("Chairman", courseX, bottomY, { align: "center" });

      // Add controller title below signature
      pdf.setFontSize(10);
      pdf.setFont("times", "bold");
      pdf.text(
        "Controller\nof Examination",
        pdfWidth - refX - 25,
        bottomY - 4,
        {
          align: "center",
        },
      );

      // Save the PDF
      pdf.save(
        `${student.RegiNo}_${student.Name.replace(/\s+/g, "_")}_Certificate.pdf`,
      );

      toast({
        title: "Certificate Downloaded",
        description: "Your certificate has been generated successfully",
      });
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast({
        title: "Certificate Generation Failed",
        description:
          "There was an error creating your certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8">
        {/* Download PDF Button */}
        <Button
          onClick={handleDownloadPDF}
          size={isMobile ? "default" : "lg"}
          disabled={isGeneratingPDF}
          className="flex items-center gap-2 sm:gap-3 h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-medium bg-gradient-primary hover:shadow-elegant transition-all duration-300 rounded-xl text-white"
        >
          {isGeneratingPDF ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Generating PDF...</span>
              <span className="sm:hidden">PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Download Mark List</span>
              <span className="sm:hidden">Mark List</span>
            </>
          )}
        </Button>

        {/* Certificate Button - Only for authenticated users and passed students */}
        {isAuthenticated && (
          <Button
            onClick={handleGenerateCertificate}
            size={isMobile ? "default" : "lg"}
            disabled={
              isGeneratingCertificate ||
              (student.Result !== "Pass" &&
                student.Result !== "PASS" &&
                student.Result !== "pass")
            }
            className={`flex items-center gap-2 sm:gap-3 h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-medium transition-all duration-300 rounded-xl ${
              student.Result === "Pass" ||
              student.Result === "PASS" ||
              student.Result === "pass"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 hover:shadow-elegant text-white"
                : "bg-gray-400 text-gray-600 cursor-not-allowed"
            }`}
          >
            {isGeneratingCertificate ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">
                  Generating Certificate...
                </span>
                <span className="sm:hidden">Certificate...</span>
              </>
            ) : (
              <>
                <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">
                  {student.Result === "Pass" ||
                  student.Result === "PASS" ||
                  student.Result === "pass"
                    ? "Generate Certificate"
                    : "Certificate Not Available"}
                </span>
                <span className="sm:hidden">
                  {student.Result === "Pass" ||
                  student.Result === "PASS" ||
                  student.Result === "pass"
                    ? "Certificate"
                    : "N/A"}
                </span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
