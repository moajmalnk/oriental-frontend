import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { Student, StudentResult, Subject } from "@/types";
import api from "@/services/api";

type OutletContextType = {
  student: Student | null;
  studentResults: StudentResult[];
  loading: boolean;
  error: string | null;
  courseIdToName: Record<number, string>;
  batchIdToName: Record<number, string>;
  courseIdToSubjectMap: Record<number, Record<number, Subject>>;
  refreshResults: () => Promise<void>;
  refreshStudent: () => Promise<void>;
};

const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-card text-card-foreground border border-border border-b-card rounded-t-lg shadow-sm"
      : "text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border"
  }`;

const StudentView: React.FC = () => {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [courseIdToName, setCourseIdToName] = useState<Record<number, string>>(
    {}
  );
  const [batchIdToName, setBatchIdToName] = useState<Record<number, string>>(
    {}
  );
  const [courseIdToSubjectMap, setCourseIdToSubjectMap] = useState<
    Record<number, Record<number, Subject>>
  >({});

  const refreshResults = async () => {
    try {
      const studentResultsResponse = await api.get(
        `/api/students/student-result-view-by-student-id/${id}/`
      );
      setStudentResults(studentResultsResponse.data);
    } catch (error) {
      // ignore
    }
  };

  const refreshStudent = async () => {
    try {
      const response = await api.get(`/api/students/view/${id}/`);
      setStudent(response.data);
    } catch (error: any) {
      console.error("Error refreshing student:", error);
    }
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await api.get(`/api/students/view/${id}/`);
        setStudent(response.data);
        await refreshResults();
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching student results:", error);
        setError(error?.message ?? "Failed to load");
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  // Fetch metadata (courses, batches, subjects) once per parent load
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [coursesRes, batchesRes] = await Promise.all([
          api.get("/api/course/list/"),
          api.get("/api/students/batches/"),
        ]);

        const courses = coursesRes.data as Array<{ id: number; name: string }>;
        const batches = batchesRes.data as Array<{ id: number; name: string }>;
        setCourseIdToName(
          courses.reduce((acc, c) => {
            acc[c.id] = c.name;
            return acc;
          }, {} as Record<number, string>)
        );
        setBatchIdToName(
          batches.reduce((acc, b) => {
            acc[b.id] = b.name;
            return acc;
          }, {} as Record<number, string>)
        );

        const uniqueCourseIds = Array.from(
          new Set(studentResults.map((r) => r.course).filter(Boolean))
        ) as number[];
        if (uniqueCourseIds.length === 0) return;

        const subjectEntries = await Promise.all(
          uniqueCourseIds.map(async (courseId) => {
            try {
              const resp = await api.get(`/api/course/subjects/${courseId}/`);
              const subjects = resp.data as Array<Subject & { id: number }>;
              const map = subjects.reduce((acc, s) => {
                acc[s.id!] = s as Subject;
                return acc;
              }, {} as Record<number, Subject>);
              return [courseId, map] as const;
            } catch {
              return [courseId, {} as Record<number, Subject>] as const;
            }
          })
        );

        const subjectMap: Record<number, Record<number, Subject>> = {};
        subjectEntries.forEach(([cid, map]) => {
          subjectMap[cid] = map;
        });
        setCourseIdToSubjectMap(subjectMap);
      } catch (e) {
        // ignore; children will fallback to IDs if needed
      }
    };

    fetchMeta();
    // Only re-run when the set of course IDs changes
  }, [studentResults]);

  const fullName = student?.name || student?.Name || "Student";
  const email = student?.email || student?.Email || "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header with avatar and identity */}
        {loading ? (
          <div className="mb-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-4 w-56 bg-muted rounded" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center gap-4">
              {/* <div className="h-14 w-14 rounded-full bg-muted text-foreground flex items-center justify-center text-lg font-semibold">
                {initials || "S"}
              </div> */}
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {fullName}
                </h1>
                {email && <p className="text-muted-foreground">{email}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Tabs and content container */}
        <div className="border-b border-border">
          <div className="flex gap-2 justify-center">
            <NavLink to="details" className={tabLinkClass} end>
              Personal Details
            </NavLink>
            <NavLink to="results" className={tabLinkClass}>
              Results
            </NavLink>
            <NavLink to="certificates" className={tabLinkClass}>
              Certificates
            </NavLink>
          </div>
        </div>

        {loading ? (
          <div className="bg-card rounded-b-lg rounded-tr-lg shadow p-6 mt-0 animate-pulse">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-2/5" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-20 bg-muted rounded" />
                <div className="h-20 bg-muted rounded" />
                <div className="h-20 bg-muted rounded" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-b-lg rounded-tr-lg shadow p-6 mt-0">
            <Outlet
              context={
                {
                  student,
                  studentResults,
                  loading,
                  error,
                  courseIdToName,
                  batchIdToName,
                  courseIdToSubjectMap,
                  refreshResults,
                  refreshStudent,
                } as OutletContextType
              }
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export type { OutletContextType };
export default StudentView;
