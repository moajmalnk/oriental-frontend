import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ErrorMessage = () => {
  return (
    <div className="max-w-md mx-auto animate-scale-in">
      <Alert variant="destructive" className="border-2 border-destructive/20 bg-destructive/5 rounded-xl p-6">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="text-base font-medium ml-2">
          No record found. Please check your Register Number or Certificate Number and try again.
        </AlertDescription>
      </Alert>
    </div>
  );
};