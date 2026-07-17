import { Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface UpsellStateProps {
  title: string;
  description: string;
}

export function UpsellState({ title, description }: UpsellStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 max-w-md mx-auto">
      <div className="w-24 h-24 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
        <Crown className="w-12 h-12 text-secondary" />
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-4">{title}</h2>
      <p className="text-muted-foreground mb-8 text-lg">{description}</p>
      
      <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto h-14 px-8 text-lg rounded-xl shadow-lg shadow-primary/20 transition-transform hover:-translate-y-1">
        <Link href="/teacher/subscribe">
          <span>الاطلاع على باقات الاشتراك</span>
          <ArrowLeft className="w-5 h-5 ms-2" />
        </Link>
      </Button>
    </div>
  );
}