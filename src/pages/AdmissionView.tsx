import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import jsPDF from "jspdf";

// Admission interface matching backend model
interface Admission {
  id: number;
  full_name: string;
  email: string;
  aadhar_number: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  guardian: string;
  religion: string;
  blood_group: string;
  contact_no1: string;
  contact_no2?: string | null;
  profession: string;
  student_photo?: string | null;
  present_address: string;
  city: string;
  district: string;
  pin_code: string;
  post: string;
  school_name: string;
  board_name: string;
  year: number;
  student_signature?: string | null;
  study_center?: string | null;
  course?: number | null;
  course_name?: string | null;
  course_code?: string | null;
  register_number?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
}

interface DetailCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
}

const DetailCard: React.FC<DetailCardProps> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="mt-1 text-muted-foreground">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-semibold text-foreground break-words">
        {value || "—"}
      </p>
    </div>
  </div>
);

function AdmissionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Get photo/signature URL
  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const baseUrl = (
      import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${baseUrl}${
      imagePath.startsWith("/") ? imagePath : `/${imagePath}`
    }`;
  };

  // Fetch admission details
  const fetchAdmission = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/admissions/detail/${id}/`);
      setAdmission(response.data);
    } catch (error: any) {
      console.error("Error fetching admission:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load admission"
      );
      toast({
        title: "Error",
        description: "Failed to load admission details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle status change (route to approval page for APPROVED, direct update for others)
  const handleStatusChange = (
    newStatus: "PENDING" | "APPROVED" | "REJECTED"
  ) => {
    if (newStatus === "APPROVED") {
      navigate(`/admission-approve/${id}`);
      return;
    }

    // Direct update for PENDING/REJECTED
    handleStatusUpdate(newStatus);
  };

  // Update status (for PENDING/REJECTED)
  const handleStatusUpdate = async (
    newStatus: "PENDING" | "APPROVED" | "REJECTED"
  ) => {
    if (!admission) return;

    try {
      setIsUpdating(true);
      // Update only the status field
      const formData = new FormData();
      formData.append("status", newStatus);

      // Include all required fields to avoid validation errors
      formData.append("full_name", admission.full_name);
      formData.append("email", admission.email);
      formData.append("aadhar_number", admission.aadhar_number);
      formData.append("date_of_birth", admission.date_of_birth);
      formData.append("gender", admission.gender);
      formData.append("marital_status", admission.marital_status);
      formData.append("guardian", admission.guardian);
      formData.append("religion", admission.religion);
      formData.append("blood_group", admission.blood_group);
      formData.append("contact_no1", admission.contact_no1);
      if (admission.contact_no2) {
        formData.append("contact_no2", admission.contact_no2);
      }
      formData.append("profession", admission.profession);
      formData.append("present_address", admission.present_address);
      formData.append("city", admission.city);
      formData.append("district", admission.district);
      formData.append("pin_code", admission.pin_code);
      formData.append("post", admission.post);
      formData.append("school_name", admission.school_name);
      formData.append("board_name", admission.board_name);
      formData.append("year", String(admission.year));

      const response = await api.put(
        `/api/admissions/update/${id}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setAdmission(response.data);
      toast({
        title: "Success",
        description: `Admission status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete admission
  const handleDelete = async () => {
    if (!admission) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/admissions/delete/${id}/`);
      toast({
        title: "Success",
        description: "Admission deleted successfully",
      });
      navigate("/admissions");
    } catch (error: any) {
      console.error("Error deleting admission:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete admission",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!admission) return;

    setIsGeneratingPDF(true);

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we create your admission form PDF...",
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Load and add admission form template background
      try {
        const templateImg = new Image();
        templateImg.crossOrigin = "anonymous";
        templateImg.src = "/admissionform.png";

        await new Promise((resolve, reject) => {
          templateImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Use higher resolution for template (300 DPI equivalent)
            const maxWidth = 3000; // ~300 DPI for A4 width
            const maxHeight = 4243.55; // ~300 DPI for A4 height
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
            // Use high quality (0.95) for template to maintain crisp details
            const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

            const compressedImg = new Image();
            compressedImg.onload = () => {
              // Scale to fit the page exactly
              const scale = Math.min(
                pdfWidth / compressedImg.width,
                pdfHeight / compressedImg.height
              );
              const finalWidth = compressedImg.width * scale;
              const finalHeight = compressedImg.height * scale;
              const x = (pdfWidth - finalWidth) / 2;
              const y = (pdfHeight - finalHeight) / 2;

              pdf.addImage(compressedImg, "PNG", x, y, finalWidth, finalHeight);
              resolve(true);
            };
            compressedImg.src = compressedDataUrl;
          };
          templateImg.onerror = reject;
        });
      } catch (error) {
        console.warn(
          "Could not load admission form template, continuing without it:",
          error
        );
      }

      // Now overlay form data on top of the template
      // Position text fields on the template - adjust these values based on actual template layout
      pdf.setTextColor(0, 0, 0);

      // Personal Information Section
      // Adjust these X and Y positions to match your template field positions
      const startX = 30; // Left margin for text fields
      let currentY = 90; // Starting Y position - adjust based on template

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Full Name
      pdf.text(admission.full_name, startX + 13, currentY);
      currentY += 8;

      // Aadhar Number
      pdf.text(admission.aadhar_number, startX + 13, currentY + 1);
      // Religion
      pdf.text(admission.religion, startX + 115, currentY + 1);
      //   currentY += 8;
      currentY += 8;

      // Date of Birth (split into DD / MM / YYYY to match template fields)
      const dob = new Date(admission.date_of_birth);
      const dobDay = dob.getDate().toString().padStart(2, "0");
      const dobMonth = (dob.getMonth() + 1).toString().padStart(2, "0");
      const dobYear = dob.getFullYear().toString();
      const dobY = currentY + 2;
      // Day digits
      pdf.text(dobDay[0], startX + 13, dobY);
      pdf.text(dobDay[1], startX + 21, dobY);
      // Month digits
      pdf.text(dobMonth[0], startX + 33, dobY);
      pdf.text(dobMonth[1], startX + 41, dobY);
      pdf.text(dobYear, startX + 53, dobY);
      currentY += 8;

      // Email
      pdf.text(admission.email, startX + 13, currentY + 3);
      // Blood Group
      pdf.text(admission.blood_group, startX + 115, currentY + 3);
      currentY += 8;

      // Gender
      if (admission.gender === "Male" || admission.gender === "male") {
        pdf.text("M", startX + 13, currentY + 4);
      } else if (
        admission.gender === "Female" ||
        admission.gender === "female"
      ) {
        pdf.text("F", startX + 39, currentY + 4);
      } else {
        return;
      }
      //   pdf.text(
      //     admission.gender.charAt(0).toUpperCase() + admission.gender.slice(1),
      //     startX,
      //     currentY
      //   );
      // Contact No 1
      pdf.text(admission.contact_no1, startX + 115, currentY + 4);
      currentY += 8;

      // Marital Status
      pdf.text(
        admission.marital_status.charAt(0).toUpperCase() +
          admission.marital_status.slice(1),
        startX + 13,
        currentY + 5
      );
      // Contact No 2 (if exists)
      if (admission.contact_no2) {
        pdf.text(admission.contact_no2, startX + 115, currentY + 5);
      }
      currentY += 8;

      // Guardian Name
      pdf.text(admission.guardian, startX + 13, currentY + 7);
      currentY += 8;
      // Profession
      pdf.text(admission.profession, startX + 115, currentY + 8);
      currentY += 10;

      // Student Photo - position on right side of form (adjust position based on template)
      const photoUrl = getImageUrl(admission.student_photo);
      if (photoUrl) {
        try {
          const photoImg = new Image();
          photoImg.crossOrigin = "anonymous";
          const photoSize = 44; // mm - adjust size based on template
          const photoX = pdfWidth - 30 - photoSize; // Right side with margin
          const photoY = 27; // Adjust Y position to match template photo location

          await new Promise((resolve) => {
            photoImg.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = photoSize * 8;
              canvas.height = (photoSize * 8 * 90) / 80;
              ctx?.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
              const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

              const compressedPhoto = new Image();
              compressedPhoto.onload = () => {
                pdf.addImage(
                  compressedPhoto,
                  "JPEG",
                  photoX + 18.5,
                  photoY,
                  photoSize,
                  photoSize * 1.2
                );
                resolve(true);
              };
              compressedPhoto.onerror = () => resolve(true);
              compressedPhoto.src = compressedDataUrl;
            };
            photoImg.onerror = () => {
              console.warn("Could not load student photo");
              resolve(true);
            };
            photoImg.src = photoUrl;
          });
        } catch (error) {
          console.warn("Could not load student photo:", error);
        }
      }

      // Address Section - adjust Y position to match template
      currentY = 176; // Reset to address section position on template
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // Present Address (single line to match template)
      const singleLineAddress = admission.present_address
        .replace(/\s+/g, ", ")
        .trim();
      pdf.text(singleLineAddress, startX + 13, currentY);
      currentY += 8;

      // City
      pdf.text(admission.city, startX + 13, currentY + 1);
      // District
      pdf.text(admission.district, startX + 115, currentY + 1);
      currentY += 8;

      // Pin Code
      pdf.text(admission.pin_code, startX + 13, currentY + 2);
      pdf.text(admission.post, startX + 115, currentY + 2);
      currentY += 8;

      // Post

      // Qualifying Exam Section - adjust Y position to match template
      currentY = 216; // Reset to qualifying exam section position on template
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      // School Name
      pdf.text(admission.school_name, startX + 13, currentY);
      currentY += 8;

      // Board Name
      pdf.text(admission.board_name, startX + 13, currentY);
      pdf.text(String(admission.year), startX + 115, currentY);
      currentY += 10;

      // Student Signature - position at bottom of form (adjust based on template)
      const signatureUrl = getImageUrl(admission.student_signature);
      if (signatureUrl) {
        try {
          const signatureImg = new Image();
          signatureImg.crossOrigin = "anonymous";
          const signWidth = 40; // mm
          const signHeight = 20; // mm
          const signX = startX + 120; // Left side or adjust to match template
          const signY = 245; // Adjust Y position to match template signature location

          await new Promise((resolve) => {
            signatureImg.onload = () => {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = signWidth * 8;
              canvas.height = signHeight * 8;
              ctx?.drawImage(signatureImg, 0, 0, canvas.width, canvas.height);
              const compressedDataUrl = canvas.toDataURL("image/png", 1.0);

              const compressedImg = new Image();
              compressedImg.onload = () => {
                pdf.addImage(
                  compressedImg,
                  "PNG",
                  signX,
                  signY,
                  signWidth,
                  signHeight
                );
                resolve(true);
              };
              compressedImg.onerror = () => resolve(true);
              compressedImg.src = compressedDataUrl;
            };
            signatureImg.onerror = () => {
              console.warn("Could not load student signature");
              resolve(true);
            };
            signatureImg.src = signatureUrl;
          });
        } catch (error) {
          console.warn("Could not load student signature:", error);
        }
      }

      // Academy seal below signature
      try {
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.src = "/kug seal.png";
        await new Promise((resolve) => {
          sealImg.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const sealWidth = 25;
            const sealHeight = 37;
            canvas.width = sealWidth * 8;
            canvas.height = sealHeight * 8;
            ctx?.drawImage(sealImg, 0, 0, canvas.width, canvas.height);
            const compressedSealUrl = canvas.toDataURL("image/png", 1.0);
            const compressedSeal = new Image();
            compressedSeal.onload = () => {
              pdf.addImage(
                compressedSeal,
                "PNG",
                startX + 120,
                255,
                sealWidth,
                sealHeight
              );
              resolve(true);
            };
            compressedSeal.onerror = () => resolve(true);
            compressedSeal.src = compressedSealUrl;
          };
          sealImg.onerror = () => {
            console.warn("Could not load academy seal");
            resolve(true);
          };
        });
      } catch (error) {
        console.warn("Error processing academy seal:", error);
      }

      // Office Use Section (Study Centre / Course details)
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const officeSectionY = 245;
      const officeRowSpacing = 8;
      const officeLeftX = startX + 13;
      const officeRightX = startX + 115;

      if (admission.study_center) {
        pdf.text(admission.study_center, officeLeftX, officeSectionY);
      }

      const officeCourseY = officeSectionY + officeRowSpacing;
      const courseCodeValue =
        admission.course_code ||
        (admission.course ? String(admission.course) : "");
      if (courseCodeValue) {
        pdf.text(courseCodeValue, officeLeftX, officeCourseY + 1);
      }

      if (admission.course_name) {
        pdf.text(admission.course_name, officeRightX, officeCourseY - 9);
      }

      const officeRegisterY = officeCourseY + officeRowSpacing;
      if (admission.register_number) {
        pdf.text(admission.register_number, officeLeftX, officeRegisterY + 12);
      }

      const officeDateY = officeRegisterY + officeRowSpacing;
      if (admission.updated_at) {
        const updatedDate = new Date(admission.updated_at);
        const updatedDay = updatedDate.getDate().toString().padStart(2, "0");
        const updatedMonth = (updatedDate.getMonth() + 1)
          .toString()
          .padStart(2, "0");
        const updatedYear = updatedDate.getFullYear().toString();
        const updatedDateStartX = startX + 12;

        pdf.text(updatedDay[0], updatedDateStartX, officeDateY + 14);
        pdf.text(updatedDay[1], updatedDateStartX + 8, officeDateY + 14);
        pdf.text(updatedMonth[0], updatedDateStartX + 20, officeDateY + 14);
        pdf.text(updatedMonth[1], updatedDateStartX + 28, officeDateY + 14);
        pdf.text(updatedYear, updatedDateStartX + 42, officeDateY + 14);
      }

      // Save the PDF
      const fileName = `${
        admission.aadhar_number
      }_${admission.full_name.replace(/\s+/g, "_")}_AdmissionForm.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Downloaded",
        description: "Your admission form has been saved successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error creating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAdmission();
    }
  }, [id]);

  // Get photo URL
  const getPhotoUrl = (photoPath: string | null | undefined): string | null => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http")) return photoPath;
    const baseUrl = (
      import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${baseUrl}${
      photoPath.startsWith("/") ? photoPath : `/${photoPath}`
    }`;
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "default";
      case "REJECTED":
        return "destructive";
      case "PENDING":
      default:
        return "secondary";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      case "PENDING":
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-6 px-4 max-w-5xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !admission) {
    return (
      <Layout>
        <div className="container mx-auto py-6 px-4 max-w-5xl">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">
              {error || "Admission not found"}
            </p>
            <Button onClick={() => navigate("/admissions")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admissions
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const photoUrl = getPhotoUrl(admission.student_photo);
  const signatureUrl = getPhotoUrl(admission.student_signature);

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Header Section */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admissions")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admissions
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <OptimizedImage
                  src={photoUrl}
                  alt={admission.full_name}
                  className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-full border-4 border-background shadow-lg ring-2 ring-primary/20"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-background shadow-lg ring-2 ring-primary/20 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">
                    {admission.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {admission.full_name}
                  </h1>
                  <Badge
                    variant={getStatusBadgeVariant(admission.status)}
                    className="gap-1"
                  >
                    {getStatusIcon(admission.status)}
                    {admission.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{admission.email}</p>
                <p className="text-sm text-muted-foreground">
                  Applied on {formatDate(admission.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={admission.status}
                onValueChange={(value) =>
                  handleStatusChange(
                    value as "PENDING" | "APPROVED" | "REJECTED"
                  )
                }
                disabled={isUpdating || admission.status === "APPROVED"}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {admission.status !== "APPROVED" && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/admission-approve/${admission.id}`)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Proceed to Approval
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailCard
                icon={<User className="h-4 w-4" />}
                label="Full Name"
                value={admission.full_name}
              />
              <DetailCard
                icon={<FileText className="h-4 w-4" />}
                label="Aadhar Number"
                value={admission.aadhar_number}
              />
              <DetailCard
                icon={<Calendar className="h-4 w-4" />}
                label="Date of Birth"
                value={formatDate(admission.date_of_birth)}
              />
              <DetailCard
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={admission.email}
              />
              <DetailCard
                icon={<User className="h-4 w-4" />}
                label="Gender"
                value={
                  admission.gender.charAt(0).toUpperCase() +
                  admission.gender.slice(1)
                }
              />
              <DetailCard
                icon={<User className="h-4 w-4" />}
                label="Marital Status"
                value={
                  admission.marital_status.charAt(0).toUpperCase() +
                  admission.marital_status.slice(1)
                }
              />
              <DetailCard
                icon={<User className="h-4 w-4" />}
                label="Guardian Name"
                value={admission.guardian}
              />
              <DetailCard
                icon={<User className="h-4 w-4" />}
                label="Religion"
                value={admission.religion}
              />
              <DetailCard
                icon={<User className="h-4 w-4" />}
                label="Blood Group"
                value={admission.blood_group}
              />
              <DetailCard
                icon={<Phone className="h-4 w-4" />}
                label="Contact No 1"
                value={admission.contact_no1}
              />
              {admission.contact_no2 && (
                <DetailCard
                  icon={<Phone className="h-4 w-4" />}
                  label="Contact No 2"
                  value={admission.contact_no2}
                />
              )}
              <DetailCard
                icon={<FileText className="h-4 w-4" />}
                label="Profession"
                value={admission.profession}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="Present Address"
                  value={admission.present_address}
                />
              </div>
              <DetailCard
                icon={<MapPin className="h-4 w-4" />}
                label="City"
                value={admission.city}
              />
              <DetailCard
                icon={<MapPin className="h-4 w-4" />}
                label="District"
                value={admission.district}
              />
              <DetailCard
                icon={<MapPin className="h-4 w-4" />}
                label="Pin Code"
                value={admission.pin_code}
              />
              <DetailCard
                icon={<MapPin className="h-4 w-4" />}
                label="Post"
                value={admission.post}
              />
            </div>
          </CardContent>
        </Card>

        {/* Details of Qualifying Exam Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Details of Qualifying Exam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <DetailCard
                icon={<FileText className="h-4 w-4" />}
                label="School Name"
                value={admission.school_name}
              />
              <DetailCard
                icon={<FileText className="h-4 w-4" />}
                label="Board Name"
                value={admission.board_name}
              />
              <DetailCard
                icon={<Calendar className="h-4 w-4" />}
                label="Year"
                value={admission.year}
              />
            </div>
            {signatureUrl && (
              <div className="mt-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Student Signature
                </p>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img
                    src={signatureUrl}
                    alt="Student Signature"
                    className="max-w-xs h-32 object-contain"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Office Use Section */}
        {(admission.study_center ||
          admission.course ||
          admission.register_number) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Office Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {admission.study_center && (
                  <DetailCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Study Center"
                    value={admission.study_center}
                  />
                )}
                {admission.course && (
                  <DetailCard
                    icon={<FileText className="h-4 w-4" />}
                    label="Course ID"
                    value={admission.course}
                  />
                )}
                {admission.register_number && (
                  <DetailCard
                    icon={<FileText className="h-4 w-4" />}
                    label="Register Number"
                    value={admission.register_number}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                admission application for <strong>{admission.full_name}</strong>{" "}
                and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="mt-10 flex justify-center">
          <Button
            size="lg"
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="min-w-[220px] justify-center"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Form PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default AdmissionView;
