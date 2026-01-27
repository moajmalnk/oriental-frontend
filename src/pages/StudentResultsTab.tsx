import React, { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { OutletContextType } from "./StudentView";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Student,
  Course,
  Batch,
  Subject,
  StudentMark,
  StudentResultFormData,
} from "@/types";
import { DatePicker } from "@/components/ui/date-picker";

const StudentResultsTab: React.FC = () => {
  const {
    studentResults,
    loading,
    error,
    courseIdToName,
    batchIdToName,
    courseIdToSubjectMap,
    refreshResults,
  } = useOutletContext<OutletContextType>();

  const { toast } = useToast();

  // State from StudentResults.tsx
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<any | null>(null);
  const [resultToDelete, setResultToDelete] = useState<any | null>(null);
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
    published_date: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resolvedResults = useMemo(() => {
    if (!studentResults) return [];
    return studentResults.map((r: any) => ({
      ...r,
      course_name: r.course_name || courseIdToName[r.course],
      batch_name: r.batch_name || batchIdToName[r.batch],
    }));
  }, [studentResults, courseIdToName, batchIdToName]);

  // Fetch students, courses, and batches for the edit dialog
  useEffect(() => {
    const fetchData = async () => {
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
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Fetch subjects for a course
  const fetchSubjects = async (courseId: number) => {
    // Don't fetch if courseId is invalid
    if (!courseId || courseId === 0 || isNaN(courseId)) {
      setSubjects([]);
      return;
    }

    try {
      const response = await api.get(`/api/course/subjects/${courseId}/`);
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      student: 0,
      course: 0,
      batch: 0,
      register_number: "",
      certificate_number: "",
      result: "",
      marks: [],
      is_published: false,
      published_date: new Date().toISOString().split("T")[0],
    });
    setErrors({});
    setEditingResult(null);
    setSubjects([]);
  };

  // Open dialog for edit
  const openDialog = (result: any) => {
    setEditingResult(result);
    setFormData({
      student: result.student,
      course: result.course,
      batch: result.batch,
      register_number: result.register_number,
      certificate_number: result.certificate_number,
      result: result.result || "",
      marks: result.marks || [],
      is_published: result.is_published || false,
      published_date:
        result.published_date || new Date().toISOString().split("T")[0],
    });
    fetchSubjects(result.course);
    setIsDialogOpen(true);
  };

  // Handle course change
  const handleCourseChange = (courseId: number) => {
    setFormData({ ...formData, course: courseId, batch: 0, marks: [] });
    if (courseId && courseId !== 0 && !isNaN(courseId)) {
      fetchSubjects(courseId);
    }
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
    // Ensure value is not negative
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

    // Validate marks
    if (formData.marks.length === 0) {
      newErrors.marks = "At least one subject mark is required";
    } else {
      // Validate each mark
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
          newErrors[`marks_${index}`] =
            "At least one mark (TE, CE, PE, or PW) is required";
        }

        if (hasTheory && hasPractical) {
          newErrors[`marks_${index}`] =
            "Cannot mix theory marks (TE/CE) with practical marks (PE/PW)";
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
        published_date: formData.published_date || null,
      };

      await api.put(
        `/api/students/student-results/update/${editingResult.id}/`,
        payload,
      );
      toast({
        title: "Success",
        description: "Student result updated successfully",
      });

      setIsDialogOpen(false);
      resetForm();
      await refreshResults();
    } catch (error: any) {
      console.error("Error saving student result:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error response status:", error.response?.status);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to save student result",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete result
  const handleDelete = async () => {
    if (!resultToDelete) return;

    try {
      setIsDeleting(true);
      await api.delete(
        `/api/students/student-results/delete/${resultToDelete.id}/`,
      );
      toast({
        title: "Success",
        description: "Student result deleted successfully",
      });
      setResultToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshResults();
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
    }
  };

  // Open delete confirmation
  const openDeleteConfirmation = (result: any) => {
    setResultToDelete(result);
    setIsDeleteDialogOpen(true);
  };

  // Parent renders skeleton; this is a safety fallback only
  if (loading) return null;
  if (error) return <div className="text-destructive">{error}</div>;

  if (!resolvedResults || resolvedResults.length === 0) {
    return <div className="text-muted-foreground">No results found.</div>;
  }

  const resultBadge = (text?: string | null) => {
    if (!text) return null;
    const normalized = text.toLowerCase();
    const color =
      normalized === "pass" || normalized === "passed"
        ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
        : normalized === "fail" || normalized === "failed"
          ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
          : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}
      >
        {text}
      </span>
    );
  };

  const scoreColor = (score?: number | null) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Helpers to compute totals if not provided, similar to ResultTable
  const computeTheoryTotal = (m: any) => {
    const te = typeof m.te_obtained === "number" ? m.te_obtained : 0;
    const ce = typeof m.ce_obtained === "number" ? m.ce_obtained : 0;
    return typeof m.theory_total === "number" ? m.theory_total : te + ce;
  };
  const computePracticalTotal = (m: any) => {
    const pe = typeof m.pe_obtained === "number" ? m.pe_obtained : 0;
    const pw = typeof m.pw_obtained === "number" ? m.pw_obtained : 0;
    return typeof m.practical_total === "number" ? m.practical_total : pe + pw;
  };
  const computeOverallObtained = (m: any) => {
    if (typeof m.overall_obtained === "number") return m.overall_obtained;
    return computeTheoryTotal(m) + computePracticalTotal(m);
  };
  const getOverallMax = (courseId: number, subjectId: number) => {
    const subj = courseIdToSubjectMap[courseId]?.[subjectId];
    if (typeof subj?.overall_total === "number") return subj.overall_total;
    const th = (subj?.theory_total as number | undefined) ?? 0;
    const pr = (subj?.practical_total as number | undefined) ?? 0;
    return th + pr;
  };

  return (
    <div className="space-y-6">
      {resolvedResults.map((result) => (
        <div
          key={result.id}
          className="bg-card shadow-lg rounded-lg p-5 border border-border"
        >
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <div className="flex gap-6 flex-wrap items-center">
              <Meta label="Course" value={result.course_name} />
              {result.batch_name && (
                <Meta label="Batch" value={result.batch_name} />
              )}
              <Meta label="Register No" value={result.register_number} />
              <Meta label="Certificate No" value={result.certificate_number} />
            </div>
            <div className="flex items-center gap-2">
              {resultBadge(result.result)}
              <Button
                size="sm"
                variant="outline"
                onClick={() => openDialog(result)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openDeleteConfirmation(result)}
              >
                Delete
              </Button>
            </div>
          </div>

          {Array.isArray(result.marks) && result.marks.length > 0 && (
            <div className="space-y-6">
              {result.marks.some(
                (m) =>
                  m.te_obtained != null ||
                  m.ce_obtained != null ||
                  m.theory_total != null,
              ) && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left p-4 font-semibold text-foreground min-w-[160px] text-sm">
                            Subject
                          </th>
                          {(() => {
                            const theoryMarks = result.marks.filter(
                              (m: any) =>
                                m.te_obtained != null ||
                                m.ce_obtained != null ||
                                m.theory_total != null,
                            );
                            const teMaxArr = theoryMarks
                              .map(
                                (m: any) =>
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.te_max,
                              )
                              .filter((v: any) => typeof v === "number");
                            const ceMaxArr = theoryMarks
                              .map(
                                (m: any) =>
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.ce_max,
                              )
                              .filter((v: any) => typeof v === "number");
                            const thTotalArr = theoryMarks
                              .map(
                                (m: any) =>
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.theory_total,
                              )
                              .filter((v: any) => typeof v === "number");
                            const teMax = teMaxArr.length
                              ? Math.max(...teMaxArr)
                              : undefined;
                            const ceMax = ceMaxArr.length
                              ? Math.max(...ceMaxArr)
                              : undefined;
                            const thTotalMax = thTotalArr.length
                              ? Math.max(...thTotalArr)
                              : undefined;
                            return (
                              <>
                                <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`TE(${
                                  teMax ?? "-"
                                })`}</th>
                                <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`CE(${
                                  ceMax ?? "-"
                                })`}</th>
                                <th className="text-center p-4 font-semibold text-foreground min-w-[120px] text-sm">{`Theory Total(${
                                  thTotalMax ?? "-"
                                })`}</th>
                              </>
                            );
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {result.marks
                          .filter(
                            (m) =>
                              m.te_obtained != null ||
                              m.ce_obtained != null ||
                              m.theory_total != null,
                          )
                          .map((m, idx) => (
                            <tr
                              key={m.id ?? idx}
                              className="border-b border-gray-100 dark:border-gray-800 hover:bg-muted/50"
                            >
                              <td className="p-4 font-medium text-foreground text-sm">
                                {m.subject_name ||
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.name ||
                                  "-"}
                              </td>
                              <td className="text-center p-4 font-mono text-sm text-foreground">
                                {m.te_obtained ?? "-"}
                              </td>
                              <td className="text-center p-4 font-mono text-sm text-foreground">
                                {m.ce_obtained ?? "-"}
                              </td>
                              <td
                                className={`text-center p-4 font-bold font-mono ${scoreColor(
                                  computeTheoryTotal(m),
                                )}`}
                              >
                                {computeTheoryTotal(m)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.marks.some(
                (m) =>
                  m.pe_obtained != null ||
                  m.pw_obtained != null ||
                  m.practical_total != null,
              ) && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left p-4 font-semibold text-foreground min-w-[160px] text-sm">
                            Subject
                          </th>
                          {(() => {
                            const practicalMarks = result.marks.filter(
                              (m: any) =>
                                m.pe_obtained != null ||
                                m.pw_obtained != null ||
                                m.practical_total != null,
                            );
                            const peMaxArr = practicalMarks
                              .map(
                                (m: any) =>
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.pe_max,
                              )
                              .filter((v: any) => typeof v === "number");
                            const pwMaxArr = practicalMarks
                              .map(
                                (m: any) =>
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.pw_max,
                              )
                              .filter((v: any) => typeof v === "number");
                            const prTotalArr = practicalMarks
                              .map(
                                (m: any) =>
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.practical_total,
                              )
                              .filter((v: any) => typeof v === "number");
                            const peMax = peMaxArr.length
                              ? Math.max(...peMaxArr)
                              : undefined;
                            const pwMax = pwMaxArr.length
                              ? Math.max(...pwMaxArr)
                              : undefined;
                            const prTotalMax = prTotalArr.length
                              ? Math.max(...prTotalArr)
                              : undefined;
                            return (
                              <>
                                <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`P.E(${
                                  peMax ?? "-"
                                })`}</th>
                                <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`P.W(${
                                  pwMax ?? "-"
                                })`}</th>
                                {practicalMarks.some(
                                  (m) => m.pr_obtained != null,
                                ) && (
                                  <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`P.R(${
                                    practicalMarks
                                      .map(
                                        (m: any) =>
                                          courseIdToSubjectMap[result.course]?.[
                                            m.subject as number
                                          ]?.pr_max,
                                      )
                                      .filter((v: any) => typeof v === "number")
                                      .reduce(
                                        (max, v) => (v > max ? v : max),
                                        0,
                                      ) || "-"
                                  })`}</th>
                                )}
                                {practicalMarks.some(
                                  (m) => m.project_obtained != null,
                                ) && (
                                  <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`Proj(${
                                    practicalMarks
                                      .map(
                                        (m: any) =>
                                          courseIdToSubjectMap[result.course]?.[
                                            m.subject as number
                                          ]?.project_max,
                                      )
                                      .filter((v: any) => typeof v === "number")
                                      .reduce(
                                        (max, v) => (v > max ? v : max),
                                        0,
                                      ) || "-"
                                  })`}</th>
                                )}
                                {practicalMarks.some(
                                  (m) => m.viva_pl_obtained != null,
                                ) && (
                                  <th className="text-center p-4 font-semibold text-foreground min-w-[80px] text-sm">{`Viva & PL(${
                                    practicalMarks
                                      .map(
                                        (m: any) =>
                                          courseIdToSubjectMap[result.course]?.[
                                            m.subject as number
                                          ]?.viva_pl_max,
                                      )
                                      .filter((v: any) => typeof v === "number")
                                      .reduce(
                                        (max, v) => (v > max ? v : max),
                                        0,
                                      ) || "-"
                                  })`}</th>
                                )}
                                <th className="text-center p-4 font-semibold text-foreground min-w-[120px] text-sm">{`Practical Total(${
                                  prTotalMax ?? "-"
                                })`}</th>
                              </>
                            );
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {result.marks
                          .filter(
                            (m) =>
                              m.pe_obtained != null ||
                              m.pw_obtained != null ||
                              m.practical_total != null,
                          )
                          .map((m, idx) => (
                            <tr
                              key={m.id ?? idx}
                              className="border-b border-gray-100 dark:border-gray-800 hover:bg-muted/50"
                            >
                              <td className="p-4 font-medium text-foreground text-sm">
                                {m.subject_name ||
                                  courseIdToSubjectMap[result.course]?.[
                                    m.subject as number
                                  ]?.name ||
                                  "-"}
                              </td>
                              <td className="text-center p-4 font-mono text-sm text-foreground">
                                {m.pe_obtained ?? "-"}
                              </td>
                              <td className="text-center p-4 font-mono text-sm text-foreground">
                                {m.pw_obtained ?? "-"}
                              </td>
                              {result.marks.some(
                                (mk) => mk.pr_obtained != null,
                              ) && (
                                <td className="text-center p-4 font-mono text-sm text-foreground">
                                  {m.pr_obtained ?? "-"}
                                </td>
                              )}
                              {result.marks.some(
                                (mk) => mk.project_obtained != null,
                              ) && (
                                <td className="text-center p-4 font-mono text-sm text-foreground">
                                  {m.project_obtained ?? "-"}
                                </td>
                              )}
                              {result.marks.some(
                                (mk) => mk.viva_pl_obtained != null,
                              ) && (
                                <td className="text-center p-4 font-mono text-sm text-foreground">
                                  {m.viva_pl_obtained ?? "-"}
                                </td>
                              )}
                              <td
                                className={`text-center p-4 font-bold font-mono ${scoreColor(
                                  computePracticalTotal(m),
                                )}`}
                              >
                                {computePracticalTotal(m)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(() => {
                const totalObtained = result.marks.reduce(
                  (sum: number, m: any) => sum + computeOverallObtained(m),
                  0,
                );
                const totalMax = result.marks.reduce(
                  (sum: number, m: any) =>
                    sum + getOverallMax(result.course, m.subject as number),
                  0,
                );
                return (
                  <div className="flex items-center justify-end gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        Overall Total:
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {totalObtained} / {totalMax || "-"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ))}

      {/* Student Result Form Dialog - Exact copy from StudentResults.tsx */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  disabled={true}
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
                  onValueChange={(value) => handleCourseChange(parseInt(value))}
                >
                  <SelectTrigger className="text-sm sm:text-base">
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
                        <SelectItem key={batch.id} value={batch.id!.toString()}>
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

              <div className="space-y-2">
                <Label htmlFor="published_date">Published Date</Label>
                <DatePicker
                  value={formData.published_date || ""}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      published_date: value || null,
                    })
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

                            {/* Practical subjects - show PE, PW, PR, Project, Viva, PL */}
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
                                      PR (Practical Record)
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
                                      htmlFor={`proj_${subject.id}`}
                                      className="text-xs"
                                    >
                                      Project
                                    </Label>
                                    <Input
                                      id={`proj_${subject.id}`}
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
              student result for <strong>{resultToDelete?.student_name}</strong>{" "}
              and remove all associated marks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel
              onClick={() => {
                setResultToDelete(null);
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
                "Delete Result"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Meta = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div>
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value ?? "-"}</div>
  </div>
);

const SmallMeta = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div className="flex items-center justify-between bg-muted/60 rounded px-2 py-1 border border-border">
    <span>{label}</span>
    <span className="font-semibold text-foreground">{value ?? "-"}</span>
  </div>
);

export default StudentResultsTab;
