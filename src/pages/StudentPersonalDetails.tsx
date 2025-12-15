import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { OutletContextType } from "./StudentView";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Student, StudentFormData } from "@/types";

const StudentPersonalDetails: React.FC = () => {
  const { student, loading, error, refreshStudent } =
    useOutletContext<OutletContextType>();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State from Students.tsx
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  // Parent renders skeleton; this is a safety fallback only
  if (loading) return null;
  if (error) return <div className="text-destructive">{error}</div>;
  if (!student)
    return <div className="text-muted-foreground">No student found.</div>;

  // Get photo URL and prepend API base URL if needed
  const photoPath =
    (student.photo as string) || (student.Photo as string) || "";
  const baseUrl = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
  const photoUrl = photoPath
    ? photoPath.startsWith("http")
      ? photoPath
      : `${baseUrl}${photoPath.startsWith("/") ? photoPath : `/${photoPath}`}`
    : "";

  // Open dialog for edit
  const openDialog = () => {
    setFormData({
      name: student.name || student.Name || "",
      email: student.email || student.Email || "",
      phone: student.phone || student.Phone || "",
      whatsapp_number: student.whatsapp_number || student.WhatsApp || "",
      photo: null,
    });
    setErrors({});
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

      await api.put(
        `/api/students/students/update/${student.id}/`,
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

      setIsDialogOpen(false);
      await refreshStudent();
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
    try {
      setIsDeleting(true);
      await api.delete(`/api/students/students/delete/${student.id}/`);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      // Navigate back to students list
      navigate("/students");
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

  return (
    <div className="space-y-6">
      {/* Header Card with Photo and Quick Actions */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <OptimizedImage
                src={photoUrl}
                alt="Student"
                className="h-24 w-24 object-cover rounded-full border-4 border-background shadow-lg ring-2 ring-primary/20"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-background shadow-lg ring-2 ring-primary/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {(student.name || student.Name || "S")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {student.name || student.Name}
              </h2>
              {(student.email || student.Email) && (
                <p className="text-sm text-muted-foreground">
                  {student.email || student.Email}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={openDialog}
              className="flex-1 sm:flex-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit Profile
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="bg-card shadow-sm rounded-xl p-6 border border-border">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3 className="text-lg font-semibold text-foreground">
            Contact Information
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
            label="Full Name"
            value={student.name || student.Name}
          />
          <DetailCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            }
            label="Email Address"
            value={student.email || student.Email}
          />
          <DetailCard
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            }
            label="Phone Number"
            value={student.phone || student.Phone}
          />
          {(student.whatsapp_number || student.WhatsApp) && (
            <DetailCard
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              label="WhatsApp"
              value={student.whatsapp_number || student.WhatsApp || ""}
            />
          )}
        </div>
      </div>

      {/* Academic Information Section */}
      {(student.RegiNo ||
        student.CertificateNumber ||
        student.Course ||
        student.Batch?.name ||
        student.PublishedDate) && (
        <div className="bg-card shadow-sm rounded-xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <h3 className="text-lg font-semibold text-foreground">
              Academic Information
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {student.RegiNo && (
              <DetailCard
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  </svg>
                }
                label="Registration Number"
                value={student.RegiNo}
              />
            )}
            {student.CertificateNumber && (
              <DetailCard
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <circle cx="12" cy="13" r="2" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  </svg>
                }
                label="Certificate Number"
                value={student.CertificateNumber}
              />
            )}
            {student.Course && (
              <DetailCard
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                }
                label="Course"
                value={student.Course}
              />
            )}
            {student.Batch?.name && (
              <DetailCard
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
                label="Batch"
                value={student.Batch.name}
              />
            )}
            {student.PublishedDate && (
              <DetailCard
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                }
                label="Published Date"
                value={new Date(student.PublishedDate).toLocaleDateString()}
              />
            )}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Edit Student
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Update student information
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
                    Updating...
                  </>
                ) : (
                  "Update Student"
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
              student <strong>{student.name || student.Name}</strong> and remove
              all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel
              onClick={() => {
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
    </div>
  );
};

const DetailCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
}) => (
  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors">
    <div className="mt-0.5 text-primary opacity-70">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground break-words">
        {value ?? "-"}
      </div>
    </div>
  </div>
);

export default StudentPersonalDetails;
