import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import {
  ArrowLeft,
  Calendar,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Clock,
  Loader2,
  CalendarDays,
  GraduationCap,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Batch, Course } from "@/types";

const BatchView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState<{
    name: string;
    start_date: string;
    duration_months: number | null;
    course: number;
  }>({
    name: "",
    start_date: "",
    duration_months: null,
    course: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBatchAndCourses();
  }, [id]);

  const fetchBatchAndCourses = async () => {
    try {
      setIsLoading(true);
      const [batchResponse, coursesResponse] = await Promise.all([
        api.get(`/api/students/batch-view/${id}`),
        api.get("/api/course/list/"),
      ]);

      const batchData = batchResponse.data;
      const coursesData = coursesResponse.data;

      // Enrich batch with course name
      const courseName =
        coursesData.find((course: Course) => course.id === batchData.course)
          ?.name || "Unknown Course";

      setBatch({ ...batchData, course_name: courseName });
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching batch:", error);
      toast({
        title: "Error",
        description: "Failed to fetch batch details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!batch?.id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/api/students/batches/delete/${batch.id}/`);
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
      navigate("/batches");
    } catch (error: any) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete batch",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = () => {
    if (batch) {
      setFormData({
        name: batch.name,
        start_date: batch.start_date,
        duration_months: batch.duration_months,
        course: batch.course,
      });
      setIsEditDialogOpen(true);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Batch name is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (formData.duration_months && formData.duration_months <= 0) {
      newErrors.duration_months = "Duration must be a positive number";
    }

    if (!formData.course || formData.course === 0) {
      newErrors.course = "Course is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !batch?.id) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        duration_months: formData.duration_months || null,
      };

      await api.put(`/api/students/batches/update/${batch.id}/`, payload);
      toast({
        title: "Success",
        description: "Batch updated successfully",
      });
      setIsEditDialogOpen(false);
      fetchBatchAndCourses(); // Refresh data
    } catch (error: any) {
      console.error("Error updating batch:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update batch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate end date
  const getEndDate = (
    startDate: string,
    durationMonths?: number | null
  ): string => {
    if (!durationMonths) return "Not specified";

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    return end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate progress
  const getProgress = (startDate: string, durationMonths?: number | null) => {
    if (!durationMonths) return 0;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    const now = new Date();

    if (now < start) return 0;
    if (now > end) return 100;

    const totalTime = end.getTime() - start.getTime();
    const elapsedTime = now.getTime() - start.getTime();

    return Math.round((elapsedTime / totalTime) * 100);
  };

  // Get status based on dates
  const getStatus = (startDate: string, durationMonths?: number | null) => {
    if (!durationMonths) return "active";

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    const now = new Date();

    if (now < start) return "upcoming";
    if (now > end) return "completed";
    return "active";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading batch details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Batch Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The batch you're looking for doesn't exist or has been
                  removed.
                </p>
                <Button onClick={() => navigate("/batches")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Batches
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const status = getStatus(batch.start_date, batch.duration_months);
  const progress = getProgress(batch.start_date, batch.duration_months);

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/batches")}
              className="mt-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold">{batch.name}</h1>
                <Badge
                  variant={
                    status === "active"
                      ? "default"
                      : status === "completed"
                      ? "secondary"
                      : "outline"
                  }
                  className="capitalize"
                >
                  {status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                View and manage batch details
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
              Edit Batch
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

        {/* Batch Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Batch Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Batch Name</span>
                </div>
                <p className="text-lg font-semibold">{batch.name}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Course</span>
                </div>
                <Badge variant="outline" className="text-base px-3 py-1">
                  {batch.course_name}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Start Date</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatDate(batch.start_date)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <p className="text-lg font-semibold">
                  {batch.duration_months
                    ? `${batch.duration_months} months`
                    : "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Batch Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Start Date
                    </span>
                    <span className="text-sm font-semibold">
                      {formatDate(batch.start_date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      End Date
                    </span>
                    <span className="text-sm font-semibold">
                      {getEndDate(batch.start_date, batch.duration_months)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Progress
                    </span>
                    <span className="text-sm font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {batch.duration_months && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Duration Breakdown
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {batch.duration_months}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Months
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.ceil(batch.duration_months / 12)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Years
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {Math.ceil((batch.duration_months * 30) / 7)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Approx. Weeks
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {batch.duration_months * 30}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Approx. Days
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batch Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">
                  {new Date(batch.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">Started</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <BookOpen className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{batch.course_name}</p>
                <p className="text-sm text-muted-foreground">Course Enrolled</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold capitalize">{status}</p>
                <p className="text-sm text-muted-foreground">Current Status</p>
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
              batch <strong>{batch.name}</strong> and remove all associated
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
                "Delete Batch"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Batch Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-visible">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>
              Update batch details and course assignment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Batch Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Batch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Batch 2024-1"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <DatePicker
                  value={formData.start_date}
                  onChange={(value) =>
                    setFormData({ ...formData, start_date: value })
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
                  placeholder="e.g., 12"
                />
                {errors.duration_months && (
                  <p className="text-sm text-destructive">
                    {errors.duration_months}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select
                  value={formData.course.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, course: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id!.toString()}>
                        {course.name} ({course.short_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.course && (
                  <p className="text-sm text-destructive">{errors.course}</p>
                )}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Batch"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BatchView;
