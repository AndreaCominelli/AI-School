import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Etichetta sopra il campo */
  label?: string;
  /** Testo di aiuto sotto il campo */
  hint?: string;
  /** Messaggio di errore: sostituisce l'hint e colora il bordo */
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className = "", ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  const message = error ?? hint;

  return (
    <div className={`ds-field ${error ? "ds-field--error" : ""} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ds-field__label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className="ds-field__input"
        aria-invalid={!!error}
        aria-describedby={message ? messageId : undefined}
        {...rest}
      />
      {message && (
        <span id={messageId} className="ds-field__hint">
          {message}
        </span>
      )}
    </div>
  );
});
