import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Users, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { imgUrl, imgSrcSet } from "@/lib/img-url";
import { safeUrl } from "@/lib/sanitize";

interface TeamMember {
  id: number;
  name: string;
  role?: string;
  title?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  photo?: string;
  image?: string;
  social?: { platform: string; url: string }[];
}

function MemberSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border bg-card p-6">
      <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted" />
      <div className="mx-auto mb-2 h-5 w-32 rounded bg-muted" />
      <div className="mx-auto h-4 w-24 rounded bg-muted" />
    </div>
  );
}

export function Team() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => api.get<TeamMember[]>("/team", { skipAuth: true }),
  });

  const avatarLetter = (name: string) =>
    name?.trim().charAt(0) ?? "م";

  const rawPhotoUrl = (m: TeamMember) =>
    m.avatar ?? m.photo ?? m.image ?? null;

  const photoUrl = (m: TeamMember) =>
    imgUrl(rawPhotoUrl(m), 160);

  return (
    <div>
      {/* Hero */}
      <header className="border-b bg-gradient-to-b from-primary/8 via-background/60 to-background">
        <div className="container mx-auto max-w-5xl px-4 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-4xl font-black text-foreground">فريق العمل</h1>
          <p className="mt-3 text-base text-muted-foreground">
            تعرّف على الكادر التعليمي والإداري الذي يُشغّل منصة موقع الإيمان التعليمي
          </p>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-12">
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <MemberSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && (!members || members.length === 0) && (
          <div className="flex flex-col items-center gap-5 py-24 text-center">
            <Users className="h-16 w-16 text-muted-foreground/20" />
            <div>
              <p className="text-xl font-bold text-muted-foreground">لا توجد بيانات متاحة حالياً</p>
              <p className="mt-1 text-sm text-muted-foreground">سيتم إضافة معلومات الفريق قريباً</p>
            </div>
          </div>
        )}

        {members && members.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Card
                key={member.id}
                className="overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-md"
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  {/* Avatar */}
                  {photoUrl(member) ? (
                    <img
                      src={photoUrl(member)!}
                      srcSet={imgSrcSet(rawPhotoUrl(member), 80)}
                      sizes="80px"
                      alt={member.name}
                      className="mb-4 h-20 w-20 rounded-full object-cover shadow-md ring-2 ring-primary/20"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-black text-primary shadow-md ring-2 ring-primary/20">
                      {avatarLetter(member.name)}
                    </div>
                  )}

                  {/* Name */}
                  <h2 className="text-lg font-black text-foreground">{member.name}</h2>

                  {/* Role */}
                  {(member.role ?? member.title) && (
                    <Badge variant="secondary" className="mt-2 rounded-full font-bold">
                      {member.role ?? member.title}
                    </Badge>
                  )}

                  {/* Bio */}
                  {member.bio && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {member.bio}
                    </p>
                  )}

                  {/* Contact links */}
                  {(member.email || (member.social && member.social.length > 0)) && (
                    <div className="mt-4 flex items-center gap-3">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted transition hover:bg-primary hover:text-primary-foreground"
                          title={member.email}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {member.social?.map((s) => {
                        const url = safeUrl(s.url);
                        if (!url) return null;
                        return (
                          <a
                            key={s.platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted transition hover:bg-primary hover:text-primary-foreground"
                            title={s.platform}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
