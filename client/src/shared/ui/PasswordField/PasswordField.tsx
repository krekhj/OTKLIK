import { useState, type InputHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import { fieldInputClass } from "../Field/fieldInputClass";
import { EyeIcon, EyeOffIcon } from "../Icon/Icon";
import styles from "./PasswordField.module.css";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  id: string;
  label: string;
  error?: string | undefined;
}

export const PasswordField = ({ id, label, error, ...input }: PasswordFieldProps) => {
  const [shown, setShown] = useState(false);

  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        type={shown ? "text" : "password"}
        className={fieldInputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-hint` : undefined}
        {...input}
      />
      <button
        type="button"
        className={styles.toggle}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown(!shown)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </Field>
  );
};
