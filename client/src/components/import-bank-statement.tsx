import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ImportBankStatementProps {
  open: boolean;
  onClose: () => void;
}

interface DetectedSubscription {
  id: string;
  merchantName: string;
  estimatedCost: string;
  detectedBillingCycle: string;
  category: string;
  transactionIds: string[];
  confidence: string;
  selected: boolean;
}

interface StatementPreview {
  totalTransactions: number;
  detectedSubscriptions: DetectedSubscription[];
}

export function ImportBankStatement({ open, onClose }: ImportBankStatementProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload bank statement");
      }

      return response.json();
    },
    onSuccess: (data: StatementPreview) => {
      setPreview(data);
      // Select all by default
      setSelectedSubs(new Set(data.detectedSubscriptions.map(s => s.id)));
      setStep("preview");
      toast({
        title: "Statement analyzed",
        description: `Detected ${data.detectedSubscriptions.length} potential subscription(s) from ${data.totalTransactions} transaction(s)`,
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
    mutationFn: async (subscriptionIds: string[]) => {
      const response = await apiRequest("POST", "/api/bank-statements/confirm", {
        subscriptionIds,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscriptions created",
        description: `Successfully created ${data.created} subscription(s) from detected transactions`,
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
    if (!preview || selectedSubs.size === 0) return;
    confirmMutation.mutate(Array.from(selectedSubs));
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setStep("upload");
    setSelectedSubs(new Set());
    onClose();
  };

  const handleBack = () => {
    setPreview(null);
    setStep("upload");
    setSelectedSubs(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedSubs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selectedSubs.size === preview.detectedSubscriptions.length) {
      setSelectedSubs(new Set());
    } else {
      setSelectedSubs(new Set(preview.detectedSubscriptions.map(s => s.id)));
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const conf = parseFloat(confidence);
    if (conf >= 90) return <Badge variant="default" className="bg-green-600">High</Badge>;
    if (conf >= 70) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import from Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a bank statement to automatically detect recurring subscriptions
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <div>
                  <h3 className="font-medium mb-1">Choose a bank statement to upload</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF, CSV, or Excel files up to 10MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="statement-upload"
                    data-testid="input-statement-upload"
                  />
                  <label htmlFor="statement-upload">
                    <Button variant="outline" asChild data-testid="button-select-statement">
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                      </span>
                    </Button>
                  </label>
                </div>
                {file && (
                  <div className="text-sm text-muted-foreground" data-testid="text-selected-statement">
                    Selected: {file.name}
                  </div>
                )}
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> We'll analyze your bank statement to find recurring charges
                that look like subscriptions. You can review and approve which ones to add.
                <br />
                <strong>Supported formats:</strong> PDF statements, CSV exports, Excel files
                <br />
                <strong>Note:</strong> Your statement data is processed securely and not stored permanently.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Total Transactions</div>
                <div className="text-2xl font-semibold">{preview.totalTransactions}</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Detected Subscriptions</div>
                <div className="text-2xl font-semibold text-primary">
                  {preview.detectedSubscriptions.length}
                </div>
              </div>
            </div>

            {preview.detectedSubscriptions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No recurring subscriptions were detected in this statement. 
                  Try uploading a statement covering a longer time period (3+ months recommended).
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="font-medium">Detected Subscriptions</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                    data-testid="button-toggle-all"
                  >
                    {selectedSubs.size === preview.detectedSubscriptions.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <ScrollArea className="h-[350px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.detectedSubscriptions.map((sub) => (
                        <TableRow 
                          key={sub.id}
                          data-testid={`row-detected-${sub.id}`}
                          className={selectedSubs.has(sub.id) ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedSubs.has(sub.id)}
                              onCheckedChange={() => toggleSelection(sub.id)}
                              data-testid={`checkbox-${sub.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{sub.merchantName}</TableCell>
                          <TableCell>${parseFloat(sub.estimatedCost).toFixed(2)}</TableCell>
                          <TableCell>{sub.detectedBillingCycle}</TableCell>
                          <TableCell>{sub.category}</TableCell>
                          <TableCell>{getConfidenceBadge(sub.confidence)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <p className="text-sm text-muted-foreground">
                  Select the subscriptions you want to add. You can edit details after importing.
                </p>
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
                data-testid="button-upload-statement"
              >
                {uploadMutation.isPending ? "Analyzing..." : "Analyze Statement"}
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
                disabled={selectedSubs.size === 0 || confirmMutation.isPending}
                data-testid="button-confirm-import"
              >
                {confirmMutation.isPending
                  ? "Creating..."
                  : `Add ${selectedSubs.size} Subscription(s)`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
