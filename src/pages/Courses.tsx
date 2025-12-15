import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Users,
  Calendar,
  Search,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
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
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Course, CourseFormData, Subject } from "@/types";
import * as XLSX from "xlsx";
import { CoursePageSkeleton } from "@/components/skeletons/CoursePageSkeleton";

// Bulk import interfaces
interface BulkCourseData {
  name: string;
  short_code: string;
  duration_months?: number;
  subjects: Array<{
    name: string;
    te_max?: number;
    ce_max?: number;
    pe_max?: number;
    pw_max?: number;
  }>;
}

interface BulkCourseValidation {
  row: number;
  data: BulkCourseData;
  errors: string[];
  isValid: boolean;
}

interface BulkCreationResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    courseName: string;
    error: string;
  }>;
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    name: "",
    short_code: "",
    duration_months: null,
    subjects: [
      { name: "", te_max: null, ce_max: null, pe_max: null, pw_max: null },
    ],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk import states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState<BulkCourseData[]>([]);
  const [bulkValidations, setBulkValidations] = useState<
    BulkCourseValidation[]
  >([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkCreationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Bulk delete states
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedCoursesForDelete, setSelectedCoursesForDelete] = useState<
    Set<number>
  >(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; courseName: string; error: string }>;
  } | null>(null);

  // Convert to Excel states
  const [isBulkExportDialogOpen, setIsBulkExportDialogOpen] = useState(false);
  const [selectedCoursesForExport, setSelectedCoursesForExport] = useState<
    Set<number>
  >(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { toast } = useToast();

  // Fetch courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/course/list/");
      setCourses(response.data);
      setFilteredCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on search query
  const filterCourses = (query: string) => {
    if (!query.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = courses.filter((course) => {
      // Search in course name and short code
      const courseMatch =
        course.name.toLowerCase().includes(searchTerm) ||
        course.short_code.toLowerCase().includes(searchTerm);

      // Search in subject names
      const subjectMatch = course.subjects.some((subject) =>
        subject.name.toLowerCase().includes(searchTerm)
      );

      return courseMatch || subjectMatch;
    });

    setFilteredCourses(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterCourses(query);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFilteredCourses(courses);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      short_code: "",
      duration_months: null,
      subjects: [
        { name: "", te_max: null, ce_max: null, pe_max: null, pw_max: null },
      ],
    });
    setErrors({});
    setEditingCourse(null);
  };

  // Open dialog for create/edit
  const openDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name,
        short_code: course.short_code,
        duration_months: course.duration_months,
        subjects:
          course.subjects.length > 0
            ? course.subjects
            : [
                {
                  name: "",
                  te_max: null,
                  ce_max: null,
                  pe_max: null,
                  pw_max: null,
                },
              ],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Course name is required";
    }

    if (!formData.short_code.trim()) {
      newErrors.short_code = "Short code is required";
    }

    if (formData.duration_months && formData.duration_months <= 0) {
      newErrors.duration_months = "Duration must be a positive number";
    }

    // Validate subjects
    const validSubjects = formData.subjects.filter((subject) =>
      subject.name.trim()
    );
    if (validSubjects.length === 0) {
      newErrors.subjects = "At least one subject is required";
    }

    // Validate each subject
    validSubjects.forEach((subject, index) => {
      const hasTheory =
        (subject.te_max !== null && subject.te_max !== undefined) ||
        (subject.ce_max !== null && subject.ce_max !== undefined);
      const hasPractical =
        (subject.pe_max !== null && subject.pe_max !== undefined) ||
        (subject.pw_max !== null && subject.pw_max !== undefined);

      if (!hasTheory && !hasPractical) {
        newErrors[`subject_${index}`] =
          "Subject must have either theory or practical marks";
      }

      if (hasTheory && hasPractical) {
        newErrors[`subject_${index}`] =
          "Subject cannot have both theory and practical marks";
      }
    });

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
      const payload = {
        ...formData,
        subjects: formData.subjects.filter((subject) => subject.name.trim()),
      };

      if (editingCourse) {
        await api.put(`/api/course/update/${editingCourse.id}/`, payload);
        toast({
          title: "Success",
          description: "Course updated successfully",
        });
      } else {
        await api.post("/api/course/create/", payload);
        toast({
          title: "Success",
          description: "Course created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCourses();
    } catch (error: any) {
      console.error("Error saving course:", error);
      console.error("Error response:", error.response?.data);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.subjects ||
          "Failed to save course",
        variant: "destructive",
      });
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (course: Course) => {
    setCourseToDelete(course);
    setIsDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const closeDeleteDialog = () => {
    setCourseToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // Delete course
  const handleDelete = async () => {
    if (!courseToDelete) return;

    try {
      await api.delete(`/api/course/delete/${courseToDelete.id}/`);
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
      fetchCourses();
      closeDeleteDialog();
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  // Add subject
  const addSubject = () => {
    setFormData({
      ...formData,
      subjects: [
        ...formData.subjects,
        { name: "", te_max: null, ce_max: null, pe_max: null, pw_max: null },
      ],
    });
  };

  // Remove subject
  const removeSubject = (index: number) => {
    if (formData.subjects.length > 1) {
      const newSubjects = formData.subjects.filter((_, i) => i !== index);
      setFormData({ ...formData, subjects: newSubjects });
    }
  };

  // Update subject
  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const newSubjects = [...formData.subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setFormData({ ...formData, subjects: newSubjects });
  };

  // Get subject type
  const getSubjectType = (
    subject: Subject
  ): "theory" | "practical" | "none" => {
    const hasTheory =
      (subject.te_max !== null && subject.te_max !== undefined) ||
      (subject.ce_max !== null && subject.ce_max !== undefined);
    const hasPractical =
      (subject.pe_max !== null && subject.pe_max !== undefined) ||
      (subject.pw_max !== null && subject.pw_max !== undefined);

    if (hasTheory) return "theory";
    if (hasPractical) return "practical";
    return "none";
  };

  // Bulk import functions
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
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }

        // Skip header row and process data
        const courseData: BulkCourseData[] = jsonData
          .slice(1)
          .map((row: any[], index: number) => {
            // Parse subjects from the row (assuming subjects start from column 4)
            const subjects: Array<{
              name: string;
              te_max?: number;
              ce_max?: number;
              pe_max?: number;
              pw_max?: number;
            }> = [];

            // Parse subjects - assuming format: Subject Name, Type, TE Max, CE Max, PE Max, PW Max
            // Each subject takes 6 columns: Name, Type, TE Max, CE Max, PE Max, PW Max
            for (let i = 3; i < row.length; i += 6) {
              if (row[i] && row[i].toString().trim()) {
                const subjectName = row[i].toString().trim();
                const subjectType = row[i + 1]?.toString().trim().toLowerCase();

                if (subjectType === "theory") {
                  const subject = {
                    name: subjectName,
                    te_max: row[i + 2] ? parseInt(row[i + 2].toString()) : null,
                    ce_max: row[i + 3] ? parseInt(row[i + 3].toString()) : null,
                    pe_max: null,
                    pw_max: null,
                  };
                  subjects.push(subject);
                } else if (subjectType === "practical") {
                  const subject = {
                    name: subjectName,
                    te_max: null,
                    ce_max: null,
                    pe_max: row[i + 4] ? parseInt(row[i + 4].toString()) : null,
                    pw_max: row[i + 5] ? parseInt(row[i + 5].toString()) : null,
                  };
                  subjects.push(subject);
                }
              }
            }

            return {
              name: row[0]?.toString() || "",
              short_code: row[1]?.toString() || "",
              duration_months: row[2] ? parseInt(row[2].toString()) : null,
              subjects,
            };
          });

        setBulkData(courseData);
        await validateBulkData(courseData);
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

  const validateBulkData = async (data: BulkCourseData[]) => {
    const validations: BulkCourseValidation[] = data.map((course, index) => {
      const errors: string[] = [];
      const row = index + 2; // +2 because we skip header and arrays are 0-indexed

      // Validate course name
      if (!course.name.trim()) {
        errors.push("Course name is required");
      }

      // Validate short code
      if (!course.short_code.trim()) {
        errors.push("Short code is required");
      }

      // Validate subjects
      if (!course.subjects || course.subjects.length === 0) {
        errors.push("At least one subject is required");
      } else {
        course.subjects.forEach((subject, subjectIndex) => {
          if (!subject.name.trim()) {
            errors.push(`Subject ${subjectIndex + 1} name is required`);
          }

          // Validate subject type consistency
          const hasTheory = subject.te_max !== null || subject.ce_max !== null;
          const hasPractical =
            subject.pe_max !== null || subject.pw_max !== null;

          if (!hasTheory && !hasPractical) {
            errors.push(
              `Subject "${subject.name}" must have either theory or practical marks`
            );
          }

          if (hasTheory && hasPractical) {
            errors.push(
              `Subject "${subject.name}" cannot have both theory and practical marks`
            );
          }
        });
      }

      // Check for duplicate course names
      const duplicateIndex = data.findIndex(
        (c, i) =>
          i !== index && c.name.toLowerCase() === course.name.toLowerCase()
      );
      if (duplicateIndex !== -1) {
        errors.push(`Duplicate course name found in row ${duplicateIndex + 2}`);
      }

      // Check for duplicate short codes
      const duplicateCodeIndex = data.findIndex(
        (c, i) =>
          i !== index &&
          c.short_code.toLowerCase() === course.short_code.toLowerCase()
      );
      if (duplicateCodeIndex !== -1) {
        errors.push(
          `Duplicate short code found in row ${duplicateCodeIndex + 2}`
        );
      }

      return {
        row,
        data: course,
        errors,
        isValid: errors.length === 0,
      };
    });

    setBulkValidations(validations);
  };

  const handleBulkCreate = async () => {
    const validCourses = bulkValidations.filter((v) => v.isValid);
    if (validCourses.length === 0) {
      toast({
        title: "No valid courses",
        description: "Please fix validation errors before creating courses.",
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

    for (let i = 0; i < validCourses.length; i++) {
      const validation = validCourses[i];
      const progress = ((i + 1) / validCourses.length) * 100;
      setBulkProgress(progress);

      try {
        const payload = {
          name: validation.data.name,
          short_code: validation.data.short_code,
          duration_months: validation.data.duration_months,
          subjects: validation.data.subjects,
        };

        await api.post("/api/course/create/", payload);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: validation.row,
          courseName: validation.data.name,
          error: error.response?.data?.message || "Failed to create course",
        });
      }
    }

    setBulkResult(result);
    setIsProcessingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Creation Complete",
        description: `Successfully created ${result.success} courses. ${result.failed} failed.`,
      });
      fetchCourses();
    }

    if (result.failed > 0) {
      toast({
        title: "Some courses failed",
        description: `${result.failed} courses could not be created. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      [
        "Course Name",
        "Short Code",
        "Duration (Months)",
        "Subject 1",
        "Type 1",
        "TE Max 1",
        "CE Max 1",
        "PE Max 1",
        "PW Max 1",
        "Subject 2",
        "Type 2",
        "TE Max 2",
        "CE Max 2",
        "PE Max 2",
        "PW Max 2",
        "Subject 3",
        "Type 3",
        "TE Max 3",
        "CE Max 3",
        "PE Max 3",
        "PW Max 3",
      ],
      [
        "Computer Science",
        "CS",
        "12",
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
        "Web Development",
        "theory",
        "70",
        "30",
        "",
        "",
      ],
      [
        "",
        "Format: Use exact names",
        "",
        "",
        "theory or practical",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "",
        "theory or practical",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "",
        "theory or practical",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "Numbers only",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Courses");
    XLSX.writeFile(wb, "courses_template.xlsx");
  };

  const downloadCSVTemplate = () => {
    const templateData = [
      [
        "Course Name",
        "Short Code",
        "Duration (Months)",
        "Subject 1",
        "Type 1",
        "TE Max 1",
        "CE Max 1",
        "PE Max 1",
        "PW Max 1",
        "Subject 2",
        "Type 2",
        "TE Max 2",
        "CE Max 2",
        "PE Max 2",
        "PW Max 2",
        "Subject 3",
        "Type 3",
        "TE Max 3",
        "CE Max 3",
        "PE Max 3",
        "PW Max 3",
      ],
      [
        "Computer Science",
        "CS",
        "12",
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
        "Web Development",
        "theory",
        "70",
        "30",
        "",
        "",
      ],
      [
        "",
        "Format: Use exact names",
        "",
        "",
        "theory or practical",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "",
        "theory or practical",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "",
        "theory or practical",
        "Numbers only",
        "Numbers only",
        "Numbers only",
        "Numbers only",
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
    link.setAttribute("download", "courses_template.csv");
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

  // Bulk delete functions
  const toggleDeleteSelection = (courseId: number) => {
    setSelectedCoursesForDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const selectAllForDelete = () => {
    setSelectedCoursesForDelete(
      new Set(paginatedCourses.map((course) => course.id!))
    );
  };

  const clearDeleteSelection = () => {
    setSelectedCoursesForDelete(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedCoursesForDelete.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one course to delete.",
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
        courseName: string;
        error: string;
      }>,
    };

    const selectedCourses = courses.filter((course) =>
      selectedCoursesForDelete.has(course.id!)
    );

    for (let i = 0; i < selectedCourses.length; i++) {
      const course = selectedCourses[i];
      const progress = ((i + 1) / selectedCourses.length) * 100;
      setBulkDeleteProgress(progress);

      try {
        await api.delete(`/api/course/delete/${course.id}/`);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          courseName: course.name,
          error: error.response?.data?.message || "Failed to delete course",
        });
      }
    }

    setBulkDeleteResult(result);
    setIsDeletingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Delete Complete",
        description: `Successfully deleted ${result.success} courses. ${result.failed} failed.`,
      });
      fetchCourses();
      setSelectedCoursesForDelete(new Set());
    }

    if (result.failed > 0) {
      toast({
        title: "Some courses failed",
        description: `${result.failed} courses could not be deleted. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  // Export functions
  const toggleExportSelection = (courseId: number) => {
    setSelectedCoursesForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const selectAllForExport = () => {
    setSelectedCoursesForExport(
      new Set(paginatedCourses.map((course) => course.id!))
    );
  };

  const clearExportSelection = () => {
    setSelectedCoursesForExport(new Set());
  };

  const exportSelectedToExcel = async () => {
    if (selectedCoursesForExport.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one course to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedCourses = courses.filter((course) =>
        selectedCoursesForExport.has(course.id!)
      );

      // Create Excel data
      const excelData = [
        [
          "Course Name",
          "Short Code",
          "Duration (Months)",
          "Subjects Count",
          "Subjects",
        ],
        ...selectedCourses.map((course) => [
          course.name,
          course.short_code,
          course.duration_months?.toString() || "",
          course.subjects.length.toString(),
          course.subjects.map((s) => s.name).join(", "),
        ]),
      ];

      // Create and download Excel file
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Courses");
      XLSX.writeFile(
        wb,
        `courses_export_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      toast({
        title: "Export Successful",
        description: `Exported ${selectedCoursesForExport.size} courses to Excel file.`,
      });

      setIsBulkExportDialogOpen(false);
      setSelectedCoursesForExport(new Set());
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export courses to Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && courses.length === 0) {
    return <CoursePageSkeleton />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Course Management
            </h1>
            <p className="text-muted-foreground">
              Manage courses and their subjects
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              onClick={() => openDialog()}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              <span>Add Course</span>
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
              onClick={() => setIsBulkExportDialogOpen(true)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Active courses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {courses.reduce(
                      (sum, course) => sum + course.subjects.length,
                      0
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total subjects
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {courses.filter((c) => c.duration_months).length > 0
                      ? Math.round(
                          courses
                            .filter((c) => c.duration_months)
                            .reduce(
                              (sum, c) => sum + (c.duration_months || 0),
                              0
                            ) / courses.filter((c) => c.duration_months).length
                        )
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Months average
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Filtered Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Search className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredCourses.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? "Search results" : "All courses"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search courses by name, code, or subject..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <Badge variant="secondary" className="whitespace-nowrap">
                  {filteredCourses.length} of {courses.length} courses
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid/List */}
        <div className="grid grid-cols-1 gap-4">
          {paginatedCourses.map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/course-view/${course.id}`)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left Section - Course Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1 truncate">
                          {course.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {course.short_code}
                          </Badge>
                          {course.duration_months && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {course.duration_months} months
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {course.subjects.length} subject
                            {course.subjects.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Subjects Preview */}
                    {course.subjects.length > 0 && (
                      <div className="pl-14 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Subjects:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {course.subjects.slice(0, 3).map((subject, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {subject.name}
                            </Badge>
                          ))}
                          {course.subjects.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{course.subjects.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Section - Action Button */}
                  <div className="flex sm:flex-col items-center gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/course-view/${course.id}`);
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
        {filteredCourses.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredCourses.length)} of{" "}
              {filteredCourses.length} courses
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
                  }
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

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground mb-4">
                  No courses match your search for "{searchQuery}"
                </p>
                <Button onClick={clearSearch} variant="outline">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first course
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </>
            )}
          </div>
        )}

        {/* Course Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingCourse ? "Edit Course" : "Create New Course"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingCourse
                  ? "Update course details and subjects"
                  : "Add a new course with its subjects"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Course Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">
                    Course Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Computer Science"
                    className="text-sm sm:text-base"
                  />
                  {errors.name && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="short_code" className="text-sm sm:text-base">
                    Short Code *
                  </Label>
                  <Input
                    id="short_code"
                    value={formData.short_code}
                    onChange={(e) =>
                      setFormData({ ...formData, short_code: e.target.value })
                    }
                    placeholder="e.g., CS"
                    className="text-sm sm:text-base"
                  />
                  {errors.short_code && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.short_code}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2 md:col-span-2 lg:col-span-1">
                  <Label
                    htmlFor="duration_months"
                    className="text-sm sm:text-base"
                  >
                    Duration (Months)
                  </Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={formData.duration_months || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_months: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder="e.g., 24"
                    className="text-sm sm:text-base"
                  />
                  {errors.duration_months && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.duration_months}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Subjects Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold">
                      Subjects
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Add subjects with either theory or practical marks (not
                      both)
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={addSubject}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </div>

                {errors.subjects && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.subjects}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3 sm:space-y-4">
                  {formData.subjects.map((subject, index) => (
                    <Card key={index}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                          <h4 className="font-medium text-sm sm:text-base">
                            Subject {index + 1}
                          </h4>
                          {formData.subjects.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSubject(index)}
                              className="text-destructive hover:text-destructive p-1 sm:p-2"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                          <div className="space-y-1 sm:space-y-2">
                            <Label
                              htmlFor={`subject_name_${index}`}
                              className="text-sm sm:text-base"
                            >
                              Subject Name *
                            </Label>
                            <Input
                              id={`subject_name_${index}`}
                              value={subject.name}
                              onChange={(e) =>
                                updateSubject(index, "name", e.target.value)
                              }
                              placeholder="e.g., Programming Fundamentals"
                              className="text-sm sm:text-base"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            {/* Theory Marks */}
                            <div className="space-y-1 sm:space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
                                Theory Marks
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label
                                    htmlFor={`te_max_${index}`}
                                    className="text-xs"
                                  >
                                    TE Max
                                  </Label>
                                  <Input
                                    id={`te_max_${index}`}
                                    type="number"
                                    value={subject.te_max || ""}
                                    onChange={(e) =>
                                      updateSubject(
                                        index,
                                        "te_max",
                                        e.target.value
                                          ? parseInt(e.target.value)
                                          : null
                                      )
                                    }
                                    placeholder="0"
                                    className="text-xs sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`ce_max_${index}`}
                                    className="text-xs"
                                  >
                                    CE Max
                                  </Label>
                                  <Input
                                    id={`ce_max_${index}`}
                                    type="number"
                                    value={subject.ce_max || ""}
                                    onChange={(e) =>
                                      updateSubject(
                                        index,
                                        "ce_max",
                                        e.target.value
                                          ? parseInt(e.target.value)
                                          : null
                                      )
                                    }
                                    placeholder="0"
                                    className="text-xs sm:text-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Practical Marks */}
                            <div className="space-y-1 sm:space-y-2">
                              <Label className="text-xs sm:text-sm font-medium">
                                Practical Marks
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label
                                    htmlFor={`pe_max_${index}`}
                                    className="text-xs"
                                  >
                                    PE Max
                                  </Label>
                                  <Input
                                    id={`pe_max_${index}`}
                                    type="number"
                                    value={subject.pe_max || ""}
                                    onChange={(e) =>
                                      updateSubject(
                                        index,
                                        "pe_max",
                                        e.target.value
                                          ? parseInt(e.target.value)
                                          : null
                                      )
                                    }
                                    placeholder="0"
                                    className="text-xs sm:text-sm"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`pw_max_${index}`}
                                    className="text-xs"
                                  >
                                    PW Max
                                  </Label>
                                  <Input
                                    id={`pw_max_${index}`}
                                    type="number"
                                    value={subject.pw_max || ""}
                                    onChange={(e) =>
                                      updateSubject(
                                        index,
                                        "pw_max",
                                        e.target.value
                                          ? parseInt(e.target.value)
                                          : null
                                      )
                                    }
                                    placeholder="0"
                                    className="text-xs sm:text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {errors[`subject_${index}`] && (
                            <p className="text-xs sm:text-sm text-destructive">
                              {errors[`subject_${index}`]}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

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
                <Button type="submit" className="w-full sm:w-auto">
                  {editingCourse ? "Update Course" : "Create Course"}
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
                course <strong>{courseToDelete?.name}</strong> and remove all
                associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={closeDeleteDialog}
                className="w-full sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              >
                Delete Course
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Import Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Import Courses
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Upload an Excel (.xlsx, .xls) or CSV file to create multiple
                courses with subjects at once. Download the template for the
                correct format.
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
                      Use this Excel template to format your course data
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

                  <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Row
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Course Name
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Short Code
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Subjects
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkValidations.map((validation, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {validation.row}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {validation.data.name}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {validation.data.short_code}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                              {validation.data.subjects.length}
                            </td>
                            <td className="p-2 sm:p-3">
                              {validation.isValid ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="text-xs sm:text-sm">
                                    Valid
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="text-xs sm:text-sm">
                                    Invalid
                                  </span>
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
                    <div className="space-y-1 sm:space-y-2">
                      <h4 className="font-medium text-destructive text-sm sm:text-base">
                        Validation Errors:
                      </h4>
                      <div className="space-y-1 max-h-24 sm:max-h-32 overflow-auto">
                        {bulkValidations
                          .filter((v) => !v.isValid)
                          .map((validation, index) => (
                            <div
                              key={index}
                              className="text-xs sm:text-sm text-destructive"
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
                        <span>Creating courses...</span>
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
                            Failed Courses:
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-auto">
                            {bulkResult.errors.map((error, index) => (
                              <div
                                key={index}
                                className="text-sm text-destructive"
                              >
                                <strong>
                                  Row {error.row} ({error.courseName}):
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
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkDialogOpen(false);
                        resetBulkDialog();
                      }}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    {!isProcessingBulk && !bulkResult && (
                      <Button
                        onClick={handleBulkCreate}
                        disabled={
                          bulkValidations.filter((v) => v.isValid).length === 0
                        }
                        className="w-full sm:w-auto"
                      >
                        Create {bulkValidations.filter((v) => v.isValid).length}{" "}
                        Courses
                      </Button>
                    )}
                    {bulkResult && (
                      <Button
                        onClick={() => {
                          setIsBulkDialogOpen(false);
                          resetBulkDialog();
                        }}
                        className="w-full sm:w-auto"
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
                Bulk Delete Courses
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select courses to delete in bulk. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Selection Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-red-50 border-red-200 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-red-900 text-sm sm:text-base">
                      Select Courses to Delete
                    </p>
                    <p className="text-xs sm:text-sm text-red-700">
                      Choose the courses you want to delete permanently.
                      {selectedCoursesForDelete.size > 0 &&
                        ` ${selectedCoursesForDelete.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForDelete}
                    variant="outline"
                    size="sm"
                    disabled={paginatedCourses.length === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({paginatedCourses.length})
                  </Button>
                  <Button
                    onClick={clearDeleteSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedCoursesForDelete.size === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Courses Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Courses to Delete
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedCoursesForDelete.size > 0 &&
                              selectedCoursesForDelete.size ===
                                paginatedCourses.length
                            }
                            onChange={() => {
                              if (
                                selectedCoursesForDelete.size ===
                                paginatedCourses.length
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
                          Course Name
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Short Code
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Duration
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Subjects
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCourses.map((course) => (
                        <tr
                          key={course.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedCoursesForDelete.has(course.id!)}
                              onChange={() => toggleDeleteSelection(course.id!)}
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{course.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            <Badge
                              variant="secondary"
                              className="text-xs sm:text-sm"
                            >
                              {course.short_code}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {course.duration_months
                              ? `${course.duration_months} months`
                              : "-"}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {course.subjects.length} subjects
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
                    <span>Deleting courses...</span>
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
                            <strong>{error.courseName}:</strong> {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkDeleteDialogOpen(false);
                    setSelectedCoursesForDelete(new Set());
                    setBulkDeleteResult(null);
                    setBulkDeleteProgress(0);
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                {!isDeletingBulk && !bulkDeleteResult && (
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedCoursesForDelete.size === 0}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">
                      Delete {selectedCoursesForDelete.size} Courses
                    </span>
                  </Button>
                )}
                {bulkDeleteResult && (
                  <Button
                    onClick={() => {
                      setIsBulkDeleteDialogOpen(false);
                      setSelectedCoursesForDelete(new Set());
                      setBulkDeleteResult(null);
                      setBulkDeleteProgress(0);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Export Dialog */}
        <Dialog
          open={isBulkExportDialogOpen}
          onOpenChange={setIsBulkExportDialogOpen}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Export Courses to Excel
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select courses to export to Excel format then delete the data,
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
                      Select Courses to Export
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Choose the courses you want to export to Excel.
                      {selectedCoursesForExport.size > 0 &&
                        ` ${selectedCoursesForExport.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForExport}
                    variant="outline"
                    size="sm"
                    disabled={paginatedCourses.length === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({paginatedCourses.length})
                  </Button>
                  <Button
                    onClick={clearExportSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedCoursesForExport.size === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Courses Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Courses to Export
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedCoursesForExport.size > 0 &&
                              selectedCoursesForExport.size ===
                                paginatedCourses.length
                            }
                            onChange={() => {
                              if (
                                selectedCoursesForExport.size ===
                                paginatedCourses.length
                              ) {
                                clearExportSelection();
                              } else {
                                selectAllForExport();
                              }
                            }}
                            className="h-3 w-3 sm:h-4 sm:w-4"
                          />
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                          Course Name
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Short Code
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Duration
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Subjects
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCourses.map((course) => (
                        <tr
                          key={course.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedCoursesForExport.has(course.id!)}
                              onChange={() => toggleExportSelection(course.id!)}
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{course.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            <Badge
                              variant="secondary"
                              className="text-xs sm:text-sm"
                            >
                              {course.short_code}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {course.duration_months
                              ? `${course.duration_months} months`
                              : "-"}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {course.subjects.length} subjects
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
                    setIsBulkExportDialogOpen(false);
                    setSelectedCoursesForExport(new Set());
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={exportSelectedToExcel}
                  disabled={selectedCoursesForExport.size === 0 || isExporting}
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
                        Export to Excel ({selectedCoursesForExport.size})
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Courses;
