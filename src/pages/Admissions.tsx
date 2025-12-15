import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  Plus,
  Search,
  X,
  Eye,
  User,
  Mail,
  Phone,
  FileText,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { AdmissionsPageSkeleton } from "@/components/skeletons/AdmissionsPageSkeleton";

// Admission interface matching backend model
interface Admission {
  id: number;
  full_name: string;
  email: string;
  aadhar_number: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  guardian: string;
  religion: string;
  blood_group: string;
  contact_no1: string;
  contact_no2?: string | null;
  profession: string;
  student_photo?: string | null;
  present_address: string;
  city: string;
  district: string;
  pin_code: string;
  post: string;
  school_name: string;
  board_name: string;
  year: number;
  student_signature?: string | null;
  study_center?: string | null;
  course?: number | null;
  register_number?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
}

function Admissions() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch admissions
  const fetchAdmissions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admissions/list/");
      setAdmissions(response.data);
    } catch (error: any) {
      console.error("Error fetching admissions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch admissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter locally for now (backend can add search later)
        const filtered = admissions.filter(
          (admission) =>
            admission.full_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            admission.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            admission.contact_no1.includes(searchQuery) ||
            admission.aadhar_number.includes(searchQuery)
        );
        // For now, we'll use all admissions and filter in component
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Get photo URL (API returns full URLs, but keep fallback for compatibility)
  const getPhotoUrl = (photoPath: string | null | undefined): string | null => {
    if (!photoPath) return null;
    // API serializer returns full URLs, so use directly
    if (photoPath.startsWith("http")) return photoPath;
    // Fallback for relative paths
    const baseUrl = (
      import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${baseUrl}${
      photoPath.startsWith("/") ? photoPath : `/${photoPath}`
    }`;
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "default";
      case "REJECTED":
        return "destructive";
      case "PENDING":
      default:
        return "secondary";
    }
  };

  // Filter admissions based on search
  const filteredAdmissions = searchQuery.trim()
    ? admissions.filter(
        (admission) =>
          admission.full_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          admission.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admission.contact_no1.includes(searchQuery) ||
          admission.aadhar_number.includes(searchQuery)
      )
    : admissions;

  // Initial fetch
  useEffect(() => {
    fetchAdmissions();
  }, []);

  if (loading) {
    return <AdmissionsPageSkeleton />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Admission Management
            </h1>
            <p className="text-muted-foreground">
              Manage student admission applications
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              onClick={() => navigate("/admission")}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              <span>New Admission</span>
            </Button>
          </div>
        </div>

        {/* Statistics Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Applications
                </p>
                <p className="text-4xl font-bold">{admissions.length}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {admissions.filter((a) => a.status === "PENDING").length}{" "}
                  pending,{" "}
                  {admissions.filter((a) => a.status === "APPROVED").length}{" "}
                  approved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, email, phone, or Aadhar number..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 w-full"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <Badge variant="secondary" className="whitespace-nowrap">
                  {filteredAdmissions.length} results
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admissions Grid/List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredAdmissions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {searchQuery ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">
                      No admissions found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      No admissions match your search for "{searchQuery}"
                    </p>
                    <Button onClick={clearSearch} variant="outline">
                      Clear Search
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">
                      No admissions found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by creating a new admission
                    </p>
                    <Button
                      onClick={() => navigate("/admission")}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Admission
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAdmissions.map((admission) => {
              const photoUrl = getPhotoUrl(admission.student_photo);
              const formattedDate = new Date(
                admission.created_at
              ).toLocaleDateString();

              return (
                <Card
                  key={admission.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admission-view/${admission.id}`)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Left Section - Admission Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {photoUrl ? (
                              <OptimizedImage
                                src={photoUrl}
                                alt={admission.full_name}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-primary/10"
                              />
                            ) : (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-semibold truncate">
                                {admission.full_name}
                              </h3>
                              <Badge
                                variant={getStatusBadgeVariant(
                                  admission.status
                                )}
                                className="text-xs"
                              >
                                {admission.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                <Mail className="h-3 w-3 mr-1" />
                                {admission.email}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Phone className="h-3 w-3 mr-1" />
                                {admission.contact_no1}
                              </Badge>
                              {admission.contact_no2 && (
                                <Badge variant="outline" className="text-xs">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {admission.contact_no2}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {admission.district}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formattedDate}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Action Button */}
                      <div className="flex sm:flex-col items-center gap-2 sm:gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admission-view/${admission.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">View Details</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Admissions;
