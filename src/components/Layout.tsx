import React, { useState } from "react";
import { Sidebar } from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedBulkCertificateDialog } from "./EnhancedBulkCertificateDialog";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [bulkCertificateDialogOpen, setBulkCertificateDialogOpen] =
    useState(false);

  const handleBulkCertificateClick = () => {
    setBulkCertificateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onBulkCertificateClick={handleBulkCertificateClick} />
      <main
        className={isAuthenticated ? "lg:ml-64 min-h-screen" : "min-h-screen"}
      >
        <div className="pt-8 p-4 lg:p-6">{children}</div>
      </main>
      {/* Enhanced Bulk Certificate Dialog - Available on all pages */}
      {isAuthenticated && (
        <EnhancedBulkCertificateDialog
          open={bulkCertificateDialogOpen}
          onOpenChange={setBulkCertificateDialogOpen}
        />
      )}
    </div>
  );
};
