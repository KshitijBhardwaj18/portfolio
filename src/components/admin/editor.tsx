"use client";

import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState, type ReactNode } from "react";
import {
  LuBold,
  LuCode,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuMinus,
  LuQuote,
  LuSquareCode,
  LuStrikethrough,
} from "react-icons/lu";
import { PROSE } from "@/components/post-view";
import { api } from "@/lib/admin";

// Rich text editor that reads and writes markdown.
// - Markdown shortcuts work as you type: "## ", "> ", "- ", "1. ", "```".
// - Toolbar (sticks to the top while you scroll): headings, image at the cursor,
//   code, quote, lists, divider.
// - Select text: bold, italic, strike, code, link, headings.
// - Select an image: edit its caption and alt text.
// - Drop or paste images anywhere: they upload and appear inline.
// - Footnotes: write [^1] in the text and "[^1]: note" on its own line at the end.
export function Editor({ initial, onChange }: { initial: string; onChange: (markdown: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [linking, setLinking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const insertImages = async (editor: TiptapEditor, files: File[], pos?: number) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return false;
    setUploading(true);
    setError("");
    try {
      for (const file of images) {
        const { url } = await api.upload(file);
        const node = { type: "image", attrs: { src: url, alt: file.name.replace(/\.\w+$/, ""), title: "" } };
        if (pos === undefined) editor.chain().focus().insertContent(node).run();
        else editor.chain().focus().insertContentAt(pos, node).run();
      }
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
    return true;
  };

  const editor = useEditor({
    immediatelyRender: false, // static export: render on the client only
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
      Image,
      Placeholder.configure({ placeholder: "Start writing. The bar above adds headings, images and more." }),
      Markdown,
    ],
    content: initial,
    contentType: "markdown",
    editorProps: {
      attributes: { class: `${PROSE} min-h-[60vh] focus:outline-none` },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])];
        if (!files.some((f) => f.type.startsWith("image/")) || !editor) return false;
        insertImages(editor, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])];
        if (!files.some((f) => f.type.startsWith("image/")) || !editor) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImages(editor, files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(fixFootnotes(editor.getMarkdown())),
  });

  if (!editor) return null;

  const setLink = (href: string) => {
    setLinking(false);
    if (!href) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="relative">
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor, state }) => !state.selection.empty && !editor.isActive("image") && !editor.isActive("codeBlock")}
        className={menuCls}
      >
        {linking ? (
          <input
            autoFocus
            defaultValue={editor.getAttributes("link").href ?? ""}
            placeholder="Paste a link, Enter to apply (empty removes it)"
            onKeyDown={(e) => {
              if (e.key === "Enter") setLink(e.currentTarget.value.trim());
              if (e.key === "Escape") setLinking(false);
            }}
            onBlur={() => setLinking(false)}
            className={`${fieldCls} w-80`}
          />
        ) : (
          <>
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold">
          <LuBold />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic">
          <LuItalic />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strikethrough">
          <LuStrikethrough />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} label="Inline code">
          <LuCode />
        </Btn>
        <Btn on={() => setLinking(true)} active={editor.isActive("link")} label="Link">
          <LuLink />
        </Btn>
        <span className="mx-0.5 h-4 w-px bg-white/15" />
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading">
          <LuHeading2 />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Subheading">
          <LuHeading3 />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote">
          <LuQuote />
        </Btn>
          </>
        )}
      </BubbleMenu>

      <BubbleMenu editor={editor} shouldShow={({ editor }) => editor.isActive("image")} className={`${menuCls} w-80 flex-col items-stretch gap-1.5 p-2`}>
        <ImageFields editor={editor} />
      </BubbleMenu>

      <div className="sticky top-16 z-10 mb-6 flex w-fit flex-wrap items-center gap-0.5 rounded-xl border border-neutral-200 bg-white/90 p-1 text-neutral-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/90 dark:text-neutral-300">
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading">
          <LuHeading2 />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Subheading">
          <LuHeading3 />
        </Btn>
        <Btn on={() => fileInput.current?.click()} label="Insert image at the cursor">
          <LuImage />
        </Btn>
        <span className="mx-0.5 h-4 w-px bg-current opacity-15" />
        <Btn on={() => editor.chain().focus().toggleCodeBlock().run()} label="Code block">
          <LuSquareCode />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">
          <LuQuote />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
          <LuList />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
          <LuListOrdered />
        </Btn>
        <Btn on={() => editor.chain().focus().setHorizontalRule().run()} label="Divider">
          <LuMinus />
        </Btn>
        {uploading && <span className="px-2 text-xs text-neutral-500">Uploading…</span>}
        {error && (
          <button onClick={() => setError("")} className="cursor-pointer px-2 text-xs text-red-500" title="Dismiss">
            {error} ✕
          </button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          insertImages(editor, [...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

function ImageFields({ editor }: { editor: TiptapEditor }) {
  const { title = "", alt = "" } = editor.getAttributes("image");
  const set = (attrs: Record<string, string>) => editor.chain().updateAttributes("image", attrs).run();
  return (
    <>
      <input value={title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Caption (shown under the image)" className={fieldCls} />
      <input value={alt ?? ""} onChange={(e) => set({ alt: e.target.value })} placeholder="Alt text (for screen readers)" className={fieldCls} />
    </>
  );
}

// Markdown serializers escape square brackets, which would break footnotes.
// Put [^1] references and "[^1]: …" definitions back the way they were typed.
export const fixFootnotes = (md: string) => md.replace(/\\\[\^([^\]\\]+)\\?\]/g, "[^$1]");

const menuCls = "flex items-center gap-0.5 rounded-xl border border-white/10 bg-neutral-900/95 p-1 text-neutral-300 shadow-2xl backdrop-blur";
const fieldCls = "rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/30";

function Btn({ on, active, label, children }: { on: () => void; active?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the text selection
      onClick={on}
      title={label}
      aria-label={label}
      className={`grid size-8 cursor-pointer place-items-center rounded-lg text-base transition-colors hover:bg-current/10 ${active ? "bg-current/15" : ""}`}
    >
      {children}
    </button>
  );
}
