import type { InputHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import { fieldInputClass } from "../Field/fieldInputClass";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string | undefined;
}

export const TextField = ({ id, label, error, ...input }: TextFieldProps) => (
  <Field label={label} htmlFor={id} error={error}>
    <input
      id={id}
      className={fieldInputClass}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-hint` : undefined}
      {...input}
    />
  </Field>
);
