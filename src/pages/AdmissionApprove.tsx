import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, ShieldAlert, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface Admission {
  id: number;
  full_name: string;
  email: string;
  study_center?: string | null;
  course?: number | null;
  register_number?: string | null;
}

const AdmissionApprove = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalFormData, setApprovalFormData] = useState({
    study_center: "",
    course: "",
    register_number: "",
    batch: "",
  });
  const [courses, setCourses] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [batches, setBatches] = useState<
    Array<{ id: number; name: string; course: number }>
  >([]);
  const [filteredBatches, setFilteredBatches] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAdmission();
    }
    fetchCourses();
    fetchBatches();
  }, [id]);

  useEffect(() => {
    if (approvalFormData.course) {
      const courseId = parseInt(approvalFormData.course);
      const filtered = batches
        .filter((batch) => batch.course === courseId)
        .map((batch) => ({ id: batch.id, name: batch.name }));
      setFilteredBatches(filtered);
    } else {
      setFilteredBatches([]);
    }
  }, [approvalFormData.course, batches]);

  const fetchAdmission = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/admissions/detail/${id}/`);
      setAdmission(response.data);
      setApprovalFormData((prev) => ({
        ...prev,
        study_center: response.data.study_center || "",
        course: response.data.course ? response.data.course.toString() : "",
        register_number: response.data.register_number || "",
      }));
    } catch (err: any) {
      console.error("Error fetching admission:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load admission for approval"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get("/api/course/list/");
      setCourses(response.data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await api.get("/api/students/batches/");
      setBatches(response.data);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!id) return;

    if (!approvalFormData.register_number.trim()) {
      toast({
        title: "Validation Error",
        description: "Register number is required",
        variant: "destructive",
      });
      return;
    }

    if (!approvalFormData.course) {
      toast({
        title: "Validation Error",
        description: "Course is required",
        variant: "destructive",
      });
      return;
    }

    if (!approvalFormData.batch) {
      toast({
        title: "Validation Error",
        description: "Batch is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsApproving(true);
      await api.post(`/api/admissions/approve/${id}/`, approvalFormData);
      toast({
        title: "Success",
        description:
          "Admission approved successfully. Student and unpublished result created.",
      });
      navigate(`/admission-view/${id}`);
    } catch (error: any) {
      console.error("Error approving admission:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to approve admission",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-6 px-4 max-w-4xl">
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
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          <div className="text-center space-y-4 py-12">
            <p className="text-destructive">
              {error || "Admission not found for approval."}
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/admission-view/${id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admission
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admission-view/${admission.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admission
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-2">
              Approve Admission
              <span className="text-base font-normal text-muted-foreground">
                {admission.full_name}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-dashed border-primary/20 bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4" />
                  Applicant
                </div>
                <p className="mt-2 text-base font-medium">
                  {admission.full_name}
                </p>
                <p className="text-sm text-muted-foreground">{admission.email}</p>
              </div>
              <div className="rounded-lg border border-dashed border-primary/20 bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  Current Assignment
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Study Center:{" "}
                  <span className="font-medium text-foreground">
                    {admission.study_center || "Not set"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Course ID:{" "}
                  <span className="font-medium text-foreground">
                    {admission.course || "Not set"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Register No:{" "}
                  <span className="font-medium text-foreground">
                    {admission.register_number || "Not assigned"}
                  </span>
                </p>
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>What happens next?</AlertTitle>
              <AlertDescription>
                Approving will instantly create a student profile and an
                unpublished student result. The result stays powerless—hidden
                from transcripts and reports—until you explicitly publish it
                later.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="study_center">Study Center</Label>
                <Input
                  id="study_center"
                  value={approvalFormData.study_center}
                  onChange={(e) =>
                    setApprovalFormData((prev) => ({
                      ...prev,
                      study_center: e.target.value,
                    }))
                  }
                  placeholder="Enter study center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">
                  Course <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={approvalFormData.course}
                  onValueChange={(value) =>
                    setApprovalFormData((prev) => ({
                      ...prev,
                      course: value,
                      batch: "",
                    }))
                  }
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch">
                  Batch <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={approvalFormData.batch}
                  onValueChange={(value) =>
                    setApprovalFormData((prev) => ({ ...prev, batch: value }))
                  }
                  disabled={
                    !approvalFormData.course || filteredBatches.length === 0
                  }
                >
                  <SelectTrigger id="batch">
                    <SelectValue
                      placeholder={
                        !approvalFormData.course
                          ? "Select course first"
                          : filteredBatches.length === 0
                          ? "No batches available"
                          : "Select batch"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBatches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id.toString()}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register_number">
                  Register Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="register_number"
                  value={approvalFormData.register_number}
                  onChange={(e) =>
                    setApprovalFormData((prev) => ({
                      ...prev,
                      register_number: e.target.value,
                    }))
                  }
                  placeholder="Enter register number"
                />
              </div>
            </div>
          </CardContent>
          <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/admission-view/${admission.id}`)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button onClick={handleApprovalSubmit} disabled={isApproving}>
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Admission"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdmissionApprove;

