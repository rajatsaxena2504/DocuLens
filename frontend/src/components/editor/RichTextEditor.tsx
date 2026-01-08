import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Code, Heading1, Heading2 } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { marked } from 'marked'
import { useMemo, useEffect } from 'react'

// Configure marked for safe HTML output
marked.setOptions({
  gfm: true,
  breaks: true,
})

// Check if content looks like markdown (not HTML)
function isMarkdown(content: string): boolean {
  if (!content || content.trim().startsWith('<')) return false
  // Check for common markdown patterns
  return /^#{1,6}\s|^\*\s|^-\s|^\d+\.\s|\*\*.*\*\*|__.*__|`.*`|\[.*\]\(.*\)/m.test(content)
}

// Convert markdown to HTML if needed
function toHtml(content: string): string {
  if (!content) return ''
  if (isMarkdown(content)) {
    return marked.parse(content, { async: false }) as string
  }
  return content
}

export interface RichTextEditorProps {
  content: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
}: RichTextEditorProps) {
  // Convert markdown to HTML
  const htmlContent = useMemo(() => toHtml(content), [content])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: htmlContent,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && htmlContent !== editor.getHTML()) {
      editor.commands.setContent(htmlContent)
    }
  }, [editor, htmlContent])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1.5 transition-colors',
        active ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-lg border">
      {editable && (
        <div className="flex flex-wrap gap-1 border-b bg-gray-50 p-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 w-px bg-gray-300" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 w-px bg-gray-300" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 w-px bg-gray-300" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4"
      />
    </div>
  )
}
