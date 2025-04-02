import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon, 
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, Heading1, Heading2, Heading3, Type, Package
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  sectionId?: number;
}

export function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = 'Inizia a scrivere...',
  editable = true,
  sectionId
}: TiptapEditorProps) {
  // Fetch section components if sectionId is provided
  const { data: sectionComponents } = useQuery<any[]>({
    queryKey: [`/api/sections/${sectionId}/components`],
    enabled: !!sectionId
  });
  
  // Stato per mostrare i componenti BOM
  const [bomComponents, setBomComponents] = useState<any[]>([]);

  // Aggiorna i componenti BOM quando arrivano dal server
  useEffect(() => {
    if (sectionComponents && sectionComponents.length > 0) {
      // Arricchisci con informazioni sui componenti
      Promise.all(sectionComponents.map(async (link) => {
        if (link.component) {
          return {
            id: link.componentId,
            code: link.component.code,
            description: link.component.description,
            quantity: link.quantity,
            notes: link.notes
          };
        }
        
        // Se il componente non è embedded nella risposta, lo recuperiamo
        try {
          const response = await fetch(`/api/components/${link.componentId}`);
          if (response.ok) {
            const component = await response.json();
            return {
              id: link.componentId,
              code: component.code,
              description: component.description,
              quantity: link.quantity,
              notes: link.notes
            };
          }
        } catch (error) {
          console.error('Error fetching component:', error);
        }
        
        return {
          id: link.componentId,
          code: 'N/A',
          description: 'Componente non disponibile',
          quantity: link.quantity,
          notes: link.notes
        };
      }))
      .then((components) => {
        setBomComponents(components);
      });
    } else {
      setBomComponents([]);
    }
  }, [sectionComponents]);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    
    const url = window.prompt('URL dell\'immagine');
    
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    
    editor.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-neutral-light rounded-md overflow-hidden">
      {editable && (
        <div className="bg-neutral-lightest border-b border-neutral-light p-2 flex flex-wrap gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-neutral-light/50' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-neutral-light/50' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-neutral-light/50' : ''}
          >
            <Underline className="h-4 w-4" />
          </Button>
          
          <span className="w-px h-6 mx-1 bg-neutral-light"></span>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-neutral-light/50' : ''}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-neutral-light/50' : ''}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'bg-neutral-light/50' : ''}
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={editor.isActive('paragraph') ? 'bg-neutral-light/50' : ''}
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <span className="w-px h-6 mx-1 bg-neutral-light"></span>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-neutral-light/50' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-neutral-light/50' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <span className="w-px h-6 mx-1 bg-neutral-light"></span>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-light/50' : ''}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-light/50' : ''}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'bg-neutral-light/50' : ''}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'bg-neutral-light/50' : ''}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
          
          <span className="w-px h-6 mx-1 bg-neutral-light"></span>
          
          <Button variant="ghost" size="sm" onClick={setLink}>
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={addTable}>
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div>
        <EditorContent 
          editor={editor} 
          className={`p-4 prose max-w-none focus:outline-none min-h-[200px] ${editable ? 'resizable-editor' : ''}`}
        />
        
        {/* Visualizzazione dei componenti BOM associati alla sezione */}
        {bomComponents.length > 0 && (
          <div className="border-t border-neutral-light bg-blue-50 p-3">
            <div className="flex items-center mb-2 text-blue-800">
              <Package className="h-4 w-4 mr-1" />
              <span className="font-medium text-sm">Componenti associati ({bomComponents.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {bomComponents.map((component) => (
                <div 
                  key={component.id}
                  className="bg-white border border-blue-200 rounded p-2 text-sm flex items-start"
                >
                  <div className="text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded-md mr-2 flex-shrink-0">
                    {component.code}
                  </div>
                  <div>
                    <div className="font-medium">{component.description}</div>
                    {component.notes && (
                      <div className="text-neutral-medium mt-1">{component.notes}</div>
                    )}
                    {component.quantity > 1 && (
                      <div className="text-neutral-dark mt-1">
                        Quantità: {component.quantity}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
