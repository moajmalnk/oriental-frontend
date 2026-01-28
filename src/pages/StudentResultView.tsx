import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  StudentResult,
  StudentResultFormData,
  Student,
  Course,
  Batch,
  Subject,
  StudentMark,
} from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  BookOpen,
  Calendar,
  Award,
  GraduationCap,
  CheckCircle,
  XCircle,
  FileText,
  Users,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

const StudentResultView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [studentResult, setStudentResult] = useState<StudentResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Data for editing
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Edit/Delete states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<StudentResultFormData>({
    student: 0,
    course: 0,
    batch: 0,
    register_number: "",
    certificate_number: "",
    result: "",
    marks: [],
    is_published: false,
    is_withheld: false,
    published_date: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch student result
  const fetchStudentResult = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/students/student-result-view/${id}`);
      setStudentResult(response.data);
    } catch (error) {
      console.error("Error fetching student result:", error);
      toast({
        title: "Error",
        description: "Failed to fetch student result details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all supporting data for editing
  const fetchSupportingData = async () => {
    try {
      const [studentsResponse, coursesResponse, batchesResponse] =
        await Promise.all([
          api.get("/api/students/students/"),
          api.get("/api/course/list/"),
          api.get("/api/students/batches/"),
        ]);

      // Handle paginated students response
      setStudents(studentsResponse.data.results || studentsResponse.data);
      setCourses(coursesResponse.data);
      setBatches(batchesResponse.data);
    } catch (error) {
      console.error("Error fetching supporting data:", error);
    }
  };

  // Fetch subjects for a course
  const fetchSubjects = async (courseId: number) => {
    try {
      const response = await api.get(`/api/course/subjects/${courseId}/`);
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    }
  };

  useEffect(() => {
    fetchStudentResult();
    fetchSupportingData();
  }, [id]);

  // Open edit dialog
  const openEditDialog = () => {
    if (!studentResult) return;

    setFormData({
      student: studentResult.student,
      course: studentResult.course,
      batch: studentResult.batch,
      register_number: studentResult.register_number,
      certificate_number: studentResult.certificate_number,
      result: studentResult.result || "",
      marks: studentResult.marks || [],
      is_published: studentResult.is_published || false,
      is_withheld: studentResult.is_withheld || false,
      published_date:
        studentResult.published_date || new Date().toISOString().split("T")[0],
    });
    fetchSubjects(studentResult.course);
    setIsEditDialogOpen(true);
  };

  // Handle course change
  const handleCourseChange = (courseId: number) => {
    setFormData({ ...formData, course: courseId, batch: 0, marks: [] });
    fetchSubjects(courseId);
  };

  // Add mark for a subject
  const addMark = (subjectId: number, subjectName: string) => {
    const existingMark = formData.marks.find(
      (mark) => mark.subject === subjectId,
    );
    if (!existingMark) {
      const newMark: StudentMark = {
        subject: subjectId,
        subject_name: subjectName,
        te_obtained: null,
        ce_obtained: null,
        pe_obtained: null,
        pw_obtained: null,
        pr_obtained: null,
        project_obtained: null,
        viva_pl_obtained: null,
      };
      setFormData({
        ...formData,
        marks: [...formData.marks, newMark],
      });
    }
  };

  // Update mark
  const updateMark = (
    subjectId: number,
    field: keyof StudentMark,
    value: number | null,
  ) => {
    const validatedValue = value !== null && value < 0 ? 0 : value;
    const updatedMarks = formData.marks.map((mark) =>
      mark.subject === subjectId ? { ...mark, [field]: validatedValue } : mark,
    );
    setFormData({ ...formData, marks: updatedMarks });
  };

  // Remove mark
  const removeMark = (subjectId: number) => {
    const updatedMarks = formData.marks.filter(
      (mark) => mark.subject !== subjectId,
    );
    setFormData({ ...formData, marks: updatedMarks });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.student || formData.student === 0) {
      newErrors.student = "Student is required";
    }

    if (!formData.course || formData.course === 0) {
      newErrors.course = "Course is required";
    }

    if (!formData.batch || formData.batch === 0) {
      newErrors.batch = "Batch is required";
    }

    if (!formData.register_number.trim()) {
      newErrors.register_number = "Register number is required";
    }

    if (!formData.certificate_number.trim()) {
      newErrors.certificate_number = "Certificate number is required";
    }

    if (formData.marks.length === 0) {
      newErrors.marks = "At least one subject mark is required";
    } else {
      formData.marks.forEach((mark, index) => {
        const hasTheory =
          mark.te_obtained !== null || mark.ce_obtained !== null;
        const hasPractical =
          mark.pe_obtained !== null ||
          mark.pw_obtained !== null ||
          mark.pr_obtained !== null ||
          mark.project_obtained !== null ||
          mark.project_obtained !== null ||
          mark.viva_pl_obtained !== null;

        if (!hasTheory && !hasPractical) {
          newErrors[`marks_${index}`] = "At least one mark is required";
        }

        if (hasTheory && hasPractical) {
          newErrors[`marks_${index}`] =
            "Cannot mix theory marks marks with practical marks";
        }
      });
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
        student: formData.student,
        course: formData.course,
        batch: formData.batch,
        register_number: formData.register_number,
        certificate_number: formData.certificate_number,
        result: formData.result || null,
        marks: formData.marks.map((mark) => ({
          subject: mark.subject,
          te_obtained: mark.te_obtained,
          ce_obtained: mark.ce_obtained,
          pe_obtained: mark.pe_obtained,
          pw_obtained: mark.pw_obtained,
          pr_obtained: mark.pr_obtained,
          project_obtained: mark.project_obtained,
          viva_pl_obtained: mark.viva_pl_obtained,
        })),
        is_published: formData.is_published || false,
        is_withheld: formData.is_withheld || false,
        published_date: formData.published_date || null,
      };

      await api.put(`/api/students/student-results/update/${id}/`, payload);
      toast({
        title: "Success",
        description: "Student result updated successfully",
      });

      setIsEditDialogOpen(false);
      fetchStudentResult(); // Refresh the data
    } catch (error: any) {
      console.error("Error updating student result:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to update student result",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/api/students/student-results/delete/${id}/`);
      toast({
        title: "Success",
        description: "Student result deleted successfully",
      });
      navigate("/student-results");
    } catch (error: any) {
      console.error("Error deleting student result:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to delete student result",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading student result...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!studentResult) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <XCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Student Result Not Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    The student result you're looking for doesn't exist or has
                    been deleted.
                  </p>
                  <Button onClick={() => navigate("/student-results")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Calculate totals for marks
  const calculateMarkTotal = (mark: StudentMark) => {
    const theoryTotal = (mark.te_obtained || 0) + (mark.ce_obtained || 0);
    const practicalTotal =
      (mark.pe_obtained || 0) +
      (mark.pw_obtained || 0) +
      (mark.pr_obtained || 0) +
      (mark.project_obtained || 0) +
      (mark.project_obtained || 0) +
      (mark.viva_pl_obtained || 0);
    return theoryTotal + practicalTotal;
  };

  const overallTotal = studentResult.marks?.reduce(
    (sum, mark) => sum + calculateMarkTotal(mark),
    0,
  );

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/student-results")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Student Result Details
              </h1>
              <p className="text-muted-foreground">
                View and manage student result information
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={openEditDialog}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
              className="gap-2 flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{studentResult.student_name}</p>
                  <p className="text-xs text-muted-foreground">Student Name</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold">{studentResult.course_name}</p>
                  <p className="text-xs text-muted-foreground">Course</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold">{studentResult.batch_name}</p>
                  <p className="text-xs text-muted-foreground">Batch</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Result Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    studentResult.result?.toLowerCase() === "pass"
                      ? "bg-green-500/10"
                      : studentResult.result?.toLowerCase() === "fail"
                        ? "bg-red-500/10"
                        : "bg-orange-500/10"
                  }`}
                >
                  {studentResult.result?.toLowerCase() === "pass" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Award className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                <div>
                  <Badge
                    variant={
                      studentResult.result?.toLowerCase() === "pass"
                        ? "default"
                        : studentResult.result?.toLowerCase() === "distinction"
                          ? "secondary"
                          : "destructive"
                    }
                    className="mb-1"
                  >
                    {studentResult.result || "No Result"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Result Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Result Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span>Register Number</span>
                  </div>
                  <p className="font-semibold pl-6">
                    {studentResult.register_number}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>Certificate Number</span>
                  </div>
                  <p className="font-semibold pl-6">
                    {studentResult.certificate_number}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Published Status</span>
                  </div>
                  <div className="pl-6">
                    {studentResult.is_published ? (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        Published
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-600"
                      >
                        Unpublished
                      </Badge>
                    )}
                  </div>
                </div>

                {studentResult.published_date && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Published Date</span>
                    </div>
                    <p className="font-semibold pl-6">
                      {new Date(
                        studentResult.published_date,
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Subjects
                    </span>
                    <Badge variant="secondary">
                      {studentResult.marks?.length || 0}
                    </Badge>
                  </div>
                </div>

                {overallTotal !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Overall Total
                    </span>
                    <Badge className="bg-green-600">{overallTotal} Marks</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Subject Marks */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Subject Marks
                </CardTitle>
                <CardDescription>
                  Detailed marks breakdown for all subjects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {studentResult.marks && studentResult.marks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">TE</TableHead>
                          <TableHead className="text-center">CE</TableHead>
                          <TableHead className="text-center">PE</TableHead>
                          <TableHead className="text-center">PW</TableHead>
                          <TableHead className="text-center">PR</TableHead>
                          <TableHead className="text-center">Proj</TableHead>
                          <TableHead className="text-center">
                            Viva & PL
                          </TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentResult.marks.map((mark, index) => {
                          const isTheory =
                            mark.te_obtained !== null ||
                            mark.ce_obtained !== null;
                          const total = calculateMarkTotal(mark);

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{mark.subject_name}</span>
                                  <Badge
                                    variant="outline"
                                    className="w-fit mt-1 text-xs"
                                  >
                                    {isTheory ? "Theory" : "Practical"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.te_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.te_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.ce_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.ce_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.pe_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.pe_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.pw_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.pw_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.pr_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.pr_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.project_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.project_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {mark.viva_pl_obtained !== null ? (
                                  <Badge variant="secondary">
                                    {mark.viva_pl_obtained}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-primary">{total}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No marks recorded for this result</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4 md:mx-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Edit Student Result
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Update student result details and marks
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="student" className="text-sm sm:text-base">
                    Student *
                  </Label>
                  <Select
                    value={formData.student.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, student: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem
                          key={student.id}
                          value={student.id!.toString()}
                        >
                          {student.name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.student && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.student}
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
                      handleCourseChange(parseInt(value))
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

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="batch" className="text-sm sm:text-base">
                    Batch *
                  </Label>
                  <Select
                    value={formData.batch.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, batch: parseInt(value) })
                    }
                    disabled={!formData.course || formData.course === 0}
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue
                        placeholder={
                          !formData.course || formData.course === 0
                            ? "Select a course first"
                            : "Select a batch"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {batches
                        .filter((batch) => batch.course === formData.course)
                        .map((batch) => (
                          <SelectItem
                            key={batch.id}
                            value={batch.id!.toString()}
                          >
                            {batch.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.batch && (
                    <p className="text-sm text-destructive">{errors.batch}</p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label
                    htmlFor="register_number"
                    className="text-sm sm:text-base"
                  >
                    Register Number *
                  </Label>
                  <Input
                    id="register_number"
                    value={formData.register_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        register_number: e.target.value,
                      })
                    }
                    placeholder="e.g., REG001"
                    className="text-sm sm:text-base"
                  />
                  {errors.register_number && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.register_number}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label
                    htmlFor="certificate_number"
                    className="text-sm sm:text-base"
                  >
                    Certificate Number *
                  </Label>
                  <Input
                    id="certificate_number"
                    value={formData.certificate_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        certificate_number: e.target.value,
                      })
                    }
                    placeholder="e.g., CERT001"
                    className="text-sm sm:text-base"
                  />
                  {errors.certificate_number && (
                    <p className="text-xs sm:text-sm text-destructive">
                      {errors.certificate_number}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="result" className="text-sm sm:text-base">
                    Result
                  </Label>
                  <Select
                    value={formData.result || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, result: value })
                    }
                  >
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pass">Pass</SelectItem>
                      <SelectItem value="Fail">Fail</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={formData.is_published}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_published: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label
                      htmlFor="is_published"
                      className="text-sm sm:text-base font-medium"
                    >
                      Published
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check this box to mark the result as published
                  </p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_withheld"
                      checked={formData.is_withheld || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_withheld: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-destructive focus:ring-destructive border-gray-300 rounded"
                    />
                    <Label
                      htmlFor="is_withheld"
                      className="text-sm sm:text-base font-medium text-destructive"
                    >
                      Withheld
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check this box to withhold the result (hides marks from
                    student)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="published_date">Published Date</Label>
                  <DatePicker
                    value={formData.published_date || ""}
                    onChange={(value) =>
                      setFormData({ ...formData, published_date: value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Select the date when the result was published
                  </p>
                </div>
              </div>

              {/* Marks Section */}
              {subjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Marks *</h3>
                    <div className="text-sm text-muted-foreground">
                      Add marks for subjects in{" "}
                      {courses.find((c) => c.id === formData.course)?.name}
                    </div>
                  </div>

                  {errors.marks && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {errors.marks}
                    </div>
                  )}

                  <div className="grid gap-4">
                    {subjects.map((subject) => {
                      const existingMark = formData.marks.find(
                        (mark) => mark.subject === subject.id,
                      );
                      return (
                        <Card key={subject.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{subject.name}</h4>
                              <div className="text-sm text-muted-foreground">
                                {subject.te_max || subject.ce_max ? (
                                  <>
                                    Theory: TE({subject.te_max || 0}) + CE(
                                    {subject.ce_max || 0})
                                  </>
                                ) : (
                                  <>
                                    Practical: PE({subject.pe_max || 0}) + PW(
                                    {subject.pw_max || 0})
                                  </>
                                )}
                              </div>
                              {errors[
                                `marks_${formData.marks.findIndex(
                                  (m) => m.subject === subject.id,
                                )}`
                              ] && (
                                <div className="text-sm text-destructive mt-1">
                                  {
                                    errors[
                                      `marks_${formData.marks.findIndex(
                                        (m) => m.subject === subject.id,
                                      )}`
                                    ]
                                  }
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant={existingMark ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (existingMark) {
                                  removeMark(subject.id!);
                                } else {
                                  addMark(subject.id!, subject.name);
                                }
                              }}
                            >
                              {existingMark ? "Remove" : "Add"}
                            </Button>
                          </div>

                          {existingMark && (
                            <div className="grid grid-cols-2 gap-3">
                              {/* Theory subjects - show TE and CE */}
                              {(subject.te_max || subject.ce_max) && (
                                <>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`te_${subject.id}`}
                                      className="text-xs"
                                    >
                                      TE (Theory Exam)
                                    </Label>
                                    <Input
                                      id={`te_${subject.id}`}
                                      type="number"
                                      value={existingMark.te_obtained || ""}
                                      onChange={(e) =>
                                        updateMark(
                                          subject.id!,
                                          "te_obtained",
                                          e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                        )
                                      }
                                      placeholder="0"
                                      min="0"
                                      max={subject.te_max || undefined}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`ce_${subject.id}`}
                                      className="text-xs"
                                    >
                                      CE (Continuous Evaluation)
                                    </Label>
                                    <Input
                                      id={`ce_${subject.id}`}
                                      type="number"
                                      value={existingMark.ce_obtained || ""}
                                      onChange={(e) =>
                                        updateMark(
                                          subject.id!,
                                          "ce_obtained",
                                          e.target.value
                                            ? parseInt(e.target.value)
                                            : null,
                                        )
                                      }
                                      placeholder="0"
                                      min="0"
                                      max={subject.ce_max || undefined}
                                    />
                                  </div>
                                </>
                              )}

                              {/* Practical subjects - show PE and PW */}
                              {(subject.pe_max ||
                                subject.pw_max ||
                                subject.pr_max ||
                                subject.project_max ||
                                subject.viva_pl_max) && (
                                <>
                                  {subject.pe_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`pe_${subject.id}`}
                                        className="text-xs"
                                      >
                                        PE (Practical Exam)
                                      </Label>
                                      <Input
                                        id={`pe_${subject.id}`}
                                        type="number"
                                        value={existingMark.pe_obtained || ""}
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "pe_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.pe_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.pw_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`pw_${subject.id}`}
                                        className="text-xs"
                                      >
                                        PW (Practical Work)
                                      </Label>
                                      <Input
                                        id={`pw_${subject.id}`}
                                        type="number"
                                        value={existingMark.pw_obtained || ""}
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "pw_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.pw_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.pr_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`pr_${subject.id}`}
                                        className="text-xs"
                                      >
                                        P.R (Practical Record)
                                      </Label>
                                      <Input
                                        id={`pr_${subject.id}`}
                                        type="number"
                                        value={existingMark.pr_obtained || ""}
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "pr_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.pr_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.project_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`project_${subject.id}`}
                                        className="text-xs"
                                      >
                                        Project
                                      </Label>
                                      <Input
                                        id={`project_${subject.id}`}
                                        type="number"
                                        value={
                                          existingMark.project_obtained || ""
                                        }
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "project_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.project_max || undefined}
                                      />
                                    </div>
                                  )}
                                  {subject.viva_pl_max && (
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`viva_pl_${subject.id}`}
                                        className="text-xs"
                                      >
                                        Viva & PL
                                      </Label>
                                      <Input
                                        id={`viva_pl_${subject.id}`}
                                        type="number"
                                        value={
                                          existingMark.viva_pl_obtained || ""
                                        }
                                        onChange={(e) =>
                                          updateMark(
                                            subject.id!,
                                            "viva_pl_obtained",
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          )
                                        }
                                        placeholder="0"
                                        min="0"
                                        max={subject.viva_pl_max || undefined}
                                      />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Result"
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
                student result for{" "}
                <strong>{studentResult?.student_name}</strong> and remove all
                associated marks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <AlertDialogCancel
                onClick={() => setIsDeleteDialogOpen(false)}
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Result"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default StudentResultView;
