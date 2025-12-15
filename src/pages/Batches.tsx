import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  Search,
  X,
  Users,
  Clock,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
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
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Batch, BatchFormData, Course } from "@/types";
import * as XLSX from "xlsx";
import { BatchPageSkeleton } from "@/components/skeletons/BatchPageSkeleton";

// Bulk creation interfaces
interface BulkBatchData {
  name: string;
  start_date: string;
  duration_months?: number | null;
  course: string; // Course name for matching
  course_id?: number; // Resolved course ID
}

interface BulkBatchValidation {
  row: number;
  data: BulkBatchData;
  errors: string[];
  isValid: boolean;
}

interface BulkCreationResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    batchName: string;
    error: string;
  }>;
}

const Batches: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<BatchFormData>({
    name: "",
    start_date: "",
    duration_months: null,
    course: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk creation states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState<BulkBatchData[]>([]);
  const [bulkValidations, setBulkValidations] = useState<BulkBatchValidation[]>(
    []
  );
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkCreationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Bulk delete states
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedBatchesForDelete, setSelectedBatchesForDelete] = useState<
    Set<number>
  >(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; batchName: string; error: string }>;
  } | null>(null);

  // Convert to Excel states
  const [isBulkExportDialogOpen, setIsBulkExportDialogOpen] = useState(false);
  const [selectedBatchesForExport, setSelectedBatchesForExport] = useState<
    Set<number>
  >(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { toast } = useToast();

  // Fetch batches and courses
  const fetchBatches = async () => {
    try {
      setLoading(true);
      const [batchesResponse, coursesResponse] = await Promise.all([
        api.get("/api/students/batches/"),
        api.get("/api/course/list/"),
      ]);

      const batchesData = batchesResponse.data;
      const coursesData = coursesResponse.data;

      // Enrich batches with course names
      const enrichedBatches = batchesData.map((batch: any) => ({
        ...batch,
        course_name:
          coursesData.find((course: Course) => course.id === batch.course)
            ?.name || "Unknown Course",
      }));

      setBatches(enrichedBatches);
      setFilteredBatches(enrichedBatches);
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch batches and courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter batches based on search query
  const filterBatches = (query: string) => {
    if (!query.trim()) {
      setFilteredBatches(batches);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = batches.filter((batch) => {
      const nameMatch = batch.name.toLowerCase().includes(searchTerm);
      const courseMatch = batch.course_name?.toLowerCase().includes(searchTerm);
      const dateMatch = new Date(batch.start_date)
        .toLocaleDateString()
        .includes(searchTerm);

      return nameMatch || courseMatch || dateMatch;
    });

    setFilteredBatches(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterBatches(query);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFilteredBatches(batches);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

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
    fetchBatches();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      duration_months: null,
      course: 0,
    });
    setErrors({});
    setEditingBatch(null);
  };

  // Open dialog for create/edit
  const openDialog = (batch?: Batch) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({
        name: batch.name,
        start_date: batch.start_date,
        duration_months: batch.duration_months,
        course: batch.course,
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
      newErrors.name = "Batch name is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (formData.duration_months && formData.duration_months <= 0) {
      newErrors.duration_months = "Duration must be a positive number";
    }

    if (!formData.course || formData.course === 0) {
      newErrors.course = "Course is required";
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
        ...formData,
        duration_months: formData.duration_months || null,
      };

      if (editingBatch) {
        await api.put(
          `/api/students/batches/update/${editingBatch.id}/`,
          payload
        );
        toast({
          title: "Success",
          description: "Batch updated successfully",
        });
      } else {
        await api.post("/api/students/batches/create/", payload);
        toast({
          title: "Success",
          description: "Batch created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBatches();
    } catch (error: any) {
      console.error("Error saving batch:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save batch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete batch
  const handleDelete = async () => {
    if (!batchToDelete) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/students/batches/delete/${batchToDelete.id}/`);
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
      setBatchToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchBatches();
    } catch (error: any) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete batch",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (batch: Batch) => {
    setBatchToDelete(batch);
    setIsDeleteDialogOpen(true);
  };

  // Bulk creation functions
  const handleFileUpload = (file: File) => {
    if (!file) return;

    const reader = new FileReader();

    // Check file type and set appropriate reading method
    if (file.name.toLowerCase().endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    reader.onload = (e) => {
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
        const batchData: BulkBatchData[] = jsonData
          .slice(1)
          .map((row: any[], index: number) => {
            // Handle date formatting - Excel might return dates in different formats
            let startDate = row[1]?.toString() || "";

            // If it's a number (Excel serial date), convert it
            if (typeof row[1] === "number") {
              const excelDate = new Date((row[1] - 25569) * 86400 * 1000);
              startDate = excelDate.toISOString().split("T")[0];
            } else if (row[1] instanceof Date) {
              // If it's already a Date object
              startDate = row[1].toISOString().split("T")[0];
            } else if (startDate) {
              // Try to parse and format the date string
              const parsedDate = new Date(startDate);
              if (!isNaN(parsedDate.getTime())) {
                startDate = parsedDate.toISOString().split("T")[0];
              }
            }

            return {
              name: row[0]?.toString() || "",
              start_date: startDate,
              duration_months: row[2] ? parseInt(row[2].toString()) : null,
              course: row[3]?.toString() || "",
            };
          });

        setBulkData(batchData);
        validateBulkData(batchData);
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

  const validateBulkData = (data: BulkBatchData[]) => {
    const validations: BulkBatchValidation[] = data.map((batch, index) => {
      const errors: string[] = [];
      const row = index + 2; // +2 because we skip header and arrays are 0-indexed

      // Validate batch name
      if (!batch.name.trim()) {
        errors.push("Batch name is required");
      }

      // Validate start date
      if (!batch.start_date || batch.start_date.trim() === "") {
        errors.push("Start date is required");
      } else {
        // Check if the date string is in a valid format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD format
        const dateRegexAlt = /^\d{1,2}\/\d{1,2}\/\d{4}$/; // MM/DD/YYYY or M/D/YYYY format
        const dateRegexAlt2 = /^\d{1,2}-\d{1,2}-\d{4}$/; // MM-DD-YYYY or M-D-YYYY format

        if (
          !dateRegex.test(batch.start_date) &&
          !dateRegexAlt.test(batch.start_date) &&
          !dateRegexAlt2.test(batch.start_date)
        ) {
          errors.push(
            "Invalid date format. Use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY"
          );
        } else {
          const date = new Date(batch.start_date);
          if (isNaN(date.getTime())) {
            errors.push("Invalid start date");
          } else {
            // Check if the date is reasonable (not too far in the past or future)
            const now = new Date();
            const year = date.getFullYear();
            const currentYear = now.getFullYear();

            if (year < 1900 || year > currentYear + 10) {
              errors.push(
                "Date must be between 1900 and " + (currentYear + 10)
              );
            }

            // Additional validation: check if the date components are valid
            const inputDate = new Date(batch.start_date);
            const formattedDate = inputDate.toISOString().split("T")[0];
            const originalDate = batch.start_date;

            // Check if the date was parsed correctly (handles cases like 2024-02-30)
            if (
              formattedDate !== originalDate &&
              dateRegex.test(originalDate)
            ) {
              errors.push("Invalid date (e.g., February 30th doesn't exist)");
            }
          }
        }
      }

      // Validate duration
      if (
        batch.duration_months !== null &&
        batch.duration_months !== undefined
      ) {
        if (batch.duration_months <= 0) {
          errors.push("Duration must be a positive number");
        }
      }

      // Validate course
      if (!batch.course.trim()) {
        errors.push("Course is required");
      } else {
        const course = courses.find(
          (c) => c.name.toLowerCase() === batch.course.toLowerCase()
        );
        if (!course) {
          errors.push(`Course "${batch.course}" not found`);
        } else {
          batch.course_id = course.id;
        }
      }

      // Check for duplicate batch names
      const duplicateIndex = data.findIndex(
        (b, i) =>
          i !== index && b.name.toLowerCase() === batch.name.toLowerCase()
      );
      if (duplicateIndex !== -1) {
        errors.push(`Duplicate batch name found in row ${duplicateIndex + 2}`);
      }

      return {
        row,
        data: batch,
        errors,
        isValid: errors.length === 0,
      };
    });

    setBulkValidations(validations);
  };

  const handleBulkCreate = async () => {
    const validBatches = bulkValidations.filter((v) => v.isValid);
    if (validBatches.length === 0) {
      toast({
        title: "No valid batches",
        description: "Please fix validation errors before creating batches.",
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

    for (let i = 0; i < validBatches.length; i++) {
      const validation = validBatches[i];
      const progress = ((i + 1) / validBatches.length) * 100;
      setBulkProgress(progress);

      try {
        const payload = {
          name: validation.data.name,
          start_date: validation.data.start_date,
          duration_months: validation.data.duration_months,
          course: validation.data.course_id,
        };

        await api.post("/api/students/batches/create/", payload);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: validation.row,
          batchName: validation.data.name,
          error: error.response?.data?.message || "Failed to create batch",
        });
      }
    }

    setBulkResult(result);
    setIsProcessingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Creation Complete",
        description: `Successfully created ${result.success} batches. ${result.failed} failed.`,
      });
      fetchBatches();
    }

    if (result.failed > 0) {
      toast({
        title: "Some batches failed",
        description: `${result.failed} batches could not be created. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ["Batch Name", "Start Date", "Duration (Months)", "Course Name"],
      ["Batch 2024-1", "2024-01-15", "12", "Computer Science"],
      ["Batch 2024-2", "2024-02-01", "6", "Data Science"],
      ["", "Format: YYYY-MM-DD", "", ""],
      ["", "Examples: 2024-01-15, 2023-12-01", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Batches");
    XLSX.writeFile(wb, "batch_template.xlsx");
  };

  const downloadCSVTemplate = () => {
    const templateData = [
      ["Batch Name", "Start Date", "Duration (Months)", "Course Name"],
      ["Batch 2024-1", "2024-01-15", "12", "Computer Science"],
      ["Batch 2024-2", "2024-02-01", "6", "Data Science"],
      ["", "Format: YYYY-MM-DD", "", ""],
      ["", "Examples: 2024-01-15, 2023-12-01", "", ""],
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
    link.setAttribute("download", "batch_template.csv");
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
  const toggleDeleteSelection = (batchId: number) => {
    setSelectedBatchesForDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const selectAllForDelete = () => {
    setSelectedBatchesForDelete(
      new Set(paginatedBatches.map((batch) => batch.id!))
    );
  };

  const clearDeleteSelection = () => {
    setSelectedBatchesForDelete(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedBatchesForDelete.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one batch to delete.",
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
        batchName: string;
        error: string;
      }>,
    };

    const selectedBatches = batches.filter((batch) =>
      selectedBatchesForDelete.has(batch.id!)
    );

    for (let i = 0; i < selectedBatches.length; i++) {
      const batch = selectedBatches[i];
      const progress = ((i + 1) / selectedBatches.length) * 100;
      setBulkDeleteProgress(progress);

      try {
        await api.delete(`/api/students/batches/delete/${batch.id}/`);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          batchName: batch.name,
          error: error.response?.data?.message || "Failed to delete batch",
        });
      }
    }

    setBulkDeleteResult(result);
    setIsDeletingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Delete Complete",
        description: `Successfully deleted ${result.success} batches. ${result.failed} failed.`,
      });
      fetchBatches();
      setSelectedBatchesForDelete(new Set());
    }

    if (result.failed > 0) {
      toast({
        title: "Some batches failed",
        description: `${result.failed} batches could not be deleted. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  // Export functions
  const toggleExportSelection = (batchId: number) => {
    setSelectedBatchesForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const selectAllForExport = () => {
    setSelectedBatchesForExport(
      new Set(paginatedBatches.map((batch) => batch.id!))
    );
  };

  const clearExportSelection = () => {
    setSelectedBatchesForExport(new Set());
  };

  const exportSelectedToExcel = async () => {
    if (selectedBatchesForExport.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one batch to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedBatches = batches.filter((batch) =>
        selectedBatchesForExport.has(batch.id!)
      );

      // Create Excel data
      const excelData = [
        ["Batch Name", "Start Date", "Duration (Months)", "Course", "End Date"],
        ...selectedBatches.map((batch) => [
          batch.name,
          new Date(batch.start_date).toLocaleDateString(),
          batch.duration_months?.toString() || "",
          batch.course_name,
          batch.duration_months
            ? getEndDate(batch.start_date, batch.duration_months)
            : "",
        ]),
      ];

      // Create and download Excel file
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Batches");
      XLSX.writeFile(
        wb,
        `batches_export_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      toast({
        title: "Export Successful",
        description: `Exported ${selectedBatchesForExport.size} batches to Excel file.`,
      });

      setIsBulkExportDialogOpen(false);
      setSelectedBatchesForExport(new Set());
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export batches to Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate end date
  const getEndDate = (startDate: string, durationMonths?: number | null) => {
    if (!durationMonths) return null;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    return end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading && batches.length === 0) {
    return <BatchPageSkeleton />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Batch Management</h1>
            <p className="text-muted-foreground">
              Manage batches and their course assignments
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              onClick={() => openDialog()}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              <span>Add Batch</span>
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
                Total Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{batches.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Active batches
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(batches.map((b) => b.course)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unique courses
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
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {batches.filter((b) => b.duration_months).length > 0
                      ? Math.round(
                          batches
                            .filter((b) => b.duration_months)
                            .reduce(
                              (sum, b) => sum + (b.duration_months || 0),
                              0
                            ) / batches.filter((b) => b.duration_months).length
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
                  <p className="text-2xl font-bold">{filteredBatches.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? "Search results" : "All batches"}
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
                  placeholder="Search batches by name, course, or date..."
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
                  {filteredBatches.length} of {batches.length} batches
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batches Grid/List */}
        <div className="grid grid-cols-1 gap-4">
          {paginatedBatches.map((batch) => (
            <Card
              key={batch.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/batch-view/${batch.id}`)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left Section - Batch Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1 truncate">
                          {batch.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {batch.course_name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(batch.start_date)}
                          </Badge>
                          {batch.duration_months && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {batch.duration_months} months
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {batch.duration_months && (
                      <div className="pl-14 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          End Date:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {getEndDate(
                              batch.start_date,
                              batch.duration_months
                            )}
                          </Badge>
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
                        navigate(`/batch-view/${batch.id}`);
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
        {filteredBatches.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredBatches.length)} of{" "}
              {filteredBatches.length} batches
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

        {filteredBatches.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No batches found</h3>
                <p className="text-muted-foreground mb-4">
                  No batches match your search for "{searchQuery}"
                </p>
                <Button onClick={clearSearch} variant="outline">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No batches found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first batch
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Batch
                </Button>
              </>
            )}
          </div>
        )}

        {/* Batch Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] mx-2 sm:mx-4 md:mx-6 overflow-visible">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingBatch ? "Edit Batch" : "Create New Batch"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingBatch
                  ? "Update batch details and course assignment"
                  : "Add a new batch with course assignment"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Batch Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">
                    Batch Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Batch 2024-1"
                    className="text-sm sm:text-base"
                  />
                  {errors.name && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="start_date" className="text-sm sm:text-base">
                    Start Date *
                  </Label>
                  <DatePicker
                    value={formData.start_date}
                    onChange={(value) =>
                      setFormData({ ...formData, start_date: value })
                    }
                    placeholder="Select start date"
                  />
                  {errors.start_date && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.start_date}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
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
                    placeholder="e.g., 12"
                    className="text-sm sm:text-base"
                  />
                  {errors.duration_months && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.duration_months}
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
                      setFormData({ ...formData, course: parseInt(value) })
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
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingBatch ? "Updating..." : "Creating..."}
                    </>
                  ) : editingBatch ? (
                    "Update Batch"
                  ) : (
                    "Create Batch"
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
                batch <strong>{batchToDelete?.name}</strong> and remove all
                associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => {
                  setBatchToDelete(null);
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
                  "Delete Batch"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Creation Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Import Batches
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Upload an Excel (.xlsx, .xls) or CSV file to create multiple
                batches at once. Download the template for the correct format.
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
                      Use this Excel template to format your batch data
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
                            Batch Name
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                            Start Date
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                            Course
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
                            <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                              {validation.data.start_date}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                              {validation.data.course}
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
                        <span>Creating batches...</span>
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
                            Failed Batches:
                          </h4>
                          <div className="space-y-1 max-h-32 overflow-auto">
                            {bulkResult.errors.map((error, index) => (
                              <div
                                key={index}
                                className="text-sm text-destructive"
                              >
                                <strong>
                                  Row {error.row} ({error.batchName}):
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
                        Batches
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
                Bulk Delete Batches
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select batches to delete in bulk. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Selection Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-red-50 border-red-200 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-red-900 text-sm sm:text-base">
                      Select Batches to Delete
                    </p>
                    <p className="text-xs sm:text-sm text-red-700">
                      Choose the batches you want to delete permanently.
                      {selectedBatchesForDelete.size > 0 &&
                        ` ${selectedBatchesForDelete.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForDelete}
                    variant="outline"
                    size="sm"
                    disabled={paginatedBatches.length === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({paginatedBatches.length})
                  </Button>
                  <Button
                    onClick={clearDeleteSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedBatchesForDelete.size === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Batches Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Batches to Delete
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedBatchesForDelete.size > 0 &&
                              selectedBatchesForDelete.size ===
                                paginatedBatches.length
                            }
                            onChange={() => {
                              if (
                                selectedBatchesForDelete.size ===
                                paginatedBatches.length
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
                          Batch Name
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Course
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Start Date
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBatches.map((batch) => (
                        <tr
                          key={batch.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedBatchesForDelete.has(batch.id!)}
                              onChange={() => toggleDeleteSelection(batch.id!)}
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{batch.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            <Badge
                              variant="secondary"
                              className="text-xs sm:text-sm"
                            >
                              {batch.course_name}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {formatDate(batch.start_date)}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {batch.duration_months
                              ? `${batch.duration_months} months`
                              : "-"}
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
                    <span>Deleting batches...</span>
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
                            <strong>{error.batchName}:</strong> {error.error}
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
                    setSelectedBatchesForDelete(new Set());
                    setBulkDeleteResult(null);
                    setBulkDeleteProgress(0);
                  }}
                >
                  Cancel
                </Button>
                {!isDeletingBulk && !bulkDeleteResult && (
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedBatchesForDelete.size === 0}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedBatchesForDelete.size} Batches
                  </Button>
                )}
                {bulkDeleteResult && (
                  <Button
                    onClick={() => {
                      setIsBulkDeleteDialogOpen(false);
                      setSelectedBatchesForDelete(new Set());
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

        {/* Bulk Export Dialog */}
        <Dialog
          open={isBulkExportDialogOpen}
          onOpenChange={setIsBulkExportDialogOpen}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Export Batches to Excel
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select batches to export to Excel format then delete the data,
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
                      Select Batches to Export
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Choose the batches you want to export to Excel.
                      {selectedBatchesForExport.size > 0 &&
                        ` ${selectedBatchesForExport.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForExport}
                    variant="outline"
                    size="sm"
                    disabled={paginatedBatches.length === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({paginatedBatches.length})
                  </Button>
                  <Button
                    onClick={clearExportSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedBatchesForExport.size === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Batches Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Batches to Export
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedBatchesForExport.size > 0 &&
                              selectedBatchesForExport.size ===
                                paginatedBatches.length
                            }
                            onChange={() => {
                              if (
                                selectedBatchesForExport.size ===
                                paginatedBatches.length
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
                          Batch Name
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Course
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Start Date
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Duration
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden xl:table-cell">
                          End Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBatches.map((batch) => (
                        <tr
                          key={batch.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedBatchesForExport.has(batch.id!)}
                              onChange={() => toggleExportSelection(batch.id!)}
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{batch.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            <Badge
                              variant="secondary"
                              className="text-xs sm:text-sm"
                            >
                              {batch.course_name}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {formatDate(batch.start_date)}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {batch.duration_months
                              ? `${batch.duration_months} months`
                              : "-"}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden xl:table-cell">
                            {batch.duration_months
                              ? getEndDate(
                                  batch.start_date,
                                  batch.duration_months
                                )
                              : "-"}
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
                    setSelectedBatchesForExport(new Set());
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={exportSelectedToExcel}
                  disabled={selectedBatchesForExport.size === 0 || isExporting}
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
                        Export to Excel ({selectedBatchesForExport.size})
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

export default Batches;
