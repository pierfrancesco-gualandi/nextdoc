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
    
    // Memorizziamo l'ultimo valore dell'input per rilevare modifiche effettive
    const [lastValue, setLastValue] = React.useState(props.value || props.defaultValue || "");
    
    // Evento per l'inizio dell'editing
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsEditing(true);
      // Memorizziamo il valore iniziale quando otteniamo il focus
      setLastValue(e.target.value);
      if (props.onFocus) {
        props.onFocus(e);
      }
    };
    
    // Gestiamo l'evento keydown per identificare attività di editing
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Contrassegna esplicitamente che c'è stata attività di modifica
      setIsEditing(true);
      
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };
    
    // Gestiamo l'evento onBlur in modo più sofisticato
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Se non dobbiamo mantenere il focus, procediamo normalmente
      if (!keepFocus) {
        if (onBlur) {
          onBlur(e);
        }
        setIsEditing(false);
        return;
      }
      
      // Chiamiamo l'evento onBlur originale se fornito
      if (onBlur) {
        onBlur(e);
      }
      
      // Otteniamo il target dell'evento blur
      const currentTarget = e.currentTarget;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Identifichiamo gli elementi interattivi che dovrebbero terminare l'editing
      const isInteractive = relatedTarget && (
        relatedTarget.tagName === 'BUTTON' ||
        relatedTarget.tagName === 'A' ||
        relatedTarget.role === 'button' ||
        relatedTarget.classList.contains('accordion-trigger') ||
        relatedTarget.getAttribute('aria-label')?.includes('Close')
      );
      
      // Se ci stiamo spostando verso un elemento interattivo, terminiamo l'editing
      if (isInteractive) {
        setIsEditing(false);
        return;
      }
      
      // Manteniamo il focus attivo solo se siamo in modalità editing 
      // e il valore è cambiato rispetto all'inizio dell'editing
      if (isEditing && currentTarget.value !== lastValue) {
        // Usiamo requestAnimationFrame invece di setTimeout 
        // per una miglior sincronizzazione con il rendering del browser
        requestAnimationFrame(() => {
          // Verifichiamo se l'elemento che ha ricevuto il focus è un pulsante di azione
          const activeElement = document.activeElement;
          
          // Lista di classi e attributi che identificano i pulsanti di chiusura/salvataggio
          const isCloseButton = activeElement && (
            activeElement.tagName === 'BUTTON' ||
            activeElement.getAttribute('role') === 'button' ||
            activeElement.classList.contains('accordion-trigger') ||
            (activeElement.textContent && (
              activeElement.textContent.includes('Chiudi') || 
              activeElement.textContent.includes('Salva') ||
              activeElement.textContent.includes('Annulla')
            )) ||
            activeElement.getAttribute('aria-label')?.includes('Close')
          );
          
          // Se non è un pulsante di chiusura, manteniamo il focus
          if (!isCloseButton && textareaRef.current && document.body.contains(textareaRef.current)) {
            // Memorizziamo la posizione del cursore prima di perdere il focus
            const start = currentTarget.selectionStart;
            const end = currentTarget.selectionEnd;
            
            // Ripristiniamo il focus
            textareaRef.current.focus();
            
            // Ripristiniamo la posizione del cursore
            try {
              textareaRef.current.setSelectionRange(start, end);
            } catch (e) {
              console.warn("Impossibile ripristinare la posizione del cursore", e);
            }
          } else {
            // Altrimenti terminiamo l'editing
            setIsEditing(false);
          }
        });
      }
    };
    
    // Gestiamo anche l'evento onChange per aggiornare immediatamente lo stato 
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Impostiamo esplicitamente che siamo in modalità editing
      setIsEditing(true);
      
      if (props.onChange) {
        props.onChange(e);
      }
    };
    
    // Verifichiamo se il componente è montato
    const isMounted = React.useRef(true);
    React.useEffect(() => {
      return () => {
        isMounted.current = false;
      };
    }, []);
    
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
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
