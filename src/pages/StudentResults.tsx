import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  BookOpen,
  Calendar,
  Award,
  Users,
  GraduationCap,
  Filter,
  ChevronDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import {
  StudentResult,
  StudentResultFormData,
  Student,
  Course,
  Batch,
  Subject,
  StudentMark,
} from "@/types";
import * as XLSX from "xlsx";
import { DatePicker } from "@/components/ui/date-picker";
import { useNavigate } from "react-router-dom";
import { StudentResultsPageSkeleton } from "@/components/skeletons/StudentResultsPageSkeleton";

// Bulk creation interfaces
interface BulkStudentResultData {
  student_name: string;
  course_name: string;
  batch_name: string;
  register_number: string;
  certificate_number: string;
  result?: string;
  marks: Array<{
    subject_name: string;
    te_obtained?: number;
    ce_obtained?: number;
    pe_obtained?: number;
    pw_obtained?: number;
  }>;
  is_published: boolean;
  published_date?: string;
  // Resolved IDs
  student_id?: number;
  course_id?: number;
  batch_id?: number;
  subject_ids?: Record<string, number>;
}

interface BulkStudentResultValidation {
  row: number;
  data: BulkStudentResultData;
  errors: string[];
  isValid: boolean;
}

interface BulkCreationResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    registerNumber: string;
    error: string;
  }>;
}

/**
 * Converts an Excel serial number (days since 1900-01-01) to a YYYY-MM-DD string.
 */
const excelSerialToYYYYMMDD = (serial: number): string => {
  // Excel's epoch is 1900-01-01, but it incorrectly thinks 1900 is a leap year.
  // JavaScript's epoch is 1970-01-01.
  // The magic number 25569 is the days between 1900-01-01 and 1970-01-01 (with Excel's leap year bug).
  const date = new Date(Date.UTC(0, 0, serial - 1, 0, 0, 0) - 25569 * 86400000);

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // getUTCMonth() is 0-indexed
  const day = date.getUTCDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
};

/**
 * Parses various date formats into a YYYY-MM-DD string,
 * correctly handling strings, Date objects, and Excel serial numbers.
 */
const parseDateToYYYYMMDD = (
  dateInput: string | Date | number | null | undefined,
): string | null => {
  if (!dateInput) {
    return null;
  }

  // --- 1. Handle Date Object ---
  // This is common if the Excel parser (like sheetjs) uses { cellDates: true }
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      return null; // Invalid Date object
    }
    // Use local components to avoid timezone shift
    const year = dateInput.getFullYear();
    const month = dateInput.getMonth() + 1; // .getMonth() is 0-indexed
    const day = dateInput.getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}`;
  }

  // --- 2. Handle Excel Serial Number ---
  if (typeof dateInput === "number") {
    // Assume numbers > 10000 are Excel dates (adjust as needed)
    if (dateInput > 10000 && dateInput < 100000) {
      return excelSerialToYYYYMMDD(dateInput);
    }
    // Otherwise, it might be a year or timestamp, treat as invalid for now
    return null;
  }

  // --- 3. Handle String Input ---
  if (typeof dateInput !== "string") {
    return null; // Not a string, date, or number
  }

  const cleaned = dateInput.trim().replace(/\s+/g, " ");

  if (!cleaned) {
    return null;
  }

  // --- Your existing regex checks (which are good) ---

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return cleaned;
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    const parts = cleaned.split("-");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const parts = cleaned.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleaned)) {
    const parts = cleaned.split("/");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime()) && date.getDate() === day) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  }

  // --- 4. Fallback for other string formats (e.g., "Oct 29 2025" or "10/29/2025") ---
  try {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      // **THE FIX IS HERE:** Use local components, not toISOString()
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`;
    }
  } catch (error) {
    // ignore
  }

  return null; // Failed to parse
};

