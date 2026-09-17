import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, Palette, Type, Eye, EyeOff } from 'lucide-react'
import type { TipTapDoc } from '../types'

interface RichTextEditorPanelProps {
  content: TipTapDoc
  focusMode?: boolean
  onContentChange: (content: TipTapDoc) => void
  onFocusModeToggle?: () => void
}

export default function RichTextEditorPanel({
  content,
  focusMode = false,
  onContentChange,
  onFocusModeToggle,
}: RichTextEditorPanelProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      FontFamily,
      Color,
      Placeholder.configure({ placeholder: 'Start writing or type a heading...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON() as TipTapDoc)
    },
  })

  useEffect(() => {
    if (editor) {
      const currentJson = editor.getJSON()
      if (JSON.stringify(currentJson) !== JSON.stringify(content)) {
        editor.commands.setContent(content, { emitUpdate: false })
      }
    }
  }, [content, editor])

  if (!editor) return null

  const casualFont = 'Comic Sans MS, Comic Sans'
  const casualFontActive = editor.isActive('textStyle', { fontFamily: casualFont })

  return (
    <section className={`workspace-panel full-bleed-editor ${focusMode ? 'focus-mode' : ''}`}>
      <div className="editor-toolbar">
        <button
          className={`icon-button ${editor.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          className={`icon-button ${editor.isActive('italic') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={15} />
        </button>

        <div className="toolbar-divider" />

        <button
          className={`icon-button ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Chapter (H1)"
        >
          <Heading1 size={15} />
        </button>
        <button
          className={`icon-button ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Subchapter (H2)"
        >
          <Heading2 size={15} />
        </button>
        <button
          className={`icon-button ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Section (H3)"
        >
          <Heading3 size={15} />
        </button>

        <div className="toolbar-divider" />

        <button
          className={`icon-button ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <AlignLeft size={15} />
        </button>
        <button
          className={`icon-button ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <AlignCenter size={15} />
        </button>
        <button
          className={`icon-button ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <AlignRight size={15} />
        </button>

        <div className="toolbar-divider" />

        <button
          className={`icon-button ${casualFontActive ? 'is-active' : ''}`}
          onClick={() => {
            const chain = editor.chain().focus()
            if (casualFontActive) {
              chain.unsetFontFamily().run()
            } else {
              chain.setFontFamily(casualFont).run()
            }
          }}
          title="Casual Font"
        >
          <Type size={15} />
        </button>
        <button
          className="icon-button"
          onClick={() => editor.chain().focus().setColor('#067044').run()}
          title="Brand Color"
        >
          <Palette size={15} color="#067044" />
        </button>
        <button
          className="icon-button"
          onClick={() => editor.chain().focus().setColor('#1f2421').run()}
          title="Reset Color"
        >
          <Palette size={15} />
        </button>

        <div className="toolbar-divider" />

        {onFocusModeToggle && (
          <button
            className={`icon-button ${focusMode ? 'is-active' : ''}`}
            onClick={onFocusModeToggle}
            title={focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
          >
            {focusMode ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>

      <div className="editor-surface">
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .full-bleed-editor .ProseMirror {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 1rem;
          line-height: 1.6;
          color: #1f2421;
          min-height: 100%;
          padding: 2rem;
          outline: none;
        }
        .focus-mode .ProseMirror {
          max-width: 48rem;
          margin: 0 auto;
          box-shadow: none;
        }
        .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror p {
          margin-bottom: 1rem;
        }
      `}</style>
    </section>
  )
}