import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
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
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";
import { announcementAPI } from "@/services/api";
import { Announcement, AnnouncementFormData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    message: "",
    is_active: true,
    expires_by: "",
  });
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [includeExpired, setIncludeExpired] = useState(false);
  const { toast } = useToast();
  const todayString = useMemo(() => {
    const today = new Date();

    // Set to midnight (local time) to ensure "today" is selectable
    today.setHours(0, 0, 0, 0);

    // Format it to 'YYYY-MM-DD' to match what your
    // date picker's 'parseISOLocal' function expects.
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  // Load announcements
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementAPI.getAnnouncements();
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Error loading announcements:", error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let combinedDateTime = formData.expires_by;

    if (expiryDate) {
      // e.g., "2024-10-30"
      const dateParts = expiryDate.split("-").map(Number); // [2024, 10, 30]
      let hour = 0;
      let minute = 0;

      if (expiryTime) {
        // e.g., "03:00"
        const timeParts = expiryTime.split(":").map(Number); // [3, 0]
        hour = timeParts[0];
        minute = timeParts[1];
      } else {
        // Only date provided, use current time
        const now = new Date();
        hour = now.getHours();
        minute = now.getMinutes();
      }

      // Create a LOCAL Date object
      // new Date(year, monthIndex, day, hour, minute)
      // Note: dateParts[1] - 1 because JS months are 0-indexed
      const localDate = new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        hour,
        minute
      );

      // Convert to full ISO string. This will be like:
      // "2024-10-30T03:00:00.000+05:30"
      // This tells the backend *exactly* what timezone this time is in.
      combinedDateTime = localDate.toISOString();
    }

    const submitData = {
      ...formData,
      expires_by: combinedDateTime,
    };

    try {
      if (editingAnnouncement) {
        await announcementAPI.updateAnnouncement(
          editingAnnouncement.id!,
          submitData
        );
        toast({
          title: "Success",
          description: "Announcement updated successfully",
        });
        setIsEditDialogOpen(false);
      } else {
        await announcementAPI.createAnnouncement(submitData);
        toast({
          title: "Success",
          description: "Announcement created successfully",
        });
        setIsCreateDialogOpen(false);
      }

      resetFormData();
      loadAnnouncements();
    } catch (error: any) {
      console.error("Error saving announcement:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save announcement",
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      message: announcement.message || "",
      is_active: announcement.is_active ?? true,
      expires_by: announcement.expires_by || "",
    });

    // Parse date and time from the existing datetime
    const dateTime = announcement.expires_by;

    if (dateTime && typeof dateTime === "string" && dateTime.includes("T")) {
      try {
        // --- START OF FIX ---

        // 1. Create a Date object from the UTC string.
        // This object correctly represents the single point in time.
        const date = new Date(dateTime);

        // 2. Extract the LOCAL date part (YYYY-MM-DD)
        const localYear = date.getFullYear();
        const localMonth = String(date.getMonth() + 1).padStart(2, "0");
        const localDay = String(date.getDate()).padStart(2, "0");
        setExpiryDate(`${localYear}-${localMonth}-${localDay}`);

        // 3. Extract the LOCAL time part (HH:mm)
        // .getHours() and .getMinutes() get the time in the user's local timezone.
        const localHours = date.getHours().toString().padStart(2, "0");
        const localMinutes = date.getMinutes().toString().padStart(2, "0");

        // This will be "12:00" in your timezone
        setExpiryTime(`${localHours}:${localMinutes}`);

        // --- END OF FIX ---
      } catch (error) {
        console.error("Error parsing datetime:", error);
        setExpiryDate("");
        setExpiryTime("");
      }
    } else {
      // Reset date and time if no valid datetime
      setExpiryDate("");
      setExpiryTime("");
    }

    setIsEditDialogOpen(true);
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({ message: "", is_active: true, expires_by: "" });
    setExpiryDate("");
    setExpiryTime("");
    setEditingAnnouncement(null);
  };

  // Handle create dialog open
  const handleCreateDialogOpen = (open: boolean) => {
    if (open) {
      resetFormData();
    }
    setIsCreateDialogOpen(open);
  };

  // Handle edit dialog open
  const handleEditDialogOpen = (open: boolean) => {
    if (!open) {
      resetFormData();
    }
    setIsEditDialogOpen(open);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await announcementAPI.deleteAnnouncement(deleteId);
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      setDeleteId(null);
      loadAnnouncements();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete announcement",
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if announcement is expired
  const isExpired = (expiresBy: string) => {
    return new Date(expiresBy) < new Date();
  };

  // Check if announcement is active and not expired
  const isActive = (announcement: Announcement) => {
    return announcement.is_active && !isExpired(announcement.expires_by);
  };

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return announcements.filter((a) => {
      const matchesQuery =
        q === "" || (a.message || "").toLowerCase().includes(q);
      const expired = isExpired(a.expires_by);
      const passesExpiry = includeExpired ? true : !expired;
      return matchesQuery && passesExpiry;
    });
  }, [announcements, searchQuery, includeExpired]);

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage system announcements
            </p>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={handleCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Create Announcement</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] mx-2 sm:mx-4">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Create New Announcement
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Create a new announcement that will be displayed to users.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="message">Message</Label>
                    <Input
                      id="message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="Enter announcement message"
                      maxLength={50}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expires_by">Expires By</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <DatePicker
                        value={expiryDate}
                        onChange={(value) => setExpiryDate(value)}
                        placeholder="Select date"
                        minDate={todayString}
                      />
                      <TimePicker
                        value={expiryTime}
                        onChange={(value) => setExpiryTime(value)}
                        placeholder="Select time"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreateDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    Create Announcement
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
          <Input
            placeholder="Search by title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button
            variant="outline"
            onClick={() => setIncludeExpired((v) => !v)}
            className="w-full sm:w-auto"
          >
            {includeExpired ? "Hide expired" : "Show expired"}
          </Button>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-[425px] mx-2 sm:mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Edit Announcement
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Update the announcement details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-message">Message</Label>
                  <Input
                    id="edit-message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    placeholder="Enter announcement message"
                    maxLength={50}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-expires_by">Expires By</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <DatePicker
                      value={expiryDate}
                      onChange={(value) => setExpiryDate(value)}
                      placeholder="Select Expiry Date"
                      minDate={todayString}
                    />
                    <TimePicker
                      value={expiryTime}
                      onChange={(value) => setExpiryTime(value)}
                      placeholder="Select Expiry Time"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="edit-is_active">Active</Label>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEditDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Update Announcement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteId !== null}
          onOpenChange={() => setDeleteId(null)}
        >
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md mx-2 sm:mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base">
                This action cannot be undone. This will permanently delete the
                announcement.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => setDeleteId(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Announcements List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {announcements.length === 0
                  ? "No announcements"
                  : "No announcements match your filters"}
              </h3>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-center">
                  Create your first announcement to get started.
                </p>
              ) : (
                <p className="text-muted-foreground text-center">
                  Try adjusting your search or showing expired.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg leading-tight">
                        {announcement.message}
                      </CardTitle>
                      <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs sm:text-sm">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            Expires: {formatDate(announcement.expires_by)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-xs sm:text-sm">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            Created: {formatDate(announcement.created_at!)}
                          </span>
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <Badge
                        variant={
                          isActive(announcement)
                            ? "default"
                            : isExpired(announcement.expires_by)
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs sm:text-sm"
                      >
                        {isActive(announcement)
                          ? "Active"
                          : isExpired(announcement.expires_by)
                          ? "Expired"
                          : "Inactive"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(announcement)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(announcement.id!)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Announcements;
