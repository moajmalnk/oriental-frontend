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
  Mail,
  Phone,
  MessageCircle,
  Image,
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
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Student, StudentFormData } from "@/types";
import * as XLSX from "xlsx";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { StudentPageSkeleton } from "@/components/skeletons/StudentPageSkeleton";

// Bulk creation interfaces
interface BulkStudentData {
  name: string;
  email: string;
  phone: string;
  whatsapp_number?: string;
  photo_path?: string; // Path to image file
}

interface BulkStudentValidation {
  row: number;
  data: BulkStudentData;
  errors: string[];
  isValid: boolean;
}

interface BulkCreationResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    studentName: string;
    error: string;
  }>;
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    photo: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk creation states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState<BulkStudentData[]>([]);
  const [bulkValidations, setBulkValidations] = useState<
    BulkStudentValidation[]
  >([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState<BulkCreationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [bulkImages, setBulkImages] = useState<File[]>([]);

  // Bulk delete states
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedStudentsForDelete, setSelectedStudentsForDelete] = useState<
    Set<number>
  >(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; studentName: string; error: string }>;
  } | null>(null);

  // Convert to Excel states
  const [isBulkExportDialogOpen, setIsBulkExportDialogOpen] = useState(false);
  const [selectedStudentsForExport, setSelectedStudentsForExport] = useState<
    Set<number>
  >(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Pagination states (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  const { toast } = useToast();
  const navigate = useNavigate();
  // Fetch students with server-side pagination and search
  const fetchStudents = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const response = await api.get("/api/students/students/", {
        params: {
          page,
          page_size: itemsPerPage,
          search: search.trim(),
        },
      });
      setStudents(response.data.results);
      setTotalCount(response.data.count);
      setTotalPages(response.data.total_pages);
      setCurrentPage(response.data.current_page);
      setTotalStudents(response.data.total_students || response.data.count);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1, searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    fetchStudents(page, searchQuery);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      fetchStudents(currentPage - 1, searchQuery);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      fetchStudents(currentPage + 1, searchQuery);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStudents(1, "");
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      whatsapp_number: "",
      photo: null,
    });
    setErrors({});
    setEditingStudent(null);
  };

  // Open dialog for create/edit
  const openDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        email: student.email,
        phone: student.phone,
        whatsapp_number: student.whatsapp_number || "",
        photo: null,
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
      newErrors.name = "Student name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (
      formData.whatsapp_number &&
      !/^[\d\s\-\+\(\)]+$/.test(formData.whatsapp_number)
    ) {
      newErrors.whatsapp_number = "Please enter a valid WhatsApp number";
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
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phone", formData.phone);
      if (formData.whatsapp_number) {
        formDataToSend.append("whatsapp_number", formData.whatsapp_number);
      }
      if (formData.photo) {
        formDataToSend.append("photo", formData.photo);
      }

      if (editingStudent) {
        await api.put(
          `/api/students/students/update/${editingStudent.id}/`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        toast({
          title: "Success",
          description: "Student updated successfully",
        });
      } else {
        await api.post("/api/students/students/create/", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast({
          title: "Success",
          description: "Student created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error("Error saving student:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save student",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete student
  const handleDelete = async () => {
    if (!studentToDelete) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/students/students/delete/${studentToDelete.id}/`);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      setStudentToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete student",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  // Bulk creation functions
  const handleFileUpload = (file: File) => {
    if (!file) return;

    // Check if it's an Excel or CSV file
    if (
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".csv")
    ) {
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
          const studentData: BulkStudentData[] = jsonData
            .slice(1)
            .map((row: any[], index: number) => ({
              name: row[0]?.toString() || "",
              email: row[1]?.toString() || "",
              phone: row[2]?.toString() || "",
              whatsapp_number: row[3]?.toString() || "",
              photo_path: row[4]?.toString() || "", // Image path/name
            }));

          setBulkData(studentData);
          validateBulkData(studentData);
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
    } else if (file.type.startsWith("image/")) {
      // Validate image file type
      const validImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
      ];
      if (!validImageTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description:
            "Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP)",
          variant: "destructive",
        });
        return;
      }

      // Handle image files
      setBulkImages((prev) => [...prev, file]);

      // Show file size information for large files
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Large Image Added",
          description: `Added ${file.name} (${fileSizeMB} MB) to bulk import. Upload may take time.`,
        });
      } else {
        toast({
          title: "Image Added",
          description: `Added ${file.name} to bulk import`,
        });
      }
    }
  };

  const validateBulkData = (data: BulkStudentData[]) => {
    const validations: BulkStudentValidation[] = data.map((student, index) => {
      const errors: string[] = [];
      const row = index + 2; // +2 because we skip header and arrays are 0-indexed

      // Validate student name
      if (!student.name.trim()) {
        errors.push("Student name is required");
      }

      // Validate email
      if (!student.email.trim()) {
        errors.push("Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
        errors.push("Invalid email format");
      }

      // Validate phone
      if (!student.phone.trim()) {
        errors.push("Phone number is required");
      } else if (!/^[\d\s\-\+\(\)]+$/.test(student.phone)) {
        errors.push("Invalid phone number format");
      }

      // Validate WhatsApp number (optional)
      if (
        student.whatsapp_number &&
        !/^[\d\s\-\+\(\)]+$/.test(student.whatsapp_number)
      ) {
        errors.push("Invalid WhatsApp number format");
      }

      // Check for duplicate emails
      const duplicateIndex = data.findIndex(
        (s, i) =>
          i !== index && s.email.toLowerCase() === student.email.toLowerCase()
      );
      if (duplicateIndex !== -1) {
        errors.push(`Duplicate email found in row ${duplicateIndex + 2}`);
      }

      // Check for duplicate names
      const duplicateNameIndex = data.findIndex(
        (s, i) =>
          i !== index && s.name.toLowerCase() === student.name.toLowerCase()
      );
      if (duplicateNameIndex !== -1) {
        errors.push(`Duplicate name found in row ${duplicateNameIndex + 2}`);
      }

      return {
        row,
        data: student,
        errors,
        isValid: errors.length === 0,
      };
    });

    setBulkValidations(validations);
  };

  const handleBulkCreate = async () => {
    const validStudents = bulkValidations.filter((v) => v.isValid);
    if (validStudents.length === 0) {
      toast({
        title: "No valid students",
        description: "Please fix validation errors before creating students.",
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

    for (let i = 0; i < validStudents.length; i++) {
      const validation = validStudents[i];
      const progress = ((i + 1) / validStudents.length) * 100;
      setBulkProgress(progress);

      try {
        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append("name", validation.data.name);
        formData.append("email", validation.data.email);
        formData.append("phone", validation.data.phone);
        if (validation.data.whatsapp_number) {
          formData.append("whatsapp_number", validation.data.whatsapp_number);
        }

        // Try to match image with student
        if (validation.data.photo_path) {
          const matchingImage = bulkImages.find(
            (img) =>
              img.name
                .toLowerCase()
                .includes(validation.data.photo_path!.toLowerCase()) ||
              validation.data
                .photo_path!.toLowerCase()
                .includes(img.name.toLowerCase())
          );
          if (matchingImage) {
            formData.append("photo", matchingImage);
          }
        }

        await api.post("/api/students/students/create/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: validation.row,
          studentName: validation.data.name,
          error: error.response?.data?.message || "Failed to create student",
        });
      }
    }

    setBulkResult(result);
    setIsProcessingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Creation Complete",
        description: `Successfully created ${result.success} students. ${result.failed} failed.`,
      });
      fetchStudents();
    }

    if (result.failed > 0) {
      toast({
        title: "Some students failed",
        description: `${result.failed} students could not be created. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ["Student Name", "Email", "Phone", "WhatsApp Number", "Photo File Name"],
      [
        "John Doe",
        "john.doe@example.com",
        "+1234567890",
        "+1234567890",
        "john_doe.jpg",
      ],
      [
        "Jane Smith",
        "jane.smith@example.com",
        "+1987654321",
        "+1987654321",
        "jane_smith.png",
      ],
      [
        "",
        "Format: valid email",
        "Format: phone number",
        "Optional",
        "Image file name (upload images separately)",
      ],
      [
        "",
        "Examples: user@domain.com",
        "Examples: +1234567890",
        "Examples: +1234567890",
        "Examples: student_photo.jpg",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_template.xlsx");
  };

  const downloadCSVTemplate = () => {
    const templateData = [
      ["Student Name", "Email", "Phone", "WhatsApp Number", "Photo File Name"],
      [
        "John Doe",
        "john.doe@example.com",
        "+1234567890",
        "+1234567890",
        "john_doe.jpg",
      ],
      [
        "Jane Smith",
        "jane.smith@example.com",
        "+1987654321",
        "+1987654321",
        "jane_smith.png",
      ],
      [
        "",
        "Format: valid email",
        "Format: phone number",
        "Optional",
        "Image file name (upload images separately)",
      ],
      [
        "",
        "Examples: user@domain.com",
        "Examples: +1234567890",
        "Examples: +1234567890",
        "Examples: student_photo.jpg",
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
    link.setAttribute("download", "student_template.csv");
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
    setBulkImages([]);
  };

  // Bulk delete functions
  const toggleDeleteSelection = (studentId: number) => {
    setSelectedStudentsForDelete((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllForDelete = () => {
    setSelectedStudentsForDelete(
      new Set(students.map((student) => student.id!))
    );
  };

  const clearDeleteSelection = () => {
    setSelectedStudentsForDelete(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedStudentsForDelete.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one student to delete.",
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
        studentName: string;
        error: string;
      }>,
    };

    const selectedStudents = students.filter((student) =>
      selectedStudentsForDelete.has(student.id!)
    );

    for (let i = 0; i < selectedStudents.length; i++) {
      const student = selectedStudents[i];
      const progress = ((i + 1) / selectedStudents.length) * 100;
      setBulkDeleteProgress(progress);

      try {
        await api.delete(`/api/students/students/delete/${student.id}/`);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          studentName: student.name,
          error: error.response?.data?.message || "Failed to delete student",
        });
      }
    }

    setBulkDeleteResult(result);
    setIsDeletingBulk(false);

    if (result.success > 0) {
      toast({
        title: "Bulk Delete Complete",
        description: `Successfully deleted ${result.success} students. ${result.failed} failed.`,
      });
      fetchStudents();
      setSelectedStudentsForDelete(new Set());
    }

    if (result.failed > 0) {
      toast({
        title: "Some students failed",
        description: `${result.failed} students could not be deleted. Check the details below.`,
        variant: "destructive",
      });
    }
  };

  // Export functions
  const toggleExportSelection = (studentId: number) => {
    setSelectedStudentsForExport((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllForExport = () => {
    setSelectedStudentsForExport(
      new Set(students.map((student) => student.id!))
    );
  };

  const clearExportSelection = () => {
    setSelectedStudentsForExport(new Set());
  };

  const exportSelectedToExcel = async () => {
    if (selectedStudentsForExport.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one student to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedStudents = students.filter((student) =>
        selectedStudentsForExport.has(student.id!)
      );

      // Create Excel data
      const excelData = [
        ["Student Name", "Email", "Phone", "WhatsApp Number", "Created Date"],
        ...selectedStudents.map((student) => [
          student.name,
          student.email,
          student.phone,
          student.whatsapp_number || "",
          student.created_at
            ? new Date(student.created_at).toLocaleDateString()
            : "",
        ]),
      ];

      // Create and download Excel file
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(
        wb,
        `students_export_${new Date().toISOString().split("T")[0]}.xlsx`
      );

      toast({
        title: "Export Successful",
        description: `Exported ${selectedStudentsForExport.size} students to Excel file.`,
      });

      setIsBulkExportDialogOpen(false);
      setSelectedStudentsForExport(new Set());
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export students to Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image file type
      const validImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
      ];
      if (!validImageTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description:
            "Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP)",
          variant: "destructive",
        });
        return;
      }

      // Show warning for very large files (>10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Large File Detected",
          description: `File size: ${(file.size / (1024 * 1024)).toFixed(
            2
          )} MB. Upload may take a moment.`,
        });
      }

      setFormData({ ...formData, photo: file });
    }
  };

  if (loading && students.length === 0) {
    return <StudentPageSkeleton />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Student Management
            </h1>
            <p className="text-muted-foreground">
              Manage student information and enrollment
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              onClick={() => openDialog()}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
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

        {/* Statistics Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <User className="h-8 w-8 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Students
                </p>
                <p className="text-4xl font-bold">{totalStudents}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All students in database
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search students by name, email, or phone..."
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
                  {totalCount} results
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Grid/List */}
        <div className="grid grid-cols-1 gap-4">
          {students.map((student) => (
            <Card
              key={student.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/student-view/${student.id}`)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left Section - Student Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {student.photo ? (
                          <OptimizedImage
                            src={student.photo}
                            alt={student.name}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-primary/10"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1 truncate">
                          {student.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            {student.email}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Phone className="h-3 w-3 mr-1" />
                            {student.phone}
                          </Badge>
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
                        navigate(`/student-view/${student.id}`);
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
              students
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

        {students.length === 0 && !loading && (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No students found
                </h3>
                <p className="text-muted-foreground mb-4">
                  No students match your search for "{searchQuery}"
                </p>
                <Button onClick={clearSearch} variant="outline">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No students found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first student
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </>
            )}
          </div>
        )}

        {/* Student Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingStudent ? "Edit Student" : "Create New Student"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingStudent
                  ? "Update student information"
                  : "Add a new student to the system"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Student Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base">
                    Student Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., John Doe"
                    className="text-sm sm:text-base"
                  />
                  {errors.name && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="e.g., john.doe@example.com"
                    className="text-sm sm:text-base"
                  />
                  {errors.email && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="e.g., +1234567890"
                    className="text-sm sm:text-base"
                  />
                  {errors.phone && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label
                    htmlFor="whatsapp_number"
                    className="text-sm sm:text-base"
                  >
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsapp_number"
                    value={formData.whatsapp_number || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_number: e.target.value,
                      })
                    }
                    placeholder="e.g., +1234567890"
                    className="text-sm sm:text-base"
                  />
                  {errors.whatsapp_number && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.whatsapp_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="photo" className="text-sm sm:text-base">
                  Student Photo
                </Label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="flex-1 text-xs sm:text-sm"
                  />
                  {formData.photo && (
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formData.photo.name}
                    </div>
                  )}
                </div>
                {formData.photo && (
                  <div className="mt-2">
                    <OptimizedImage
                      src={URL.createObjectURL(formData.photo)}
                      alt="Preview"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                    />
                  </div>
                )}
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
                      {editingStudent ? "Updating..." : "Creating..."}
                    </>
                  ) : editingStudent ? (
                    "Update Student"
                  ) : (
                    "Create Student"
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
                student <strong>{studentToDelete?.name}</strong> and remove all
                associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => {
                  setStudentToDelete(null);
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
                  "Delete Student"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Creation Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Bulk Import Students
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Upload an Excel (.xlsx, .xls) or CSV file to create multiple
                students at once. Download the template for the correct format.
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
                      Use this Excel template to format your student data
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

              {/* Step 1: Upload Images First */}
              {bulkData.length === 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                        1
                      </div>
                      <h3 className="font-semibold text-blue-900 text-sm sm:text-base">
                        Step 1: Upload Student Photos
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-700 mb-3 sm:mb-4">
                      First, upload all student photos. These will be matched
                      with the Excel/CSV data using the photo file names.
                    </p>

                    <div
                      className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors ${
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
                        const files = Array.from(e.dataTransfer.files);
                        files.forEach((file) => handleFileUpload(file));
                      }}
                    >
                      <Image className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="font-medium mb-1 text-sm sm:text-base">
                        Upload Student Photos
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                        Drag and drop images here, or click to browse
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach((file) => handleFileUpload(file));
                        }}
                        className="hidden"
                        id="bulk-image-upload"
                      />
                      <Button asChild size="sm" className="w-full sm:w-auto">
                        <Label
                          htmlFor="bulk-image-upload"
                          className="cursor-pointer"
                        >
                          <Image className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">
                            Choose Images
                          </span>
                        </Label>
                      </Button>
                    </div>
                  </div>

                  {/* Show uploaded images */}
                  {bulkImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h4 className="font-medium text-sm sm:text-base">
                          Uploaded Images ({bulkImages.length})
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkImages([])}
                          className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-32 sm:max-h-40 overflow-y-auto">
                        {bulkImages.map((image, index) => (
                          <div
                            key={index}
                            className="flex flex-col items-center"
                          >
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={image.name}
                                width="80px"
                                height="80px"
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 z-10"
                                onClick={() => {
                                  setBulkImages((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  );
                                }}
                              >
                                <X className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-center mt-1 truncate w-20">
                              {image.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Upload Excel/CSV File */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <h3 className="font-semibold text-green-900">
                        Step 2: Upload Excel/CSV File
                      </h3>
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                      Now upload your Excel or CSV file with student data. Make
                      sure the photo file names in the Excel match the images
                      you uploaded above.
                    </p>

                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
                        const files = Array.from(e.dataTransfer.files);
                        files.forEach((file) => handleFileUpload(file));
                      }}
                    >
                      <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="font-medium mb-1">Upload Excel/CSV File</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop your Excel (.xlsx, .xls) or CSV file here,
                        or click to browse
                      </p>
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                        id="bulk-excel-upload"
                      />
                      <Button asChild>
                        <Label
                          htmlFor="bulk-excel-upload"
                          className="cursor-pointer"
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Choose Excel/CSV File
                        </Label>
                      </Button>
                    </div>
                  </div>
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
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Row
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium">
                            Student Name
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                            Email
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                            Phone
                          </th>
                          <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                            Photo
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
                              {validation.data.email}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                              {validation.data.phone}
                            </td>
                            <td className="p-2 sm:p-3 text-xs sm:text-sm hidden lg:table-cell">
                              {validation.data.photo_path ? (
                                <div className="flex items-center gap-1">
                                  <Image className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                                  <span className="text-xs">
                                    {validation.data.photo_path}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  No photo
                                </span>
                              )}
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
                      <div className="space-y-1 max-h-40 overflow-auto">
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
                        <span>Creating students...</span>
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
                            Failed Students:
                          </h4>
                          <div className="space-y-1 max-h-40 overflow-auto">
                            {bulkResult.errors.map((error, index) => (
                              <div
                                key={index}
                                className="text-sm text-destructive"
                              >
                                <strong>
                                  Row {error.row} ({error.studentName}):
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
                        Students
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
                Bulk Delete Students
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select students to delete in bulk. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 sm:space-y-6">
              {/* Selection Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg bg-red-50 border-red-200 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-red-900 text-sm sm:text-base">
                      Select Students to Delete
                    </p>
                    <p className="text-xs sm:text-sm text-red-700">
                      Choose the students you want to delete permanently.
                      {selectedStudentsForDelete.size > 0 &&
                        ` ${selectedStudentsForDelete.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForDelete}
                    variant="outline"
                    size="sm"
                    disabled={students.length === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({students.length})
                  </Button>
                  <Button
                    onClick={clearDeleteSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedStudentsForDelete.size === 0}
                    className="border-red-300 text-red-700 hover:bg-red-100 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Students Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Students to Delete
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedStudentsForDelete.size > 0 &&
                              selectedStudentsForDelete.size === students.length
                            }
                            onChange={() => {
                              if (
                                selectedStudentsForDelete.size ===
                                students.length
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
                          Email
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Phone
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          Created Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr
                          key={student.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedStudentsForDelete.has(
                                student.id!
                              )}
                              onChange={() =>
                                toggleDeleteSelection(student.id!)
                              }
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              {student.photo ? (
                                <OptimizedImage
                                  src={student.photo}
                                  alt={student.name}
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="truncate">{student.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            {student.email}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {student.phone}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {student.created_at
                              ? new Date(
                                  student.created_at
                                ).toLocaleDateString()
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
                    <span>Deleting students...</span>
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
                            <strong>{error.studentName}:</strong> {error.error}
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
                    setSelectedStudentsForDelete(new Set());
                    setBulkDeleteResult(null);
                    setBulkDeleteProgress(0);
                  }}
                >
                  Cancel
                </Button>
                {!isDeletingBulk && !bulkDeleteResult && (
                  <Button
                    onClick={handleBulkDelete}
                    disabled={selectedStudentsForDelete.size === 0}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedStudentsForDelete.size} Students
                  </Button>
                )}
                {bulkDeleteResult && (
                  <Button
                    onClick={() => {
                      setIsBulkDeleteDialogOpen(false);
                      setSelectedStudentsForDelete(new Set());
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
                Export Students to Excel
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Select students to export to Excel format then delete the data,
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
                      Select Students to Export
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Choose the students you want to export to Excel.
                      {selectedStudentsForExport.size > 0 &&
                        ` ${selectedStudentsForExport.size} selected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={selectAllForExport}
                    variant="outline"
                    size="sm"
                    disabled={students.length === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Select All ({students.length})
                  </Button>
                  <Button
                    onClick={clearExportSelection}
                    variant="outline"
                    size="sm"
                    disabled={selectedStudentsForExport.size === 0}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* Students Selection Table */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Select Students to Export
                </h3>
                <div className="max-h-48 sm:max-h-60 overflow-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium w-8 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              selectedStudentsForExport.size > 0 &&
                              selectedStudentsForExport.size === students.length
                            }
                            onChange={() => {
                              if (
                                selectedStudentsForExport.size ===
                                students.length
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
                          Student
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden sm:table-cell">
                          Email
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                          Phone
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">
                          WhatsApp
                        </th>
                        <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-medium hidden xl:table-cell">
                          Created Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr
                          key={student.id}
                          className="border-t hover:bg-muted/50"
                        >
                          <td className="p-2 sm:p-3">
                            <input
                              type="checkbox"
                              checked={selectedStudentsForExport.has(
                                student.id!
                              )}
                              onChange={() =>
                                toggleExportSelection(student.id!)
                              }
                              className="h-3 w-3 sm:h-4 sm:w-4"
                            />
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              {student.photo ? (
                                <OptimizedImage
                                  src={student.photo}
                                  alt={student.name}
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="truncate">{student.name}</span>
                            </div>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell">
                            {student.email}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">
                            {student.phone}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                            {student.whatsapp_number || "-"}
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden xl:table-cell">
                            {student.created_at
                              ? new Date(
                                  student.created_at
                                ).toLocaleDateString()
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
                    setSelectedStudentsForExport(new Set());
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={exportSelectedToExcel}
                  disabled={selectedStudentsForExport.size === 0 || isExporting}
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
                        Export to Excel ({selectedStudentsForExport.size})
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

export default Students;
