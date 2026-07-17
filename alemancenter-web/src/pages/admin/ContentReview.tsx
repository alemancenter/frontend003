import ContentAudit from "./ContentAudit";

export default function ContentReview() {
  return (
    <ContentAudit
      initialTab="review"
      title="قائمة المراجعة البشرية"
      description="اعتماد أو رفض معاينات تحسين المحتوى المقترحة قبل تطبيقها."
    />
  );
}
