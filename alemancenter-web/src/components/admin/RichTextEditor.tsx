import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { cn } from "@/lib/utils";
import { filesApi } from "@/lib/api/content";
import { useToast } from "@/hooks/use-toast";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Pilcrow,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  Palette,
  Paperclip,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  error?: boolean;
}

function getEditorHtml(editor: NonNullable<ReturnType<typeof useEditor>>) {
  if (editor.isDestroyed) return null;

  try {
    return editor.getHTML();
  } catch {
    return null;
  }
}

const TEXT_COLORS = [
  { value: "#111827", label: "أسود", className: "bg-gray-900" },
  { value: "#dc2626", label: "أحمر", className: "bg-red-600" },
  { value: "#2563eb", label: "أزرق", className: "bg-blue-600" },
  { value: "#16a34a", label: "أخضر", className: "bg-green-600" },
  { value: "#ca8a04", label: "ذهبي", className: "bg-yellow-600" },
];

// ─── Resizable image ─────────────────────────────────────────────────────────
// Extends the stock Image node with a `width` attribute (percentage of the
// content column) rendered as an inline style, so the chosen size survives in
// the stored HTML and on the public pages (the sanitizer allows `style`).

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute("width") || null,
        renderHTML: (attributes: { width?: string | null }) =>
          attributes.width ? { style: `width: ${attributes.width}` } : {},
      },
    };
  },
});

const IMAGE_SIZES = [
  { value: "25%", label: "٢٥٪" },
  { value: "50%", label: "٥٠٪" },
  { value: "75%", label: "٧٥٪" },
  { value: "100%", label: "كامل" },
  { value: null, label: "أصلي" },
] as const;

export function RichTextEditor({
  value,
  onChange,
  placeholder = "اكتب المحتوى هنا...",
  minHeight = "260px",
  maxHeight = "420px",
  error = false,
}: RichTextEditorProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      Color,
      ResizableImage.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    // Re-render the React toolbar on every transaction so active states
    // (bold, selected image, …) stay in sync with the selection.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3 leading-7",
        dir: "rtl",
      },
    },
    onUpdate({ editor }) {
      const html = getEditorHtml(editor);
      if (html === null) return;
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const current = getEditorHtml(editor);
    if (current === null) return;

    if (value !== current && value !== (current === "<p></p>" ? "" : current)) {
      try {
        editor.commands.setContent(value || "", { emitUpdate: false });
      } catch {
        // TipTap can briefly expose a destroyed view during route/form resets.
      }
    }
  }, [value, editor]);

  const setLink = () => {
    if (!editor || editor.isDestroyed) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("أدخل رابط URL:", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  // ── media upload (image / attachment) ──────────────────────────────────────

  const insertImage = async (file: File) => {
    if (!editor || editor.isDestroyed) return;
    setIsUploading(true);
    try {
      const { url, name } = await filesApi.uploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: name ?? file.name }).run();
      toast({ title: "تم رفع الصورة وإدراجها" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل رفع الصورة",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const insertAttachment = async (file: File) => {
    if (!editor || editor.isDestroyed) return;
    setIsUploading(true);
    try {
      const { url, name } = await filesApi.uploadDocument(file);
      const label = name ?? file.name;
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "text",
            text: `📎 ${label}`,
            marks: [{ type: "link", attrs: { href: url, target: "_blank" } }],
          },
          { type: "text", text: " " },
        ])
        .run();
      toast({ title: "تم رفع الملف وإدراج رابطه" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل رفع الملف",
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onPickFile = (
    event: React.ChangeEvent<HTMLInputElement>,
    handler: (file: File) => Promise<void>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handler(file);
  };

  if (!editor || editor.isDestroyed) return null;

  return (
    <div
      className={cn(
        "rounded-md border bg-background overflow-hidden shadow-sm",
        error && "border-destructive",
        "focus-within:ring-1 focus-within:ring-ring"
      )}
    >
      {/* Toolbar */}
      <div
        className="sticky top-0 z-10 flex w-full flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5"
        dir="ltr"
      >
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          title="غامق"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          title="مائل"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          title="تحته خط"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          title="يتوسطه خط"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Toggle
          size="sm"
          pressed={editor.isActive("paragraph")}
          onPressedChange={() => editor.chain().focus().setParagraph().run()}
          title="فقرة"
        >
          <Pilcrow className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="عنوان رئيسي"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="عنوان فرعي"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          title="قائمة نقطية"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          title="قائمة مرقمة"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          title="اقتباس"
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "right" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
          title="محاذاة يمين"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "center" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
          title="توسيط"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "left" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
          title="محاذاة يسار"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <div className="flex items-center gap-1 px-1" title="لون النص">
          <Palette className="h-4 w-4 text-muted-foreground" />
          {TEXT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              title={color.label}
              aria-label={color.label}
              onClick={() => editor.chain().focus().setColor(color.value).run()}
              className={cn(
                "h-5 w-5 rounded-sm border border-border ring-offset-background transition-shadow hover:ring-2 hover:ring-ring/50",
                color.className,
                editor.isActive("textStyle", { color: color.value }) && "ring-2 ring-ring"
              )}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Toggle
          size="sm"
          pressed={editor.isActive("link")}
          onPressedChange={setLink}
          title="إدراج رابط"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          disabled={isUploading}
          onPressedChange={() => imageInputRef.current?.click()}
          title="إدراج صورة"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          disabled={isUploading}
          onPressedChange={() => fileInputRef.current?.click()}
          title="إرفاق ملف"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Toggle>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(event) => onPickFile(event, insertImage)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
          className="hidden"
          onChange={(event) => onPickFile(event, insertAttachment)}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="تراجع"
        >
          <Undo2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="إعادة"
        >
          <Redo2 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="مسح التنسيق"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Image size controls — visible while an image node is selected */}
      {editor.isActive("image") && (
        <div
          className="flex w-full flex-wrap items-center gap-2 border-b bg-primary/5 px-3 py-1.5 text-xs"
          dir="rtl"
        >
          <span className="flex items-center gap-1 font-bold text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            حجم الصورة:
          </span>
          <div className="flex items-center gap-1">
            {IMAGE_SIZES.map((size) => {
              const currentWidth = (editor.getAttributes("image").width as string | null) ?? null;
              const isActive = currentWidth === size.value;
              return (
                <button
                  key={size.label}
                  type="button"
                  onClick={() =>
                    editor.chain().focus().updateAttributes("image", { width: size.value }).run()
                  }
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-bold transition",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ minHeight, maxHeight }}
        className="overflow-y-auto [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:pb-6 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-right [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pr-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pr-5 [&_.ProseMirror_li]:mb-1 [&_.ProseMirror_blockquote]:border-r-4 [&_.ProseMirror_blockquote]:border-muted-foreground/30 [&_.ProseMirror_blockquote]:pr-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline [&_.ProseMirror_s]:line-through [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-2 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-2 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-ring"
      />
    </div>
  );
}
