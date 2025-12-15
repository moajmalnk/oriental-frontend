import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Clock,
  Search,
  X,
  Palette,
  FileText,
  Award,
  Upload,
  Image,
  PenTool,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { workshopAPI } from "@/services/api";
import { Workshop, WorkshopFormData } from "@/types";
import { WorkshopTemplate } from "@/components/WorkshopTemplate";
import { AdvancedColorPicker } from "@/components/AdvancedColorPicker";
import { DatePicker } from "@/components/ui/date-picker";

// Default certificate colors
const DEFAULT_COLORS = {
  background_color: "#ffffff",
  center_background_color: "#ffffff",
  border_color: "#4b9164",
  title_color: "#4b9164",
  name_color: "#4b9164",
  text_color: "#333333",
};

const Workshops: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workshopToDelete, setWorkshopToDelete] = useState<Workshop | null>(
    null
  );
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewWorkshop, setPreviewWorkshop] = useState<Workshop | null>(null);
  const [formData, setFormData] = useState<WorkshopFormData>({
    name: "",
    duration_days: 1,
    start_date: "",
    end_date: null,
    place: "",
    description: "",
    chief_trainer_title: "",
    chief_trainer_name: "",
    logo: null,
    background_color: DEFAULT_COLORS.background_color,
    ...DEFAULT_COLORS,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("details");
  const [removeLogoFlag, setRemoveLogoFlag] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { toast } = useToast();

  // Fetch workshops
  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      const response = await workshopAPI.getWorkshops();
      setWorkshops(response.data);
      setFilteredWorkshops(response.data);
    } catch (error) {
      console.error("Error fetching workshops:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workshops",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter workshops based on search query
  const filterWorkshops = (query: string) => {
    if (!query.trim()) {
      setFilteredWorkshops(workshops);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = workshops.filter(
      (workshop) =>
        workshop.name.toLowerCase().includes(searchTerm) ||
        workshop.place.toLowerCase().includes(searchTerm) ||
        workshop.description.toLowerCase().includes(searchTerm)
    );

    setFilteredWorkshops(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterWorkshops(query);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFilteredWorkshops(workshops);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredWorkshops.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWorkshops = filteredWorkshops.slice(startIndex, endIndex);

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
    fetchWorkshops();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      duration_days: 1,
      start_date: "",
      end_date: null,
      place: "",
      description: "",
      chief_trainer_title: "",
      chief_trainer_name: "",
      logo: null,
      background_color: DEFAULT_COLORS.background_color,
      ...DEFAULT_COLORS,
    });
    setLogoPreview(null);
    setRemoveLogoFlag(false);
    setErrors({});
    setEditingWorkshop(null);
    setActiveTab("details");
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, logo: file });
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove logo
  const removeLogo = () => {
    setFormData({ ...formData, logo: null });
    setLogoPreview(null);
    setRemoveLogoFlag(true);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  // Open dialog for create/edit
  const openDialog = (workshop?: Workshop) => {
    if (workshop) {
      setEditingWorkshop(workshop);
      setFormData({
        name: workshop.name,
        duration_days: workshop.duration_days,
        start_date: workshop.start_date,
        end_date: workshop.end_date || null,
        place: workshop.place,
        description: workshop.description,
        chief_trainer_title: workshop.chief_trainer_title || "",
        chief_trainer_name: workshop.chief_trainer_name || "",
        logo: null, // Don't pre-fill file, but show existing logo
        background_color:
          workshop.background_color || DEFAULT_COLORS.background_color,
        center_background_color:
          workshop.center_background_color || DEFAULT_COLORS.center_background_color,
        border_color: workshop.border_color,
        title_color: workshop.title_color,
        name_color: workshop.name_color,
        text_color: workshop.text_color,
      });
      // Set logo preview from existing workshop logo
      setLogoPreview(workshop.logo_url || null);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Workshop name is required";
    } else {
      // Check for duplicate workshop name (case-insensitive)
      const trimmedName = formData.name.trim();
      const existingWorkshop = workshops.find(
        (w) => w.name.toLowerCase() === trimmedName.toLowerCase()
      );

      // If editing, allow the same name if it's the same workshop
      if (existingWorkshop) {
        if (!editingWorkshop || existingWorkshop.id !== editingWorkshop.id) {
          newErrors.name = "A workshop with this name already exists. Please choose a different name.";
        }
      }
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.place.trim()) {
      newErrors.place = "Place is required";
    }

    if (formData.duration_days < 1) {
      newErrors.duration_days = "Duration must be at least 1 day";
    }

    if (
      formData.end_date &&
      formData.start_date &&
      new Date(formData.end_date) < new Date(formData.start_date)
    ) {
      newErrors.end_date = "End date must be after start date";
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
      end_date: formData.end_date || null,
      remove_logo: removeLogoFlag,
    };

    // Show update confirmation dialog if editing
    if (editingWorkshop) {
      setPendingUpdatePayload(payload);
      setIsUpdateDialogOpen(true);
      return;
    }

    // Create new workshop (no confirmation needed)
    try {
      await workshopAPI.createWorkshop(payload);
      toast({
        title: "Success",
        description: "Workshop created successfully",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchWorkshops();
    } catch (error: any) {
      console.error("Error creating workshop:", error);

      // Handle validation errors from backend
      if (error.response?.data?.errors?.name) {
        setErrors({ name: error.response.data.errors.name[0] });
        toast({
          title: "Validation Error",
          description: error.response.data.errors.name[0],
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to create workshop",
          variant: "destructive",
        });
      }
    }
  };

  // Perform the actual update after confirmation
  const handleConfirmUpdate = async () => {
    if (!editingWorkshop || !pendingUpdatePayload) return;

    try {
      await workshopAPI.updateWorkshop(editingWorkshop.id!, pendingUpdatePayload);
      toast({
        title: "Success",
        description: "Workshop updated successfully",
      });
      setIsDialogOpen(false);
      setIsUpdateDialogOpen(false);
      setPendingUpdatePayload(null);
      resetForm();
      fetchWorkshops();
    } catch (error: any) {
      console.error("Error updating workshop:", error);

      // Handle validation errors from backend
      if (error.response?.data?.errors?.name) {
        setErrors({ name: error.response.data.errors.name[0] });
        setIsUpdateDialogOpen(false);
        toast({
          title: "Validation Error",
          description: error.response.data.errors.name[0],
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to update workshop",
          variant: "destructive",
        });
      }
    }
  };

  // Close update confirmation dialog
  const closeUpdateDialog = () => {
    setIsUpdateDialogOpen(false);
    setPendingUpdatePayload(null);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (workshop: Workshop) => {
    setWorkshopToDelete(workshop);
    setIsDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const closeDeleteDialog = () => {
    setWorkshopToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  // Delete workshop
  const handleDelete = async () => {
    if (!workshopToDelete) return;

    try {
      await workshopAPI.deleteWorkshop(workshopToDelete.id!);
      toast({
        title: "Success",
        description: "Workshop deleted successfully",
      });
      fetchWorkshops();
      closeDeleteDialog();
    } catch (error: any) {
      console.error("Error deleting workshop:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete workshop",
        variant: "destructive",
      });
    }
  };

  // Open certificate preview
  const openPreview = (workshop: Workshop) => {
    setPreviewWorkshop(workshop);
    setIsPreviewDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get date range string for display
  const getDateRangeDisplay = (workshop: Workshop) => {
    if (workshop.end_date) {
      return `${formatDate(workshop.start_date)} - ${formatDate(
        workshop.end_date
      )}`;
    }
    return formatDate(workshop.start_date);
  };

  // Using AdvancedColorPicker component from @/components/AdvancedColorPicker

  // Create a preview workshop object from form data
  const getPreviewWorkshop = (): Workshop => ({
    id: 0,
    name: formData.name || "Workshop Name",
    duration_days: formData.duration_days || 1,
    start_date: formData.start_date || new Date().toISOString().split("T")[0],
    end_date: formData.end_date,
    place: formData.place || "Location",
    description: formData.description || "",
    // Fallback to "Course Director" if empty, so preview is meaningful
    chief_trainer_title: formData.chief_trainer_title || (formData.chief_trainer_title === "" ? "Course Director" : null),
    chief_trainer_name: formData.chief_trainer_name || (formData.chief_trainer_name === "" ? "Dr. Example Name" : null),
    logo_url: logoPreview || (editingWorkshop?.logo_url) || null,
    background_color:
      formData.background_color || DEFAULT_COLORS.background_color,
    center_background_color:
      formData.center_background_color || DEFAULT_COLORS.center_background_color,
    border_color: formData.border_color,
    title_color: formData.title_color,
    name_color: formData.name_color,
    text_color: formData.text_color,
  });

  if (loading && workshops.length === 0) {
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
              Workshop Management
            </h1>
            <p className="text-muted-foreground">
              Manage workshops and customize certificates
            </p>
          </div>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Workshop</span>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Workshops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{workshops.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Total workshops
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {
                      workshops.filter(
                        (w) => new Date(w.start_date) > new Date()
                      ).length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Future workshops
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {
                      workshops.filter(
                        (w) => new Date(w.start_date) <= new Date()
                      ).length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Past workshops
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Search className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredWorkshops.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? "Matching" : "All workshops"}
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
                  placeholder="Search workshops by name, place, or description..."
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
                  {filteredWorkshops.length} of {workshops.length} workshops
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Workshops List */}
        <div className="grid grid-cols-1 gap-4">
          {paginatedWorkshops.map((workshop) => (
            <Card
              key={workshop.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  {/* Top Row - Workshop Info and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    {/* Left Section - Workshop Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${workshop.border_color}20` }}
                        >
                          <Award
                            className="h-5 w-5"
                            style={{ color: workshop.border_color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold mb-1 truncate">
                            {workshop.name}
                          </h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {workshop.duration_days} day
                              {workshop.duration_days > 1 ? "s" : ""}
                            </Badge>
                            <Badge variant="outline" className="text-xs max-w-[140px] sm:max-w-none truncate">
                              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{getDateRangeDisplay(workshop)}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs max-w-[100px] sm:max-w-none truncate">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{workshop.place}</span>
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Actions (Always visible) */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(workshop)}
                        className="gap-1.5 h-8 px-2.5 sm:px-3"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Preview</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(workshop)}
                        className="gap-1.5 h-8 px-2.5 sm:px-3"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(workshop)}
                        className="gap-1.5 h-8 px-2.5 sm:px-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Row - Description and Colors */}
                  <div className="space-y-2 pl-0 sm:pl-11">
                    {/* Description Preview */}
                    {workshop.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {workshop.description}
                      </p>
                    )}

                    {/* Color Preview */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Certificate colors:
                      </span>
                      <div className="flex gap-1">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor:
                              workshop.background_color || DEFAULT_COLORS.background_color,
                          }}
                          title="Background"
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: workshop.border_color }}
                          title="Border"
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: workshop.title_color }}
                          title="Title"
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: workshop.name_color }}
                          title="Name"
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: workshop.text_color }}
                          title="Text"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {filteredWorkshops.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredWorkshops.length)} of{" "}
              {filteredWorkshops.length} workshops
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
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
                          onClick={() => goToPage(page)}
                          className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="text-muted-foreground text-xs">
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
                className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredWorkshops.length === 0 && (
          <div className="text-center py-12">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchQuery ? (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No workshops found
                </h3>
                <p className="text-muted-foreground mb-4">
                  No workshops match your search for "{searchQuery}"
                </p>
                <Button onClick={clearSearch} variant="outline">
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No workshops yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first workshop
                </p>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workshop
                </Button>
              </>
            )}
          </div>
        )}

        {/* Workshop Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-6xl w-[95vw] sm:w-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {editingWorkshop ? "Edit Workshop" : "Create New Workshop"}
              </DialogTitle>
              <DialogDescription>
                {editingWorkshop
                  ? "Update workshop details and certificate customization"
                  : "Add a new workshop with customizable certificate"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Workshop </span>Details
                  </TabsTrigger>
                  <TabsTrigger value="certificate" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Certificate </span>Design
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Workshop Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          // Clear name error when user starts typing
                          if (errors.name) {
                            setErrors({ ...errors, name: "" });
                          }
                        }}
                        placeholder="e.g., Cupping Therapy Workshop"
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Workshop names must be unique
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration_days">Duration (Days) *</Label>
                      <Input
                        id="duration_days"
                        type="number"
                        min="1"
                        value={formData.duration_days}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_days: parseInt(e.target.value) || 1,
                          })
                        }
                        placeholder="1"
                      />
                      {errors.duration_days && (
                        <p className="text-sm text-destructive">
                          {errors.duration_days}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date *</Label>
                      <DatePicker
                        value={formData.start_date}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            start_date: value,
                          })
                        }
                        placeholder="Select start date"
                      />
                      {errors.start_date && (
                        <p className="text-sm text-destructive">
                          {errors.start_date}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">
                        End Date (Optional for multi-day workshops)
                      </Label>
                      <DatePicker
                        value={formData.end_date || ""}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            end_date: value || null,
                          })
                        }
                        placeholder="Select end date (optional)"
                        minDate={formData.start_date}
                      />
                      {errors.end_date && (
                        <p className="text-sm text-destructive">
                          {errors.end_date}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="place">Place/Location *</Label>
                      <Input
                        id="place"
                        value={formData.place}
                        onChange={(e) =>
                          setFormData({ ...formData, place: e.target.value })
                        }
                        placeholder="e.g., Kottakkal"
                      />
                      {errors.place && (
                        <p className="text-sm text-destructive">
                          {errors.place}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">
                        Description (Appears on certificate)
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="e.g., The participant has gained knowledge and skills related to cupping therapy techniques, safety protocols, and its therapeutic benefits."
                        rows={3}
                      />
                    </div>

                    {/* Signatory / Authority Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:col-span-2 border p-3 sm:p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
                      <div className="md:col-span-2 flex items-center gap-2 mb-1">
                        <PenTool className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-medium text-xs sm:text-sm">Certificate Signatory Authority</h4>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chief_trainer_title">Signatory Title (Optional)</Label>
                        <Input
                          id="chief_trainer_title"
                          value={formData.chief_trainer_title}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              chief_trainer_title: e.target.value,
                            })
                          }
                          placeholder="e.g., Course Coordinator, Chief Trainer, Director"
                        />
                        <p className="text-xs text-muted-foreground">
                          The title displayed under the signature (e.g., Course Designer)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="chief_trainer_name">Signatory Name (Optional)</Label>
                        <Input
                          id="chief_trainer_name"
                          value={formData.chief_trainer_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              chief_trainer_name: e.target.value,
                            })
                          }
                          placeholder="e.g., Dr. Name Surname"
                        />
                        <p className="text-xs text-muted-foreground">
                          The name displayed above the title
                        </p>
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Certificate Logo (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload a custom logo for the certificate. If not provided, the default KUG logo will be used.
                      </p>
                      <div className="flex items-start gap-4">
                        {/* Logo Preview */}
                        <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Image className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => logoInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {logoPreview ? "Change Logo" : "Upload Logo"}
                          </Button>
                          {logoPreview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeLogo}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Certificate Design Tab - Colors and Live Preview side by side */}
                <TabsContent value="certificate" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Left Side - Color Controls */}
                    <div className="space-y-3 sm:space-y-4 order-2 lg:order-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base sm:text-lg">Certificate Colors</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm h-8 px-2 sm:px-3"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              ...DEFAULT_COLORS,
                            })
                          }
                        >
                          Reset Colors
                        </Button>
                      </div>

                      <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-none overflow-y-auto sm:overflow-visible pr-1 sm:pr-0">
                        <AdvancedColorPicker
                          label="Background Color"
                          value={formData.background_color}
                          onChange={(value) =>
                            setFormData({ ...formData, background_color: value })
                          }
                          description="Overall certificate background"
                        />

                        <AdvancedColorPicker
                          label="Border Color"
                          value={formData.border_color}
                          onChange={(value) =>
                            setFormData({ ...formData, border_color: value })
                          }
                          description="Wavy border decoration"
                        />

                        <AdvancedColorPicker
                          label="Center Card Background"
                          value={formData.center_background_color || "#ffffff"}
                          onChange={(value) =>
                            setFormData({ ...formData, center_background_color: value })
                          }
                          description="Inner certificate card background"
                        />

                        <AdvancedColorPicker
                          label="Title Color"
                          value={formData.title_color}
                          onChange={(value) =>
                            setFormData({ ...formData, title_color: value })
                          }
                          description="'CERTIFICATE Of PARTICIPATION' text"
                        />

                        <AdvancedColorPicker
                          label="Name Color"
                          value={formData.name_color}
                          onChange={(value) =>
                            setFormData({ ...formData, name_color: value })
                          }
                          description="Participant name and decorative lines"
                        />

                        <AdvancedColorPicker
                          label="Text Color"
                          value={formData.text_color}
                          onChange={(value) =>
                            setFormData({ ...formData, text_color: value })
                          }
                          description="Body text and descriptions"
                        />
                      </div>
                    </div>

                    {/* Right Side - Live Preview */}
                    <div className="space-y-2 order-1 lg:order-2">
                      <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Live Preview
                      </h3>
                      <div className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-900 overflow-auto touch-pan-x touch-pan-y" style={{ maxHeight: "280px" }}>
                        <div className="flex justify-start sm:justify-center min-w-max">
                          <div style={{ transform: "scale(0.22)", transformOrigin: "top left" }} className="sm:!scale-[0.28] sm:!origin-top-center">
                            <style>{`
                              @media (min-width: 640px) {
                                .sm\\:\\!scale-\\[0\\.28\\] { transform: scale(0.28) !important; }
                                .sm\\:\\!origin-top-center { transform-origin: top center !important; }
                              }
                            `}</style>
                            <WorkshopTemplate
                              workshop={getPreviewWorkshop()}
                              participantName="[PARTICIPANT NAME]"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {window.innerWidth < 640 ? 'Scroll to view full preview • ' : ''}Changes are reflected instantly
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  {editingWorkshop ? "Update Workshop" : "Create Workshop"}
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workshop - Warning</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="font-semibold text-destructive">
                  This action cannot be undone.
                </p>
                <p>
                  You are about to permanently delete the workshop{" "}
                  <strong>{workshopToDelete?.name}</strong>. This will result in:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>
                    <strong>Permanent deletion</strong> of all workshop data and
                    associated information
                  </li>
                  <li>
                    <strong>Certificate template cannot be restored</strong> -
                    Once deleted, the workshop certificate design and
                    configuration will be permanently lost
                  </li>
                  <li>
                    <strong>Certificate cannot be reused</strong> - The deleted
                    workshop certificate template cannot be recovered or
                    restored for future use
                  </li>
                  <li>
                    <strong>All associated data</strong> including participant
                    records linked to this workshop will be affected
                  </li>
                </ul>
                <p className="pt-2 font-medium">
                  Are you absolutely sure you want to proceed with this
                  deletion?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteDialog}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Workshop
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
              <AlertDialogTitle>Update Workshop - Important Notice</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="font-semibold text-amber-600 dark:text-amber-500">
                  Changes will affect all instances of this workshop.
                </p>
                <p>
                  You are about to update the workshop{" "}
                  <strong>{editingWorkshop?.name}</strong>. Please be aware that
                  these changes will have system-wide impact:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm ml-2">
                  <li>
                    <strong>Certificate templates will be updated</strong> - All
                    existing and future certificates generated for this workshop
                    will reflect the new design, colors, and content
                  </li>
                  <li>
                    <strong>Student certificates will be affected</strong> - Any
                    certificates already issued or pending for this workshop will
                    use the updated template when regenerated or viewed
                  </li>
                  <li>
                    <strong>Workshop information changes everywhere</strong> -
                    Updates to name, dates, location, or description will be
                    reflected across all system modules including:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Workshop listings and management pages</li>
                      <li>Student enrollment records</li>
                      <li>Certificate generation system</li>
                      <li>Reports and analytics</li>
                      <li>Historical records and archives</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Logo changes</strong> - If you update the workshop
                    logo, all certificates using this workshop template will
                    display the new logo
                  </li>
                  <li>
                    <strong>Color scheme updates</strong> - Changes to certificate
                    colors will apply to all certificates associated with this
                    workshop, including those already generated
                  </li>
                  <li>
                    <strong>Data consistency</strong> - Ensure all changes are
                    accurate as they will propagate throughout the entire system
                  </li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    ⚠️ Recommendation: Review all changes carefully before
                    confirming. Consider creating a new workshop instead if you
                    need to preserve the original configuration.
                  </p>
                </div>
                <p className="pt-2 font-medium">
                  Do you want to proceed with updating this workshop?
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
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        >
          <DialogContent className="max-w-[98vw] sm:max-w-[95vw] w-full sm:w-fit max-h-[98vh] sm:max-h-[95vh] overflow-hidden p-3 sm:p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base sm:text-lg">Certificate Preview - {previewWorkshop?.name}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Preview of the workshop certificate template. Scroll horizontally to view full certificate on mobile.
              </DialogDescription>
            </DialogHeader>
            {previewWorkshop && (
              <div className="flex flex-col items-center">
                {/* Mobile-responsive certificate preview container */}
                <div
                  className="border rounded-lg bg-gray-50 dark:bg-gray-900 p-2 sm:p-3 overflow-auto touch-pan-x touch-pan-y"
                  style={{
                    width: 'min(calc(98vw - 24px), 920px)',
                    maxHeight: 'min(calc(98vh - 160px), 700px)',
                  }}
                >
                  {/* Mobile: smaller scale, scrollable. Desktop: larger scale */}
                  <div
                    className="flex justify-start sm:justify-center min-w-max"
                    style={{
                      transform: 'scale(var(--cert-scale, 0.35))',
                      transformOrigin: 'top left',
                    }}
                  >
                    <style>{`
                      @media (min-width: 640px) { :root { --cert-scale: 0.55; } }
                      @media (max-width: 639px) { :root { --cert-scale: 0.35; } }
                    `}</style>
                    <WorkshopTemplate
                      workshop={previewWorkshop}
                      participantName="[PARTICIPANT NAME]"
                      showDownload={true}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                  {window.innerWidth < 640 ? 'Scroll to view full certificate • ' : ''}Full resolution will be used when downloading
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Workshops;