import { cx } from "@/shared/lib";
import { Checkbox, ChipGroup, Field, SectionRule, Select, fieldInputClass } from "@/shared/ui";
import {
  AREA_OPTIONS,
  DEFAULT_FILTERS,
  EXPERIENCE_OPTIONS,
  LABEL_OPTIONS,
  MAX_SALARY,
  SEARCH_FIELD_OPTIONS,
  WORK_FORMAT_OPTIONS,
  countActiveFilters,
  type RunFilters as Filters,
} from "../model/filters";
import type { RunForm } from "../model/useRunForm";
import styles from "./RunFilters.module.css";

interface RunFiltersProps {
  form: RunForm;
  disabled?: boolean;
}

// Фильтры выдачи hh: самые важные из панели «Фильтры» на сайте.
export const RunFilters = ({ form, disabled }: RunFiltersProps) => {
  const filters = form.values.filters;
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    form.set("filters", { ...filters, [key]: value });
  const active = countActiveFilters(filters);

  return (
    <fieldset className={styles.filters} disabled={disabled}>
      <legend className="visually-hidden">Search filters</legend>
      <div>
        <SectionRule title="FILTERS" />
        <div className={cx("t-caption", styles.head, styles.summary)}>
          <span className={styles.count}>{active ? `${active} active` : "no filters — whole hh.ru"}</span>
          <button
            type="button"
            className={cx("t-caption", styles.reset)}
            onClick={() => form.set("filters", DEFAULT_FILTERS)}
          >
            reset
          </button>
        </div>
      </div>

      <Select
        id="area"
        label="REGION"
        value={filters.area}
        options={AREA_OPTIONS}
        onChange={(v) => update("area", v)}
      />

      <ChipGroup
        label="EXPERIENCE"
        value={filters.experience}
        options={EXPERIENCE_OPTIONS}
        onChange={(v) => update("experience", v)}
      />

      <ChipGroup
        label="WORK FORMAT"
        value={filters.workFormat}
        options={WORK_FORMAT_OPTIONS}
        onChange={(v) => update("workFormat", v)}
      />

      <div className={styles.salaryRow}>
        <Field label="SALARY FROM" htmlFor="salary">
          <input
            id="salary"
            className={fieldInputClass}
            inputMode="numeric"
            placeholder="any"
            value={filters.salary ? Number(filters.salary).toLocaleString("ru-RU") : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
              update("salary", digits && String(Math.min(Number(digits), MAX_SALARY)));
            }}
          />
          <span className={styles.unit} aria-hidden="true">
            ₽
          </span>
        </Field>
        <Checkbox
          label="only with salary specified"
          checked={filters.onlyWithSalary}
          onChange={(v) => update("onlyWithSalary", v)}
        />
      </div>

      <ChipGroup
        label="SEARCH ONLY IN"
        value={filters.searchFields}
        options={SEARCH_FIELD_OPTIONS}
        onChange={(v) => update("searchFields", v)}
      />

      <Field label="EXCLUDE WORDS" htmlFor="excluded" hint="comma separated">
        <input
          id="excluded"
          className={fieldInputClass}
          placeholder="e.g. senior, lead"
          maxLength={200}
          value={filters.excludedText}
          onChange={(e) => update("excludedText", e.target.value)}
        />
      </Field>

      <fieldset className={styles.group}>
        <legend className={cx("t-label", styles.legend)}>OTHER</legend>
        <div className={styles.others}>
          {LABEL_OPTIONS.map((o) => (
            <Checkbox
              key={o.value}
              label={o.label}
              checked={filters.labels.includes(o.value)}
              onChange={(on) =>
                update(
                  "labels",
                  on ? [...filters.labels, o.value] : filters.labels.filter((l) => l !== o.value),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    </fieldset>
  );
};