const StudentResults: React.FC = () => {
  const navigate = useNavigate();
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter states (client-side filtering on current page)
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<string>("all");
  const [selectedPublished, setSelectedPublished] = useState<string>("all");

  // Pagination states (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Statistics states (always show total database counts)
  const [totalResults, setTotalResults] = useState(0);
  const [totalPublished, setTotalPublished] = useState(0);
  const [totalPass, setTotalPass] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<StudentResult | null>(
    null,
  );
  const [resultToDelete, setResultToDelete] = useState<StudentResult | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<StudentResultFormData>({
    student: 0,
    course: 0,
    batch: 0,
    register_number: "",
    certificate_number: "",
    result: "",
    marks: [],
    is_published: false,
    published_date: new Date().toISOString().split("T")[0],
    is_withheld: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk creation states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState<BulkStudentResultData[]>([]);
  const [bulkValidations, setBulkValidations] = useState<
    BulkStudentResultValidation[]
  >([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkCreationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Bulk update states
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [selectedResultsForExport, setSelectedResultsForExport] = useState<
    Set<number>
  >(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkUpdateMode, setIsBulkUpdateMode] = useState(false);

  // Separate bulk update states
  const [isBulkUpdateImportDialogOpen, setIsBulkUpdateImportDialogOpen] =
    useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState<BulkStudentResultData[]>(
    [],
  );
  const [bulkUpdateValidations, setBulkUpdateValidations] = useState<
    BulkStudentResultValidation[]
  >([]);
  const [isProcessingBulkUpdate, setIsProcessingBulkUpdate] = useState(false);
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState(0);
  const [bulkUpdateResult, setBulkUpdateResult] =
    useState<BulkCreationResult | null>(null);

  // Bulk delete states
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedResultsForDelete, setSelectedResultsForDelete] = useState<
    Set<number>
  >(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; registerNumber: string; error: string }>;
  } | null>(null);

  const { toast } = useToast();

  // Fetch all data with server-side pagination and search
  const fetchData = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const [
        resultsResponse,
        studentsResponse,
        coursesResponse,
        batchesResponse,
      ] = await Promise.all([
        api.get("/api/students/student-results/", {
          params: {
            page,
            page_size: itemsPerPage,
            search: search.trim(),
          },
        }),
        api.get("/api/students/students/", { params: { page_size: 1000 } }),
        api.get("/api/course/list/"),
        api.get("/api/students/batches/"),
      ]);

      const resultsData = resultsResponse.data.results;
      const studentsData =
        studentsResponse.data.results || studentsResponse.data;
      const coursesData = coursesResponse.data;
      const batchesData = batchesResponse.data;

      setStudentResults(resultsData);
      setFilteredResults(resultsData); // Initially show all loaded results
      setTotalCount(resultsResponse.data.count);
      setTotalPages(resultsResponse.data.total_pages);
      setCurrentPage(resultsResponse.data.current_page);

      // Set total statistics from API (always total DB counts)
      setTotalResults(
        resultsResponse.data.total_results || resultsResponse.data.count,
      );
      setTotalPublished(resultsResponse.data.total_published || 0);
      setTotalPass(resultsResponse.data.total_pass || 0);

      setStudents(studentsData);
      setCourses(coursesData);
      setBatches(batchesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch student results and related data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch subjects for a course
  const fetchSubjects = async (courseId: number) => {
    if (!courseId || isNaN(courseId)) {
      setSubjects([]);
      return;
    }
    try {
      const response = await api.get(`/api/course/subjects/${courseId}/`);
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    }
  };

  // Debounced search handler (server-side)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client-side filtering (filters only current page data)
  useEffect(() => {
    let filtered = [...studentResults];

    // Apply batch filter
    if (selectedBatch !== "all") {
      filtered = filtered.filter(
        (result) => result.batch === parseInt(selectedBatch),
      );
    }

    // Apply course filter
    if (selectedCourse !== "all") {
      filtered = filtered.filter(
        (result) => result.course === parseInt(selectedCourse),
      );
    }

    // Apply result filter
    if (selectedResult !== "all") {
      if (selectedResult === "pass") {
        filtered = filtered.filter(
          (result) => result.result?.toLowerCase() === "pass",
        );
      } else if (selectedResult === "fail") {
        filtered = filtered.filter(
          (result) => result.result?.toLowerCase() === "fail",
        );
      } else if (selectedResult === "distinction") {
        filtered = filtered.filter(
          (result) => result.result?.toLowerCase() === "distinction",
        );
      } else if (selectedResult === "absent") {
        filtered = filtered.filter(
          (result) => result.result?.toLowerCase() === "absent",
        );
      }
    }

    // Apply published filter
    if (selectedPublished !== "all") {
      if (selectedPublished === "published") {
        filtered = filtered.filter((result) => result.is_published === true);
      } else if (selectedPublished === "unpublished") {
        filtered = filtered.filter((result) => result.is_published === false);
      }
    }

    setFilteredResults(filtered);
  }, [
    selectedBatch,
    selectedCourse,
    selectedResult,
    selectedPublished,
    studentResults,
  ]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedBatch("all");
    setSelectedCourse("all");
    setSelectedResult("all");
    setSelectedPublished("all");
  };

  // Initial fetch
  useEffect(() => {
    fetchData(1, "");
  }, []);

  // Pagination handlers
  const goToPage = (page: number) => {
    fetchData(page, searchQuery);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      fetchData(currentPage - 1, searchQuery);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      fetchData(currentPage + 1, searchQuery);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      student: 0,
      course: 0,
      batch: 0,
      register_number: "",
      certificate_number: "",
      result: "",
      marks: [],
      is_published: false,
      published_date: new Date().toISOString().split("T")[0],
      is_withheld: false,
    });
    setErrors({});
    setEditingResult(null);
    setSubjects([]);
  };

  // Open dialog for create/edit
  const openDialog = (result?: StudentResult) => {
    if (result) {
      setEditingResult(result);
      setFormData({
        student: result.student,
        course: result.course,
        batch: result.batch,
        register_number: result.register_number,
        certificate_number: result.certificate_number,
        result: result.result || "",
        marks: result.marks || [],
        is_published: result.is_published || false,
        published_date:
          result.published_date || new Date().toISOString().split("T")[0],
        is_withheld: result.is_withheld || false,
      });
      fetchSubjects(result.course);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // Handle course change
  const handleCourseChange = (courseId: number) => {
    if (!courseId || isNaN(courseId)) return;
    setFormData({ ...formData, course: courseId, batch: 0, marks: [] });
    fetchSubjects(courseId);
  };

  // Add mark for a subject
  const addMark = (subjectId: number, subjectName: string) => {
    const existingMark = formData.marks.find(
      (mark) => mark.subject === subjectId,
    );
    if (!existingMark) {
      const newMark: StudentMark = {
        subject: subjectId,
        subject_name: subjectName,
        te_obtained: null,
        ce_obtained: null,
        pe_obtained: null,
        pw_obtained: null,
        pr_obtained: null,
        project_obtained: null,
        viva_pl_obtained: null,
      };
      setFormData({
        ...formData,
        marks: [...formData.marks, newMark],
      });
    }
  };

  // Update mark
  const updateMark = (
    subjectId: number,
    field: keyof StudentMark,
    value: number | null,
  ) => {
    // Ensure value is not negative
    const validatedValue = value !== null && value < 0 ? 0 : value;

    const updatedMarks = formData.marks.map((mark) =>
      mark.subject === subjectId ? { ...mark, [field]: validatedValue } : mark,
    );
    setFormData({ ...formData, marks: updatedMarks });
  };

  // Remove mark
  const removeMark = (subjectId: number) => {
    const updatedMarks = formData.marks.filter(
      (mark) => mark.subject !== subjectId,
    );
    setFormData({ ...formData, marks: updatedMarks });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.student || formData.student === 0) {
      newErrors.student = "Student is required";
    }

    if (!formData.course || formData.course === 0) {
      newErrors.course = "Course is required";
    }

    if (!formData.batch || formData.batch === 0) {
      newErrors.batch = "Batch is required";
    }

    if (!formData.register_number.trim()) {
      newErrors.register_number = "Register number is required";
    }

    if (!formData.certificate_number.trim()) {
      newErrors.certificate_number = "Certificate number is required";
    }

    // Check for duplicate course results (only for new results, not updates)
    if (!editingResult && formData.student && formData.course) {
      const existingResult = studentResults.find(
        (result) =>
          result.student === formData.student &&
          result.course === formData.course,
      );
      if (existingResult) {
        const studentName =
          students.find((s) => s.id === formData.student)?.name || "Unknown";
        const courseName =
          courses.find((c) => c.id === formData.course)?.name || "Unknown";
        newErrors.course = `${studentName} already has a result for ${courseName}. A student can only have one result per course.`;
      }
    }

    // Validate marks
    if (formData.marks.length === 0) {
      newErrors.marks = "At least one subject mark is required";
    } else {
      // Validate each mark
      formData.marks.forEach((mark, index) => {
        const hasTheory =
          mark.te_obtained !== null || mark.ce_obtained !== null;
        const hasPractical =
          mark.pe_obtained !== null ||
          mark.pw_obtained !== null ||
          mark.pr_obtained !== null ||
          mark.project_obtained !== null ||
          mark.project_obtained !== null ||
          mark.viva_pl_obtained !== null;

        if (!hasTheory && !hasPractical) {
          newErrors[`marks_${index}`] = "At least one mark is required";
        }

        if (hasTheory && hasPractical) {
          newErrors[`marks_${index}`] =
            "Cannot mix theory marks marks with practical marks";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        student: formData.student,
        course: formData.course,
        batch: formData.batch,
        register_number: formData.register_number,
        certificate_number: formData.certificate_number,
        result: formData.result || null,
        marks: formData.marks.map((mark) => ({
          subject: mark.subject,
          te_obtained: mark.te_obtained,
          ce_obtained: mark.ce_obtained,
          pe_obtained: mark.pe_obtained,
          pw_obtained: mark.pw_obtained,
          pr_obtained: mark.pr_obtained,
          project_obtained: mark.project_obtained,
          viva_pl_obtained: mark.viva_pl_obtained,
        })),
        is_published: formData.is_published || false,
        published_date: formData.published_date || null,
        is_withheld: formData.is_withheld || false,
      };

      if (editingResult) {
        await api.put(
          `/api/students/student-results/update/${editingResult.id}/`,
          payload,
        );
        toast({
          title: "Success",
          description: "Student result updated successfully",
        });
      } else {
        await api.post("/api/students/student-results/create/", payload);
        toast({
          title: "Success",
          description: "Student result created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving student result:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to save student result",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete result
  const handleDelete = async () => {
    if (!resultToDelete) return;

    try {
      setIsDeleting(true);
      await api.delete(
        `/api/students/student-results/delete/${resultToDelete.id}/`,
      );
      toast({
        title: "Success",
        description: "Student result deleted successfully",
      });
      setResultToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting student result:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete student result",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (result: StudentResult) => {
    setResultToDelete(result);
    setIsDeleteDialogOpen(true);
  };

  // Bulk creation functions
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();

    // Check file type and set appropriate reading method
    if (file.name.toLowerCase().endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    reader.onload = async (e) => {
      try {
        let jsonData: any[][];

        // Check file type and parse accordingly
        if (file.name.toLowerCase().endsWith(".csv")) {
          // Parse CSV file
          const csvText = e.target?.result as string;
          const lines = csvText.split("\n");
          jsonData = lines.map((line) => {
            // Simple CSV parsing - handles quoted fields
            const result = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          });
        } else {
          // Parse Excel file
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }

        // Skip header row and process data
        const resultData: BulkStudentResultData[] = jsonData
          .slice(1)
          .map((row: any[], index: number) => {
            // Parse marks from the row (assuming marks are in columns after the basic info)
            const marks: Array<{
              subject_name: string;
              te_obtained?: number;
              ce_obtained?: number;
              pe_obtained?: number;
              pw_obtained?: number;
            }> = [];

            // Parse marks - new format: Subject 1, Type 1, TE Obtained 1, CE Obtained 1, PE Obtained 1, PW Obtained 1, Subject 2, Type 2, ...
            // Each subject group takes 6 columns: Subject Name, Type, TE Obtained, CE Obtained, PE Obtained, PW Obtained
            // Start from column 8 (index 8) since we added is_published at column 6 and published_date at column 7
            for (let i = 8; i < row.length; i += 6) {
              if (row[i] && row[i].toString().trim()) {
                const subjectName = row[i].toString().trim();
                const subjectType = row[i + 1]?.toString().trim().toLowerCase();

                // Create mark object with all possible fields
                const mark = {
                  subject_name: subjectName,
                  te_obtained: row[i + 2]
                    ? parseInt(row[i + 2].toString())
                    : null,
                  ce_obtained: row[i + 3]
                    ? parseInt(row[i + 3].toString())
                    : null,
                  pe_obtained: row[i + 4]
                    ? parseInt(row[i + 4].toString())
                    : null,
                  pw_obtained: row[i + 5]
                    ? parseInt(row[i + 5].toString())
                    : null,
                };

                // Only add if at least one mark is provided
                const hasAnyMark =
                  mark.te_obtained !== null ||
                  mark.ce_obtained !== null ||
                  mark.pe_obtained !== null ||
                  mark.pw_obtained !== null;

                if (hasAnyMark) {
                  marks.push(mark);
                }
              }
            }

            // Parse published_date properly - return null if empty/invalid
            const publishedDateStr = parseDateToYYYYMMDD(row[7]);

            return {
              student_name: row[0]?.toString() || "",
              course_name: row[1]?.toString() || "",
              batch_name: row[2]?.toString() || "",
              register_number: row[3]?.toString() || "",
              certificate_number: row[4]?.toString() || "",
              result: row[5]?.toString() || "",
              is_published:
                row[6]?.toString().toLowerCase() === "true" || false,
              published_date: publishedDateStr,
              marks,
            };
          });

        setBulkData(resultData);
        await validateBulkData(resultData);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "Error",
          description:
            "Failed to parse file. Please check the format and ensure it's a valid Excel or CSV file.",
          variant: "destructive",
        });
      }
    };
  };

  const validateBulkData = async (data: BulkStudentResultData[]) => {
    const validations: BulkStudentResultValidation[] = await Promise.all(
      data.map(async (result, index) => {
        const errors: string[] = [];
        const row = index + 2; // +2 because we skip header and arrays are 0-indexed

        // Validate student name
        if (!result.student_name.trim()) {
          errors.push("Student name is required");
        } else {
          const student = students.find(
            (s) => s.name.toLowerCase() === result.student_name.toLowerCase(),
          );
          if (!student) {
            errors.push(`Student "${result.student_name}" not found`);
          } else {
            result.student_id = student.id;
          }
        }

        // Validate course name
        if (!result.course_name.trim()) {
          errors.push("Course name is required");
        } else {
          const course = courses.find(
            (c) => c.name.toLowerCase() === result.course_name.toLowerCase(),
          );
          if (!course) {
            errors.push(`Course "${result.course_name}" not found`);
          } else {
            result.course_id = course.id;
          }
        }

        // Validate batch name
        if (!result.batch_name.trim()) {
          errors.push("Batch name is required");
        } else {
          const batch = batches.find(
            (b) => b.name.toLowerCase() === result.batch_name.toLowerCase(),
          );
          if (!batch) {
            errors.push(`Batch "${result.batch_name}" not found`);
          } else {
            // Check if batch belongs to the course
            if (result.course_id && batch.course !== result.course_id) {
              errors.push(
                `Batch "${result.batch_name}" does not belong to course "${result.course_name}"`,
              );
            } else {
              result.batch_id = batch.id;
            }
          }
        }

        // Validate register number
        if (!result.register_number.trim()) {
          errors.push("Register number is required");
        }

        // Validate certificate number
        if (!result.certificate_number.trim()) {
          errors.push("Certificate number is required");
        }

        // Check for duplicate course results
        if (result.student_id && result.course_id) {
          const existingResult = studentResults.find(
            (existing) =>
              existing.student === result.student_id &&
              existing.course === result.course_id,
          );
          if (existingResult) {
            errors.push(
              `Student "${result.student_name}" already has a result for course "${result.course_name}". A student can only have one result per course.`,
            );
          }
        }

        // Validate marks and resolve subject IDs
        if (result.marks && result.marks.length > 0 && result.course_id) {
          try {
            const response = await api.get(
              `/api/course/subjects/${result.course_id}/`,
            );
            const courseSubjects = response.data;

            for (const mark of result.marks) {
              if (!mark.subject_name.trim()) {
                errors.push("Subject name is required for marks");
              } else {
                const subject = courseSubjects.find(
                  (s: any) =>
                    s.name.toLowerCase() === mark.subject_name.toLowerCase(),
                );
                if (!subject) {
                  errors.push(
                    `Subject "${mark.subject_name}" not found for course "${result.course_name}"`,
                  );
                } else {
                  // Validate mark fields based on subject type
                  const hasTheory =
                    mark.te_obtained !== null || mark.ce_obtained !== null;
                  const hasPractical =
                    mark.pe_obtained !== null || mark.pw_obtained !== null;

                  if (!hasTheory && !hasPractical) {
                    errors.push(
                      `At least one mark is required for subject "${mark.subject_name}"`,
                    );
                  }

                  if (hasTheory && hasPractical) {
                    errors.push(
                      `Cannot mix theory and practical marks for subject "${mark.subject_name}"`,
                    );
                  }

                  // Store subject ID for later use
                  if (!result.subject_ids) {
                    result.subject_ids = {};
                  }
                  result.subject_ids[mark.subject_name] = subject.id;
                }
              }
            }
          } catch (error) {
            errors.push(
              `Failed to fetch subjects for course "${result.course_name}"`,
            );
          }
        } else if (result.course_id) {
          errors.push("At least one subject mark is required");
        }

        // Check for duplicate register numbers
        const duplicateRegisterIndex = data.findIndex(
          (r, i) =>
            i !== index &&
            r.register_number.toLowerCase() ===
              result.register_number.toLowerCase(),
        );
        if (duplicateRegisterIndex !== -1) {
          errors.push(
            `Duplicate register number found in row ${
              duplicateRegisterIndex + 2
            }`,
          );
        }

        // Check for duplicate course results within the bulk data
        const duplicateCourseIndex = data.findIndex(
          (r, i) =>
            i !== index &&
            r.student_id === result.student_id &&
            r.course_id === result.course_id,
        );
        if (duplicateCourseIndex !== -1) {
          errors.push(
            `Duplicate course result found in row ${
              duplicateCourseIndex + 2
            }. Student "${
              result.student_name
            }" already has a result for course "${
              result.course_name
            }" in this import.`,
          );
        }

        return {
          row,
          data: result,
          errors,
          isValid: errors.length === 0,
        };
      }),
    );

    setBulkValidations(validations);
  };

  // Separate validation for bulk updates (doesn't check for duplicate course results)
  const validateBulkUpdateData = async (data: BulkStudentResultData[]) => {
    const validations: BulkStudentResultValidation[] = await Promise.all(
      data.map(async (result, index) => {
        const errors: string[] = [];
        const row = index + 2; // +2 because we skip header and arrays are 0-indexed

        // Validate student name
        if (!result.student_name.trim()) {
          errors.push("Student name is required");
        } else {
          const student = students.find(
            (s) => s.name.toLowerCase() === result.student_name.toLowerCase(),
          );
          if (!student) {
            errors.push(`Student "${result.student_name}" not found`);
          } else {
            result.student_id = student.id;
          }
        }

        // Validate course name
        if (!result.course_name.trim()) {
          errors.push("Course name is required");
        } else {
          const course = courses.find(
            (c) => c.name.toLowerCase() === result.course_name.toLowerCase(),
          );
          if (!course) {
            errors.push(`Course "${result.course_name}" not found`);
          } else {
            result.course_id = course.id;
          }
        }

        // Validate batch name
        if (!result.batch_name.trim()) {
          errors.push("Batch name is required");
        } else {
          const batch = batches.find(
            (b) => b.name.toLowerCase() === result.batch_name.toLowerCase(),
          );
          if (!batch) {
            errors.push(`Batch "${result.batch_name}" not found`);
          } else {
            // Check if batch belongs to the course
            if (result.course_id && batch.course !== result.course_id) {
              errors.push(
                `Batch "${result.batch_name}" does not belong to course "${result.course_name}"`,
              );
            } else {
              result.batch_id = batch.id;
            }
          }
        }

        // Validate register number
        if (!result.register_number.trim()) {
          errors.push("Register number is required");
        }

        // Validate certificate number
        if (!result.certificate_number.trim()) {
          errors.push("Certificate number is required");
        }

        // For updates, we need to check if the result exists
        if (result.register_number.trim()) {
          const existingResult = studentResults.find(
            (existing) =>
              existing.register_number.toLowerCase() ===
              result.register_number.toLowerCase(),
          );
          if (!existingResult) {
            errors.push(
              `No existing result found with register number "${result.register_number}". Please ensure this is an update of an existing result.`,
            );
          }
        }

        // Validate marks and resolve subject IDs
        if (result.marks && result.marks.length > 0 && result.course_id) {
          try {
            const response = await api.get(
              `/api/course/subjects/${result.course_id}/`,
            );
            const courseSubjects = response.data;

            for (const mark of result.marks) {
              if (!mark.subject_name.trim()) {
                errors.push("Subject name is required for marks");
              } else {
                const subject = courseSubjects.find(
                  (s: any) =>
                    s.name.toLowerCase() === mark.subject_name.toLowerCase(),
                );
                if (!subject) {
                  errors.push(
                    `Subject "${mark.subject_name}" not found for course "${result.course_name}"`,
                  );
                } else {
                  // Validate mark fields based on subject type
                  const hasTheory =
                    mark.te_obtained !== null || mark.ce_obtained !== null;
                  const hasPractical =
                    mark.pe_obtained !== null || mark.pw_obtained !== null;

                  if (!hasTheory && !hasPractical) {
                    errors.push(
                      `At least one mark is required for subject "${mark.subject_name}"`,
                    );
                  }

                  if (hasTheory && hasPractical) {
                    errors.push(
                      `Cannot mix theory and practical marks for subject "${mark.subject_name}"`,
                    );
                  }

                  // Store subject ID for later use
                  if (!result.subject_ids) {
                    result.subject_ids = {};
                  }
                  result.subject_ids[mark.subject_name] = subject.id;
                }
              }
            }
          } catch (error) {
            errors.push(
              `Failed to fetch subjects for course "${result.course_name}"`,
            );
          }
        } else if (result.course_id) {
          errors.push("At least one subject mark is required");
        }

        // Check for duplicate register numbers within the bulk data
        const duplicateRegisterIndex = data.findIndex(
          (r, i) =>
            i !== index &&
            r.register_number.toLowerCase() ===
              result.register_number.toLowerCase(),
        );
        if (duplicateRegisterIndex !== -1) {
          errors.push(
            `Duplicate register number found in row ${
              duplicateRegisterIndex + 2
            }`,
          );
        }

        return {
          row,
          data: result,
          errors,
          isValid: errors.length === 0,
        };
      }),
    );

    setBulkUpdateValidations(validations);
  };

  const handleBulkCreate = async () => {
    const validResults = bulkValidations.filter((v) => v.isValid);
    if (validResults.length === 0) {
      toast({
        title: "No valid results",
        description: "Please fix validation errors before creating results.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingBulk(true);
    setBulkProgress(0);
    setBulkResult(null);

    const result: BulkCreationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < validResults.length; i++) {
      const validation = validResults[i];
      const progress = ((i + 1) / validResults.length) * 100;
      setBulkProgress(progress);

      try {
        // Debug logging
        console.log("Creating result for:", validation.data.register_number);
        console.log("Subject IDs available:", validation.data.subject_ids);
        console.log(
          "Available keys in subject_ids:",
          validation.data.subject_ids
            ? Object.keys(validation.data.subject_ids)
            : "none",
        );
        console.log("Marks:", validation.data.marks);

        // Validate that all subjects have IDs before creating
        const marksToCreate = validation.data.marks.map((mark) => {
          // Try exact match first
          let subjectId = validation.data.subject_ids?.[mark.subject_name];

          // If no exact match, try case-insensitive lookup
          if (!subjectId && validation.data.subject_ids) {
            const keys = Object.keys(validation.data.subject_ids);
            const matchedKey = keys.find(
              (key) => key.toLowerCase() === mark.subject_name.toLowerCase(),
            );
            if (matchedKey) {
              subjectId = validation.data.subject_ids[matchedKey];
            }
          }

          if (!subjectId) {
            const availableKeys = validation.data.subject_ids
              ? Object.keys(validation.data.subject_ids)
              : [];
            throw new Error(
              `Subject ID not found for "${
                mark.subject_name
              }". Available keys: ${availableKeys.join(", ")}`,
            );
          }
          console.log(
            `Mapping subject "${mark.subject_name}" to ID: ${subjectId}`,
          );
          return {
            subject: subjectId,
            te_obtained: mark.te_obtained,
            ce_obtained: mark.ce_obtained,
            pe_obtained: mark.pe_obtained,
            pw_obtained: mark.pw_obtained,
          };
        });
        console.log(
          "RAW DATE VALUE:",
          validation.data.published_date,
          "TYPE:",
          typeof validation.data.published_date,
        );
        // Format published_date properly (YYYY-MM-DD format or null)
        // Use the utility function to parse various date formats
        const formattedPublishedDate = validation.data.published_date
          ? parseDateToYYYYMMDD(validation.data.published_date)
          : null;

        const payload = {
          student: validation.data.student_id,
          course: validation.data.course_id,
          batch: validation.data.batch_id,
          register_number: validation.data.register_number,
          certificate_number: validation.data.certificate_number,
          result: validation.data.result || null,
          marks: marksToCreate,
          is_published: validation.data.is_published || false,
          published_date: formattedPublishedDate || null,
        };

        console.log("Payload being sent:", payload);

        await api.post("/api/students/student-results/create/", payload);
        result.success++;
      } catch (error: any) {
        console.error(
          "Error creating result for:",
          validation.data.register_number,
          error,
        );
        result.failed++;
        const errorMessage = error.response?.data
          ? typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data)
          : "Failed to create result";
        result.errors.push({
          row: validation.row,
          registerNumber: validation.data.register_number,
          error: errorMessage,
        });
      }
    }

    setBulkResult(result);
    setIsProcessingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Creation Complete",
        description: `Successfully created ${result.success} results. ${result.failed} failed.`,
      });
      fetchData();
    }

    if (result.failed > 0) {
      toast({
        title: "Some results failed",
        description: `${result.failed} results could not be created. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdate = async () => {
    const validResults = bulkUpdateValidations.filter((v) => v.isValid);
    if (validResults.length === 0) {
      toast({
        title: "No valid results",
        description: "Please fix validation errors before updating results.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingBulkUpdate(true);
    setBulkUpdateProgress(0);
    setBulkUpdateResult(null);

    const result: BulkCreationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < validResults.length; i++) {
      const validation = validResults[i];
      const progress = ((i + 1) / validResults.length) * 100;
      setBulkUpdateProgress(progress);

      try {
        // Find existing result by register number
        const existingResult = studentResults.find(
          (result) =>
            result.register_number === validation.data.register_number,
        );

        if (!existingResult) {
          result.failed++;
          result.errors.push({
            row: validation.row,
            registerNumber: validation.data.register_number,
            error: "Result not found for update",
          });
          continue;
        }

        // Validate that all subjects have IDs before updating
        const marksToCreate = validation.data.marks.map((mark) => {
          // Try exact match first
          let subjectId = validation.data.subject_ids?.[mark.subject_name];

          // If no exact match, try case-insensitive lookup
          if (!subjectId && validation.data.subject_ids) {
            const keys = Object.keys(validation.data.subject_ids);
            const matchedKey = keys.find(
              (key) => key.toLowerCase() === mark.subject_name.toLowerCase(),
            );
            if (matchedKey) {
              subjectId = validation.data.subject_ids[matchedKey];
            }
          }

          if (!subjectId) {
            const availableKeys = validation.data.subject_ids
              ? Object.keys(validation.data.subject_ids)
              : [];
            throw new Error(
              `Subject ID not found for "${
                mark.subject_name
              }". Available keys: ${availableKeys.join(", ")}`,
            );
          }
          return {
            subject: subjectId,
            te_obtained: mark.te_obtained,
            ce_obtained: mark.ce_obtained,
            pe_obtained: mark.pe_obtained,
            pw_obtained: mark.pw_obtained,
          };
        });

        const payload = {
          student: validation.data.student_id,
          course: validation.data.course_id,
          batch: validation.data.batch_id,
          register_number: validation.data.register_number,
          certificate_number: validation.data.certificate_number,
          result: validation.data.result || null,
          marks: marksToCreate,
          is_published: validation.data.is_published || false,
        };

        await api.put(
          `/api/students/student-results/update/${existingResult.id}/`,
          payload,
        );
        result.success++;
      } catch (error: any) {
        console.error(
          "Error updating result for:",
          validation.data.register_number,
          error,
        );
        result.failed++;
        const errorMessage = error.response?.data
          ? typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data)
          : "Failed to update result";
        result.errors.push({
          row: validation.row,
          registerNumber: validation.data.register_number,
          error: errorMessage,
        });
      }
    }

    setBulkUpdateResult(result);
    setIsProcessingBulkUpdate(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Update Complete",
        description: `Successfully updated ${result.success} results. ${result.failed} failed.`,
      });
      fetchData();
    }

    if (result.failed > 0) {
      toast({
        title: "Some results failed",
        description: `${result.failed} results could not be updated. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  // File upload handler for bulk updates
  const handleBulkUpdateFileUpload = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();

    // Check file type and set appropriate reading method
    if (file.name.toLowerCase().endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    reader.onload = async (e) => {
      try {
        let jsonData: any[][];

        // Check file type and parse accordingly
        if (file.name.toLowerCase().endsWith(".csv")) {
          // Parse CSV file
          const csvText = e.target?.result as string;
          const lines = csvText.split("\n");
          jsonData = lines.map((line) => {
            // Simple CSV parsing - handles quoted fields
            const result = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          });
        } else {
          // Parse Excel file
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }

        // Skip header row and process data
        const resultData: BulkStudentResultData[] = jsonData
          .slice(1)
          .map((row: any[], index: number) => {
            // Parse marks from the row (assuming marks are in columns after the basic info)
            const marks: Array<{
              subject_name: string;
              te_obtained?: number;
              ce_obtained?: number;
              pe_obtained?: number;
              pw_obtained?: number;
            }> = [];

            // Parse marks - new format: Subject 1, Type 1, TE Obtained 1, CE Obtained 1, PE Obtained 1, PW Obtained 1, Subject 2, Type 2, ...
            // Each subject group takes 10 columns: Subject Name, Type, TE, CE, PE, PW, PR, Project, Viva, PL
            // Start from column 8 (index 8) since we added is_published at column 6 and published_date at column 7
            for (let i = 8; i < row.length; i += 10) {
              if (row[i] && row[i].toString().trim()) {
                const subjectName = row[i].toString().trim();
                const subjectType = row[i + 1]?.toString().trim().toLowerCase();

                // Create mark object with all possible fields
                const mark = {
                  subject_name: subjectName,
                  te_obtained: row[i + 2]
                    ? parseInt(row[i + 2].toString())
                    : null,
                  ce_obtained: row[i + 3]
                    ? parseInt(row[i + 3].toString())
                    : null,
                  pe_obtained: row[i + 4]
                    ? parseInt(row[i + 4].toString())
                    : null,
                  pw_obtained: row[i + 5]
                    ? parseInt(row[i + 5].toString())
                    : null,
                  pr_obtained: row[i + 6]
                    ? parseInt(row[i + 6].toString())
                    : null,
                  project_obtained: row[i + 7]
                    ? parseInt(row[i + 7].toString())
                    : null,
                  viva_obtained: row[i + 8]
                    ? parseInt(row[i + 8].toString())
                    : null,
                  pl_obtained: row[i + 9]
                    ? parseInt(row[i + 9].toString())
                    : null,
                };

                // Only add if at least one mark is provided
                const hasAnyMark =
                  mark.te_obtained !== null ||
                  mark.ce_obtained !== null ||
                  mark.pe_obtained !== null ||
                  mark.pw_obtained !== null;

                if (hasAnyMark) {
                  marks.push(mark);
                }
              }
            }

            // Parse published_date properly - return null if empty/invalid
            let publishedDateStr: string | null = null;
            if (row[7]) {
              publishedDateStr = parseDateToYYYYMMDD(row[7].toString());
            }

            return {
              student_name: row[0]?.toString() || "",
              course_name: row[1]?.toString() || "",
              batch_name: row[2]?.toString() || "",
              register_number: row[3]?.toString() || "",
              certificate_number: row[4]?.toString() || "",
              result: row[5]?.toString() || "",
              is_published:
                row[6]?.toString().toLowerCase() === "true" || false,
              published_date: publishedDateStr,
              marks,
            };
          });

        setBulkUpdateData(resultData);
        await validateBulkUpdateData(resultData);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "Error",
          description:
            "Failed to parse file. Please check the format and ensure it's a valid Excel or CSV file.",
          variant: "destructive",
        });
      }
    };
  };

  // Bulk delete functions
  const toggleDeleteSelection = (resultId: number) => {
    setSelectedResultsForDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const selectAllForDelete = () => {
    setSelectedResultsForDelete(
      new Set(filteredResults.map((result) => result.id!)),
    );
  };

  const clearDeleteSelection = () => {
    setSelectedResultsForDelete(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedResultsForDelete.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one student result to delete.",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingBulk(true);
    setBulkDeleteProgress(0);
    setBulkDeleteResult(null);

    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{
        row: number;
        registerNumber: string;
        error: string;
      }>,
    };

    const selectedResults = studentResults.filter((result) =>
      selectedResultsForDelete.has(result.id!),
    );

    for (let i = 0; i < selectedResults.length; i++) {
      const studentResult = selectedResults[i];
      const progress = ((i + 1) / selectedResults.length) * 100;
      setBulkDeleteProgress(progress);

      try {
        await api.delete(
          `/api/students/student-results/delete/${studentResult.id}/`,
        );
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          registerNumber: studentResult.register_number,
          error: error.response?.data?.message || "Failed to delete result",
        });
      }
    }

    setBulkDeleteResult(result);
    setIsDeletingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Delete Complete",
        description: `Successfully deleted ${result.success} results. ${result.failed} failed.`,
      });
      fetchData();
      setSelectedResultsForDelete(new Set());
    }

    if (result.failed > 0) {
      toast({
        title: "Some results failed",
        description: `${result.failed} results could not be deleted. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      [
        "Student Name",
        "Course Name",
        "Batch Name",
        "Register Number",
        "Certificate Number",
        "Result (Pass/Fail/Absent)",
        "Is Published",
        "Published Date",
        "Subject 1",
        "Type 1",
        "TE Obtained 1",
        "CE Obtained 1",
        "PE Obtained 1",
        "PW Obtained 1",
        "PR Obtained 1",
        "Project Obtained 1",
        "Viva Obtained 1",
        "PL Obtained 1",

        "Subject 2",
        "Type 2",
        "TE Obtained 2",
        "CE Obtained 2",
        "PE Obtained 2",
        "PW Obtained 2",
        "PR Obtained 2",
        "Project Obtained 2",
        "Viva Obtained 2",
        "PL Obtained 2",
        "Subject 3",
        "Type 3",
        "TE Obtained 3",
        "CE Obtained 3",
        "PE Obtained 3",
        "PW Obtained 3",
        "PR Obtained 3",
        "Project Obtained 3",
        "Viva Obtained 3",
        "PL Obtained 3",
      ],
      [
        "John Doe",
        "Computer Science",
        "CS Batch 2024-1",
        "REG001",
        "CERT001",
        "Pass",
        "TRUE",
        "2024-12-15",
        "Programming",
        "theory",
        "80",
        "20",
        "",
        "",
        "Database Lab",
        "practical",
        "",
        "",
        "15",
        "5",
        "Data Structures",
        "theory",
        "75",
        "25",
        "",
        "",
      ],
      [
        "",
        "Use exact course name",
        "Use exact batch name",
        "Unique register number",
        "Unique certificate number",
        "Pass/Fail/Absent",
        "TRUE or FALSE",
        "Date: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY or YYYY/MM/DD",
        "Subject name",
        "theory or practical",
        "For theory subjects only",
        "For theory subjects only",
        "For practical subjects only",
        "For practical subjects only",
        "Subject name",
        "theory or practical",
        "For theory subjects only",
        "For theory subjects only",
        "For practical subjects only",
        "For practical subjects only",
        "Subject name",
        "theory or practical",
        "For theory subjects only",
        "For theory subjects only",
        "For practical subjects only",
        "For practical subjects only",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Results");
    XLSX.writeFile(wb, "student_results_template.xlsx");
  };

  const downloadCSVTemplate = () => {
    const templateData = [
      [
        "Student Name",
        "Course Name",
        "Batch Name",
        "Register Number",
        "Certificate Number",
        "Result",
        "Is Published",
        "Published Date",
        "Subject 1",
        "Type 1",
        "TE Obtained 1",
        "CE Obtained 1",
        "PE Obtained 1",
        "PW Obtained 1",
        "Subject 2",
        "Type 2",
        "TE Obtained 2",
        "CE Obtained 2",
        "PE Obtained 2",
        "PW Obtained 2",
        "Subject 3",
        "Type 3",
        "TE Obtained 3",
        "CE Obtained 3",
        "PE Obtained 3",
        "PW Obtained 3",
      ],
      [
        "John Doe",
        "Computer Science",
        "CS Batch 2024-1",
        "REG001",
        "CERT001",
        "Pass",
        "TRUE",
        "2024-12-15",
        "Programming",
        "theory",
        "80",
        "20",
        "",
        "",
        "Database Lab",
        "practical",
        "",
        "",
        "15",
        "5",
        "Data Structures",
        "theory",
        "75",
        "25",
        "",
        "",
      ],
      [
        "",
        "Use exact course name",
        "Use exact batch name",
        "Unique register number",
        "Unique certificate number",
        "Pass/Fail/Absent",
        "TRUE or FALSE",
        "Date: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY or YYYY/MM/DD",
        "Subject name",
        "theory or practical",
        "For theory subjects only",
        "For theory subjects only",
        "For practical subjects only",
        "For practical subjects only",
        "Subject name",
        "theory or practical",
        "For theory subjects only",
        "For theory subjects only",
        "For practical subjects only",
        "For practical subjects only",
        "Subject name",
        "theory or practical",
        "For theory subjects only",
        "For theory subjects only",
        "For practical subjects only",
        "For practical subjects only",
      ],
    ];

    // Convert to CSV format
    const csvContent = templateData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_results_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetBulkDialog = () => {
    setBulkData([]);
    setBulkValidations([]);
    setBulkResult(null);
    setBulkProgress(0);
  };

  // Bulk update functions
  const toggleResultSelection = (resultId: number) => {
    setSelectedResultsForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const selectAllResults = () => {
    setSelectedResultsForExport(
      new Set(filteredResults.map((result) => result.id!)),
    );
  };

  const clearSelection = () => {
    setSelectedResultsForExport(new Set());
  };

  const exportSelectedToExcel = async () => {
    if (selectedResultsForExport.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one student result to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedResults = studentResults.filter((result) =>
        selectedResultsForExport.has(result.id!),
      );

      // Create Excel data using the same template structure as bulk import
      const excelData = [
        [
          "Student Name",
          "Course Name",
          "Batch Name",
          "Register Number",
          "Certificate Number",
          "Result",
          "Is Published",
          "Subject 1",
          "Type 1",
          "TE Obtained 1",
          "CE Obtained 1",
          "PE Obtained 1",
          "PW Obtained 1",
          "Subject 2",
          "Type 2",
          "TE Obtained 2",
          "CE Obtained 2",
          "PE Obtained 2",
          "PW Obtained 2",
          "Subject 3",
          "Type 3",
          "TE Obtained 3",
          "CE Obtained 3",
          "PE Obtained 3",
          "PW Obtained 3",
        ],
      ];

      // Add data rows
      selectedResults.forEach((result) => {
        const row = [
          result.student_name,
          result.course_name,
          result.batch_name,
          result.register_number,
          result.certificate_number,
          result.result || "",
          result.is_published ? "TRUE" : "FALSE",
        ];

        // Add marks data
        if (result.marks && result.marks.length > 0) {
          result.marks.forEach((mark, index) => {
            if (index < 3) {
              // Limit to 3 subjects max
              const subjectType =
                mark.te_obtained !== null || mark.ce_obtained !== null
                  ? "theory"
                  : "practical";
              row.push(
                mark.subject_name || "",
                subjectType,
                mark.te_obtained?.toString() || "",
                mark.ce_obtained?.toString() || "",
                mark.pe_obtained?.toString() || "",
                mark.pw_obtained?.toString() || "",
              );
            }
          });

          // Fill remaining subject columns if less than 3 subjects
          const remainingSubjects = 3 - (result.marks?.length || 0);
          for (let i = 0; i < remainingSubjects; i++) {
            row.push("", "", "", "", "", "");
          }
        } else {
          // No marks - fill with empty values
          for (let i = 0; i < 18; i++) {
            // 3 subjects * 6 columns each
            row.push("");
          }
        }

        excelData.push(row);
      });

      // Create and download Excel file
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Student Results");
      XLSX.writeFile(
        wb,
        `student_results_export_${new Date().toISOString().split("T")[0]}.xlsx`,
      );

      toast({
        title: "Export Successful",
        description: `Exported ${selectedResultsForExport.size} student results to Excel file.`,
      });

      setIsBulkUpdateDialogOpen(false);
      setSelectedResultsForExport(new Set());
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export student results to Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && studentResults.length === 0) {
    return <StudentResultsPageSkeleton />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Student Results Management
            </h1>
            <p className="text-muted-foreground">
              Manage student results and their marks
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              onClick={() => openDialog()}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              <span>Add Result</span>
            </Button>
            <Button
              onClick={() => {
                resetBulkDialog();
                setIsBulkDialogOpen(true);
              }}
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden md:inline">Bulk Import</span>
            </Button>
            <Button
              onClick={() => setIsBulkUpdateDialogOpen(true)}
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden md:inline">Export</span>
            </Button>
            <Button
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              variant="outline"
              className="gap-2 flex-1 sm:flex-none text-red-600 border-red-300 hover:bg-red-600 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden md:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalResults}</p>
                  <p className="text-xs text-muted-foreground">
                    All results in database
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {totalResults > 0
                      ? Math.round((totalPass / totalResults) * 100)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalPass} of {totalResults} passed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Award className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPublished}</p>
                  <p className="text-xs text-muted-foreground">
                    Published results
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search results by student, register number, certificate number..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Badge variant="secondary" className="whitespace-nowrap">
                {searchQuery
                  ? `${totalCount} results`
                  : `${filteredResults.length} of ${studentResults.length} on page`}
              </Badge>
            </div>

            {/* Filter Options */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id!.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id!.toString()}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedResult} onValueChange={setSelectedResult}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPublished}
                onValueChange={setSelectedPublished}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery ||
                selectedCourse !== "all" ||
                selectedBatch !== "all" ||
                selectedResult !== "all" ||
                selectedPublished !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Grid/List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredResults.map((result) => (
            <Card
              key={result.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/student-result-view/${result.id}`)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left Section - Result Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1 truncate">
                          {result.student_name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {result.register_number}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Award className="h-3 w-3 mr-1" />
                            {result.certificate_number}
                          </Badge>
                          {result.result && (
                            <Badge
                              variant={
                                result.result.toLowerCase() === "pass"
                                  ? "default"
                                  : result.result.toLowerCase() ===
                                      "distinction"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {result.result}
                            </Badge>
                          )}
                          {result.is_published ? (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 border-green-600"
                            >
                              Published
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-orange-600 border-orange-600"
                            >
                              Unpublished
                            </Badge>
                          )}
                          {result.is_withheld && (
                            <Badge variant="destructive" className="text-xs">
                              Withheld
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pl-14 space-y-1">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{result.course_name}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{result.batch_name}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{result.marks?.length || 0} subjects</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Action Button */}
                  <div className="flex sm:flex-col items-center gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student-result-view/${result.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View Details</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}{" "}
              results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    // Show first page, last page, current page, and pages around current page
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="text-muted-foreground">
                          ...
                        </span>
                      );
                    }
                    return null;
                  },
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {filteredResults.length === 0 && !loading && (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchQuery ||
            selectedBatch !== "all" ||
            selectedCourse !== "all" ||
            selectedResult !== "all" ||
            selectedPublished !== "all" ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  No results match your current filters
                </p>
                <Button onClick={clearAllFilters} variant="outline">
                  Clear All Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first student result
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Result
                </Button>
              </>
            )}
          </div>
        )}

        {/* Student Result Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingResult
                  ? "Edit Student Result"
                  : "Create New Student Result"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingResult
                  ? "Update student result details and marks"
                  : "Add a new student result with marks"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="student" className="text-sm sm:text-base">
                    Student *
                  </Label>
                  <Select
                    value={formData.student.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, student: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {students.map((student) => (
                        <SelectItem
                          key={student.id}
                          value={student.id!.toString()}
                        >
                          {student.name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.student && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.student}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="course" className="text-sm sm:text-base">
                    Course *
                  </Label>
                  <Select
                    value={formData.course.toString()}
                    onValueChange={(value) =>
                      handleCourseChange(parseInt(value))
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem
                          key={course.id}
                          value={course.id!.toString()}
                        >
                          {course.name} ({course.short_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.course && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.course}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="batch" className="text-sm sm:text-base">
                    Batch *
                  </Label>
                  <Select
                    value={formData.batch.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, batch: parseInt(value) })
                    }
                    disabled={!formData.course || formData.course === 0}
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue
                        placeholder={
                          !formData.course || formData.course === 0
                            ? "Select a course first"
                            : "Select a batch"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {batches
                        .filter((batch) => batch.course === formData.course)
                        .map((batch) => (
                          <SelectItem
                            key={batch.id}
                            value={batch.id!.toString()}
                          >
                            {batch.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.batch && (
                    <p className="text-sm text-destructive">{errors.batch}</p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label
                    htmlFor="register_number"
                    className="text-sm sm:text-base"
                  >
                    Register Number *
                  </Label>
                  <Input
                    id="register_number"
                    value={formData.register_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        register_number: e.target.value,
                      })
                    }
                    placeholder="e.g., REG001"
                    className="text-sm sm:text-base"
                  />
                  {errors.register_number && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.register_number}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label
                    htmlFor="certificate_number"
                    className="text-sm sm:text-base"
                  >
                    Certificate Number *
                  </Label>
                  <Input
                    id="certificate_number"
                    value={formData.certificate_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        certificate_number: e.target.value,
                      })
                    }
                    placeholder="e.g., CERT001"
                    className="text-sm sm:text-base"
                  />
                  {errors.certificate_number && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.certificate_number}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="result" className="text-sm sm:text-base">
                    Result
                  </Label>
                  <Select
                    value={formData.result || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, result: value })
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={formData.is_published}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_published: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label
                      htmlFor="is_published"
                      className="text-sm sm:text-base font-medium"
                    >
                      Published
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check this box to mark the result as published
                  </p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_withheld"
                      checked={formData.is_withheld}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_withheld: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-destructive focus:ring-destructive border-gray-300 rounded"
                    />
                    <Label
                      htmlFor="is_withheld"
                      className="text-sm sm:text-base font-medium text-destructive"
                    >
                      Withheld
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check this box to withhold the result (hides marks from
                    student)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="published_date">Published Date</Label>
                  <DatePicker
                    value={formData.published_date || ""}
                    onChange={(value) =>
                      setFormData({ ...formData, published_date: value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Select the date when the result was published
                  </p>
                </div>
              </div>

              {/* Marks Section */}
              {subjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Marks *</h3>
                    <div className="text-sm text-muted-foreground">
                      Add marks for subjects in{" "}
                      {courses.find((c) => c.id === formData.course)?.name}
                    </div>
                  </div>

                  {errors.marks && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {errors.marks}
                    </div>
                  )}

                  <div className="grid gap-4">
                    {subjects.map((subject) => {
                      const existingMark = formData.marks.find(
                        (mark) => mark.subject === subject.id,
                      );
                      return (
                        <Card key={subject.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{subject.name}</h4>
                              <div className="text-sm text-muted-foreground">
                                {subject.te_max || subject.ce_max ? (
                                  <>
                                    Theory: TE({subject.te_max || 0}) + CE(
                                    {subject.ce_max || 0})
                                  </>
                                ) : (
                                  <>
                                    Practical: PE({subject.pe_max || 0}) + PW(
                                    {subject.pw_max || 0})
                                  </>
                                )}
                              </div>
                              {errors[
                                `marks_${formData.marks.findIndex(
                                  (m) => m.subject === subject.id,
                                )}`
                              ] && (
                                <div className="text-sm text-destructive mt-1">
                                  {
                                    errors[
                                      `marks_${formData.marks.findIndex(
                                        (m) => m.subject === subject.id,
                                      )}`
                                    ]
                                  }
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant={existingMark ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (existingMark) {
                                  removeMark(subject.id!);
                                } else {
                                  addMark(subject.id!, subject.name);
                                }
                              }}
                            >
                              {existingMark ? "Remove" : "Add"}
                            </Button>
                          </div>

                          {existingMark && (
                            <div className="grid grid-cols-2 gap-3">
                              {/* Theory subjects - show TE and CE */}
                              {(subject.te_max || subject.ce_max) && (
                                <>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`te_${subject.id}`}
                                      className="text-xs"
                                    >
                                      TE (Theory Exam)
                                    </Label>
                                    <Input
                                      id={`te_${subject.id}`}
                                      type="number"
                                      value={existingMark.te_obtained || ""}
                                      onChange={(e) =>
                                        updateMark(
                                          subject.id!,
                                          "te_obtained",
                                          e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                        )
                                      }
                                      placeholder="0"
                                      min="0"
                                      max={subject.te_max || undefined}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`ce_${subject.id}`}
                                      className="text-xs"
                                    >
                                      CE (Continuous Evaluation)
                                    </Label>
                                    <Input
                                      id={`ce_${subject.id}`}
                                      type="number"
                                      value={existingMark.ce_obtained || ""}
                                      onChange={(e) =>
                                        updateMark(
                                          subject.id!,
                                          "ce_obtained",
                                          e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                        )
                                      }
                                      placeholder="0"
                                      min="0"
                                      max={subject.ce_max || undefined}
                                    />
                                  </div>
                                </>
                              )}

                              {/* Practical subjects - show PE and PW */}
                              {(subject.pe_max ||
                                subject.pw_max ||
                                subject.pr_max ||
                                subject.project_max ||
                                subject.viva_pl_max) && (
                                <>
                                  {subject.pe_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`pe_${subject.id}`}
                                        className="text-xs"
                                      >
                                        PE (Practical Exam)
                                      </Label>
                                      <Input
                                        id={`pe_${subject.id}`}
                                        type="number"
                                        value={existingMark.pe_obtained || ""}
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "pe_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.pe_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.pw_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`pw_${subject.id}`}
                                        className="text-xs"
                                      >
                                        PW (Practical Work)
                                      </Label>
                                      <Input
                                        id={`pw_${subject.id}`}
                                        type="number"
                                        value={existingMark.pw_obtained || ""}
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "pw_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.pw_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.pr_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`pr_${subject.id}`}
                                        className="text-xs"
                                      >
                                        P.R (Practical Record)
                                      </Label>
                                      <Input
                                        id={`pr_${subject.id}`}
                                        type="number"
                                        value={existingMark.pr_obtained || ""}
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "pr_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.pr_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.project_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`project_${subject.id}`}
                                        className="text-xs"
                                      >
                                        Project
                                      </Label>
                                      <Input
                                        id={`project_${subject.id}`}
                                        type="number"
                                        value={
                                          existingMark.project_obtained || ""
                                        }
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "project_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.project_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.viva_pl_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`viva_pl_${subject.id}`}
                                        className="text-xs"
                                      >
                                        Viva & PL
                                      </Label>
                                      <Input
                                        id={`viva_pl_${subject.id}`}
                                        type="number"
                                        value={
                                          existingMark.viva_pl_obtained || ""
                                        }
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "viva_pl_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.viva_pl_max || undefined}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingResult ? "Updating..." : "Creating..."}
                    </>
                  ) : editingResult ? (
                    "Update Result"
                  ) : (
                    "Create Result"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent className="mx-2 sm:mx-4 md:mx-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base">
                This action cannot be undone. This will permanently delete the
                student result for{" "}
                <strong>{resultToDelete?.student_name}</strong> and remove all
                associated marks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => {
                  setResultToDelete(null);
                  setIsDeleteDialogOpen(false);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Result"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Update Dialog */}
        <Dialog
          open={isBulkUpdateDialogOpen}
          onOpenChange={setIsBulkUpdateDialogOpen}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Export Student Results
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select student results to export to Excel,then delete the data,
                then upload back the exported data for bulk updates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Selection Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-muted/50 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">
                      Select Student Results
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Choose the student results you want to export and update.
                      {selectedResultsForExport.size > 0 &&
                        ` ${selectedResultsForExport.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllResults}
                    variant="outline"
                    size="sm"
                    disabled={filteredResults.length === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({filteredResults.length})
                  </Button>
                  <Button
                    onClick={clearSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedResultsForExport.size === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Results Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Results to Export
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedResultsForExport.size > 0 &&
                              selectedResultsForExport.size ===
                                filteredResults.length
                            }
                            onChange={() => {
                              if (
                                selectedResultsForExport.size ===
                                filteredResults.length
                              ) {
                                clearSelection();
                              } else {
                                selectAllResults();
                              }
                            }}
                            className="h-3 w-3 sm:h-4 sm:w-4"
                          />
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                          Student
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Course
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Batch
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Register No.
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden xl:table-cell">
                          Result
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden 2xl:table-cell">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result) => (
                        <tr
                          key={result.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedResultsForExport.has(result.id!)}
                              onChange={() => toggleResultSelection(result.id!)}
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <span className="truncate">
                              {result.student_name}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            {result.course_name}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {result.batch_name}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">
                            {result.register_number}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden xl:table-cell">
                            {result.result ? (
                              <Badge
                                variant={
                                  result.result.toLowerCase() === "pass"
                                    ? "default"
                                    : result.result.toLowerCase() ===
                                        "distinction"
                                      ? "secondary"
                                      : "destructive"
                                }
                                className="text-xs sm:text-sm"
                              >
                                {result.result}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs sm:text-sm">
                                No result
                              </span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden 2xl:table-cell">
                            {result.is_published ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600 text-xs sm:text-sm"
                              >
                                Published
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-600 text-xs sm:text-sm"
                              >
                                Unpublished
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkUpdateDialogOpen(false);
                    setSelectedResultsForExport(new Set());
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={exportSelectedToExcel}
                  disabled={selectedResultsForExport.size === 0 || isExporting}
                  className="w-full sm:w-auto"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                      <span className="text-xs sm:text-sm">Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">
                        Export to Excel ({selectedResultsForExport.size})
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Update Import Dialog */}
        <Dialog
          open={isBulkUpdateImportDialogOpen}
          onOpenChange={setIsBulkUpdateImportDialogOpen}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Update Student Results
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Upload an Excel file with existing student results to update
                them in bulk. The system will validate that the results exist
                before updating.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* File Upload */}
              {bulkUpdateData.length === 0 && (
                <div
                  className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handleBulkUpdateFileUpload(files[0]);
                    }
                  }}
                >
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    Upload Excel or CSV File for Bulk Update
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Drag and drop your Excel (.xlsx, .xls) or CSV file here, or
                    click to browse. This should contain existing student
                    results that you want to update.
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBulkUpdateFileUpload(file);
                    }}
                    className="hidden"
                    id="bulk-update-upload"
                  />
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Label
                      htmlFor="bulk-update-upload"
                      className="cursor-pointer"
                    >
                      Choose File
                    </Label>
                  </Button>
                </div>
              )}

              {/* Validation Results */}
              {bulkUpdateValidations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Validation Results
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {bulkUpdateValidations.filter((v) => v.isValid).length}{" "}
                        Valid
                      </Badge>
                      <Badge variant="destructive">
                        {bulkUpdateValidations.filter((v) => !v.isValid).length}{" "}
                        Invalid
                      </Badge>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium">
                            Row
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Student
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Course
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Batch
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Register No
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkUpdateValidations.map((validation, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3 text-sm">{validation.row}</td>
                            <td className="p-3 text-sm">
                              {validation.data.student_name}
                            </td>
                            <td className="p-3 text-sm">
                              {validation.data.course_name}
                            </td>
                            <td className="p-3 text-sm">
                              {validation.data.batch_name}
                            </td>
                            <td className="p-3 text-sm">
                              {validation.data.register_number}
                            </td>
                            <td className="p-3">
                              {validation.isValid ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">Valid</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-sm">Invalid</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Error Details */}
                  {bulkUpdateValidations.some((v) => !v.isValid) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">
                        Validation Errors:
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-auto">
                        {bulkUpdateValidations
                          .filter((v) => !v.isValid)
                          .map((validation, index) => (
                            <div
                              key={index}
                              className="text-sm text-destructive"
                            >
                              <strong>Row {validation.row}:</strong>{" "}
                              {validation.errors.join(", ")}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {isProcessingBulkUpdate && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Updating results...</span>
                        <span>{Math.round(bulkUpdateProgress)}%</span>
                      </div>
                      <Progress value={bulkUpdateProgress} className="w-full" />
                    </div>
                  )}

                  {/* Results */}
                  {bulkUpdateResult && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            {bulkUpdateResult.success} Updated
                          </span>
                        </div>
                        {bulkUpdateResult.failed > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">
                              {bulkUpdateResult.failed} Failed
                            </span>
                          </div>
                        )}
                      </div>

                      {bulkUpdateResult.errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-destructive">
                            Failed Updates:
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-auto">
                            {bulkUpdateResult.errors.map((error, index) => (
                              <div
                                key={index}
                                className="text-sm text-destructive"
                              >
                                <strong>
                                  Row {error.row} ({error.registerNumber}):
                                </strong>{" "}
                                {error.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkUpdateImportDialogOpen(false);
                        setBulkUpdateData([]);
                        setBulkUpdateValidations([]);
                        setBulkUpdateResult(null);
                        setBulkUpdateProgress(0);
                      }}
                    >
                      Cancel
                    </Button>
                    {!isProcessingBulkUpdate && !bulkUpdateResult && (
                      <Button
                        onClick={handleBulkUpdate}
                        disabled={
                          bulkUpdateValidations.filter((v) => v.isValid)
                            .length === 0
                        }
                      >
                        Update{" "}
                        {bulkUpdateValidations.filter((v) => v.isValid).length}{" "}
                        Results
                      </Button>
                    )}
                    {bulkUpdateResult && (
                      <Button
                        onClick={() => {
                          setIsBulkUpdateImportDialogOpen(false);
                          setBulkUpdateData([]);
                          setBulkUpdateValidations([]);
                          setBulkUpdateResult(null);
                          setBulkUpdateProgress(0);
                        }}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Dialog */}
        <Dialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Delete Student Results
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select student results to delete in bulk. This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Selection Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-red-50 border-red-200 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-red-900 text-sm sm:text-base">
                      Select Student Results to Delete
                    </p>
                    <p className="text-xs sm:text-sm text-red-700">
                      Choose the student results you want to delete permanently.
                      {selectedResultsForDelete.size > 0 &&
                        ` ${selectedResultsForDelete.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForDelete}
                    variant="outline"
                    size="sm"
                    disabled={filteredResults.length === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({filteredResults.length})
                  </Button>
                  <Button
                    onClick={clearDeleteSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedResultsForDelete.size === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Results Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Results to Delete
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedResultsForDelete.size > 0 &&
                              selectedResultsForDelete.size ===
                                filteredResults.length
                            }
                            onChange={() => {
                              if (
                                selectedResultsForDelete.size ===
                                filteredResults.length
                              ) {
                                clearDeleteSelection();
                              } else {
                                selectAllForDelete();
                              }
                            }}
                            className="h-3 w-3 sm:h-4 sm:w-4"
                          />
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                          Student
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Course
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Batch
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Register No.
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden xl:table-cell">
                          Result
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden 2xl:table-cell">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result) => (
                        <tr
                          key={result.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedResultsForDelete.has(result.id!)}
                              onChange={() => toggleDeleteSelection(result.id!)}
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <span className="truncate">
                              {result.student_name}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            {result.course_name}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {result.batch_name}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">
                            {result.register_number}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden xl:table-cell">
                            {result.result ? (
                              <Badge
                                variant={
                                  result.result.toLowerCase() === "pass"
                                    ? "default"
                                    : result.result.toLowerCase() ===
                                        "distinction"
                                      ? "secondary"
                                      : "destructive"
                                }
                                className="text-xs sm:text-sm"
                              >
                                {result.result}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs sm:text-sm">
                                No result
                              </span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden 2xl:table-cell">
                            {result.is_published ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600 text-xs sm:text-sm"
                              >
                                Published
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-600 text-xs sm:text-sm"
                              >
                                Unpublished
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress Bar */}
              {isDeletingBulk && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Deleting results...</span>
                    <span>{Math.round(bulkDeleteProgress)}%</span>
                  </div>
                  <Progress value={bulkDeleteProgress} className="w-full" />
                </div>
              )}

              {/* Results */}
              {bulkDeleteResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">
                        {bulkDeleteResult.success} Deleted
                      </span>
                    </div>
                    {bulkDeleteResult.failed > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">
                          {bulkDeleteResult.failed} Failed
                        </span>
                      </div>
                    )}
                  </div>

                  {bulkDeleteResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">
                        Failed Deletions:
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-auto">
                        {bulkDeleteResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-destructive">
                            <strong>{error.registerNumber}:</strong>{" "}
                            {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkDeleteDialogOpen(false);
                    setSelectedResultsForDelete(new Set());
                    setBulkDeleteResult(null);
                    setBulkDeleteProgress(0);
                  }}
                >
                  Cancel
                </Button>
                {!isDeletingBulk && !bulkDeleteResult && (
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedResultsForDelete.size === 0}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedResultsForDelete.size} Results
                  </Button>
                )}
                {bulkDeleteResult && (
                  <Button
                    onClick={() => {
                      setIsBulkDeleteDialogOpen(false);
                      setSelectedResultsForDelete(new Set());
                      setBulkDeleteResult(null);
                      setBulkDeleteProgress(0);
                    }}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Creation Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Import Student Results
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Upload an Excel (.xlsx, .xls) or CSV file to create multiple
                student results at once. Download the template for the correct
                format.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Template Download */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-muted/50 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">
                      Download Template
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use this Excel template to format your student result data
                      correctly. You can also use CSV format with the same
                      column structure.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Excel</span>
                  </Button>
                  <Button
                    onClick={downloadCSVTemplate}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">CSV</span>
                  </Button>
                </div>
              </div>

              {/* Bulk Update Section */}
              {/* <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <Edit className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Bulk Update Existing Results
                    </p>
                    <p className="text-sm text-blue-700">
                      Export existing results to Excel, edit them, and upload
                      back for bulk updates.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setIsBulkDialogOpen(false);
                    setIsBulkUpdateDialogOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Convert to Excel
                </Button>
              </div> */}

              {/* File Upload */}
              {bulkData.length === 0 && (
                <div
                  className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      handleFileUpload(files[0]);
                    }
                  }}
                >
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    Upload Excel or CSV File
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Drag and drop your Excel (.xlsx, .xls) or CSV file here, or
                    click to browse
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="bulk-upload"
                  />
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Label htmlFor="bulk-upload" className="cursor-pointer">
                      Choose File
                    </Label>
                  </Button>
                </div>
              )}

              {/* Validation Results */}
              {bulkValidations.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Validation Results
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {bulkValidations.filter((v) => v.isValid).length} Valid
                      </Badge>
                      <Badge
                        variant="destructive"
                        className="text-xs sm:text-sm"
                      >
                        {bulkValidations.filter((v) => !v.isValid).length}{" "}
                        Invalid
                      </Badge>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium">
                            Row
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Student
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Course
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Batch
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Register No
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkValidations.map((validation, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3 text-sm">{validation.row}</td>
                            <td className="p-3 text-sm">
                              {validation.data.student_name}
                            </td>
                            <td className="p-3 text-sm">
                              {validation.data.course_name}
                            </td>
                            <td className="p-3 text-sm">
                              {validation.data.batch_name}
                            </td>
                            <td className="p-3 text-sm">
                              {validation.data.register_number}
                            </td>
                            <td className="p-3">
                              {validation.isValid ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">Valid</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-sm">Invalid</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Error Details */}
                  {bulkValidations.some((v) => !v.isValid) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">
                        Validation Errors:
                      </h4>
                      <div className="space-y-1 max-h-32 overflow-auto">
                        {bulkValidations
                          .filter((v) => !v.isValid)
                          .map((validation, index) => (
                            <div
                              key={index}
                              className="text-sm text-destructive"
                            >
                              <strong>Row {validation.row}:</strong>{" "}
                              {validation.errors.join(", ")}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {isProcessingBulk && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Creating results...</span>
                        <span>{Math.round(bulkProgress)}%</span>
                      </div>
                      <Progress value={bulkProgress} className="w-full" />
                    </div>
                  )}

                  {/* Results */}
                  {bulkResult && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            {bulkResult.success} Created
                          </span>
                        </div>
                        {bulkResult.failed > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-medium">
                              {bulkResult.failed} Failed
                            </span>
                          </div>
                        )}
                      </div>

                      {bulkResult.errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-destructive">
                            Failed Results:
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-auto">
                            {bulkResult.errors.map((error, index) => (
                              <div
                                key={index}
                                className="text-sm text-destructive"
                              >
                                <strong>
                                  Row {error.row} ({error.registerNumber}):
                                </strong>{" "}
                                {error.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkDialogOpen(false);
                        resetBulkDialog();
                      }}
                    >
                      Cancel
                    </Button>
                    {!isProcessingBulk && !bulkResult && (
                      <Button
                        onClick={handleBulkCreate}
                        disabled={
                          bulkValidations.filter((v) => v.isValid).length === 0
                        }
                      >
                        Create {bulkValidations.filter((v) => v.isValid).length}{" "}
                        Results
                      </Button>
                    )}
                    {bulkResult && (
                      <Button
                        onClick={() => {
                          setIsBulkDialogOpen(false);
                          resetBulkDialog();
                        }}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default StudentResults;
