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
      // Per prevenire il blocco dell'interfaccia, controlliamo se il focus è andato
      // a un elemento dentro il form o se è un click volontario fuori
      if (keepFocus) {
        // Usiamo setTimeout per dare tempo al browser di stabilire il nuovo focus 
        // prima di decidere se riportare il focus al textarea
        setTimeout(() => {
          // Solo se il textarea esiste ancora e non c'è un altro elemento attivo nel form
          const activeElement = document.activeElement;
          const isActiveElementInForm = activeElement && 
            (activeElement.tagName === 'TEXTAREA' || 
             activeElement.tagName === 'INPUT' ||
             activeElement.tagName === 'BUTTON' ||
             activeElement.tagName === 'SELECT');
            
          // Se nessun elemento del form ha il focus e il textarea esiste ancora
          if (textareaRef.current && !isActiveElementInForm) {
            // Controlliamo se l'utente ha fatto click su un pulsante di salvataggio o chiusura
            const clickedOnButton = activeElement && 
              activeElement.tagName === 'BUTTON' &&
              (activeElement.textContent?.includes('Chiudi') || 
               activeElement.textContent?.includes('Salva'));
               
            // Riportiamo il focus solo se non è un click su un pulsante di azione
            if (!clickedOnButton) {
              textareaRef.current.focus();
            }
          }
        }, 10);
      }
      
      // Chiamiamo l'evento onBlur originale se fornito
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
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
