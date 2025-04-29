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
    
    // Gestisce il focus iniziale e lo mantiene durante l'editing
    React.useEffect(() => {
      if (keepFocus && textareaRef.current) {
        // Imposta il focus quando il componente è montato
        const focusInterval = setInterval(() => {
          if (textareaRef.current && document.activeElement !== textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100); // Controlla continuamente
        
        return () => clearInterval(focusInterval);
      }
    }, [keepFocus]);
    
    // Gestisce l'evento onChange - INTERCETTA COMPLETAMENTE
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Aggiorna il valore locale
      setLocalValue(e.target.value);
      
      // Chiama l'event handler originale se fornito
      if (onChange) {
        onChange(e);
      }
    };
    
    // Gestisce l'evento onFocus - NON FARE NULLA DI SPECIALE
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (onFocus) {
        onFocus(e);
      }
    };
    
    // Gestisce l'evento onBlur - IGNORA COMPLETAMENTE SE keepFocus è true
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (keepFocus) {
        // Previeni la perdita di focus
        e.preventDefault();
        e.stopPropagation();
        
        // Rimetti il focus immediatamente
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 0);
        
        // Non chiamare l'handler originale
        return;
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
