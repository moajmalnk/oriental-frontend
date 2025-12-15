import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Download,
  Award,
  CheckCircle,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import jsPDF from "jspdf";
import { Student, Course, Batch } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/services/api";

interface EnhancedBulkCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EnhancedBulkCertificateDialog = ({
  open,
  onOpenChange,
}: EnhancedBulkCertificateDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const [selectedRegiNos, setSelectedRegiNos] = useState<Set<string>>(
    new Set()
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Filter states
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch all data when dialog opens
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;

      setIsLoading(true);
      try {
        // Fetch students, student results, courses, and batches in parallel
        const [
          studentsResponse,
          studentResultsResponse,
          coursesResponse,
          batchesResponse,
        ] = await Promise.all([
          // Fetch a large page to cover all students for accurate mapping
          api.get("/api/students/students/", { params: { page: 1, page_size: 10000 } }),
          // Fetch a large page of results as well to cover mapping needs
          api.get("/api/students/student-results/", { params: { page: 1, page_size: 10000 } }),
          api.get("/api/course/list/"),
          api.get("/api/students/batches/"),
        ]);

        // Handle paginated responses
        const fetchedStudents = studentsResponse.data.results || studentsResponse.data;
        const fetchedStudentResults = studentResultsResponse.data.results || studentResultsResponse.data;
        const fetchedCourses: Course[] = coursesResponse.data;
        const fetchedBatches: Batch[] = batchesResponse.data;

        // Transform student results to student format for compatibility
        const transformedStudents: Student[] = fetchedStudentResults.map(
          (result: any) => {
            // Find the actual student data by matching student ID
            const actualStudent = fetchedStudents.find(
              (student: any) => student.id === result.student
            );

            // Find the related course and batch data
            const relatedCourse = fetchedCourses.find(
              (c) => c.id === result.course
            );
            const relatedBatch = fetchedBatches.find(
              (b) => b.id === result.batch
            );

            return {
              id: result.id,
              Name:
                actualStudent?.name || actualStudent?.Name || result.student_name || "Unknown Student",
              RegiNo: result.register_number,
              Course: relatedCourse?.name || "Course " + result.course,
              Batch: {
                id: result.batch,
                name: relatedBatch?.name || "Batch " + result.batch,
                start_date: relatedBatch?.start_date || "",
                duration_months: relatedBatch?.duration_months || null,
                course: result.course,
                course_name: relatedCourse?.name || "",
                created_at: relatedBatch?.created_at || "",
              },
              CertificateNumber: result.certificate_number,
              Result: result.result || "PENDING",
              IsPublished: result.is_published || false,
              Email: actualStudent?.email || actualStudent?.Email || "",
              Phone: actualStudent?.phone || actualStudent?.Phone || "",
              WhatsApp:
                actualStudent?.whatsapp_number ||
                actualStudent?.WhatsApp ||
                null,
              Photo: actualStudent?.photo || actualStudent?.Photo || null,
              CourseType: (relatedCourse?.name || "")
                .toUpperCase()
                .includes("PDA")
                ? "PDA"
                : "DCP",
              Subjects: result.marks || [],
              PublishedDate: result.published_date || null,
            };
          }
        );

        setStudents(transformedStudents);
        setCourses(fetchedCourses);
        setBatches(fetchedBatches);

        // Filter students who are eligible for certificates (have certificate numbers, are published, and passed)
        const eligibleStudents = transformedStudents.filter((student) => {
          const hasCertificate =
            student.CertificateNumber &&
            student.CertificateNumber.trim() !== "";
          const isPublished = (student as any).IsPublished === true;
          const hasPassed = student.Result?.toLowerCase() === "pass";
          
          return hasCertificate && isPublished && hasPassed;
        });

        setFilteredStudents(eligibleStudents);
        setSelectedRegiNos(new Set(eligibleStudents.map((s) => s.RegiNo)));

        console.log("Fetched data:", {
          students: fetchedStudents.length,
          studentResults: fetchedStudentResults.length,
          transformedStudents: transformedStudents.length,
          eligibleStudents: eligibleStudents.length,
          courses: fetchedCourses.length,
          batches: fetchedBatches.length,
          sampleStudent: fetchedStudents[0],
          sampleResult: fetchedStudentResults[0],
          sampleTransformed: transformedStudents[0],
          allCertificateNumbers: fetchedStudentResults.map(
            (r) => r.certificate_number
          ),
          allResults: fetchedStudentResults.map((r) => r.result),
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Failed to Load Data",
          description:
            "Unable to load students, courses, and batches. Please try again.",
          variant: "destructive",
        });
        setStudents([]);
        setCourses([]);
        setBatches([]);
        setFilteredStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, toast]);

  // Apply filters when filter states change
  useEffect(() => {
    let filtered = students.filter((student) => {
      // Only show published and passed results
      const hasCertificate =
        student.CertificateNumber && student.CertificateNumber.trim() !== "";
      const isPublished = (student as any).IsPublished === true;
      const hasPassed = student.Result?.toLowerCase() === "pass";
      
      if (!hasCertificate || !isPublished || !hasPassed) return false;

      // Course filter
      if (selectedCourse !== "all") {
        const courseMatch =
          student.Course === selectedCourse ||
          student.CourseType === selectedCourse ||
          (typeof student.Course === "object" &&
            student.Course &&
            (student.Course as any).name === selectedCourse);
        if (!courseMatch) return false;
      }

      // Batch filter
      if (selectedBatch !== "all") {
        const batchMatch =
          typeof student.Batch === "object" &&
          student.Batch?.name === selectedBatch;
        if (!batchMatch) return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          student.Name.toLowerCase().includes(searchLower) ||
          student.RegiNo.toLowerCase().includes(searchLower) ||
          student.CertificateNumber.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });

    setFilteredStudents(filtered);
  }, [students, selectedCourse, selectedBatch, searchTerm]);

  // Update selection when filtered students change
  useEffect(() => {
    if (open) {
      setSelectedRegiNos(new Set(filteredStudents.map((s) => s.RegiNo)));
    }
  }, [filteredStudents, open]);

  const allSelected =
    selectedRegiNos.size > 0 &&
    selectedRegiNos.size === filteredStudents.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRegiNos(new Set());
    } else {
      setSelectedRegiNos(new Set(filteredStudents.map((s) => s.RegiNo)));
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

  const clearFilters = () => {
    setSelectedCourse("all");
    setSelectedBatch("all");
    setSearchTerm("");
  };

  const generateSingleCertificate = async (
    student: Student,
    pdf: jsPDF
  ): Promise<void> => {
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Load and add certificate template background
    try {
      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      templateImg.src = "/Course Certificate Model WEB .jpg";

      await new Promise((resolve, reject) => {
        templateImg.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const maxWidth = 2480;
          const maxHeight = 3508;
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
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

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
      console.warn("Could not load certificate template:", error);
    }

    const refX = 16.8;
    const refStartY = 133.65;
    const photoSize = 21;
    const photoX = pdfWidth - 16.8 - photoSize;
    const photoY = 133.65;
    const courseX = pdfWidth / 2;
    const courseStartY = 148.5;
    const nameY = 185;
    const statementStartY = 196;
    const bottomY = 255.42;
    const sealSize = 15;
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

        await new Promise((resolve) => {
          photoImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = photoSize * 16;
            canvas.height = (photoSize * 16 * 90) / 80;
            ctx?.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.95);

            const compressedPhoto = new Image();
            compressedPhoto.onload = () => {
              pdf.addImage(
                compressedPhoto,
                "JPEG",
                photoX - 2,
                photoY - 8,
                photoSize,
                photoSize * 1.200
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

      await new Promise((resolve) => {
        chairmanImg.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const signWidth = 21;
          const signHeight = 15;
          canvas.width = signWidth * 24;
          canvas.height = signHeight * 24;
          ctx?.drawImage(chairmanImg, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

          const compressedImg = new Image();
          compressedImg.onload = () => {
            pdf.addImage(
              compressedImg,
              "PNG",
              courseX - signWidth / 2 -5,
              bottomY - 25,
              signWidth + 12,
              ((signWidth * compressedImg.height) / compressedImg.width) + 12
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

      await new Promise((resolve) => {
        controllerImg.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const signWidth = 24;
          const signHeight = 15;
          canvas.width = signWidth * 24;
          canvas.height = signHeight * 24;
          ctx?.drawImage(controllerImg, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

          const compressedImg = new Image();
          compressedImg.onload = () => {
            pdf.addImage(
              compressedImg,
              "PNG",
              pdfWidth - refX - signWidth - 15,
              bottomY - 26,
              signWidth + 12,
              ((signWidth * compressedImg.height) / compressedImg.width) + 12
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

      await new Promise((resolve) => {
        sealImg.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = sealSize * 24;
          canvas.height = sealSize * 24;
          ctx?.drawImage(sealImg, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

          const compressedImg = new Image();
          compressedImg.onload = () => {
            const sealWidth = 23;
            const sealHeight = 33;
            pdf.addImage(
              compressedImg,
              "PNG",
              sealX - 4,
              sealY - 13,
              sealWidth,
              sealHeight
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

    // Add reference numbers
    pdf.setFontSize(11);
    pdf.setFont("times", "bold");

    pdf.setTextColor(139, 69, 19);
    pdf.text("Register No.", refX, refStartY);
    pdf.setTextColor(198, 40, 40);
    pdf.text(`: ${student.RegiNo}`, refX + 22, refStartY);

    pdf.setTextColor(139, 69, 19);
    pdf.text("Certificate No.", refX, refStartY + 8);
    pdf.setTextColor(17, 17, 17);
    pdf.text(
      `: ${student.CertificateNumber || "2025" + student.RegiNo.slice(-4)}`,
      refX + 25,
      refStartY + 8
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

    // Add student name
    pdf.setFontSize(30);
    pdf.setFont("times", "bold");
    pdf.setTextColor(0, 0, 0);
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

    const getEndDate = (startDate: string, durationMonths?: number | null) => {
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
      student.Batch.duration_months
    );

    pdf.setFontSize(11);
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

    const maxWidth = 140;
    let currentStatementY = statementStartY;

    completionLines.forEach((line) => {
      const wrappedLines = pdf.splitTextToSize(line, maxWidth);
      wrappedLines.forEach((wrappedLine) => {
        pdf.text(wrappedLine, courseX, currentStatementY, {
          align: "center",
        });
        currentStatementY += 3;
      });
      currentStatementY += 3;
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

    // Add chairman title
    pdf.setFontSize(10);
    pdf.setFont("times", "bold");
    pdf.text("Chairman", courseX, bottomY, { align: "center" });

    // Add controller title
    pdf.setFontSize(10);
    pdf.setFont("times", "bold");
    pdf.text("Controller\nof Examination", pdfWidth - refX - 25, bottomY - 4, {
      align: "center",
    });
  };

  const handleBulkDownload = async () => {
    if (filteredStudents.length === 0) {
      toast({
        title: "No Students Available",
        description: "No eligible students found for certificate generation.",
        variant: "destructive",
      });
      return;
    }

    const selectedStudents = filteredStudents.filter((s) =>
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

        pdf.save(
          `${student.RegiNo}_${student.Name.replace(
            /\s+/g,
            "_"
          )}_Certificate.pdf`
        );

        const progressPercent = Math.round(
          ((i + 1) / selectedStudents.length) * 100
        );
        setProgress(progressPercent);

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
      <DialogContent className="max-w-7xl max-h-[90vh] w-[95vw] sm:w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            Bulk Certificate Download
          </DialogTitle>
          <DialogDescription>
            Select students and download certificates with filtering options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto max-h-[calc(90vh-100px)]">
          <>
            {/* Summary */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-lg p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    <span className="font-semibold text-sm sm:text-base text-emerald-900 dark:text-emerald-100">
                      {filteredStudents.length} Eligible Students
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-0 sm:pl-3 border-l-0 sm:border-l border-emerald-300/50 dark:border-emerald-700/50">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                      Select all ({selectedRegiNos.size}/
                      {filteredStudents.length})
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleBulkDownload}
                  disabled={
                    filteredStudents.length === 0 ||
                    selectedRegiNos.size === 0 ||
                    isGenerating
                  }
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Course
                </label>
                <Select
                  value={selectedCourse}
                  onValueChange={setSelectedCourse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.name}>
                        {course.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="PDA">PDA</SelectItem>
                    <SelectItem value="DCP">DCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Batch</label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.name}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </label>
                <Input
                  placeholder="Search by name, register no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
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
            <ScrollArea className="h-[300px] sm:h-[400px] rounded-md border p-2 sm:p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading students and courses...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 sm:space-y-2">
                  {filteredStudents.map((student, index) => (
                    <div
                      key={student.RegiNo}
                      className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={selectedRegiNos.has(student.RegiNo)}
                          onCheckedChange={() => toggleOne(student.RegiNo)}
                          className="shrink-0"
                        />
                        <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs sm:text-sm shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm truncate">
                            {student.Name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            <span className="hidden sm:inline">Reg: </span>
                            {student.RegiNo}
                            <span className="hidden sm:inline"> • Cert: </span>
                            <span className="sm:hidden"> • </span>
                            {student.CertificateNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                          {student.Result}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {!isLoading && filteredStudents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No eligible students found.</p>
                <p className="text-sm mt-2">
                  Try adjusting your filters or check if students have
                  certificate numbers and PASS results.
                </p>
              </div>
            )}
          </>
        </div>
      </DialogContent>
    </Dialog>
  );
};
