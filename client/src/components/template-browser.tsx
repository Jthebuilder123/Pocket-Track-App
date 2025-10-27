import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Plus, Sparkles } from "lucide-react";
import type { SubscriptionTemplate } from "@shared/schema";
import { SUBSCRIPTION_CATEGORIES } from "@shared/schema";

interface TemplateBrowserProps {
  onSelectTemplate: (template: SubscriptionTemplate) => void;
}

export function TemplateBrowser({ onSelectTemplate }: TemplateBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: templates = [], isLoading } = useQuery<SubscriptionTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      searchQuery === "" || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from templates
  const availableCategories = Array.from(new Set(templates.map(t => t.category))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-semibold">Quick Add from Templates</h2>
      </div>
      
      <p className="text-muted-foreground">
        Browse 100+ popular subscription services and add them with a single click. 
        Pre-filled with typical pricing - just confirm and customize.
      </p>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {availableCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or category filter
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="hover-elevate transition-all cursor-pointer group"
              onClick={() => onSelectTemplate(template)}
              data-testid={`card-template-${template.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                    }}
                    data-testid={`button-add-template-${template.id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {template.description && (
                  <CardDescription className="text-sm line-clamp-2 mb-3">
                    {template.description}
                  </CardDescription>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    ${parseFloat(template.suggestedPrice).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {template.billingCycle.toLowerCase()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
