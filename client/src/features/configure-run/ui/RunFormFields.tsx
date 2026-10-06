import { cx } from "@/shared/lib";
import {
  PasswordField,
  SectionRule,
  Segmented,
  Stepper,
  TagInput,
  TextArea,
  TextField,
} from "@/shared/ui";
import type { RunForm } from "../model/useRunForm";
import { RUN_LIMITS, type RunFormErrors } from "../model/validate";
import styles from "./RunFormFields.module.css";

interface RunFormFieldsProps {
  form: RunForm;
  disabled?: boolean;
  // ошибки, пришедшие не из формы (например, hh отклонил логин)
  extraErrors?: RunFormErrors;
}

export const RunFormFields = ({ form, disabled, extraErrors }: RunFormFieldsProps) => {
  const { values, set } = form;
  const errors = { ...extraErrors, ...form.errors };

  return (
    <fieldset disabled={disabled} className={styles.fieldset}>
      <legend className="visually-hidden">Run settings</legend>

      <SectionRule
        index="01"
        title="ACCOUNT"
        className={styles.rule}
        aside={
          <Segmented
            name="auth-mode"
            label="Sign-in method"
            value={values.authMode}
            options={[
              { value: "password", label: "PASSWORD" },
              { value: "code", label: "EMAIL CODE" },
            ]}
            onChange={(mode) => set("authMode", mode)}
          />
        }
      />
      <div className={values.authMode === "password" ? styles.gap48 : styles.gap64}>
        <TextField
          id="login"
          label="HH LOGIN"
          type="email"
          autoComplete="username"
          placeholder="email"
          value={values.login}
          error={errors.login}
          onChange={(e) => set("login", e.target.value)}
        />
        {values.authMode === "code" && (
          <p className={cx("t-caption", styles.note)}>
            hh.ru will email you a code — type it here when the bot asks. this browser is
            remembered, so next runs usually skip the code.
          </p>
        )}
      </div>
      {values.authMode === "password" && (
      <div className={styles.gap64}>
        <PasswordField
          id="password"
          label="PASSWORD"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          error={errors.password}
          onChange={(e) => set("password", e.target.value)}
        />
      </div>
      )}

      <SectionRule index="02" title="SEARCH" className={styles.rule} />
      <div className={styles.gap48}>
        <TagInput
          id="keywords"
          label="SEARCH KEYWORDS"
          value={values.keywords}
          onChange={(k) => set("keywords", k)}
          max={RUN_LIMITS.keywords}
          maxLength={RUN_LIMITS.keywordLength}
          placeholder="add keyword"
          emptyPlaceholder="e.g. frontend, react"
          error={errors.keywords}
        />
      </div>
      <div className={styles.gap64}>
        <Stepper
          label="NUMBER OF APPLICATIONS"
          value={values.count}
          onChange={(n) => set("count", n)}
          min={RUN_LIMITS.minCount}
          max={RUN_LIMITS.maxCount}
          presets={[10, 20, 50, 100]}
          unit={`per run · max ${RUN_LIMITS.maxCount}`}
        />
      </div>

      <SectionRule index="03" title="COVER LETTER" className={styles.rule} />
      <div className={styles.gap56}>
        <TextArea
          id="letter"
          label="LETTER"
          aside="OPTIONAL"
          note={errors.coverLetter ? `ERR · ${errors.coverLetter}` : "plain text · sent with every application"}
          maxLength={RUN_LIMITS.letter}
          placeholder="hi! i'm interested in this role. leave blank to use our default template."
          value={values.coverLetter}
          onChange={(e) => set("coverLetter", e.target.value)}
        />
      </div>
    </fieldset>
  );
};
