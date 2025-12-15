import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Download, ArrowLeft, Home } from "lucide-react";
import api from "@/services/api";
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
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

function AdmissionThankYou() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  useEffect(() => {
    const fetchAdmission = async () => {
      if (!id) {
        setError("Admission ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/admissions/public/detail/${id}/`);
        setAdmission(response.data);
      } catch (error: any) {
        console.error("Error fetching admission:", error);
        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load admission details"
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

    fetchAdmission();
  }, [id, toast]);

  // Generate PDF
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading admission details...</p>
        </div>
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || "Admission not found"}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/")} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
              <Button onClick={() => navigate("/admission")} variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-3xl">Thank You!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">
              Your admission form has been submitted successfully
            </p>
            <p className="text-muted-foreground">
              We have received your application for admission. Your application
              ID is <strong>{admission.id}</strong>.
            </p>
            {/* <p className="text-muted-foreground">
              You will receive a confirmation email at{" "}
              <strong>{admission.email}</strong> shortly.
            </p> */}
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Download a copy of your submitted admission form
              </p>
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                size="lg"
                className="w-full sm:w-auto"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Admission Form PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
            <Button
              onClick={() => navigate("/admission")}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Submit Another Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdmissionThankYou;
