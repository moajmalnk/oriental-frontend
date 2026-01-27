import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { OutletContextType } from "./StudentView";
import { Certificate } from "@/components/Certificate";
import { PrintPDFButtons } from "@/components/PrintPDFButtons";
import { Student, SubjectMark, Batch } from "@/types";
import api from "@/services/api";
import { useResponsive } from "@/hooks/use-responsive";
import { Award } from "lucide-react";

const StudentCertificatesTab: React.FC = () => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const {
    student,
    studentResults,
    loading,
    error,
    courseIdToName,
    batchIdToName,
    courseIdToSubjectMap,
  } = useOutletContext<OutletContextType>();

  const [allBatches, setAllBatches] = useState<Record<number, Batch>>({});
  const [loadingBatches, setLoadingBatches] = useState(true);

  // Fetch all batches to get start_date and duration_months
  useEffect(() => {
    const fetchAllBatches = async () => {
      try {
        const response = await api.get("/api/students/batches/");
        const batches = response.data as Batch[];
        const batchMap: Record<number, Batch> = {};
        batches.forEach((batch) => {
          if (batch.id) {
            batchMap[batch.id] = batch;
          }
        });
        setAllBatches(batchMap);
      } catch (error) {
        console.error("Error fetching batches:", error);
      } finally {
        setLoadingBatches(false);
      }
    };

    if (!loading) {
      fetchAllBatches();
    }
  }, [loading]);

  // Parent renders skeleton; this is a safety fallback only
  if (loading || loadingBatches) return null;
  if (error) return <div className="text-destructive">{error}</div>;
  if (!student)
    return <div className="text-muted-foreground">No student found.</div>;

  // Check if student has passed results (eligible for certificates)
  const passedResults = studentResults.filter(
    (result) =>
      result.result === "Pass" ||
      result.result === "PASS" ||
      result.result === "pass",
  );

  // If no passed results, show message
  if (passedResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-muted/30 rounded-full p-6 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <circle cx="12" cy="13" r="2" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Certificates Available
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Certificates are only available for courses with a passing result.
          Complete your courses successfully to receive certificates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Course Certificates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {passedResults.length === 1
              ? "1 certificate available"
              : `${passedResults.length} certificates available`}
          </p>
        </div>
      </div>

      {/* Certificates List */}
      <div className="space-y-12">
        {passedResults.map((result, index) => {
          // Get batch data from fetched batches (has start_date and duration_months)
          const batchData = allBatches[result.batch] ||
            student.Batch || {
              id: result.batch || 0,
              name:
                result.batch_name || batchIdToName[result.batch] || "Unknown",
              start_date: new Date().toISOString(),
              duration_months: 12,
              course: result.course || 0,
            };

          // Convert StudentMark[] to SubjectMark[] format
          const subjects: SubjectMark[] = result.marks.map((mark) => {
            const subjectInfo =
              courseIdToSubjectMap[result.course]?.[mark.subject];

            // Calculate theory total if not provided
            const theoryTotal =
              mark.theory_total ??
              ((mark.te_obtained ?? 0) + (mark.ce_obtained ?? 0) || null);

            // Calculate practical total if not provided
            const practicalTotal =
              mark.practical_total ??
              ((mark.pe_obtained ?? 0) +
                (mark.pw_obtained ?? 0) +
                (mark.pr_obtained ?? 0) +
                (mark.project_obtained ?? 0) +
                (mark.project_obtained ?? 0) +
                (mark.viva_pl_obtained ?? 0) ||
                null);

            // Calculate overall obtained if not provided
            const overallObtained =
              mark.overall_obtained ??
              ((theoryTotal ?? 0) + (practicalTotal ?? 0) || null);

            // Calculate maximum marks totals
            const theoryTotalMax =
              subjectInfo?.theory_total ??
              ((subjectInfo?.te_max ?? 0) + (subjectInfo?.ce_max ?? 0) || null);

            const practicalTotalMax =
              subjectInfo?.practical_total ??
              ((subjectInfo?.pe_max ?? 0) +
                (subjectInfo?.pw_max ?? 0) +
                (subjectInfo?.pr_max ?? 0) +
                (subjectInfo?.project_max ?? 0) +
                (subjectInfo?.viva_pl_max ?? 0) ||
                null);

            const overallTotalMax =
              subjectInfo?.overall_total ??
              ((theoryTotalMax ?? 0) + (practicalTotalMax ?? 0) || null);

            return {
              SubjectName:
                mark.subject_name || subjectInfo?.name || "Unknown Subject",
              TE: mark.te_obtained,
              CE: mark.ce_obtained,
              PE: mark.pe_obtained,
              PW: mark.pw_obtained,
              PR: mark.pr_obtained,
              Project: mark.project_obtained,
              Viva_PL: mark.viva_pl_obtained,
              PL: null, // Removed legacy PL
              TheoryTotal: theoryTotal,
              PracticalTotal: practicalTotal,
              OverallObtained: overallObtained,
              SubjectType:
                mark.pe_obtained != null ||
                mark.pw_obtained != null ||
                mark.pr_obtained != null ||
                mark.project_obtained != null ||
                mark.viva_pl_obtained != null
                  ? "Practical"
                  : "Theory",
              // Maximum scores from subject configuration
              TE_Max: subjectInfo?.te_max,
              CE_Max: subjectInfo?.ce_max,
              PE_Max: subjectInfo?.pe_max,
              PW_Max: subjectInfo?.pw_max,
              PR_Max: subjectInfo?.pr_max,
              Project_Max: subjectInfo?.project_max,
              Viva_PL_Max: subjectInfo?.viva_pl_max,
              TheoryTotal_Max: theoryTotalMax,
              PracticalTotal_Max: practicalTotalMax,
              OverallTotal_Max: overallTotalMax,
            };
          });

          // Fix photo URL to prevent double slash
          const photoPath =
            (student.Photo as string) || (student.photo as string) || "";
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
          ).replace(/\/$/, "");
          const photoUrl = photoPath
            ? photoPath.startsWith("http")
              ? photoPath
              : `${baseUrl}${
                  photoPath.startsWith("/") ? photoPath : `/${photoPath}`
                }`
            : "";

          // Create a student object for this specific result
          const certificateStudent: Student = {
            id: student.id,
            Name: student.Name || student.name || "",
            RegiNo: result.register_number || student.RegiNo || "",
            CertificateNumber:
              result.certificate_number || student.CertificateNumber || "",
            Course:
              result.course_name ||
              courseIdToName[result.course] ||
              student.Course ||
              "",
            Result: result.result || "Pass",
            PublishedDate:
              result.published_date ||
              student.PublishedDate ||
              new Date().toISOString(),
            Email: student.Email || student.email || "",
            Phone: student.Phone || student.phone || "",
            WhatsApp: student.WhatsApp || student.whatsapp_number || null,
            Photo: photoUrl || null,
            CourseType: student.CourseType || "",
            Subjects: subjects,
            Batch: batchData,
          };

          return (
            <div
              key={result.id || index}
              className="bg-card border border-border rounded-xl shadow-lg overflow-hidden"
            >
              {/* Certificate Header */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {result.course_name || "Course Certificate"}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      {result.register_number && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
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
                          <span>Reg: {result.register_number}</span>
                        </div>
                      )}
                      {result.certificate_number && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
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
                          <span>Cert: {result.certificate_number}</span>
                        </div>
                      )}
                      {result.batch_name && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
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
                          <span>{result.batch_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium border border-green-500/20">
                      ✓ Passed
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Preview */}
              {isDesktop && (
                <div className="p-6 bg-muted/20">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
                    <div className="transform scale-90 origin-top">
                      <Certificate student={certificateStudent} />
                    </div>
                  </div>
                </div>
              )}
              {/* Non-desktop message */}
              {!isDesktop && (
                <div className="mt-12">
                  <div className="bg-gradient-card rounded-2xl p-6 sm:p-8 border border-border/50 shadow-elegant backdrop-blur-sm max-w-2xl mx-auto">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        Certificate Preview Available
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        To view the certificate preview, please switch to
                        desktop view (full screen) for the best experience.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>
                          Desktop view recommended for certificate preview
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Download Buttons */}
              <div className="px-6 py-4 bg-muted/10 border-t border-border">
                <PrintPDFButtons student={certificateStudent} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex gap-3">
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
          className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            About Your Certificates
          </p>
          <p className="text-blue-700 dark:text-blue-300">
            Each certificate represents a successfully completed course. You can
            download both the certificate and mark list for each course. The
            documents are generated in high-quality PDF format suitable for
            printing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentCertificatesTab;
