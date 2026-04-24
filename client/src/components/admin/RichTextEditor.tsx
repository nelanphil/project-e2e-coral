"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BulletList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { useEffect, useLayoutEffect, useRef, useCallback } from "react";

const BULLET_STYLES = [
  { value: "disc", label: "Disc" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
] as const;

const BulletListWithStyle = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "disc",
        parseHTML: (element) => {
          const style = element.getAttribute("style");
          const m = style?.match(/list-style-type:\s*([a-z-]+)/);
          return (m && m[1]) || "disc";
        },
        renderHTML: (value) => {
          const styleType = typeof value === "string" ? value : "disc";
          return { style: `list-style-type: ${styleType}` };
        },
      },
    };
  },
});

const FONT_SIZE_MIN_PX = 10;
const FONT_SIZE_MAX_PX = 36;
const FONT_SIZE_STEP_PX = 2;
const FONT_SIZE_BASE_PX = 16;

function parseFontSizeToPx(
  fontSize: string | null | undefined,
): number | null {
  if (fontSize == null || typeof fontSize !== "string") return null;
  const s = fontSize.trim();
  const px = s.match(/^(\d+(?:\.\d+)?)px$/i);
  if (px) return Math.round(parseFloat(px[1]!));
  const rem = s.match(/^(\d+(?:\.\d+)?)rem$/i);
  if (rem) return Math.round(parseFloat(rem[1]!) * 16);
  return null;
}

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#9333ea" },
];

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  "aria-label"?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  minHeight = "8rem",
  "aria-label": ariaLabel,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const isInternalUpdate = useRef(false);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
        bulletList: false,
      }),
      BulletListWithStyle,
      TextStyle,
      FontSize,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      if (html !== valueRef.current) {
        valueRef.current = html;
        onChangeRef.current(html);
      }
      isInternalUpdate.current = false;
    },
  });

  useEffect(() => {
    if (!editor) return;
    const normalized = (value ?? "").trim() || "";
    const current = editor.getHTML().trim() || "";
    if (normalized !== current && !isInternalUpdate.current) {
      editor.commands.setContent(normalized || "<p></p>", {
        emitUpdate: false,
      });
      valueRef.current = normalized || "<p></p>";
    }
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const adjustFontSizeBy = useCallback(
    (delta: number) => {
      if (!editor) return;
      const attrs = editor.getAttributes("textStyle") as {
        fontSize?: string | null;
      };
      const parsed = parseFontSizeToPx(attrs.fontSize ?? undefined);
      const current = parsed ?? FONT_SIZE_BASE_PX;
      const next = Math.min(
        FONT_SIZE_MAX_PX,
        Math.max(FONT_SIZE_MIN_PX, current + delta),
      );
      editor
        .chain()
        .focus()
        .extendMarkRange("textStyle")
        .setFontSize(`${next}px`)
        .run();
    },
    [editor],
  );

  const resetFontSize = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("textStyle").unsetFontSize().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="rich-text-editor rounded-lg border border-base-300 bg-base-100 overflow-hidden"
      style={{ minHeight }}>
      <div className="flex flex-wrap items-center gap-1 border-b border-base-300 bg-base-200 p-1">
        <select
          className="select select-bordered select-sm max-w-[10rem]"
          value={
            editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "h2")
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "h3")
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
          aria-label="Paragraph format">
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("bold") ? "btn-active" : ""}`}
          aria-label="Bold"
          title="Bold">
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("italic") ? "btn-active" : ""}`}
          aria-label="Italic"
          title="Italic">
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("underline") ? "btn-active" : ""}`}
          aria-label="Underline"
          title="Underline">
          <u>U</u>
        </button>
        <div className="dropdown dropdown-hover">
          <label
            tabIndex={0}
            className="btn btn-sm btn-ghost cursor-pointer"
            aria-label="Text color">
            A
            <span
              className="ml-0.5 inline-block h-3 w-3 rounded border border-base-content/30"
              style={{
                backgroundColor:
                  (editor.getAttributes("textStyle") as { color?: string })
                    .color ?? "currentColor",
              }}
            />
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu z-10 rounded-box bg-base-200 p-1 shadow-lg">
            {TEXT_COLORS.map(({ name, value: color }) => (
              <li key={color || "default"}>
                <button
                  type="button"
                  onClick={() =>
                    color
                      ? editor.chain().focus().setColor(color).run()
                      : editor.chain().focus().unsetColor().run()
                  }>
                  <span
                    className="inline-block h-4 w-4 rounded border border-base-content/30"
                    style={{ backgroundColor: color || "transparent" }}
                  />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => adjustFontSizeBy(-FONT_SIZE_STEP_PX)}
          className="btn btn-sm btn-ghost"
          aria-label="Decrease font size"
          title="Decrease font size">
          A−
        </button>
        <button
          type="button"
          onClick={() => adjustFontSizeBy(FONT_SIZE_STEP_PX)}
          className="btn btn-sm btn-ghost"
          aria-label="Increase font size"
          title="Increase font size">
          A+
        </button>
        <button
          type="button"
          onClick={resetFontSize}
          className="btn btn-sm btn-ghost"
          aria-label="Default font size"
          title="Default font size">
          Aa
        </button>
        <div className="divider divider-horizontal mx-0 w-2" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`btn btn-sm btn-ghost ${editor.isActive({ textAlign: "left" }) ? "btn-active" : ""}`}
          aria-label="Align left"
          title="Align left">
          ≡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`btn btn-sm btn-ghost ${editor.isActive({ textAlign: "center" }) ? "btn-active" : ""}`}
          aria-label="Align center"
          title="Align center">
          ≡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`btn btn-sm btn-ghost ${editor.isActive({ textAlign: "right" }) ? "btn-active" : ""}`}
          aria-label="Align right"
          title="Align right">
          ≡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={`btn btn-sm btn-ghost ${editor.isActive({ textAlign: "justify" }) ? "btn-active" : ""}`}
          aria-label="Justify"
          title="Justify">
          ≡
        </button>
        <div className="divider divider-horizontal mx-0 w-2" />
        <button
          type="button"
          onClick={setLink}
          className={`btn btn-sm btn-ghost ${editor.isActive("link") ? "btn-active" : ""}`}
          aria-label="Insert link"
          title="Insert link">
          🔗
        </button>
        <div className="divider divider-horizontal mx-0 w-2" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("bulletList") ? "btn-active" : ""}`}
          aria-label="Bullet list"
          title="Bullet list">
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`btn btn-sm btn-ghost ${editor.isActive("orderedList") ? "btn-active" : ""}`}
          aria-label="Numbered list"
          title="Numbered list">
          1.
        </button>
        {editor.isActive("bulletList") && (
          <select
            className="select select-bordered select-sm max-w-32"
            value={
              (editor.getAttributes("bulletList").listStyleType as string) ||
              "disc"
            }
            onChange={(e) => {
              const v = e.target.value as "disc" | "circle" | "square";
              editor
                .chain()
                .focus()
                .updateAttributes("bulletList", { listStyleType: v })
                .run();
            }}
            aria-label="Bullet style">
            {BULLET_STYLES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>
      <EditorContent
        editor={editor}
        className="ProseMirror-wrapper p-3 focus:outline-none [&_.ProseMirror]:min-h-[6rem] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-base-content/40 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
      <style jsx global>{`
        .rich-text-editor .ProseMirror p {
          margin: 0.25em 0;
        }
        .rich-text-editor .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.5em 0;
        }
        .rich-text-editor .ProseMirror h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0.4em 0;
        }
        .rich-text-editor .ProseMirror a {
          color: hsl(var(--p));
          text-decoration: underline;
        }
        .rich-text-editor .ProseMirror ul,
        .rich-text-editor .ProseMirror ol {
          margin: 0.5em 0;
          padding-left: 1.5rem;
        }
        .rich-text-editor .ProseMirror li {
          margin: 0.2em 0;
        }
      `}</style>
    </div>
  );
}
