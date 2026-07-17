import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { communicationApi } from "@/lib/api/communication";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export function PublicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Backend filters by start/end (YYYY-MM-DD), not year/month. Build the
  // first/last day of the shown month so navigation actually filters.
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const { data: events, isLoading } = useQuery({
    queryKey: ["public-events", monthStart, monthEnd],
    queryFn: () => communicationApi.publicEvents({ start: monthStart, end: monthEnd, limit: 100 }),
  });

  return (
    <div className="container mx-auto px-4 md:px-8 py-12 max-w-5xl">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold mb-4">التقويم الدراسي</h1>
        <p className="text-muted-foreground text-lg">أهم المواعيد والأحداث والعطل الرسمية</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : events?.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-3xl">
          <p className="text-xl font-bold mb-2">لا يوجد أحداث في هذا الشهر</p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {events?.map((event) => {
            const startDate = new Date(event.event_date);
            return (
              <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <span className="font-bold text-sm">{startDate.getDate()}</span>
                </div>
                <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-primary font-bold mb-2">
                      <Clock className="w-4 h-4" />
                      <span>{startDate.toLocaleDateString("ar-JO", { month: "long", year: "numeric" })}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-muted-foreground text-sm">{event.description}</p>
                    )}
                    <div className="mt-4 inline-block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {startDate.toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
