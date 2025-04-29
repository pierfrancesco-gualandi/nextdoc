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
    
    // Gestiamo l'evento onBlur in modo più sofisticato
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Chiamiamo l'evento onBlur originale se fornito
      if (onBlur) {
        onBlur(e);
      }
      
      // Per prevenire il blocco dell'interfaccia, controlliamo se il focus è andato
      // a un elemento dentro il form o se è un click volontario fuori
      if (keepFocus) {
        // Manteniamo una copia dello stato del textarea prima di qualsiasi modifica
        const currentValue = textareaRef.current?.value;
        const currentSelectionStart = textareaRef.current?.selectionStart;
        const currentSelectionEnd = textareaRef.current?.selectionEnd;
        
        // Usiamo requestAnimationFrame per assicurarci che il browser abbia completato 
        // il ridisegno prima di decidere se riportare il focus al textarea
        requestAnimationFrame(() => {
          // Solo se il textarea esiste ancora
          if (textareaRef.current) {
            // Verifichiamo se il focus è andato ad un elemento interattivo
            const activeElement = document.activeElement;
            const isInteractiveElement = activeElement && 
              (activeElement.tagName === 'TEXTAREA' || 
               activeElement.tagName === 'INPUT' ||
               activeElement.tagName === 'BUTTON' ||
               activeElement.tagName === 'SELECT' ||
               activeElement.tagName === 'A' ||
               activeElement.hasAttribute('contenteditable'));
              
            // Verifichiamo se è un elemento nel nostro form o un bottone di azione
            const isButtonWithAction = activeElement && 
              activeElement.tagName === 'BUTTON' &&
              (activeElement.textContent?.includes('Chiudi') || 
               activeElement.textContent?.includes('Salva') ||
               activeElement.textContent?.includes('Annulla'));
               
            // Riportiamo il focus solo se non è un click su un elemento interattivo del form
            if (!isInteractiveElement && !isButtonWithAction) {
              // Riportiamo il focus e reimpostiamo la posizione del cursore
              textareaRef.current.focus();
              
              // Ripristiniamo la posizione del cursore
              if (currentSelectionStart !== undefined && currentSelectionEnd !== undefined) {
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart = currentSelectionStart;
                    textareaRef.current.selectionEnd = currentSelectionEnd;
                  }
                }, 0);
              }
            }
          }
        });
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
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
