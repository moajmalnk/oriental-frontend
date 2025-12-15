import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Edit,
  Trash2,
  GraduationCap,
  FileText,
  Award,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Course, Subject } from "@/types";

const CourseView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState<{
    name: string;
    short_code: string;
    duration_months: number | null;
    subjects: Subject[];
  }>({
    name: "",
    short_code: "",
    duration_months: null,
    subjects: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/course/view/${id}`);
      setCourse(response.data);
    } catch (error) {
      console.error("Error fetching course:", error);
      toast({
        title: "Error",
        description: "Failed to fetch course details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!course?.id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/course/delete/${course.id}/`);
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
      navigate("/courses");
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete course",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = () => {
    if (course) {
      setFormData({
        name: course.name,
        short_code: course.short_code,
        duration_months: course.duration_months,
        subjects:
          course.subjects.length > 0
            ? course.subjects
            : [
                {
                  name: "",
                  te_max: null,
                  ce_max: null,
                  pe_max: null,
                  pw_max: null,
                },
              ],
      });
      setIsEditDialogOpen(true);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Course name is required";
    }

    if (!formData.short_code.trim()) {
      newErrors.short_code = "Short code is required";
    }

    if (formData.duration_months && formData.duration_months <= 0) {
      newErrors.duration_months = "Duration must be a positive number";
    }

    const validSubjects = formData.subjects.filter((subject) =>
      subject.name.trim()
    );
    if (validSubjects.length === 0) {
      newErrors.subjects = "At least one subject is required";
    }

    validSubjects.forEach((subject, index) => {
      const hasTheory =
        (subject.te_max !== null && subject.te_max !== undefined) ||
        (subject.ce_max !== null && subject.ce_max !== undefined);
      const hasPractical =
        (subject.pe_max !== null && subject.pe_max !== undefined) ||
        (subject.pw_max !== null && subject.pw_max !== undefined);

      if (!hasTheory && !hasPractical) {
        newErrors[`subject_${index}`] =
          "Subject must have either theory or practical marks";
      }

      if (hasTheory && hasPractical) {
        newErrors[`subject_${index}`] =
          "Subject cannot have both theory and practical marks";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !course?.id) {
      return;
    }

    try {
      const payload = {
        ...formData,
        subjects: formData.subjects.filter((subject) => subject.name.trim()),
      };

      await api.put(`/api/course/update/${course.id}/`, payload);
      toast({
        title: "Success",
        description: "Course updated successfully",
      });
      setIsEditDialogOpen(false);
      fetchCourse(); // Refresh data
    } catch (error: any) {
      console.error("Error updating course:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.subjects ||
          "Failed to update course",
        variant: "destructive",
      });
    }
  };

  const addSubject = () => {
    setFormData({
      ...formData,
      subjects: [
        ...formData.subjects,
        { name: "", te_max: null, ce_max: null, pe_max: null, pw_max: null },
      ],
    });
  };

  const removeSubject = (index: number) => {
    if (formData.subjects.length > 1) {
      const newSubjects = formData.subjects.filter((_, i) => i !== index);
      setFormData({ ...formData, subjects: newSubjects });
    }
  };

  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const newSubjects = [...formData.subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setFormData({ ...formData, subjects: newSubjects });
  };

  const getSubjectType = (
    subject: Subject
  ): "Theory" | "Practical" | "Unknown" => {
    const hasTheory =
      (subject.te_max !== null && subject.te_max !== undefined) ||
      (subject.ce_max !== null && subject.ce_max !== undefined);
    const hasPractical =
      (subject.pe_max !== null && subject.pe_max !== undefined) ||
      (subject.pw_max !== null && subject.pw_max !== undefined);

    if (hasTheory) return "Theory";
    if (hasPractical) return "Practical";
    return "Unknown";
  };

  const getTotalMarks = (subject: Subject): number => {
    const type = getSubjectType(subject);
    if (type === "Theory") {
      return (subject.te_max || 0) + (subject.ce_max || 0);
    } else if (type === "Practical") {
      return (subject.pe_max || 0) + (subject.pw_max || 0);
    }
    return 0;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading course details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The course you're looking for doesn't exist or has been
                  removed.
                </p>
                <Button onClick={() => navigate("/courses")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/courses")}
              className="mt-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {course.name}
                </h1>
                <Badge variant="secondary" className="text-base">
                  {course.short_code}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                View and manage course details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={openEditDialog}
              variant="default"
              className="gap-2 flex-1 sm:flex-none"
            >
              <Edit className="h-4 w-4" />
              Edit Course
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

        {/* Course Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Course Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Course Name</span>
                </div>
                <p className="text-lg font-semibold">{course.name}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span className="text-sm font-medium">Short Code</span>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {course.short_code}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <p className="text-lg font-semibold">
                  {course.duration_months
                    ? `${course.duration_months} months`
                    : "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Subjects ({course.subjects.length})
              </CardTitle>
              <Badge variant="outline">
                {
                  course.subjects.filter((s) => getSubjectType(s) === "Theory")
                    .length
                }{" "}
                Theory,{" "}
                {
                  course.subjects.filter(
                    (s) => getSubjectType(s) === "Practical"
                  ).length
                }{" "}
                Practical
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {course.subjects.length > 0 ? (
                course.subjects.map((subject, index) => {
                  const subjectType = getSubjectType(subject);
                  const totalMarks = getTotalMarks(subject);

                  return (
                    <Card key={index} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">
                                {subject.name}
                              </h3>
                              <Badge
                                variant={
                                  subjectType === "Theory"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {subjectType}
                              </Badge>
                            </div>

                            {subjectType === "Theory" && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      Term End (TE)
                                    </p>
                                    <p className="text-2xl font-bold text-primary">
                                      {subject.te_max || 0}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      Continuous (CE)
                                    </p>
                                    <p className="text-2xl font-bold text-primary">
                                      {subject.ce_max || 0}
                                    </p>
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      Total Marks
                                    </p>
                                    <p className="text-2xl font-bold text-green-600">
                                      {totalMarks}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {subjectType === "Practical" && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      Practical Exam (PE)
                                    </p>
                                    <p className="text-2xl font-bold text-primary">
                                      {subject.pe_max || 0}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      Practical Work (PW)
                                    </p>
                                    <p className="text-2xl font-bold text-primary">
                                      {subject.pw_max || 0}
                                    </p>
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      Total Marks
                                    </p>
                                    <p className="text-2xl font-bold text-green-600">
                                      {totalMarks}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No subjects added yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BookOpen className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{course.subjects.length}</p>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">
                  {
                    course.subjects.filter(
                      (s) => getSubjectType(s) === "Theory"
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Theory Subjects</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Award className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">
                  {
                    course.subjects.filter(
                      (s) => getSubjectType(s) === "Practical"
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Practical Subjects
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              course <strong>{course.name}</strong> and remove all associated
              data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Course"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details and subjects
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Computer Science"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_code">Short Code *</Label>
                <Input
                  id="short_code"
                  value={formData.short_code}
                  onChange={(e) =>
                    setFormData({ ...formData, short_code: e.target.value })
                  }
                  placeholder="e.g., CS"
                />
                {errors.short_code && (
                  <p className="text-sm text-destructive">
                    {errors.short_code}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_months">Duration (Months)</Label>
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
                  placeholder="e.g., 24"
                />
                {errors.duration_months && (
                  <p className="text-sm text-destructive">
                    {errors.duration_months}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Subjects Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Subjects</h3>
                  <p className="text-sm text-muted-foreground">
                    Add subjects with either theory or practical marks (not
                    both)
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={addSubject}
                  variant="outline"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </div>

              {errors.subjects && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.subjects}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {formData.subjects.map((subject, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Subject {index + 1}</h4>
                        {formData.subjects.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubject(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`subject_name_${index}`}>
                            Subject Name *
                          </Label>
                          <Input
                            id={`subject_name_${index}`}
                            value={subject.name}
                            onChange={(e) =>
                              updateSubject(index, "name", e.target.value)
                            }
                            placeholder="e.g., Programming Fundamentals"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Theory Marks */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Theory Marks
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label
                                  htmlFor={`te_max_${index}`}
                                  className="text-xs"
                                >
                                  TE Max
                                </Label>
                                <Input
                                  id={`te_max_${index}`}
                                  type="number"
                                  value={subject.te_max || ""}
                                  onChange={(e) =>
                                    updateSubject(
                                      index,
                                      "te_max",
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`ce_max_${index}`}
                                  className="text-xs"
                                >
                                  CE Max
                                </Label>
                                <Input
                                  id={`ce_max_${index}`}
                                  type="number"
                                  value={subject.ce_max || ""}
                                  onChange={(e) =>
                                    updateSubject(
                                      index,
                                      "ce_max",
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Practical Marks */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Practical Marks
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label
                                  htmlFor={`pe_max_${index}`}
                                  className="text-xs"
                                >
                                  PE Max
                                </Label>
                                <Input
                                  id={`pe_max_${index}`}
                                  type="number"
                                  value={subject.pe_max || ""}
                                  onChange={(e) =>
                                    updateSubject(
                                      index,
                                      "pe_max",
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor={`pw_max_${index}`}
                                  className="text-xs"
                                >
                                  PW Max
                                </Label>
                                <Input
                                  id={`pw_max_${index}`}
                                  type="number"
                                  value={subject.pw_max || ""}
                                  onChange={(e) =>
                                    updateSubject(
                                      index,
                                      "pw_max",
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : null
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {errors[`subject_${index}`] && (
                          <p className="text-sm text-destructive">
                            {errors[`subject_${index}`]}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Course</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CourseView;
