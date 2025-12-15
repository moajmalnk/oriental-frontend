import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Upload, Image as ImageIcon, X } from "lucide-react";

// Blood groups array
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Kerala districts array
const keralaDistricts = [
  "Alappuzha",
  "Ernakulam",
  "Idukki",
  "Kannur",
  "Kasaragod",
  "Kollam",
  "Kottayam",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Pathanamthitta",
  "Thiruvananthapuram",
  "Thrissur",
  "Wayanad",
];

// Gender options
const genders = ["male", "female", "other"];

// Marital status options
const maritalStatuses = ["single", "married"];

const formGuidelines = [
  "Keep clear digital copies of your passport-size photo and signature (JPEG/PNG, <10MB).",
  "Use an active email address and phone number so we can send you updates.",
  "Enter names and numbers exactly as they appear on your official documents.",
  "Double-check your address details; this is where we will send physical communication.",
];

const sectionOverview = [
  {
    step: "01",
    title: "Personal Information",
    description: "Tell us who you are and upload your recent photograph.",
  },
  {
    step: "02",
    title: "Address Details",
    description: "Share the address where you can reliably receive mail.",
  },
  {
    step: "03",
    title: "Qualifying Exam",
    description:
      "Provide your latest academic credentials and signature sample.",
  },
];

type SectionHeaderContentProps = {
  step: string;
  title: string;
  description: string;
};

const SectionHeaderContent = ({
  step,
  title,
  description,
}: SectionHeaderContentProps) => (
  <div className="flex flex-wrap items-start gap-4">
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
      {step}
    </span>
    <div>
      <CardTitle className="text-xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  </div>
);

// Zod schema for form validation
const admissionFormSchema = z.object({
  // Personal Information
  fullName: z.string().min(1, "Full name is required"),
  aadharNo: z
    .string()
    .min(12, "Aadhar number must be 12 digits")
    .max(12, "Aadhar number must be 12 digits")
    .regex(/^\d+$/, "Aadhar number must contain only digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  email: z.string().email("Invalid email address"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Gender is required",
  }),
  maritalStatus: z.enum(["single", "married"], {
    required_error: "Marital status is required",
  }),
  guardianName: z.string().min(1, "Guardian name is required"),
  religion: z.string().min(1, "Religion is required"),
  bloodGroup: z.enum(
    ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as [string, ...string[]],
    {
      required_error: "Blood group is required",
    }
  ),
  contactNo1: z
    .string()
    .min(10, "Contact number must be at least 10 digits")
    .regex(/^\d+$/, "Contact number must contain only digits"),
  contactNo2: z
    .string()
    .regex(/^\d*$/, "Contact number must contain only digits")
    .optional(),
  profession: z.string().min(1, "Profession is required"),
  studentPhoto: z
    .any()
    .refine((file) => file instanceof File, {
      message: "Student photo is required",
    })
    .refine(
      (file) => {
        if (!(file instanceof File)) return false;
        const validImageTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp",
        ];
        return validImageTypes.includes(file.type);
      },
      {
        message: "Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP)",
      }
    )
    .refine(
      (file) => {
        if (!(file instanceof File)) return false;
        return file.size <= 10 * 1024 * 1024;
      },
      {
        message: "File size must be less than 10MB",
      }
    ),
  // Address
  presentAddress: z.string().min(1, "Present address is required"),
  city: z.string().min(1, "City is required"),
  district: z.enum(
    [
      "Alappuzha",
      "Ernakulam",
      "Idukki",
      "Kannur",
      "Kasaragod",
      "Kollam",
      "Kottayam",
      "Kozhikode",
      "Malappuram",
      "Palakkad",
      "Pathanamthitta",
      "Thiruvananthapuram",
      "Thrissur",
      "Wayanad",
    ] as [string, ...string[]],
    {
      required_error: "District is required",
    }
  ),
  pinCode: z
    .string()
    .min(6, "Pin code must be 6 digits")
    .max(6, "Pin code must be 6 digits")
    .regex(/^\d+$/, "Pin code must contain only digits"),
  post: z.string().min(1, "Post is required"),
  // Details of Qualifying Exam
  schoolName: z.string().min(1, "School name is required"),
  boardName: z.string().min(1, "Board name is required"),
  year: z
    .string()
    .min(1, "Year is required")
    .regex(/^\d+$/, "Year must be a number")
    .refine(
      (val) => {
        const yearNum = parseInt(val);
        return yearNum >= 1990 && yearNum <= 2030;
      },
      {
        message: "Year must be between 1990 and 2030",
      }
    ),
  studentSignature: z
    .any()
    .refine((file) => file instanceof File, {
      message: "Student signature is required",
    })
    .refine(
      (file) => {
        if (!(file instanceof File)) return false;
        const validImageTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp",
        ];
        return validImageTypes.includes(file.type);
      },
      {
        message: "Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP)",
      }
    )
    .refine(
      (file) => {
        if (!(file instanceof File)) return false;
        return file.size <= 10 * 1024 * 1024;
      },
      {
        message: "File size must be less than 10MB",
      }
    ),
});

type AdmissionFormValues = z.infer<typeof admissionFormSchema>;

function AdmissionForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      fullName: "",
      aadharNo: "",
      dateOfBirth: "",
      email: "",
      gender: undefined,
      maritalStatus: undefined,
      guardianName: "",
      religion: "",
      bloodGroup: undefined,
      contactNo1: "",
      contactNo2: "",
      profession: "",
      presentAddress: "",
      city: "",
      district: undefined,
      pinCode: "",
      post: "",
      schoolName: "",
      boardName: "",
      year: "",
      studentSignature: undefined,
      studentPhoto: undefined,
    },
  });

  // Handle signature file change
  const handleSignatureChange = (
    file: File | null,
    onChange: (value: File) => void
  ) => {
    if (!file) return;

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

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignaturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onChange(file);
  };

  // Handle drag and drop for signature
  const handleSignatureDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSignature(true);
  };

  const handleSignatureDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingSignature(false);
  };

  const handleSignatureDrop = (
    e: React.DragEvent<HTMLDivElement>,
    onChange: (value: File) => void
  ) => {
    e.preventDefault();
    setIsDraggingSignature(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSignatureChange(file, onChange);
    }
  };

  // Remove signature
  const handleRemoveSignature = (onChange: (value: undefined) => void) => {
    setSignaturePreview(null);
    onChange(undefined);
  };

  // Handle photo file change
  const handlePhotoChange = (
    file: File | null,
    onChange: (value: File) => void
  ) => {
    if (!file) return;

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

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onChange(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    onChange: (value: File) => void
  ) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePhotoChange(file, onChange);
    }
  };

  // Remove photo
  const handleRemovePhoto = (onChange: (value: undefined) => void) => {
    setPhotoPreview(null);
    onChange(undefined);
  };

  const onSubmit = async (data: AdmissionFormValues) => {
    try {
      setIsSubmitting(true);

      // Convert form data to FormData for file upload
      const formData = new FormData();
      formData.append("full_name", data.fullName);
      formData.append("aadhar_number", data.aadharNo);
      formData.append("date_of_birth", data.dateOfBirth);
      formData.append("email", data.email);
      formData.append("gender", data.gender);
      formData.append("marital_status", data.maritalStatus);
      formData.append("guardian", data.guardianName);
      formData.append("religion", data.religion);
      formData.append("blood_group", data.bloodGroup);
      formData.append("contact_no1", data.contactNo1);
      if (data.contactNo2) {
        formData.append("contact_no2", data.contactNo2);
      }
      formData.append("profession", data.profession);
      formData.append("present_address", data.presentAddress);
      formData.append("city", data.city);
      formData.append("district", data.district);
      formData.append("pin_code", data.pinCode);
      formData.append("post", data.post);
      formData.append("school_name", data.schoolName);
      formData.append("board_name", data.boardName);
      formData.append("year", data.year);
      formData.append("student_signature", data.studentSignature);
      formData.append("student_photo", data.studentPhoto);

      // Submit admission form
      const response = await api.post("/api/admissions/create/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Extract admission ID from response
      const admissionId = response.data?.id;

      if (!admissionId) {
        throw new Error("Admission ID not found in response");
      }

      // Navigate to thank you page with admission ID
      navigate(`/admission-thank-you/${admissionId}`);
    } catch (error: any) {
      console.error("Error submitting admission form:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to submit admission form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mt-1 ml-3 mb-3 hover:text-blue-500 hover:bg-transparent"
        >
          <ArrowLeft className="h-5 w-5" /> Go Back
        </Button>
        <div className="mb-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                2025 Admission Drive
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Admission Form
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Set aside a few minutes to carefully complete all sections. The
                more accurate your responses, the faster we can process your
                application.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-xl">Helpful Instructions</CardTitle>
                <CardDescription>
                  Review these quick reminders before you begin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {formGuidelines.map((tip) => (
                    <li key={tip} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Need help? Write to{" "}
                  <a
                    className="text-primary underline underline-offset-4"
                    href="mailto:info@kugoriental.com"
                  >
                    info@kugoriental.com
                  </a>{" "}
                  and we&apos;ll get back to you.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardHeader>
                <CardTitle className="text-xl">Form Sections</CardTitle>
                <CardDescription>
                  Use this checklist to track your progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-4">
                  {sectionOverview.map(({ step, title, description }) => (
                    <li
                      key={step}
                      className="flex gap-4 rounded-lg border border-border/60 bg-background p-4"
                    >
                      <span className="text-2xl font-semibold text-primary/80">
                        {step}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information Section */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/40">
                <SectionHeaderContent
                  step="01"
                  title="Personal Information"
                  description="Provide your identity and contact details exactly as they appear on your official documents."
                />
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="rounded-lg border border-dashed border-primary/20 bg-background p-4 text-sm text-muted-foreground">
                  Tip: Names should match your SSLC or equivalent certificate.
                  Upload a recent passport-size photograph with a plain
                  background.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aadharNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhar No</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter 12-digit Aadhar number"
                            maxLength={12}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select date of birth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {genders.map((gender) => (
                              <SelectItem key={gender} value={gender}>
                                {gender.charAt(0).toUpperCase() +
                                  gender.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marital Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select marital status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {maritalStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter guardian name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="religion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Religion</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter religion" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bloodGroups.map((group) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNo1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact No 1</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter contact number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNo2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact No 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter contact number"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profession</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter profession" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Student Photo Field - Full Width */}
                <FormField
                  control={form.control}
                  name="studentPhoto"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Your Photo</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {photoPreview ? (
                            <div className="relative group">
                              <div className="relative w-full max-w-xs mx-auto">
                                <div
                                  className={`relative aspect-square w-full max-w-[200px] mx-auto rounded-lg border-2 border-border overflow-hidden bg-muted/50 cursor-pointer transition-all ${
                                    isDragging
                                      ? "border-primary scale-[1.02]"
                                      : "hover:border-primary"
                                  }`}
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, onChange)}
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    {...fieldProps}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      handlePhotoChange(file, onChange);
                                    }}
                                  />
                                  <img
                                    src={photoPreview}
                                    alt="Photo preview"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Upload className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePhoto(onChange);
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-center text-muted-foreground mt-2">
                                Click the photo or drag a new one to replace
                              </p>
                            </div>
                          ) : (
                            <div
                              className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                                isDragging
                                  ? "border-primary bg-primary/5 scale-[1.02]"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, onChange)}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                {...fieldProps}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  handlePhotoChange(file, onChange);
                                }}
                              />
                              <div className="flex flex-col items-center justify-center p-8 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                  <ImageIcon className="h-8 w-8 text-primary" />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-foreground">
                                    <span className="text-primary">
                                      Click to upload
                                    </span>{" "}
                                    or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Passport-size photo (JPEG, PNG, GIF, WebP,
                                    BMP)
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Max file size: 10MB
                                  </p>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Upload className="h-4 w-4" />
                                  <span>Drop your photo here</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Address Section */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/40">
                <SectionHeaderContent
                  step="02"
                  title="Address"
                  description="Tell us where we should send official correspondence."
                />
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="rounded-lg border border-dashed border-primary/20 bg-background p-4 text-sm text-muted-foreground">
                  Use your current communication address.
                </div>
                <FormField
                  control={form.control}
                  name="presentAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Present Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter present address"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select district" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {keralaDistricts.map((district) => (
                              <SelectItem key={district} value={district}>
                                {district}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pin Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter 6-digit pin code"
                            maxLength={6}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="post"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter post" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Details of Qualifying Exam Section */}
            <Card className="shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/40">
                <SectionHeaderContent
                  step="03"
                  title="Details of Qualifying Exam"
                  description="Share information about your latest academic qualification."
                />
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="rounded-lg border border-dashed border-primary/20 bg-background p-4 text-sm text-muted-foreground">
                  Mention the board and passing year of the most recent exam you
                  completed. Upload a clear scan of your signature written in
                  blue or black ink on a{" "}
                  <strong className="text-foreground">
                    white or transparent background
                  </strong>{" "}
                  for effective printing.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter school name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="boardName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Board Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter board name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter year (1990-2030)"
                            maxLength={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Student Signature Field - Full Width */}
                <FormField
                  control={form.control}
                  name="studentSignature"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Student Signature</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {signaturePreview ? (
                            <div className="relative group">
                              <div className="relative w-full max-w-xs mx-auto">
                                <div
                                  className={`relative aspect-square w-full max-w-[200px] mx-auto rounded-lg border-2 border-border overflow-hidden bg-muted/50 cursor-pointer transition-all ${
                                    isDraggingSignature
                                      ? "border-primary scale-[1.02]"
                                      : "hover:border-primary"
                                  }`}
                                  onDragOver={handleSignatureDragOver}
                                  onDragLeave={handleSignatureDragLeave}
                                  onDrop={(e) =>
                                    handleSignatureDrop(e, onChange)
                                  }
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    {...fieldProps}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null;
                                      handleSignatureChange(file, onChange);
                                    }}
                                  />
                                  <img
                                    src={signaturePreview}
                                    alt="Signature preview"
                                    className="w-full h-full object-contain bg-white"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Upload className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSignature(onChange);
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-center text-muted-foreground mt-2">
                                Click the signature or drag a new one to replace
                              </p>
                            </div>
                          ) : (
                            <div
                              className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                                isDraggingSignature
                                  ? "border-primary bg-primary/5 scale-[1.02]"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                              onDragOver={handleSignatureDragOver}
                              onDragLeave={handleSignatureDragLeave}
                              onDrop={(e) => handleSignatureDrop(e, onChange)}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                {...fieldProps}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  handleSignatureChange(file, onChange);
                                }}
                              />
                              <div className="flex flex-col items-center justify-center p-8 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                  <ImageIcon className="h-8 w-8 text-primary" />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-foreground">
                                    <span className="text-primary">
                                      Click to upload
                                    </span>{" "}
                                    or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Signature on white/transparent background
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    (JPEG, PNG, GIF, WebP, BMP)
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Max file size: 10MB
                                  </p>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Upload className="h-4 w-4" />
                                  <span>Drop your signature here</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSignaturePreview(null);
                  setPhotoPreview(null);
                }}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}

export default AdmissionForm;
