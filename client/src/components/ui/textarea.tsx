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
    // Gestiamo l'evento onBlur per mantenere il focus se richiesto
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (keepFocus) {
        e.target.focus();
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
        ref={ref}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
