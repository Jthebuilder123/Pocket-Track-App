import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign } from "lucide-react";
import { type Subscription } from "@shared/schema";

interface UpcomingRenewalsProps {
  subscriptions: Subscription[];
}

export function UpcomingRenewals({ subscriptions }: UpcomingRenewalsProps) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Filter and sort subscriptions by renewal date
  const upcomingSubscriptions = subscriptions
    .filter((sub) => {
      const renewalDate = new Date(sub.nextRenewalDate);
      return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => {
      return new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime();
    });

  if (upcomingSubscriptions.length === 0) {
    return null;
  }

  const groupByPeriod = (subs: Subscription[]) => {
    const today: Subscription[] = [];
    const thisWeek: Subscription[] = [];
    const thisMonth: Subscription[] = [];

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    subs.forEach((sub) => {
      const renewalDate = new Date(sub.nextRenewalDate);
      if (renewalDate <= todayEnd) {
        today.push(sub);
      } else if (renewalDate <= weekEnd) {
        thisWeek.push(sub);
      } else {
        thisMonth.push(sub);
      }
    });

    return { today, thisWeek, thisMonth };
  };

  const { today, thisWeek, thisMonth } = groupByPeriod(upcomingSubscriptions);

  const RenewalItem = ({ subscription }: { subscription: Subscription }) => {
    const renewalDate = new Date(subscription.nextRenewalDate);
    const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <div className="flex items-center justify-between py-3 border-b last:border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">
              {subscription.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm">{subscription.name}</p>
            <p className="text-xs text-muted-foreground">
              {renewalDate.toLocaleDateString()}
              {daysUntil === 0 ? " (Today)" : ` (${daysUntil} ${daysUntil === 1 ? "day" : "days"})`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">${parseFloat(subscription.cost).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{subscription.billingCycle}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-medium flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Renewals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {today.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="destructive">Due Today</Badge>
            </div>
            <div>
              {today.map((sub) => (
                <RenewalItem key={sub.id} subscription={sub} />
              ))}
            </div>
          </div>
        )}

        {thisWeek.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">This Week</Badge>
            </div>
            <div>
              {thisWeek.map((sub) => (
                <RenewalItem key={sub.id} subscription={sub} />
              ))}
            </div>
          </div>
        )}

        {thisMonth.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">This Month</Badge>
            </div>
            <div>
              {thisMonth.map((sub) => (
                <RenewalItem key={sub.id} subscription={sub} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
