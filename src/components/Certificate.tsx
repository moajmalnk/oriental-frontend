import React from "react";
import { Batch, Student, StudentResult } from "@/types";
import "./Certificate.css";

interface CertificateProps {
  student: Student;
  className?: string;
}

export const Certificate = ({ student, className = "" }: CertificateProps) => {
  // Determine course name based on course type
  const courseName = student.Course;
  const StartDate = new Date(student.Batch.start_date);
  const batchStartDate = StartDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
  const getEndDate = (startDate: string, durationMonths?: number | null) => {
    if (!durationMonths) return null;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    return end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  // Format the published date for display in DD-MM-YYYY format
  const displayDate = student.PublishedDate
    ? new Date(student.PublishedDate)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-")
    : new Date()
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-");

  // Get the full photo URL from backend
  const getPhotoUrl = () => {
    if (student.Photo) {
      // If Photo is already a full URL, return it
      if (student.Photo.startsWith("http")) {
        console.log("Photo is full URL:", student.Photo);
        return student.Photo;
      }
      // If it's a relative path, construct the full URL
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const fullUrl = `${baseUrl}${student.Photo}`;
      return fullUrl;
    }
    console.log("No photo available");
    return null;
  };

  return (
    <div className={`certificate-container ${className}`}>
      {/* Certificate Paper with Template Background */}
      <div className="certificate-paper">
        {/* Template Background */}
        <div className="template-background">
          <img
            src="/Course Certificate Model WEB .jpg"
            alt="Certificate Template"
            className="template-image"
            crossOrigin="anonymous"
          />
        </div>

        {/* Content Overlay */}
        <div className="certificate-content">
          {/* Reference Numbers - Positioned over template */}
          <div className="reference-numbers">
            <div className="ref-line">
              <span>Register No. :</span>
              <span className="reg-value"> {student.RegiNo}</span>
            </div>
            <div className="ref-line">
              <span>Certificate No. :</span>
              <span className="cert-value">
                {" "}
                {student.CertificateNumber || "2025" + student.RegiNo.slice(-4)}
              </span>
            </div>
          </div>

          {/* Student Photo - Positioned over template */}
          <div className="student-photo">
            <div className="photo-container">
              <img
                src={getPhotoUrl() || "/placeholder.svg"}
                alt={`${student.Name} photo`}
                className="student-photo-img"
                onError={(e) => {
                  console.log("Image load error:", e);
                  // Fallback to placeholder if photo not found
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = "flex";
                }}
              />
              <div className="photo-placeholder" style={{ display: "none" }}>
                <div className="photo-icon">👤</div>
              </div>
            </div>
          </div>

          {/* Course Conferred - Positioned over template */}
          <div className="course-conferred">
            <div className="conferral-text">The certificate of</div>
            <div className="course-name">{courseName}</div>
            <div className="conferral-text">has been conferred upon</div>
          </div>

          {/* Student Name - Centered big like the template */}
          <div className="student-name">{student.Name.toUpperCase()}</div>

          {/* Completion Statement - Positioned over template */}
          <div className="completion-statement">
            <div>
              who successfully completed the course at the Kug Oriental Academy
              of
            </div>
            <div>
              Alternative Medicines Allied Sciences Foundation from{" "}
              <strong>
                {batchStartDate} to{" "}
                {getEndDate(batchStartDate, student.Batch.duration_months)}
              </strong>
              , and passed the final examination administered by the
            </div>
            <div>
              Central Board of Examinations of the Kug Oriental Academy of
            </div>
            <div>Alternative Medicines Allied Sciences Foundation.</div>
          </div>

          {/* Bottom Row - Date, Chairman, and Controller in one row */}
          <div className="bottom-row">
            {/* Date - Positioned on left side */}
            <div className="date-section">
              <div className="date-text">Date: {displayDate}</div>
            </div>

            {/* Chairman - Positioned in center */}
            <div className="chairman-section">
              <div className="chairman-line">
                <img
                  src="/UMMER SIR SIGN.png"
                  alt="Chairman Signature"
                  className="chairman-sign"
                />
                <div className="chairman-title">Chairman</div>
              </div>
            </div>

            {/* Controller of Examination - Positioned on right side */}
            <div className="controller-section">
              <div className="controller-line">
                <img
                  src="/Nargees teacher Sign.png"
                  alt="Controller Signature"
                  className="controller-sign"
                />
                <div className="controller-title">
                  Controller <br /> of Examination
                </div>
              </div>
            </div>
          </div>

          {/* KUG Seal - Positioned below signatures */}
          <div className="kug-seal">
            <img
              src="/kug seal.png"
              alt="KUG Oriental Academy Seal"
              className="seal-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
