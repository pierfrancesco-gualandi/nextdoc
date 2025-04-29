import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Funzione speciale per mantenere il focus quando perso
   */
  keepFocus?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, keepFocus, onBlur, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    // Combiniamo il ref fornito con il nostro ref interno
    const handleRef = (element: HTMLTextAreaElement) => {
      textareaRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };
    
    // Stato per tenere traccia se stiamo modificando il testo
    const [isEditing, setIsEditing] = React.useState(false);
    
    // Evento per l'inizio dell'editing
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };
    
    // Gestiamo l'evento onBlur in modo più sofisticato
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (!keepFocus) {
        if (onBlur) {
          onBlur(e);
        }
        setIsEditing(false);
        return;
      }
      
      // Preveniamo il comportamento standard
      e.preventDefault();
      
      // Chiamiamo l'evento onBlur originale se fornito
      if (onBlur) {
        onBlur(e);
      }
      
      // Manteniamo il focus attivo solo se siamo in modalità editing
      if (isEditing) {
        // Usiamo setTimeout per dare precedenza agli eventi del browser
        setTimeout(() => {
          // Verifichiamo se l'elemento che ha ricevuto il focus è un pulsante di azione
          const activeElement = document.activeElement;
          
          // Lista di classi e attributi che identificano i pulsanti di chiusura/salvataggio
          const isCloseButton = activeElement && 
            (activeElement.textContent?.includes('Chiudi') || 
             activeElement.textContent?.includes('Salva') ||
             activeElement.textContent?.includes('Annulla') ||
             activeElement.classList.contains('accordion-trigger') ||
             activeElement.getAttribute('aria-label')?.includes('Close'));
          
          // Se non è un pulsante di chiusura, manteniamo il focus
          if (!isCloseButton && textareaRef.current) {
            textareaRef.current.focus();
          } else {
            // Altrimenti terminiamo l'editing
            setIsEditing(false);
          }
        }, 0);
      }
    };
    
    // Gestiamo anche l'evento onChange per aggiornare immediatamente lo stato del componente padre
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (props.onChange) {
        props.onChange(e);
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
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
