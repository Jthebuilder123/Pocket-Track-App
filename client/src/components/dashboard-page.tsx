import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, TrendingUp, DollarSign, CreditCard, Calendar, Search, SlidersHorizontal, Download, FileJson, FileText, LogOut, LogIn, User, Upload, Crown } from "lucide-react";
import logoHeader from "@/assets/logo-header.png";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionCard } from "@/components/subscription-card";
import { SubscriptionModal } from "@/components/subscription-modal";
import { ImportSubscriptions } from "@/components/import-subscriptions";
import { ImportBankStatement } from "@/components/import-bank-statement";
import { SpendingCharts } from "@/components/spending-charts";
import { UpcomingRenewals } from "@/components/upcoming-renewals";
import { BankConnect } from "@/components/bank-connect";
import { DetectedSubscriptions } from "@/components/detected-subscriptions";
import { GuestBanner } from "@/components/guest-banner";
import { TemplateBrowser } from "@/components/template-browser";
import { type Subscription, type SubscriptionTemplate, SUBSCRIPTION_CATEGORIES, BILLING_CYCLES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { migrateGuestSubscriptions, hasGuestData } from "@/lib/migrateGuestData";

export function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBankStatementImportOpen, setIsBankStatementImportOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();
  const [templateData, setTemplateData] = useState<SubscriptionTemplate | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [billingFilter, setBillingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { subscriptions, isLoading, isGuest, refetch } = useSubscriptions();
  const migrationTriggered = useRef(false);

  // Check authentication status
  const { data: user } = useQuery<{ email: string } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  // Get user's current plan
  const { data: userPlan } = useQuery<{ plan: string }>({
    queryKey: ["/api/user/plan"],
    enabled: !!user,
  });

  // Auto-migrate guest data when user signs up
  useEffect(() => {
    const attemptMigration = async () => {
      if (user && !isGuest && hasGuestData() && !migrationTriggered.current) {
        migrationTriggered.current = true;
        
        toast({
          title: "Migrating your data...",
          description: "Transferring your local subscriptions to your account",
        });

        try {
          const result = await migrateGuestSubscriptions();
          
          if (result.success) {
            toast({
              title: "Migration complete!",
              description: `Successfully migrated ${result.migrated} subscription${result.migrated !== 1 ? 's' : ''} to your account`,
            });
          } else {
            toast({
              title: "Partial migration",
              description: `Migrated ${result.migrated} subscriptions, ${result.failed} failed. Failed items remain in guest storage for retry. ${result.errors && result.errors.length > 0 ? 'Check console for details.' : ''}`,
              variant: "destructive",
              duration: 10000, // Show longer for important info
            });
            
            // Log detailed errors to console for debugging
            if (result.errors) {
              console.error("Migration errors:", result.errors);
            }
          }
          
          // Refresh subscriptions to show migrated data
          refetch();
        } catch (error) {
          toast({
            title: "Migration failed",
            description: "Failed to migrate your subscriptions. Please contact support.",
            variant: "destructive",
          });
        }
      }
    };

    attemptMigration();
  }, [user, isGuest, toast, refetch]);

  // FIX: Logout mutation - updated to match backend GET /api/logout endpoint
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // FIX: Backend uses GET /api/logout, not POST /api/auth/logout
      window.location.href = "/api/logout";
    },
  });

  // Calculate statistics (only for active subscriptions)
  const activeSubscriptions = subscriptions.filter(sub => sub.status === "active");
  const monthlyTotal = activeSubscriptions.reduce((sum, sub) => {
    const cost = parseFloat(sub.cost);
    if (sub.billingCycle === "Monthly") return sum + cost;
    if (sub.billingCycle === "Quarterly") return sum + cost / 3;
    if (sub.billingCycle === "Yearly") return sum + cost / 12;
    return sum;
  }, 0);

  const annualTotal = monthlyTotal * 12;
  const activeCount = activeSubscriptions.length;

  // Filter and sort subscriptions (only show active ones by default)
  let filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || sub.category === categoryFilter;
    const matchesBilling = billingFilter === "all" || sub.billingCycle === billingFilter;
    const isActive = sub.status === "active";
    return matchesSearch && matchesCategory && matchesBilling && isActive;
  });

  filteredSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "cost") return parseFloat(b.cost) - parseFloat(a.cost);
    if (sortBy === "renewal") {
      return new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime();
    }
    return 0;
  });

  const hasActiveFilters = categoryFilter !== "all" || billingFilter !== "all" || searchQuery !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setBillingFilter("all");
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setTemplateData(undefined);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingSubscription(undefined);
    setTemplateData(undefined);
    setIsModalOpen(true);
  };

  const handleSelectTemplate = (template: SubscriptionTemplate) => {
    setEditingSubscription(undefined);
    setTemplateData(template);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubscription(undefined);
    setTemplateData(undefined);
  };

  const escapeCsvField = (field: string): string => {
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const exportToCSV = () => {
    try {
      const headers = ["Name", "Cost", "Billing Cycle", "Category", "Next Renewal", "Status", "Notes"];
      const csvData = activeSubscriptions.map(sub => [
        escapeCsvField(sub.name),
        escapeCsvField(sub.cost),
        escapeCsvField(sub.billingCycle),
        escapeCsvField(sub.category),
        escapeCsvField(new Date(sub.nextRenewalDate).toISOString().split('T')[0]),
        escapeCsvField(sub.status),
        escapeCsvField(sub.notes || "")
      ]);

      const csvContent = [
        headers.map(h => escapeCsvField(h)).join(","),
        ...csvData.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${activeSubscriptions.length} subscriptions to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export subscriptions",
        variant: "destructive",
      });
    }
  };

  const exportToJSON = () => {
    try {
      const jsonData = activeSubscriptions.map(sub => ({
        name: sub.name,
        cost: parseFloat(sub.cost),
        billingCycle: sub.billingCycle,
        category: sub.category,
        nextRenewalDate: new Date(sub.nextRenewalDate).toISOString(),
        status: sub.status,
        notes: sub.notes || "",
        createdAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : null,
      }));

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `subscriptions_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${activeSubscriptions.length} subscriptions to JSON`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export subscriptions",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <button 
            type="button"
            onClick={() => setLocation("/")}
            className="flex items-center cursor-pointer hover-elevate active-elevate-2 px-1.5 sm:px-2 py-1 rounded-md bg-transparent border-0"
            data-testid="link-logo"
            aria-label="Go to homepage"
          >
            <img src={logoHeader} alt="PocketTrack" className="h-6 sm:h-8 w-auto" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user && (
              <div className="hidden lg:flex items-center gap-3 mr-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground" data-testid="text-user-email">
                    {user.email}
                  </span>
                </div>
                {userPlan && (
                  <Badge
                    variant={userPlan.plan === "pro" ? "default" : userPlan.plan === "essentials" ? "secondary" : "outline"}
                    className="gap-1"
                    data-testid="badge-current-plan"
                  >
                    <Crown className="w-3 h-3" data-testid="icon-plan-crown" />
                    {userPlan.plan.charAt(0).toUpperCase() + userPlan.plan.slice(1)}
                  </Badge>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className="sm:w-auto sm:min-h-9"
              onClick={() => setLocation("/pricing")}
              data-testid="button-pricing"
            >
              <Crown className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Upgrade</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:w-auto sm:min-h-9" data-testid="button-export">
                  <Download className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} data-testid="menuitem-export-csv">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON} data-testid="menuitem-export-json">
                  <FileJson className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:w-auto sm:min-h-9" data-testid="button-import">
                  <Upload className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsImportOpen(true)} data-testid="menuitem-import-csv">
                  <FileText className="w-4 h-4 mr-2" />
                  Import CSV/Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBankStatementImportOpen(true)} data-testid="menuitem-import-statement">
                  <FileText className="w-4 h-4 mr-2" />
                  Import Bank Statement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              onClick={handleAddNew} 
              size="icon"
              className="sm:w-auto sm:min-h-9"
              data-testid="button-add-subscription"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Subscription</span>
            </Button>
            {user ? (
              <Button
                variant="outline"
                size="icon"
                className="sm:w-auto sm:min-h-9"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                className="sm:w-auto sm:min-h-9"
                onClick={() => setLocation("/login")}
                data-testid="button-login"
              >
                <LogIn className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Guest Banner */}
        {isGuest && (
          <div className="mb-4 sm:mb-6">
            <GuestBanner />
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-1.5 sm:mb-2">Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track and manage all your recurring subscriptions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="hover-elevate transition-all" data-testid="card-monthly-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
              <p className="text-sm sm:text-sm font-medium text-muted-foreground">Monthly Total</p>
              <DollarSign className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl sm:text-3xl font-bold" data-testid="text-monthly-amount">
                ${monthlyTotal.toFixed(2)}
              </div>
              <p className="text-sm sm:text-xs text-muted-foreground mt-1.5 sm:mt-1">
                Estimated monthly spending
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all" data-testid="card-annual-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
              <p className="text-sm sm:text-sm font-medium text-muted-foreground">Annual Total</p>
              <TrendingUp className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl sm:text-3xl font-bold" data-testid="text-annual-amount">
                ${annualTotal.toFixed(2)}
              </div>
              <p className="text-sm sm:text-xs text-muted-foreground mt-1.5 sm:mt-1">
                Projected yearly spending
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all" data-testid="card-active-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
              <p className="text-sm sm:text-sm font-medium text-muted-foreground">Active Subscriptions</p>
              <Calendar className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl sm:text-3xl font-bold" data-testid="text-subscription-count">
                {activeCount}
              </div>
              <p className="text-sm sm:text-xs text-muted-foreground mt-1.5 sm:mt-1">
                Currently tracked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="subscriptions" className="mb-6 sm:mb-8">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto sm:h-10" data-testid="tabs-navigation">
            <TabsTrigger value="subscriptions" className="text-xs sm:text-sm min-h-10 sm:min-h-9" data-testid="tab-subscriptions">
              My Subscriptions
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm min-h-10 sm:min-h-9" data-testid="tab-templates">
              Browse Templates
            </TabsTrigger>
            <TabsTrigger value="detected" className="text-xs sm:text-sm min-h-10 sm:min-h-9" data-testid="tab-detected">
              Detected
            </TabsTrigger>
            <TabsTrigger value="banks" className="text-xs sm:text-sm min-h-10 sm:min-h-9" data-testid="tab-banks">
              Bank Connections
            </TabsTrigger>
          </TabsList>

          {/* My Subscriptions Tab */}
          <TabsContent value="subscriptions" className="mt-6 space-y-8">
            {/* Charts Section */}
            {activeSubscriptions.length > 0 && (
              <SpendingCharts subscriptions={activeSubscriptions as Subscription[]} />
            )}

            {/* Upcoming Renewals */}
            {activeSubscriptions.length > 0 && (
              <UpcomingRenewals subscriptions={activeSubscriptions as Subscription[]} />
            )}

            {/* Filters and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-9 min-h-11 sm:min-h-9 text-base sm:text-sm"
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-11 sm:min-h-9 text-base sm:text-sm" data-testid="select-category-filter">
                <SlidersHorizontal className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {SUBSCRIPTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={billingFilter} onValueChange={setBillingFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-billing-filter">
                <SelectValue placeholder="Billing Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {BILLING_CYCLES.map((cycle) => (
                  <SelectItem key={cycle} value={cycle}>
                    {cycle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-sort">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="renewal">Renewal Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary">Search: {searchQuery}</Badge>
            )}
            {categoryFilter !== "all" && (
              <Badge variant="secondary">Category: {categoryFilter}</Badge>
            )}
            {billingFilter !== "all" && (
              <Badge variant="secondary">Billing: {billingFilter}</Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              Clear all
            </Button>
          </div>
        )}

            {/* Subscriptions List */}
            <div>
              <h3 className="text-xl font-medium mb-4">
                Your Subscriptions ({filteredSubscriptions.length})
              </h3>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-6">
                      <div className="animate-pulse flex gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-3 bg-muted rounded w-1/6" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {subscriptions.length === 0 ? "No subscriptions yet" : "No subscriptions found"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {subscriptions.length === 0
                        ? "Start tracking your recurring expenses by adding your first subscription."
                        : "Try adjusting your filters or search query."}
                    </p>
                    {subscriptions.length === 0 && (
                      <Button onClick={handleAddNew} data-testid="button-add-first">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Subscription
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription as Subscription}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Browse Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <TemplateBrowser onSelectTemplate={handleSelectTemplate} />
          </TabsContent>

          {/* Detected Subscriptions Tab */}
          <TabsContent value="detected" className="mt-6">
            <DetectedSubscriptions />
          </TabsContent>

          {/* Bank Connections Tab */}
          <TabsContent value="banks" className="mt-6">
            <BankConnect />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal */}
      <SubscriptionModal
        open={isModalOpen}
        onClose={handleCloseModal}
        subscription={editingSubscription}
        template={templateData}
      />

      {/* Import Modal */}
      <ImportSubscriptions
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {/* Bank Statement Import Modal */}
      <ImportBankStatement
        open={isBankStatementImportOpen}
        onClose={() => setIsBankStatementImportOpen(false)}
      />
    </div>
  );
}
