import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Award, CheckCircle, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { Student } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import DataService from "@/services/dataService";

interface BulkCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseType: "PDA" | "DCP";
}

export const BulkCertificateDialog = ({
  open,
  onOpenChange,
  courseType,
}: BulkCertificateDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const [selectedRegiNos, setSelectedRegiNos] = useState<Set<string>>(
    new Set()
  );
  const [students, setStudents] = useState<Student[]>([]);

  // Fetch students data from API when dialog opens
  useEffect(() => {
    const fetchStudents = async () => {
      if (!open) return;

      setIsLoading(true);
      try {
        let fetchedStudents: Student[] = [];

        if (courseType === "PDA") {
          fetchedStudents = await DataService.getStudentsByCourseType("PDA");
        } else if (courseType === "DCP") {
          fetchedStudents = await DataService.getStudentsByCourseType("DCP");
        }

        setStudents(fetchedStudents);

        // Debug logging
        console.log(`Fetched ${courseType} students:`, fetchedStudents);
        console.log(
          `Students with results:`,
          fetchedStudents.filter((s) => s.Result)
        );
        console.log(
          `Students with certificates:`,
          fetchedStudents.filter(
            (s) => s.CertificateNumber && s.CertificateNumber.trim() !== ""
          )
        );
        // Note: is_published field is not available in the API response
        console.log(`Sample student data:`, fetchedStudents[0]);
        console.log(
          `Sample student keys:`,
          Object.keys(fetchedStudents[0] || {})
        );
      } catch (error) {
        console.error(`Failed to fetch ${courseType} students:`, error);
        toast({
          title: "Failed to Load Students",
          description: `Unable to load ${courseType} students. Please try again.`,
          variant: "destructive",
        });
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [open, courseType, toast]);

  // Filter students who are eligible for certificates
  // Since is_published field is not available, use certificate numbers as the criterion
  const passedStudents = students.filter((student) => {
    const hasCertificate =
      student.CertificateNumber && student.CertificateNumber.trim() !== "";

    // Include students who have certificate numbers (they are eligible for certificates)
    return hasCertificate;
  });

  // Debug logging for filtering
  React.useEffect(() => {
    if (students.length > 0) {
      console.log(`Filtering ${courseType} students:`, {
        total: students.length,
        withResults: students.filter((s) => s.Result).length,
        withCertificates: students.filter((s) => s.CertificateNumber).length,
        passedWithCertificates: passedStudents.length,
        resultTypes: [...new Set(students.map((s) => s.Result))],
        sampleStudent: students[0],
      });
    }
  }, [students, courseType, passedStudents.length]);

  // Initialize selection to all passed students when dialog opens or data changes
  // Ensures a sensible default: everything selected
  React.useEffect(() => {
    if (open) {
      setSelectedRegiNos(new Set(passedStudents.map((s) => s.RegiNo)));
    }
  }, [open, students]);

  const allSelected =
    selectedRegiNos.size > 0 && selectedRegiNos.size === passedStudents.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRegiNos(new Set());
    } else {
      setSelectedRegiNos(new Set(passedStudents.map((s) => s.RegiNo)));
    }
  };

  const toggleOne = (regiNo: string) => {
    setSelectedRegiNos((prev) => {
      const next = new Set(prev);
      if (next.has(regiNo)) {
        next.delete(regiNo);
      } else {
        next.add(regiNo);
      }
      return next;
    });
  };

  const isDCPStudent = (student: Student): boolean => {
    return student.CourseType === "DCP";
  };

  const generateSingleCertificate = async (
    student: Student,
    pdf: jsPDF
  ): Promise<void> => {
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Load and add certificate template as background
    try {
      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      templateImg.src = "/Course Certificate Model WEB .jpg";

      await new Promise((resolve, reject) => {
        templateImg.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const maxWidth = 1200;
          const maxHeight = 1600;
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

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

          const compressedImg = new Image();
          compressedImg.onload = () => {
            const scale = Math.min(
              pdfWidth / compressedImg.width,
              pdfHeight / compressedImg.height
            );
            const finalWidth = compressedImg.width * scale;
            const finalHeight = compressedImg.height * scale;

            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(compressedImg, "JPEG", x, y, finalWidth, finalHeight);
            resolve(true);
          };
          compressedImg.src = compressedDataUrl;
        };
        templateImg.onerror = reject;
      });
    } catch (error) {
      console.warn("Could not load certificate template image:", error);
    }

    // Add dynamic content
    pdf.setTextColor(101, 67, 33);

    // Register Number
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Register No. : ${student.RegiNo}`, 20, 125);

    // Certificate Number
    const certificateNo =
      student.CertificateNumber || "2025" + student.RegiNo.slice(-4);
    pdf.text(`Certificate No. : ${certificateNo}`, 20, 133);

    // Course description
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    pdf.text("The certificate of", pdfWidth / 2, 145, { align: "center" });

    const courseName = student.Course;
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(courseName, pdfWidth / 2, 153, { align: "center" });

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("has been conferred upon", pdfWidth / 2, 161, { align: "center" });

    // Course completion details
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    const courseDuration = isDCPStudent(student)
      ? "October 2024 to September 2025"
      : "October 2024 to September 2025";

    const completionLine1 =
      "who successfully completed the course at the Kug Oriental Academy of";
    const completionLine2 = `Alternative Medicines Allied Sciences Foundation from ${courseDuration}, and passed the`;
    const completionLine3 =
      "final examination administered by the Central Board of Examinations of the Kug";
    const completionLine4 =
      "Oriental Academy of Alternative Medicines Allied Sciences Foundation.";

    let completionY = 184;
    pdf.text(completionLine1, pdfWidth / 2, completionY, { align: "center" });
    completionY += 4;
    pdf.text(completionLine2, pdfWidth / 2, completionY, { align: "center" });
    completionY += 4;
    pdf.text(completionLine3, pdfWidth / 2, completionY, { align: "center" });
    completionY += 4;
    pdf.text(completionLine4, pdfWidth / 2, completionY, { align: "center" });

    // Add student photo using backend photo URL
    if (student.Photo) {
      try {
        const photoImg = new Image();
        photoImg.crossOrigin = "anonymous";
        // Use backend photo URL
        const photoUrl = student.Photo.startsWith("http")
          ? student.Photo
          : `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}${
              student.Photo
            }`;
        photoImg.src = photoUrl;

        await new Promise((resolve) => {
          photoImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const photoSize = 200;
            canvas.width = photoSize;
            canvas.height = photoSize;

            ctx?.drawImage(photoImg, 0, 0, photoSize, photoSize);

            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

            const compressedPhotoImg = new Image();
            compressedPhotoImg.onload = () => {
              const photoWidth = 20;
              const photoHeight = 20;
              const photoX = pdfWidth - photoWidth - 25;
              const photoY = 125;

              pdf.addImage(
                compressedPhotoImg,
                "JPEG",
                photoX,
                photoY,
                photoWidth,
                photoHeight
              );
              resolve(true);
            };
            compressedPhotoImg.src = compressedDataUrl;
          };
          photoImg.onerror = () => {
            console.warn(`Could not load photo for ${student.RegiNo}`);
            resolve(true);
          };
        });
      } catch (error) {
        console.warn("Could not load student photo:", error);
      }
    }

    // Add date
    const displayDate = isDCPStudent(student) ? "28/06/2021" : "28/06/2021";
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date: ${displayDate}`, 20, 250);

    // Add signatures
    pdf.setFontSize(9);
    pdf.setTextColor(101, 67, 33);
    pdf.text("Chairman", pdfWidth / 2, 260, { align: "center" });

    pdf.text("Controller", pdfWidth - 20, 258, { align: "right" });
    pdf.text("of Examination", pdfWidth - 20, 262, { align: "right" });
  };

  const handleBulkDownload = async () => {
    if (passedStudents.length === 0) {
      toast({
        title: "No Certificates Available",
        description: "No passed students found for certificate generation.",
        variant: "destructive",
      });
      return;
    }

    const selectedStudents = passedStudents.filter((s) =>
      selectedRegiNos.has(s.RegiNo)
    );
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to download.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      toast({
        title: "Generating Certificates",
        description: `Starting bulk download for ${selectedStudents.length} certificates...`,
      });

      for (let i = 0; i < selectedStudents.length; i++) {
        const student = selectedStudents[i];
        const pdf = new jsPDF("p", "mm", "a4");

        await generateSingleCertificate(student, pdf);

        // Save individual PDF
        pdf.save(
          `${student.RegiNo}_${student.Name.replace(
            /\s+/g,
            "_"
          )}_Certificate.pdf`
        );

        // Update progress
        const progressPercent = Math.round(
          ((i + 1) / selectedStudents.length) * 100
        );
        setProgress(progressPercent);

        // Small delay between downloads to prevent browser blocking
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast({
        title: "Certificates Downloaded",
        description: `Successfully generated ${selectedStudents.length} certificates.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error generating certificates:", error);
      toast({
        title: "Generation Failed",
        description:
          "There was an error generating certificates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            {courseType} Bulk Certificate Download
          </DialogTitle>
          <DialogDescription>
            Download certificates for all passed students in {courseType} course
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                  {passedStudents.length} Passed Students
                </span>
                <div className="flex items-center gap-2 pl-3 border-l border-emerald-300/50 dark:border-emerald-700/50">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-emerald-900 dark:text-emerald-200">
                    Select all ({selectedRegiNos.size}/{passedStudents.length})
                  </span>
                </div>
              </div>
              <Button
                onClick={handleBulkDownload}
                disabled={
                  isGenerating ||
                  passedStudents.length === 0 ||
                  selectedRegiNos.size === 0
                }
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {progress}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-gradient-to-r from-amber-600 to-orange-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          {/* Student List */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading {courseType} students...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {passedStudents.map((student, index) => (
                  <div
                    key={student.RegiNo}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedRegiNos.has(student.RegiNo)}
                        onCheckedChange={() => toggleOne(student.RegiNo)}
                      />
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{student.Name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.RegiNo} • Cert: {student.CertificateNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-2 py-1 rounded-full font-medium">
                        PASS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {!isLoading && passedStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No passed students found for certificate generation.</p>
              <p className="text-sm mt-2">
                Make sure students have PASS result and certificate numbers.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
