import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Award,
  Users,
  FileText,
  Download,
  Eye,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  UserCheck,
  Filter,
  Loader2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { workshopAPI, participantAPI } from "@/services/api";
import { Workshop, Participant, ParticipantFormData } from "@/types";
import { WorkshopTemplate } from "@/components/WorkshopTemplate";

const DEFAULT_FORM_DATA: ParticipantFormData = {
  name: "",
  email: "",
  phone: "",
  gender: "male",
  address: "",
  participant_type: "external",
  workshops: [],
};

// Certificate dimensions (A4 Landscape ratio)
const CERT_WIDTH = 1536;
const CERT_HEIGHT = 1086;

type BulkParticipantRow = {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  participant_type: "kug_student" | "external";
  address?: string | null;
};

type BulkValidationResult = {
  row: number;
  data: BulkParticipantRow;
  errors: string[];
};

const BULK_TEMPLATE_HEADERS = [
  "Full Name",
  "Email",
  "Phone",
  "Gender",
  "Participant Type(KUG Student or External Participant)",
  "Address (Optional)",
];

const WorkshopCertificates: React.FC = () => {
  // Data states
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState<any>(null);
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
  const [isBulkDownloadDialogOpen, setIsBulkDownloadDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<ParticipantFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Certificate generation states
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedWorkshopForCert, setSelectedWorkshopForCert] = useState<Workshop | null>(null);

  // Bulk download states
  const [bulkDownloadWorkshop, setBulkDownloadWorkshop] = useState<Workshop | null>(null);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState(0);
  const [bulkDownloadTotal, setBulkDownloadTotal] = useState(0);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const bulkCertificateRef = useRef<HTMLDivElement>(null);

  // Selection states for bulk download
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<number>>(new Set());
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

  // Bulk import states
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [bulkWorkshopId, setBulkWorkshopId] = useState<string | null>(null);
  const [bulkValidations, setBulkValidations] = useState<BulkValidationResult[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [isProcessingBulkImport, setIsProcessingBulkImport] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState(0);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [bulkImportTotal, setBulkImportTotal] = useState(0);
  const [bulkDragActive, setBulkDragActive] = useState(false);
  const [isConfirmBulkImportOpen, setIsConfirmBulkImportOpen] = useState(false);
  const [editingBulkIndex, setEditingBulkIndex] = useState<number | null>(null);
  const [editingBulkData, setEditingBulkData] = useState<BulkParticipantRow | null>(null);
  const [isTemplateConfirmOpen, setIsTemplateConfirmOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Active tab
  const [activeTab, setActiveTab] = useState("participants");

  const { toast } = useToast();

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [participantsRes, workshopsRes] = await Promise.all([
        participantAPI.getParticipants(),
        workshopAPI.getWorkshops(),
      ]);
      setParticipants(participantsRes.data);
      setFilteredParticipants(participantsRes.data);
      setWorkshops(workshopsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter participants based on search query, workshop filter, and type filter
  const filterParticipants = (query: string, workshopFilter: string, typeFilter: string) => {
    let filtered = [...participants];

    // Apply workshop filter
    if (workshopFilter !== "all") {
      const workshopId = parseInt(workshopFilter);
      filtered = filtered.filter((participant) =>
        participant.workshops?.includes(workshopId)
      );
    }

    // Apply participant type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (participant) => participant.participant_type === typeFilter
      );
    }

    // Apply search query
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(
        (participant) =>
          participant.name.toLowerCase().includes(searchTerm) ||
          participant.email.toLowerCase().includes(searchTerm) ||
          participant.phone.includes(searchTerm)
      );
    }

    setFilteredParticipants(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterParticipants(query, selectedWorkshopFilter, selectedTypeFilter);
  };

  // Handle workshop filter change
  const handleWorkshopFilterChange = (value: string) => {
    setSelectedWorkshopFilter(value);
    filterParticipants(searchQuery, value, selectedTypeFilter);
    setSelectedParticipantIds(new Set()); // Clear selection when filter changes
  };

  // Handle participant type filter change
  const handleTypeFilterChange = (value: string) => {
    setSelectedTypeFilter(value);
    filterParticipants(searchQuery, selectedWorkshopFilter, value);
    setSelectedParticipantIds(new Set()); // Clear selection when filter changes
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedWorkshopFilter("all");
    setSelectedTypeFilter("all");
    setFilteredParticipants(participants);
    setSelectedParticipantIds(new Set()); // Clear selection when filters are cleared
  };

  // Get participants for a specific workshop (for bulk download)
  const getWorkshopParticipants = (workshopId: number): Participant[] => {
    return participants.filter((p) => p.workshops?.includes(workshopId));
  };

  // Selection handlers
  const toggleParticipantSelection = (participantId: number) => {
    setSelectedParticipantIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedParticipantIds.size === filteredParticipants.length) {
      // Deselect all
      setSelectedParticipantIds(new Set());
    } else {
      // Select all filtered participants
      const allIds = new Set(filteredParticipants.map((p) => p.id!));
      setSelectedParticipantIds(allIds);
    }
  };

  const clearSelection = () => {
    setSelectedParticipantIds(new Set());
  };

  // Get selected participants
  const getSelectedParticipants = (): Participant[] => {
    return filteredParticipants.filter((p) => selectedParticipantIds.has(p.id!));
  };

  // Bulk import helpers
  const resetBulkImportState = () => {
    setBulkValidations([]);
    setBulkFileName(null);
    setBulkImportErrors([]);
    setBulkImportProgress(0);
    setBulkImportTotal(0);
    setIsProcessingBulkImport(false);
  };

  const openBulkImportDialog = () => {
    resetBulkImportState();
    if (selectedWorkshopFilter !== "all") {
      setBulkWorkshopId(selectedWorkshopFilter);
    } else {
      setBulkWorkshopId(null);
    }
    setIsBulkImportDialogOpen(true);
  };

  const downloadBulkTemplate = () => {
    // Explicit header row to avoid column mismatch issues
    const headers = BULK_TEMPLATE_HEADERS;

    const sampleRow = [
      "John Doe",
      "john@example.com",
      "+1 555 123456",
      "Male",
      "KUG Student",
      "123 Example Street",
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    // Provide generous column widths so long details are visible in editors
    ws["!cols"] = [
      { wch: 28 }, // Full Name
      { wch: 36 }, // Email
      { wch: 18 }, // Phone
      { wch: 12 }, // Gender
      { wch: 34 }, // Participant Type
      { wch: 42 }, // Address
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    // Use default XLSX writer options for maximum compatibility (e.g., macOS Numbers/Canva)
    XLSX.writeFile(wb, "workshop_participants_template.xlsx");
  };

  const parseGender = (value: string): BulkParticipantRow["gender"] | null => {
    const normalized = value.trim().toLowerCase();
    if (["male", "m"].includes(normalized)) return "male";
    if (["female", "f", "woman", "girl"].includes(normalized)) return "female";
    if (["other", "others", "o"].includes(normalized)) return "other";
    return null;
  };

  const parseParticipantType = (
    value: string
  ): BulkParticipantRow["participant_type"] | null => {
    const normalized = value.trim().toLowerCase();
    if (
      normalized.startsWith("kug") ||
      normalized === "internal" ||
      normalized.includes("student")
    ) {
      return "kug_student";
    }
    if (
      normalized.startsWith("external") ||
      normalized.startsWith("ext") ||
      normalized.includes("participant")
    ) {
      return "external";
    }
    return null;
  };

  const getCellValue = (row: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return "";
  };

  const validateParticipantData = (
    rawData: Partial<BulkParticipantRow> & Record<string, any>,
    rowNumber: number
  ): BulkValidationResult => {
    const name = String(getCellValue(rawData, ["Full Name", "Name", "name"])).trim();
    const email = String(getCellValue(rawData, ["Email", "email"])).trim();
    const phone = String(getCellValue(rawData, ["Phone", "phone"])).toString().trim();
    const genderRaw = String(getCellValue(rawData, ["Gender", "gender"])).trim();
    const typeRaw = String(
      getCellValue(rawData, [
        "Participant Type",
        "Participant Type (KUG Student or External Participant)",
        "Participant Type(KUG Student or External Participant)",
        "participant_type",
      ])
    ).trim();
    const addressValue = getCellValue(rawData, ["Address", "Address (Optional)", "address"]);

    const errors: string[] = [];

    if (!name) errors.push("Full Name is required");
    if (!email) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid email format");
    }

    if (!phone) errors.push("Phone is required");

    const genderParsed = parseGender(genderRaw);
    if (!genderParsed) {
      errors.push("Gender must be Male, Female, or Other");
    }

    const participantTypeParsed = parseParticipantType(typeRaw);
    if (!participantTypeParsed) {
      errors.push("Participant Type must be KUG Student or External Participant");
    }

    const data: BulkParticipantRow = {
      name,
      email,
      phone,
      gender: (genderParsed || "male") as BulkParticipantRow["gender"],
      participant_type: (participantTypeParsed ||
        "external") as BulkParticipantRow["participant_type"],
      address: addressValue ? String(addressValue).trim() || null : null,
    };

    return {
      row: rowNumber,
      data,
      errors,
    };
  };

  const validateBulkRows = (rows: Record<string, any>[]): BulkValidationResult[] => {
    return rows.map((row, index) => validateParticipantData(row, index + 2));
  };

  const handleBulkFile = async (file: File) => {
    resetBulkImportState();
    const allowedExtensions = [".xlsx", ".xls"];
    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some((ext) => lowerName.endsWith(ext))) {
      toast({
        title: "Invalid file",
        description: "Please upload an Excel (.xlsx/.xls) file",
        variant: "destructive",
      });
      return;
    }

    setBulkFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        setBulkImportErrors(["No sheet found in the file."]);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
        defval: "",
      });

      if (rows.length === 0) {
        setBulkImportErrors(["No data rows found. Please check the file content."]);
        return;
      }

      const validations = validateBulkRows(rows);
      setBulkValidations(validations);

      if (validations.every((v) => v.errors.length > 0)) {
        setBulkImportErrors([
          "All rows have validation issues. Please fix the highlighted errors.",
        ]);
      }
    } catch (error) {
      console.error("Error parsing bulk file:", error);
      setBulkImportErrors([
        "Unable to read the file. Ensure it is a valid Excel file with the correct columns.",
      ]);
    }
  };

  const handleBulkImportSubmit = async () => {
    const workshopId = bulkWorkshopId ? parseInt(bulkWorkshopId) : NaN;
    if (!workshopId || Number.isNaN(workshopId)) {
      toast({
        title: "Select a workshop",
        description: "Please choose the target workshop for these participants",
        variant: "destructive",
      });
      return;
    }

    const validRows = bulkValidations.filter((v) => v.errors.length === 0);
    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "Fix the errors in the file before importing",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingBulkImport(true);
    setBulkImportProgress(0);
    setBulkImportErrors([]);
    setBulkImportTotal(validRows.length);

    const failures: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await participantAPI.createParticipant({
          ...row.data,
          address: row.data.address || null,
          workshops: [workshopId],
        });
      } catch (error: any) {
        console.error("Error creating participant from bulk:", error);
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Failed to create participant";
        failures.push(`Row ${row.row} (${row.data.name}) - ${apiMessage}`);
      } finally {
        setBulkImportProgress(i + 1);
      }
    }

    setIsProcessingBulkImport(false);
    setBulkImportErrors(failures);

    if (failures.length === 0) {
      toast({
        title: "Bulk import complete",
        description: `Added ${validRows.length} participants to the workshop.`,
      });
      fetchData();
      setIsBulkImportDialogOpen(false);
      resetBulkImportState();
    } else {
      toast({
        title: "Bulk import completed with errors",
        description: `${failures.length} of ${validRows.length} rows failed. See details below.`,
        variant: "destructive",
      });
      fetchData();
    }
  };

  const handleManualAddFromBulk = () => {
    if (!bulkWorkshopId) {
      toast({
        title: "Select a workshop first",
        description: "Choose a workshop so we can prefill it for manual entry.",
        variant: "destructive",
      });
      return;
    }
    // Open inline add (uses edit dialog in append mode)
    setEditingBulkIndex(bulkValidations.length); // sentinel for append
    setEditingBulkData({
      name: "",
      email: "",
      phone: "",
      gender: "male",
      participant_type: "external",
      address: "",
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParticipants = filteredParticipants.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedWorkshopFilter, selectedTypeFilter]);

  // Re-apply filters when participants change
  useEffect(() => {
    filterParticipants(searchQuery, selectedWorkshopFilter, selectedTypeFilter);
  }, [participants]);

  // Reset form
  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setEditingParticipant(null);
  };

  // Open dialog for create/edit
  const openDialog = (participant?: Participant, prefillWorkshops?: number[]) => {
    if (participant) {
      setEditingParticipant(participant);
      setFormData({
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        gender: participant.gender,
        address: participant.address || "",
        participant_type: participant.participant_type,
        workshops: participant.workshops || [],
      });
    } else {
      setEditingParticipant(null);
      setFormData(
        prefillWorkshops && prefillWorkshops.length > 0
          ? { ...DEFAULT_FORM_DATA, workshops: prefillWorkshops }
          : DEFAULT_FORM_DATA
      );
      setErrors({});
    }
    setIsDialogOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }

    if (!formData.participant_type) {
      newErrors.participant_type = "Participant type is required";
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

    const payload = {
      ...formData,
      address: formData.address || null,
    };

    // Show update confirmation dialog if editing
    if (editingParticipant) {
      setPendingUpdatePayload(payload);
      setIsUpdateDialogOpen(true);
      return;
    }

    // Create new participant (no confirmation needed)
    try {
      await participantAPI.createParticipant(payload);
      toast({
        title: "Success",
        description: "Participant created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error creating participant:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to create participant",
        variant: "destructive",
      });
    }
  };

  // Perform the actual update after confirmation
  const handleConfirmUpdate = async () => {
    if (!editingParticipant || !pendingUpdatePayload) return;

    try {
      await participantAPI.updateParticipant(editingParticipant.id!, pendingUpdatePayload);
      toast({
        title: "Success",
        description: "Participant updated successfully",
      });
      setIsDialogOpen(false);
      setIsUpdateDialogOpen(false);
      setPendingUpdatePayload(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error updating participant:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update participant",
        variant: "destructive",
      });
    }
  };

  // Close update confirmation dialog
  const closeUpdateDialog = () => {
    setIsUpdateDialogOpen(false);
    setPendingUpdatePayload(null);
  };

  // Handle workshop selection in form
  const handleWorkshopToggle = (workshopId: number) => {
    setFormData((prev) => {
      const isSelected = prev.workshops.includes(workshopId);
      if (isSelected) {
        return {
          ...prev,
          workshops: prev.workshops.filter((id) => id !== workshopId),
        };
      } else {
        return {
          ...prev,
          workshops: [...prev.workshops, workshopId],
        };
      }
    });
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (participant: Participant) => {
    setParticipantToDelete(participant);
    setIsDeleteDialogOpen(true);
  };

  // Delete participant
  const handleDelete = async () => {
    if (!participantToDelete) return;

    try {
      await participantAPI.deleteParticipant(participantToDelete.id!);
      toast({
        title: "Success",
        description: "Participant deleted successfully",
      });
      fetchData();
      setIsDeleteDialogOpen(false);
      setParticipantToDelete(null);
    } catch (error: any) {
      console.error("Error deleting participant:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete participant",
        variant: "destructive",
      });
    }
  };

  // Open certificate dialog
  const openCertificateDialog = (participant: Participant) => {
    setSelectedParticipant(participant);
    setSelectedWorkshopForCert(null);
    setIsCertificateDialogOpen(true);
  };

  // Get workshops for a participant
  const getParticipantWorkshops = (participant: Participant): Workshop[] => {
    if (participant.workshop_details && participant.workshop_details.length > 0) {
      return participant.workshop_details;
    }
    return workshops.filter((w) => participant.workshops?.includes(w.id!));
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Open bulk download dialog
  const openBulkDownloadDialog = (workshop: Workshop) => {
    setBulkDownloadWorkshop(workshop);
    setBulkDownloadProgress(0);
    setBulkDownloadTotal(0);
    setIsBulkDownloading(false);
    setIsBulkDownloadDialogOpen(true);
  };

  // Generate certificate for a participant (returns canvas)
  const generateCertificateCanvas = async (
    workshop: Workshop,
    participantName: string
  ): Promise<HTMLCanvasElement> => {
    // Create a temporary container for the certificate
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = `${CERT_WIDTH}px`;
    container.style.height = `${CERT_HEIGHT}px`;
    container.style.zIndex = "-9999";
    document.body.appendChild(container);

    // Import ReactDOM to render the certificate
    const ReactDOM = await import("react-dom/client");
    const root = ReactDOM.createRoot(container);

    // Create a promise that resolves when the certificate is rendered
    await new Promise<void>((resolve) => {
      root.render(
        <WorkshopTemplate
          workshop={workshop}
          participantName={participantName}
          showDownload={false}
        />
      );
      // Wait for render and images to load
      setTimeout(resolve, 500);
    });

    // Capture the certificate with optimized settings for quality and file size
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: CERT_WIDTH,
      height: CERT_HEIGHT,
      windowWidth: CERT_WIDTH,
      windowHeight: CERT_HEIGHT,
      logging: false,
    });

    // Clean up
    root.unmount();
    document.body.removeChild(container);

    return canvas;
  };

  // Bulk download certificates
  const handleBulkDownload = async () => {
    if (!bulkDownloadWorkshop) return;

    const workshopParticipants = getWorkshopParticipants(bulkDownloadWorkshop.id!);
    if (workshopParticipants.length === 0) {
      toast({
        title: "No Participants",
        description: "No participants found for this workshop",
        variant: "destructive",
      });
      return;
    }

    setIsBulkDownloading(true);
    setBulkDownloadTotal(workshopParticipants.length);
    setBulkDownloadProgress(0);

    try {
      for (let i = 0; i < workshopParticipants.length; i++) {
        const participant = workshopParticipants[i];
        setBulkDownloadProgress(i + 1);

        const canvas = await generateCertificateCanvas(
          bulkDownloadWorkshop,
          participant.name
        );

        const fileName = `certificate-${bulkDownloadWorkshop.name.replace(/\s+/g, "-")}-${participant.name.replace(/\s+/g, "-")}`;

        // Download as PDF with optimized image quality
        const pdfWidth = 297;
        const pdfHeight = 210;
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });
        // Use JPEG at 0.92 quality for PDF - excellent quality with better compression
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        pdf.save(`${fileName}.pdf`);

        // Small delay between downloads to prevent browser issues
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      toast({
        title: "Success",
        description: `Downloaded ${workshopParticipants.length} certificates`,
      });
    } catch (error) {
      console.error("Error during bulk download:", error);
      toast({
        title: "Error",
        description: "Failed to download some certificates",
        variant: "destructive",
      });
    } finally {
      setIsBulkDownloading(false);
      setIsBulkDownloadDialogOpen(false);
    }
  };

  // Download selected participants certificates
  const handleDownloadSelected = async () => {
    if (selectedParticipantIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select participants to download certificates",
        variant: "destructive",
      });
      return;
    }

    if (selectedWorkshopFilter === "all") {
      toast({
        title: "Select Workshop",
        description: "Please filter by a workshop first to download certificates",
        variant: "destructive",
      });
      return;
    }

    const workshop = workshops.find(
      (w) => w.id?.toString() === selectedWorkshopFilter
    );
    if (!workshop) return;

    const selectedParticipants = getSelectedParticipants();

    setIsDownloadingSelected(true);
    setBulkDownloadTotal(selectedParticipants.length);
    setBulkDownloadProgress(0);

    try {
      for (let i = 0; i < selectedParticipants.length; i++) {
        const participant = selectedParticipants[i];
        setBulkDownloadProgress(i + 1);

        const canvas = await generateCertificateCanvas(
          workshop,
          participant.name
        );

        const fileName = `certificate-${workshop.name.replace(/\s+/g, "-")}-${participant.name.replace(/\s+/g, "-")}`;

        // Download as PDF with optimized image quality
        const pdfWidth = 297;
        const pdfHeight = 210;
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });
        // Use JPEG at 0.92 quality for PDF - excellent quality with better compression
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
        pdf.save(`${fileName}.pdf`);

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      toast({
        title: "Success",
        description: `Downloaded ${selectedParticipants.length} certificates`,
      });
      clearSelection();
    } catch (error) {
      console.error("Error during selected download:", error);
      toast({
        title: "Error",
        description: "Failed to download some certificates",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingSelected(false);
      setBulkDownloadProgress(0);
      setBulkDownloadTotal(0);
    }
  };

  if (loading && participants.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Workshop Certificates
            </h1>
            <p className="text-muted-foreground">
              Manage participants and generate workshop certificates
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={openBulkImportDialog} className="gap-2">
              <Upload className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Add Participant</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-xs text-muted-foreground">Registered</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                KUG Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {participants.filter((p) => p.participant_type === "kug_student").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Internal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                External Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {participants.filter((p) => p.participant_type === "external").length}
                  </p>
                  <p className="text-xs text-muted-foreground">External</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Workshops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Award className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workshops.length}</p>
                  <p className="text-xs text-muted-foreground">Workshops</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Search and Filter Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search participants by name, email, or phone..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10 pr-10 w-full"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        filterParticipants("", selectedWorkshopFilter, selectedTypeFilter);
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Workshop Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <Select
                    value={selectedWorkshopFilter}
                    onValueChange={handleWorkshopFilterChange}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by workshop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Workshops</SelectItem>
                      {workshops.map((workshop) => (
                        <SelectItem key={workshop.id} value={workshop.id!.toString()}>
                          {workshop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Participant Type Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select
                    value={selectedTypeFilter}
                    onValueChange={handleTypeFilterChange}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Participant type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="kug_student">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          KUG Student
                        </div>
                      </SelectItem>
                      <SelectItem value="external">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          External
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedWorkshopFilter !== "all" || selectedTypeFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1 whitespace-nowrap"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Filter Info and Bulk Download Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {filteredParticipants.length} of {participants.length} participants
                  </Badge>
                  {selectedWorkshopFilter !== "all" && (
                    <Badge
                      variant="outline"
                      className="whitespace-nowrap"
                      style={{
                        borderColor: workshops.find(
                          (w) => w.id?.toString() === selectedWorkshopFilter
                        )?.border_color,
                        color: workshops.find(
                          (w) => w.id?.toString() === selectedWorkshopFilter
                        )?.border_color,
                      }}
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {workshops.find((w) => w.id?.toString() === selectedWorkshopFilter)?.name}
                    </Badge>
                  )}
                  {selectedTypeFilter !== "all" && (
                    <Badge
                      variant={selectedTypeFilter === "kug_student" ? "default" : "secondary"}
                      className="whitespace-nowrap"
                    >
                      {selectedTypeFilter === "kug_student" ? (
                        <>
                          <Building className="h-3 w-3 mr-1" />
                          KUG Student
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          External
                        </>
                      )}
                    </Badge>
                  )}
                </div>

                {/* Bulk Download Button - Only show when a workshop is selected */}
                {selectedWorkshopFilter !== "all" && filteredParticipants.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const workshop = workshops.find(
                        (w) => w.id?.toString() === selectedWorkshopFilter
                      );
                      if (workshop) openBulkDownloadDialog(workshop);
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download All Certificates ({filteredParticipants.length})
                  </Button>
                )}
              </div>

              {/* Selection Controls - Only show when a workshop is selected */}
              {selectedWorkshopFilter !== "all" && filteredParticipants.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          filteredParticipants.length > 0 &&
                          selectedParticipantIds.size === filteredParticipants.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Select All
                      </label>
                    </div>
                    {selectedParticipantIds.size > 0 && (
                      <>
                        <Badge variant="default" className="whitespace-nowrap">
                          {selectedParticipantIds.size} selected
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelection}
                          className="h-7 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Download Selected Button */}
                  {selectedParticipantIds.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleDownloadSelected}
                      disabled={isDownloadingSelected}
                      className="gap-2"
                    >
                      {isDownloadingSelected ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {bulkDownloadProgress}/{bulkDownloadTotal}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download Selected ({selectedParticipantIds.size})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participants List */}
        <div className="grid grid-cols-1 gap-4">
          {paginatedParticipants.map((participant) => {
            const participantWorkshops = getParticipantWorkshops(participant);
            const isSelected = selectedParticipantIds.has(participant.id!);
            return (
              <Card
                key={participant.id}
                className={`hover:shadow-lg transition-shadow ${isSelected ? "ring-2 ring-primary border-primary" : ""
                  }`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Section - Participant Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Selection Checkbox - Only show when workshop is filtered */}
                        {selectedWorkshopFilter !== "all" && (
                          <div className="flex items-center pt-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleParticipantSelection(participant.id!)}
                              className="h-5 w-5"
                            />
                          </div>
                        )}
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1">
                            {participant.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                participant.participant_type === "kug_student"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {participant.participant_type === "kug_student"
                                ? "KUG Student"
                                : "External"}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {participant.gender}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-12">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{participant.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{participant.phone}</span>
                        </div>
                        {participant.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{participant.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Workshops */}
                      {participantWorkshops.length > 0 && (
                        <div className="pl-12">
                          <p className="text-xs text-muted-foreground mb-2">
                            Participated in:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {participantWorkshops.map((workshop) => (
                              <Badge
                                key={workshop.id}
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: workshop.border_color,
                                  color: workshop.border_color,
                                }}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                {workshop.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                      {participantWorkshops.length > 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openCertificateDialog(participant)}
                          className="gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="hidden sm:inline">Certificate</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(participant)}
                        className="gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(participant)}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {filteredParticipants.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredParticipants.length)} of{" "}
              {filteredParticipants.length} participants
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
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
                          onClick={() => setCurrentPage(page)}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredParticipants.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No participants found
                </h3>
                <p className="text-muted-foreground mb-4">
                  No participants match your search for "{searchQuery}"
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No participants yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first participant
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
              </>
            )}
          </div>
        )}

        {/* Participant Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingParticipant ? "Edit Participant" : "Add New Participant"}
              </DialogTitle>
              <DialogDescription>
                {editingParticipant
                  ? "Update participant details"
                  : "Add a new workshop participant"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: "male" | "female" | "other") =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-destructive">{errors.gender}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participant_type">Participant Type *</Label>
                  <Select
                    value={formData.participant_type}
                    onValueChange={(value: "kug_student" | "external") =>
                      setFormData({ ...formData, participant_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kug_student">KUG Student</SelectItem>
                      <SelectItem value="external">External Participant</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.participant_type && (
                    <p className="text-sm text-destructive">
                      {errors.participant_type}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Textarea
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Enter address"
                    rows={2}
                  />
                </div>
              </div>

              {/* Workshop Selection */}
              <div className="space-y-3">
                <Label>Participated Workshops</Label>
                <p className="text-xs text-muted-foreground">
                  Select the workshops this participant has attended
                </p>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
                  {workshops.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No workshops available. Create workshops first.
                    </p>
                  ) : (
                    workshops.map((workshop) => (
                      <div
                        key={workshop.id}
                        className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-lg"
                      >
                        <Checkbox
                          id={`workshop-${workshop.id}`}
                          checked={formData.workshops.includes(workshop.id!)}
                          onCheckedChange={() => handleWorkshopToggle(workshop.id!)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`workshop-${workshop.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {workshop.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(workshop.start_date)} • {workshop.place}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {formData.workshops.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.workshops.length} workshop(s) selected
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingParticipant ? "Update Participant" : "Add Participant"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog
          open={isBulkImportDialogOpen}
          onOpenChange={(open) => {
            if (!isProcessingBulkImport) {
              setIsBulkImportDialogOpen(open);
              if (!open) resetBulkImportState();
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Bulk Upload Participants
              </DialogTitle>
              <DialogDescription>
                Upload an Excel (.xlsx/.xls) file to add multiple participants
                to a workshop. Use the template to match the required columns.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Workshop</Label>
                  <Select
                    value={bulkWorkshopId ?? "none"}
                    onValueChange={(value) =>
                      setBulkWorkshopId(value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger className={!bulkWorkshopId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Choose workshop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select workshop</SelectItem>
                      {workshops.map((workshop) => (
                        <SelectItem key={workshop.id} value={workshop.id!.toString()}>
                          {workshop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Defaults to your active workshop filter when opening this dialog.
                  </p>
                  {!bulkWorkshopId && (
                    <div className="text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Please select a workshop before importing.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTemplateConfirmOpen(true)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Excel template
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">Upload Excel/CSV</p>
                    <p className="text-xs text-muted-foreground">
                      Required columns: Full Name, Email, Phone, Gender, Participant Type
                      (KUG Student or External Participant). Address is optional. Drag &
                      drop your file or browse to upload.
                    </p>
                  </div>
                  {bulkFileName && (
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {bulkFileName}
                    </Badge>
                  )}
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${bulkDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    } ${!bulkWorkshopId ? "opacity-70 cursor-not-allowed" : ""}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (!bulkWorkshopId || isProcessingBulkImport) return;
                    setBulkDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setBulkDragActive(false);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!bulkWorkshopId || isProcessingBulkImport) return;
                    setBulkDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleBulkFile(file);
                  }}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">Drag & drop Excel file here</p>
                    <p className="text-sm text-muted-foreground">
                      Supported: .xlsx, .xls (use the template for correct columns).
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBulkFile(file);
                          e.target.value = "";
                        }}
                        disabled={isProcessingBulkImport || !bulkWorkshopId}
                        className="hidden"
                        id="bulk-import-file"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("bulk-import-file")?.click()}
                        disabled={isProcessingBulkImport || !bulkWorkshopId}
                      >
                        Browse file
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {bulkValidations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="whitespace-nowrap">
                      {bulkValidations.filter((v) => v.errors.length === 0).length} valid
                    </Badge>
                    <Badge variant="destructive" className="whitespace-nowrap">
                      {bulkValidations.filter((v) => v.errors.length > 0).length} invalid
                    </Badge>
                    {isProcessingBulkImport && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {bulkImportProgress}/{bulkImportTotal || bulkValidations.length}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Missing someone?</p>
                      <p className="text-xs text-muted-foreground">
                        If a participant isn’t in the file or needs special handling, add them
                        manually with the selected workshop prefilled.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualAddFromBulk}
                      className="whitespace-nowrap"
                    >
                      Add manually
                    </Button>
                  </div>

                  <div className="border rounded-lg max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left font-medium">Row</th>
                          <th className="p-2 text-left font-medium">Name</th>
                          <th className="p-2 text-left font-medium">Email</th>
                          <th className="p-2 text-left font-medium">Phone</th>
                          <th className="p-2 text-left font-medium">Type</th>
                          <th className="p-2 text-left font-medium">Status</th>
                          <th className="p-2 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkValidations.map((validation, index) => (
                          <tr key={`${validation.data.email}-${index}`} className="border-t">
                            <td className="p-2">{validation.row}</td>
                            <td className="p-2">{validation.data.name}</td>
                            <td className="p-2">{validation.data.email}</td>
                            <td className="p-2">{validation.data.phone}</td>
                            <td className="p-2 capitalize">
                              {validation.data.participant_type === "kug_student"
                                ? "KUG Student"
                                : "External"}
                            </td>
                            <td className="p-2">
                              {validation.errors.length === 0 ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Valid</span>
                                </div>
                              ) : (
                                <div className="space-y-1 text-red-600 text-xs">
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Needs fixes</span>
                                  </div>
                                  <ul className="list-disc list-inside">
                                    {validation.errors.map((error, i) => (
                                      <li key={i}>{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingBulkIndex(index);
                                  setEditingBulkData(validation.data);
                                }}
                                className="h-7 px-2"
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bulkImportErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Issues found while importing
                  </div>
                  <ul className="list-disc list-inside text-sm">
                    {bulkImportErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!isProcessingBulkImport) {
                      setIsBulkImportDialogOpen(false);
                      resetBulkImportState();
                    }
                  }}
                  disabled={isProcessingBulkImport}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setIsConfirmBulkImportOpen(true)}
                  disabled={
                    isProcessingBulkImport ||
                    !bulkWorkshopId ||
                    bulkValidations.filter((v) => v.errors.length === 0).length === 0
                  }
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Review & Import
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit bulk row dialog */}
        <Dialog
          open={editingBulkIndex !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBulkIndex(null);
              setEditingBulkData(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit participant entry</DialogTitle>
              <DialogDescription>
                Fix any typos before importing. Validation updates automatically.
              </DialogDescription>
            </DialogHeader>
            {editingBulkData && editingBulkIndex !== null && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={editingBulkData.name}
                      onChange={(e) =>
                        setEditingBulkData({ ...editingBulkData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      value={editingBulkData.email}
                      onChange={(e) =>
                        setEditingBulkData({ ...editingBulkData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      value={editingBulkData.phone}
                      onChange={(e) =>
                        setEditingBulkData({ ...editingBulkData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <Select
                      value={editingBulkData.gender}
                      onValueChange={(value: "male" | "female" | "other") =>
                        setEditingBulkData({ ...editingBulkData, gender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Participant Type</Label>
                    <Select
                      value={editingBulkData.participant_type}
                      onValueChange={(value: "kug_student" | "external") =>
                        setEditingBulkData({ ...editingBulkData, participant_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kug_student">KUG Student</SelectItem>
                        <SelectItem value="external">External Participant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Address (Optional)</Label>
                    <Textarea
                      value={editingBulkData.address || ""}
                      onChange={(e) =>
                        setEditingBulkData({ ...editingBulkData, address: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingBulkIndex(null);
                      setEditingBulkData(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingBulkIndex === null || !editingBulkData) return;
                      const existingMaxRow =
                        bulkValidations.length > 0
                          ? Math.max(...bulkValidations.map((v) => v.row))
                          : 1;
                      const isAppend = editingBulkIndex >= bulkValidations.length;
                      const targetRow = isAppend
                        ? existingMaxRow + 1
                        : bulkValidations[editingBulkIndex].row;
                      const updated = validateParticipantData(editingBulkData, targetRow);
                      const next = [...bulkValidations];
                      if (isAppend) {
                        next.push(updated);
                      } else {
                        next[editingBulkIndex] = updated;
                      }
                      setBulkValidations(next);
                      setEditingBulkIndex(null);
                      setEditingBulkData(null);
                    }}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm template download */}
        <AlertDialog
          open={isTemplateConfirmOpen}
          onOpenChange={setIsTemplateConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Download Excel template</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Required columns (keep headers unchanged):</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Full Name</li>
                    <li>Email</li>
                    <li>Phone</li>
                    <li>Gender (Male / Female / Other)</li>
                    <li>Participant Type (KUG Student or External Participant)</li>
                    <li>Address (Optional)</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Example row:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Full Name: Jane Smith</li>
                    <li>Email: jane.smith@example.com</li>
                    <li>Phone: +1 555 987654</li>
                    <li>Gender: Female</li>
                    <li>Participant Type: External Participant</li>
                    <li>Address (Optional): 123 Main Street, City</li>
                  </ul>
                </div>
                <p className="text-muted-foreground">
                  Save as .xlsx without changing headers. Columns are widened for readability.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  downloadBulkTemplate();
                  setIsTemplateConfirmOpen(false);
                }}
              >
                Download .xlsx
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Bulk Import */}
        <AlertDialog
          open={isConfirmBulkImportOpen}
          onOpenChange={(open) => {
            if (!isProcessingBulkImport) setIsConfirmBulkImportOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm bulk import</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  You are about to import participants into{" "}
                  <strong>
                    {workshops.find((w) => w.id?.toString() === bulkWorkshopId)?.name ||
                      "selected workshop"}
                  </strong>
                  .
                </p>
                <p className="text-sm text-muted-foreground">
                  Valid rows:{" "}
                  <strong>
                    {bulkValidations.filter((v) => v.errors.length === 0).length}
                  </strong>{" "}
                  • Invalid rows:{" "}
                  <strong>
                    {bulkValidations.filter((v) => v.errors.length > 0).length}
                  </strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Please double-check names, emails, phones, and participant types before
                  proceeding. You can re-upload if something looks off.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  if (!isProcessingBulkImport) setIsConfirmBulkImportOpen(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsConfirmBulkImportOpen(false);
                  handleBulkImportSubmit();
                }}
                disabled={isProcessingBulkImport}
              >
                Import now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Participant - Warning</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="font-semibold text-destructive">
                  This action cannot be undone.
                </p>
                <p>
                  You are about to permanently delete the participant{" "}
                  <strong>{participantToDelete?.name}</strong>. This will result in:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>
                    <strong>Permanent deletion</strong> of all participant data
                    including personal information, contact details, and enrollment
                    records
                  </li>
                  <li>
                    <strong>Removal from all workshops</strong> - The participant
                    will be removed from all workshop enrollments and associated
                    records
                  </li>
                  <li>
                    <strong>Certificate records affected</strong> - Any certificates
                    generated for this participant will remain, but the participant
                    data will no longer be accessible in the system
                  </li>
                  <li>
                    <strong>Historical data loss</strong> - All participation history,
                    workshop associations, and related information will be
                    permanently removed
                  </li>
                  <li>
                    <strong>Cannot be restored</strong> - Once deleted, the
                    participant record cannot be recovered or restored
                  </li>
                </ul>
                <p className="pt-2 font-medium">
                  Are you absolutely sure you want to proceed with this deletion?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setParticipantToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Participant
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Update Confirmation Dialog */}
        <AlertDialog
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Participant - Important Notice</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="font-semibold text-amber-600 dark:text-amber-500">
                  Changes will affect all instances of this participant.
                </p>
                <p>
                  You are about to update the participant{" "}
                  <strong>{editingParticipant?.name}</strong>. Please be aware that
                  these changes will have system-wide impact:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm ml-2">
                  <li>
                    <strong>Personal information updates</strong> - Changes to name,
                    email, phone, address, or gender will be reflected across all
                    system records and certificates
                  </li>
                  <li>
                    <strong>Certificate data changes</strong> - Any certificates
                    already generated or pending for this participant will display
                    the updated information when regenerated or viewed
                  </li>
                  <li>
                    <strong>Workshop enrollment changes</strong> - Updates to
                    workshop associations will affect:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Participant enrollment records</li>
                      <li>Certificate generation eligibility</li>
                      <li>Workshop participant lists and reports</li>
                      <li>Historical participation tracking</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Participant type changes</strong> - Changing from KUG
                    Student to External (or vice versa) will affect categorization
                    in all system modules including reports, statistics, and
                    filtering options
                  </li>
                  <li>
                    <strong>Data consistency</strong> - Ensure all changes are
                    accurate as they will propagate throughout the entire system
                    including:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Participant management pages</li>
                      <li>Certificate generation system</li>
                      <li>Workshop enrollment records</li>
                      <li>Reports and analytics</li>
                      <li>Historical records and archives</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Contact information updates</strong> - Changes to email
                    or phone will affect communication records and notification
                    systems
                  </li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    ⚠️ Recommendation: Review all changes carefully before
                    confirming. Ensure workshop associations are correct as they
                    determine certificate eligibility.
                  </p>
                </div>
                <p className="pt-2 font-medium">
                  Do you want to proceed with updating this participant?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeUpdateDialog}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmUpdate}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm Update
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Certificate Preview Dialog */}
        <Dialog
          open={isCertificateDialogOpen}
          onOpenChange={setIsCertificateDialogOpen}
        >
          <DialogContent className="max-w-[95vw] w-fit max-h-[95vh] overflow-hidden p-6">
            <DialogHeader className="pb-2">
              <DialogTitle>Generate Certificate</DialogTitle>
              <DialogDescription>
                Select a workshop to generate the certificate for{" "}
                <strong>{selectedParticipant?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            {selectedParticipant && (
              <div className="space-y-4">
                {/* Workshop Selection */}
                {!selectedWorkshopForCert ? (
                  <div className="space-y-3">
                    <Label>Select Workshop</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {getParticipantWorkshops(selectedParticipant).map(
                        (workshop) => (
                          <Card
                            key={workshop.id}
                            className="cursor-pointer hover:border-primary transition-colors"
                            onClick={() => setSelectedWorkshopForCert(workshop)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{
                                    backgroundColor: `${workshop.border_color}20`,
                                  }}
                                >
                                  <Award
                                    className="h-5 w-5"
                                    style={{ color: workshop.border_color }}
                                  />
                                </div>
                                <div>
                                  <h4 className="font-medium">{workshop.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(workshop.start_date)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Back Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedWorkshopForCert(null)}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Change Workshop
                    </Button>

                    {/* Certificate Preview */}
                    <div
                      className="border rounded-lg bg-gray-50 p-3 overflow-auto"
                      style={{
                        maxWidth: "calc(95vw - 48px)",
                        maxHeight: "calc(95vh - 250px)",
                      }}
                    >
                      <div
                        className="flex justify-center"
                        style={{
                          transform: "scale(0.5)",
                          transformOrigin: "top center",
                          marginBottom: "-500px",
                        }}
                      >
                        <WorkshopTemplate
                          workshop={selectedWorkshopForCert}
                          participantName={selectedParticipant.name}
                          showDownload={true}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      Use the download buttons above to save the certificate
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Download Dialog */}
        <Dialog
          open={isBulkDownloadDialogOpen}
          onOpenChange={(open) => {
            if (!isBulkDownloading) {
              setIsBulkDownloadDialogOpen(open);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Bulk Download Certificates
              </DialogTitle>
              <DialogDescription>
                Download all certificates for participants of{" "}
                <strong>{bulkDownloadWorkshop?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            {bulkDownloadWorkshop && (
              <div className="space-y-4">
                {/* Workshop Info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: `${bulkDownloadWorkshop.border_color}20`,
                      }}
                    >
                      <Award
                        className="h-5 w-5"
                        style={{ color: bulkDownloadWorkshop.border_color }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium">{bulkDownloadWorkshop.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(bulkDownloadWorkshop.start_date)} •{" "}
                        {getWorkshopParticipants(bulkDownloadWorkshop.id!).length}{" "}
                        participants
                      </p>
                    </div>
                  </div>
                </div>

                {!isBulkDownloading && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Each certificate will be downloaded as a separate PDF file
                    </p>
                  </div>
                )}

                {/* Progress */}
                {isBulkDownloading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Downloading certificates...</span>
                      <span className="font-medium">
                        {bulkDownloadProgress} / {bulkDownloadTotal}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(bulkDownloadProgress / bulkDownloadTotal) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Please wait while certificates are being generated...
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkDownloadDialogOpen(false)}
                    disabled={isBulkDownloading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkDownload}
                    disabled={isBulkDownloading}
                    className="gap-2"
                  >
                    {isBulkDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download All ({getWorkshopParticipants(bulkDownloadWorkshop.id!).length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default WorkshopCertificates;
