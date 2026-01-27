import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import Courses from "./pages/Courses";
import Batches from "./pages/Batches";
import Students from "./pages/Students";
import StudentResults from "./pages/StudentResults";
import Announcements from "./pages/Announcements";
import StudentView from "./pages/StudentView";
import StudentPersonalDetails from "./pages/StudentPersonalDetails";
import StudentResultsTab from "./pages/StudentResultsTab";
import StudentCertificatesTab from "./pages/StudentCertificatesTab";
import CourseView from "./pages/CourseView";
import { Navigate } from "react-router-dom";
import BatchView from "./pages/BatchView";
import StudentResultView from "./pages/StudentResultView";
import AdmissionForm from "./pages/AdmissionForm";
import AdmissionThankYou from "./pages/AdmissionThankYou";
import Admissions from "./pages/Admissions";
import AdmissionView from "./pages/AdmissionView";
import AdmissionApprove from "./pages/AdmissionApprove";
import Workshops from "./pages/Workshops";
import WorkshopCertificates from "./pages/WorkshopCertificates";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route path="/admission" element={<AdmissionForm />} />
            <Route path="/admission-thank-you/:id" element={<AdmissionThankYou />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batches"
              element={
                <ProtectedRoute>
                  <Batches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-results"
              element={
                <ProtectedRoute>
                  <StudentResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute>
                  <Announcements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-view/:id"
              element={
                <ProtectedRoute>
                  <StudentView />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="details" replace />} />
              <Route path="details" element={<StudentPersonalDetails />} />
              <Route path="results" element={<StudentResultsTab />} />
              <Route path="certificates" element={<StudentCertificatesTab />} />
            </Route>
            <Route
              path="/course-view/:id"
              element={
                <ProtectedRoute>
                  <CourseView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch-view/:id"
              element={
                <ProtectedRoute>
                  <BatchView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-result-view/:id"
              element={
                <ProtectedRoute>
                  <StudentResultView />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admissions"
              element={
                <ProtectedRoute>
                  <Admissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admission-view/:id"
              element={
                <ProtectedRoute>
                  <AdmissionView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admission-approve/:id"
              element={
                <ProtectedRoute>
                  <AdmissionApprove />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workshops"
              element={
                <ProtectedRoute>
                  <Workshops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workshop-certificates"
              element={
                <ProtectedRoute>
                  <WorkshopCertificates />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
