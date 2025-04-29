import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Funzione speciale per mantenere il focus quando perso
   */
  keepFocus?: boolean;
}

// COMPONENTE TEXTAREA COMPLETAMENTE RISCRITTO
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, keepFocus = false, onBlur, onFocus, onChange, value, ...props }, ref) => {
    // Creiamo un ref interno
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    // Stato locale per il valore - SOLUZIONE DRACONIANA
    const [localValue, setLocalValue] = React.useState(value || "");
    
    // SOLUZIONE RADICALE: Aggiorniamo sempre il valore locale quando cambia il prop
    React.useEffect(() => {
      if (value !== undefined) {
        setLocalValue(value);
      }
    }, [value]);
    
    // Combina refs
    const handleRef = (element: HTMLTextAreaElement) => {
      textareaRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
        // Flag per controllare se è in corso una modifica attiva
    const [isEditing, setIsEditing] = React.useState(false);
    
    // Gestisce il focus solo quando siamo in modalità editing
    React.useEffect(() => {
      // Solo se keepFocus è true E siamo in fase di editing
      if (keepFocus && isEditing && textareaRef.current) {
        // Strategia più gentile: controlla solo occasionalmente
        const focusInterval = setInterval(() => {
          if (textareaRef.current && document.activeElement !== textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 300); // Controlla meno frequentemente
        
        return () => clearInterval(focusInterval);
      }
    }, [keepFocus, isEditing]);
    
    // Gestisce l'evento onChange - INTERCETTA COMPLETAMENTE
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Aggiorna il valore locale
      setLocalValue(e.target.value);
      
      // Segnala che siamo in fase di editing
      setIsEditing(true);
      
      // Chiama l'event handler originale se fornito
      if (onChange) {
        onChange(e);
      }
    };
    
    // Gestisce l'evento onFocus - Attiva la modalità editing
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      if (onFocus) {
        onFocus(e);
      }
    };
    
    // Gestisce l'evento onBlur - COMPLETAMENTE SEMPLIFICATO
    // La tenuta del focus è ora gestita dal componente TranslationEditableField
    // e dall'uso di editingModuleStates
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Se lo stato globale mi dice di NON mantenere il focus, fallo perdere normalmente
      if (typeof window !== 'undefined' && (window as any).preventTextareaFocus) {
        // Chiama l'event handler originale e basta
        if (onBlur) {
          onBlur(e);
        }
        return;
      }
      
      // Altrimenti, se keepFocus è true e siamo in editing, manteniamo il focus
      if (keepFocus && isEditing) {
        // Previeni default solo se il parametro keepFocus è true
        e.preventDefault();
      }
      
      // Se non dobbiamo mantenere il focus, chiama l'handler originale
      if (onBlur) {
        onBlur(e);
      }
    };
    
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={handleRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        value={localValue}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
