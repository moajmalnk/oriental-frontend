/**
 * Data Service for Oriental College
 * Provides real data from backend API
 */

import { Student } from "../types";
import api from "./api";

export class DataService {
  // Get all students (authenticated endpoint)
  static async getStudents(): Promise<Student[]> {
    try {
      const response = await api.get("/api/students/students/");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch students:", error);
      throw new Error("Failed to fetch students");
    }
  }

  // Get students by course type (authenticated endpoint)
  static async getStudentsByCourseType(courseType: string): Promise<Student[]> {
    try {
      const response = await api.get("/api/students/students/");
      return response.data.filter(
        (student: any) =>
          student.CourseType === courseType ||
          student.Course?.name?.toUpperCase().includes(courseType)
      );
    } catch (error) {
      console.error(`Failed to fetch ${courseType} students:`, error);
      throw new Error(`Failed to fetch ${courseType} students`);
    }
  }

  // Get student by registration number (for public access)
  static async getStudentByRegiNo(regiNo: string): Promise<Student | null> {
    try {
      const response = await api.get(`/api/students/public/search/${regiNo}/`);
      const studentData = response.data;

      // Transform the response to match the expected format
      const transformedStudent: Student = {
        id: studentData.id,
        Name: studentData.Name,
        RegiNo: studentData.RegiNo,
        Course: studentData.Course,
        Batch: studentData.Batch,
        CertificateNumber: studentData.CertificateNumber,
        Result: studentData.Result,
        Email: studentData.Email,
        Phone: studentData.Phone,
        WhatsApp: studentData.WhatsApp,
        Photo: studentData.Photo,
        CourseType: studentData.CourseType,
        Subjects: studentData.Subjects || [],
        PublishedDate: studentData.PublishedDate || null,
      };

      return transformedStudent;
    } catch (error: any) {
      console.error("Failed to fetch student by regi no:", error);
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch student");
    }
  }

  // Get statistics for dashboard
  static async getStatistics() {
    try {
      // Fetch all students from the backend
      const response = await api.get("/api/students/students/");
      const allStudents = response.data;

      const pdaStudents = allStudents.filter(
        (s: any) =>
          s.CourseType === "PDA" ||
          s.Course?.name?.toUpperCase().includes("PDA")
      );
      const dcpStudents = allStudents.filter(
        (s: any) =>
          s.CourseType === "DCP" ||
          s.Course?.name?.toUpperCase().includes("DCP")
      );

      const totalStudents = allStudents.length;
      const pdaPassed = pdaStudents.filter(
        (s: any) => s.Result === "PASS"
      ).length;
      const dcpPassed = dcpStudents.filter(
        (s: any) => s.Result === "PASS"
      ).length;
      const totalPassed = pdaPassed + dcpPassed;

      return {
        pda: {
          total_students: pdaStudents.length,
          published_students: pdaStudents.length,
        },
        dcp: {
          total_students: dcpStudents.length,
          published_students: dcpStudents.length,
        },
        total_students: totalStudents,
        total_published: totalStudents,
        active_courses: 2, // PDA and DCP
        active_batches: 1,
      };
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
      throw new Error("Failed to fetch statistics");
    }
  }

  // Health check
  static async healthCheck() {
    try {
      return {
        status: "healthy",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Health check failed:", error);
      throw new Error("Health check failed");
    }
  }
}

export default DataService;
