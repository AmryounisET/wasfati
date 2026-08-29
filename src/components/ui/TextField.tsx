import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FieldLabelProps {
  label?: string;
  labelEn?: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
}

function FieldLabel({ label, labelEn, required, htmlFor }: FieldLabelProps) {
  if (!label && !labelEn) return null;
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      {label && (
        <label htmlFor={htmlFor} className="text-bodym font-semibold text-ink-900">
          {label}
          {required && <span className="text-danger-500"> *</span>}
        </label>
      )}
      {labelEn && <span className="text-caption text-ink-500">{labelEn}</span>}
    </div>
  );
}

const fieldBase =
  "w-full rounded-md border bg-surface-card px-4 text-bodyl text-ink-900 placeholder:text-ink-500 " +
  "transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-primary-300";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelEn?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ className, label, labelEn, error, required, id, ...props }, ref) => {
    return (
      <div>
        <FieldLabel label={label} labelEn={labelEn} required={required} htmlFor={id} />
        <input
          ref={ref}
          id={id}
          required={required}
          className={cn(
            fieldBase,
            "h-12",
            error ? "border-danger-500" : "border-ink-300 focus:border-primary-500",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-caption text-danger-500">{error}</p>}
      </div>
    );
  },
);
TextField.displayName = "TextField";

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelEn?: string;
  error?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ className, label, labelEn, error, required, id, rows = 3, ...props }, ref) => {
    return (
      <div>
        <FieldLabel label={label} labelEn={labelEn} required={required} htmlFor={id} />
        <textarea
          ref={ref}
          id={id}
          required={required}
          rows={rows}
          className={cn(
            fieldBase,
            "py-3",
            error ? "border-danger-500" : "border-ink-300 focus:border-primary-500",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-caption text-danger-500">{error}</p>}
      </div>
    );
  },
);
TextAreaField.displayName = "TextAreaField";
