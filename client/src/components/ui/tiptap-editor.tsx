import { useCallback, useEffect, useState, useRef, ChangeEvent } from 'react';
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
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Image as ImageIcon, 
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, Heading1, Heading2, Heading3, Type, Package,
  Upload, FileText, Palette, ArrowUpFromLine, Square, ChevronsUpDown, 
  TextCursorInput, Wand2, PaintBucket, Baseline
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  // File input reference per importazione testo
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stato per altezza editor
  const [editorHeight, setEditorHeight] = useState(200);
  // Stato per colore di sfondo
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  // Stato per interlinea
  const [lineHeight, setLineHeight] = useState(1.5);
  // Stato per dimensione del testo
  const [fontSize, setFontSize] = useState(16);
  
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
      TextStyle,
      Color,
      Underline,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  
  // Funzione per importare testo da file txt
  const handleImportText = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!editor || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    if (file.type !== 'text/plain') {
      alert('Per favore, seleziona un file di testo (.txt)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      editor.commands.setContent(content);
    };
    reader.readAsText(file);
    
    // Reset del campo file
    if (event.target) {
      event.target.value = '';
    }
  }, [editor]);
  
  // Funzione per cambiare colore del testo
  const setTextColor = useCallback((color: string) => {
    if (!editor) return;
    
    editor.chain().focus().setColor(color).run();
  }, [editor]);
  
  // Funzione per applicare uno stile predefinito
  const applyTextStyle = useCallback((style: string) => {
    if (!editor) return;
    
    switch(style) {
      case 'title':
        editor.chain().focus().toggleBold().setColor('#000').run();
        editor.commands.updateAttributes('paragraph', { 
          style: 'font-size: 24px; font-weight: bold;' 
        });
        break;
      case 'subtitle':
        editor.chain().focus().toggleBold().setColor('#444').run();
        editor.commands.updateAttributes('paragraph', { 
          style: 'font-size: 18px;' 
        });
        break;
      case 'warning':
        editor.chain().focus().toggleBold().setColor('#e74c3c').run();
        editor.commands.updateAttributes('paragraph', { 
          style: 'font-size: 16px;' 
        });
        break;
      case 'info':
        editor.chain().focus().setColor('#3498db').run();
        editor.commands.updateAttributes('paragraph', { 
          style: 'font-size: 16px;' 
        });
        break;
      case 'note':
        editor.chain().focus().toggleItalic().setColor('#7f8c8d').run();
        editor.commands.updateAttributes('paragraph', { 
          style: 'font-size: 14px;' 
        });
        break;
      default:
        editor.chain().focus().unsetColor().run();
        editor.commands.updateAttributes('paragraph', { style: '' });
    }
  }, [editor]);

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
            title="Grassetto"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-neutral-light/50' : ''}
            title="Corsivo"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'bg-neutral-light/50' : ''}
            title="Sottolineato"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          
          <span className="w-px h-6 mx-1 bg-neutral-light"></span>
          
          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative" title="Colore testo">
                <Palette className="h-4 w-4" />
                <span 
                  className="absolute bottom-0 right-0 rounded-full w-2 h-2 border border-white"
                  style={{ 
                    backgroundColor: editor.getAttributes('textStyle').color || '#000000',
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-2">
                {['#000000', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', 
                '#9b59b6', '#1abc9c', '#34495e', '#e67e22', '#7f8c8d'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded-full border border-neutral-light"
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Line color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Colora riga corrente">
                <Baseline className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-2">
                {['#f8f9fa', '#e9ecef', '#fff3cd', '#d1e7dd', '#cfe2ff', 
                '#f8d7da', '#e0cffc', '#ffd6a5', '#caffbf', 'transparent'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded-full border border-neutral-light"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      if (!editor) return;
                      editor.commands.updateAttributes('paragraph', { 
                        style: `background-color: ${color};` 
                      });
                    }}
                    title={color === 'transparent' ? 'Rimuovi colore' : color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Background color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Colore sfondo testo">
                <Square className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-2 mb-2">
                {['transparent', '#f8f9fa', '#e9ecef', '#fff3cd', '#d1e7dd', 
                '#cfe2ff', '#f8d7da', '#e0cffc', '#ffd6a5', '#caffbf'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded-full border border-neutral-light"
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                    title={color === 'transparent' ? 'Trasparente' : color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Height adjustment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Altezza editor">
                <ArrowUpFromLine className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <Label className="mb-2 block">Altezza dell'editor</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[editorHeight]}
                  min={100}
                  max={500}
                  step={10}
                  onValueChange={(values) => setEditorHeight(values[0])}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{editorHeight}px</span>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Line height adjustment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Interlinea">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <Label className="mb-2 block">Interlinea</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[lineHeight * 10]}
                  min={10}
                  max={30}
                  step={1}
                  onValueChange={(values) => setLineHeight(values[0] / 10)}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{lineHeight.toFixed(1)}</span>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Font size adjustment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Dimensione testo">
                <TextCursorInput className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <Label className="mb-2 block">Dimensione testo</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[fontSize]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={(values) => setFontSize(values[0])}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{fontSize}px</span>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Text import */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Importa testo da file .txt"
          >
            <FileText className="h-4 w-4" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportText}
              accept=".txt"
              className="hidden"
            />
          </Button>
          
          <span className="w-px h-6 mx-1 bg-neutral-light"></span>
          
          {/* Text styling presets */}
          <Select onValueChange={applyTextStyle}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Stile di testo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normale</SelectItem>
              <SelectItem value="title">Titolo</SelectItem>
              <SelectItem value="subtitle">Sottotitolo</SelectItem>
              <SelectItem value="warning">Avviso</SelectItem>
              <SelectItem value="info">Informazione</SelectItem>
              <SelectItem value="note">Nota</SelectItem>
            </SelectContent>
          </Select>
          
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
          
          <Button variant="ghost" size="sm" onClick={setLink} title="Inserisci o modifica link">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={addImage} title="Inserisci immagine">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={addTable} title="Inserisci tabella">
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div>
        <EditorContent 
          editor={editor} 
          className={`p-4 prose max-w-none focus:outline-none ${editable ? 'resizable-editor' : ''}`}
          style={{ 
            minHeight: `${editorHeight}px`, 
            backgroundColor: backgroundColor,
            lineHeight: lineHeight,
            fontSize: `${fontSize}px`
          }}
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
