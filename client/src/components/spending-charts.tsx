import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Subscription } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface SpendingChartsProps {
  subscriptions: Subscription[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function SpendingCharts({ subscriptions }: SpendingChartsProps) {
  // Calculate spending by category
  const categoryData = subscriptions.reduce((acc, sub) => {
    const monthlyCost = 
      sub.billingCycle === "Monthly" ? parseFloat(sub.cost) :
      sub.billingCycle === "Quarterly" ? parseFloat(sub.cost) / 3 :
      parseFloat(sub.cost) / 12;

    const existing = acc.find((item) => item.name === sub.category);
    if (existing) {
      existing.value += monthlyCost;
    } else {
      acc.push({ name: sub.category, value: monthlyCost });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Calculate by billing frequency
  const billingData = subscriptions.reduce((acc, sub) => {
    const existing = acc.find((item) => item.name === sub.billingCycle);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: sub.billingCycle, count: 1 });
    }
    return acc;
  }, [] as { name: string; count: number }[]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Category Spending Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-medium">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}/mo`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Billing Frequency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-medium">Subscriptions by Billing Cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
