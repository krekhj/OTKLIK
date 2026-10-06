import { useState, type KeyboardEvent } from "react";
import { Field } from "../Field/Field";
import { fieldInputClass } from "../Field/fieldInputClass";
import { CloseIcon } from "../Icon/Icon";
import { cx } from "@/shared/lib";
import styles from "./TagInput.module.css";

interface TagInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  maxLength?: number;
  placeholder?: string;
  emptyPlaceholder?: string;
  error?: string | undefined;
}

export const TagInput = ({
  id,
  label,
  value,
  onChange,
  max,
  maxLength,
  placeholder,
  emptyPlaceholder,
  error,
}: TagInputProps) => {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim();
    setDraft("");
    if (!tag || value.length >= max) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={`press enter to add · ${value.length} / ${max}`}
      rowClassName={styles.row}
    >
      {value.map((tag) => (
        <span key={tag} className={styles.pill}>
          {tag}
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            <CloseIcon />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        className={cx(fieldInputClass, styles.input)}
        placeholder={value.length ? placeholder : (emptyPlaceholder ?? placeholder)}
        value={draft}
        maxLength={maxLength}
        disabled={value.length >= max}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </Field>
  );
};
