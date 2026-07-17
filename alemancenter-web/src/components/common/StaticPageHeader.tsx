import { Link } from "wouter";
import { ChevronLeft, Home } from "lucide-react";

interface StaticPageHeaderProps {
  title: string;
  description?: string;
  current: string;
  eyebrow?: string;
}

export default function StaticPageHeader({ title, description, current, eyebrow }: StaticPageHeaderProps) {
  return (
    <header className="border-b bg-gradient-to-b from-primary/5 via-background to-background pt-4">
      <div className="container mx-auto px-4 py-7 sm:py-9 lg:py-10">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-bold text-muted-foreground shadow-sm sm:text-sm"
        >
          <Link href="/" className="flex items-center gap-1.5 transition hover:text-primary">
            <Home className="h-4 w-4" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-4 w-4 text-muted-foreground/40 rtl:rotate-180" />
          <span className="text-primary">{current}</span>
        </nav>

        <div className="max-w-3xl">
          {eyebrow ? <p className="mb-2 text-xs font-black text-primary">{eyebrow}</p> : null}
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-sm font-medium leading-8 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
