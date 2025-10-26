import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertSubscription } from "@shared/schema";
import { format } from "date-fns";

interface ImportSubscriptionsProps {
  open: boolean;
  onClose: () => void;
}

interface PreviewRow {
  rowNumber: number;
  data: InsertSubscription;
}

interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  preview: PreviewRow[];
  errors: Array<{ row: number; errors: string[] }>;
}

export function ImportSubscriptions({ open, onClose }: ImportSubscriptionsProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/subscriptions/import/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      return response.json();
    },
    onSuccess: (data: ImportPreview) => {
      setPreview(data);
      setStep("preview");
      toast({
        title: "File parsed successfully",
        description: `Found ${data.validRows} valid row(s) out of ${data.totalRows} total row(s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (subscriptions: InsertSubscription[]) => {
      const response = await apiRequest("POST", "/api/subscriptions/import/confirm", {
        subscriptions,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Import successful",
        description: `Successfully imported ${data.imported} subscription(s)`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const handleConfirm = () => {
    if (!preview) return;
    const subscriptionsToImport = preview.preview.map((row) => row.data);
    confirmMutation.mutate(subscriptionsToImport);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setStep("upload");
    onClose();
  };

  const handleBack = () => {
    setPreview(null);
    setStep("upload");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Subscriptions from CSV/Excel</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with your subscription data
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="font-medium mb-1">Choose a file to upload</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    CSV or Excel files up to 5MB
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    data-testid="input-file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild data-testid="button-select-file">
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                      </span>
                    </Button>
                  </label>
                </div>
                {file && (
                  <div className="text-sm text-muted-foreground" data-testid="text-selected-file">
                    Selected: {file.name}
                  </div>
                )}
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Required columns:</strong> name (or service), cost (or price), 
                billingCycle (or cycle), category, nextRenewalDate (or renewal_date)
                <br />
                <strong>Optional:</strong> notes (or description)
                <br />
                <strong>Billing Cycle values:</strong> Monthly, Quarterly, or Yearly
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Total Rows</div>
                <div className="text-2xl font-semibold">{preview.totalRows}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Valid</div>
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {preview.validRows}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Invalid</div>
                <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {preview.invalidRows}
                </div>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Validation Errors:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {preview.errors.slice(0, 3).map((error) => (
                      <li key={error.row}>
                        Row {error.row}: {error.errors.join(", ")}
                      </li>
                    ))}
                    {preview.errors.length > 3 && (
                      <li>...and {preview.errors.length - 3} more error(s)</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {preview.validRows > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium">Valid Subscriptions Preview</span>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Billing Cycle</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Next Renewal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.preview.map((row) => (
                        <TableRow key={row.rowNumber} data-testid={`row-preview-${row.rowNumber}`}>
                          <TableCell>{row.data.name}</TableCell>
                          <TableCell>${row.data.cost}</TableCell>
                          <TableCell>{row.data.billingCycle}</TableCell>
                          <TableCell>{row.data.category}</TableCell>
                          <TableCell>
                            {format(new Date(row.data.nextRenewalDate), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploadMutation.isPending}
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload & Preview"}
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleBack} data-testid="button-back">
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!preview || preview.validRows === 0 || confirmMutation.isPending}
                data-testid="button-confirm-import"
              >
                {confirmMutation.isPending
                  ? "Importing..."
                  : `Import ${preview?.validRows} Subscription(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
