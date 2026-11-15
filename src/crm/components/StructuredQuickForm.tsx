import { useState, type FormEvent } from "react";

export type StructuredFormField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "number"
    | "date"
    | "time"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  wide?: boolean;
};

export type StructuredFormSection = {
  title: string;
  description?: string;
  fields: StructuredFormField[];
};

export type StructuredQuickFormProps = {
  submitLabel: string;
  sections: StructuredFormSection[];
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  requiredDefault?: boolean;
};

export function StructuredQuickForm({
  submitLabel,
  sections,
  onSubmit,
  requiredDefault = true,
}: StructuredQuickFormProps) {
  const [error, setError] = useState("");

  // Con noValidate la validazione nativa non blocca più il submit in silenzio:
  // i campi mancanti vengono detti qui, dentro la pagina.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const missing = [...form.elements].filter(
      (element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) &&
        element.willValidate &&
        !element.checkValidity(),
    );

    if (missing.length) {
      const labels = new Map(sections.flatMap((section) => section.fields).map((field) => [field.name, field.label]));
      const names = missing.map((element) => labels.get(element.name) || element.name);
      setError(names.length === 1 ? `Manca: ${names[0]}.` : `Mancano: ${names.join(", ")}.`);
      const first = missing[0];
      const container = first.closest("details");
      if (container && !container.open) {
        container.open = true;
      }
      first.scrollIntoView({ block: "center", behavior: "smooth" });
      first.focus({ preventScroll: true });
      return;
    }

    setError("");
    const formData = new FormData(form);
    const values = sections
      .flatMap((section) => section.fields)
      .reduce<Record<string, string>>((result, field) => {
        result[field.name] =
          field.type === "checkbox"
            ? formData.has(field.name)
              ? "Si"
              : "No"
            : String(formData.get(field.name) ?? "").trim();
        return result;
      }, {});

    await onSubmit(values);
    form.reset();
  }

  return (
    <form
      className="quick-form structured-form"
      noValidate
      onChange={() => { if (error) setError(""); }}
      onSubmit={handleSubmit}
    >
      {sections.map((section, sectionIndex) => (
        <details key={`${section.title}-${sectionIndex}`} open>
          <summary>{section.title}</summary>
          {section.description ? <p>{section.description}</p> : null}

          <div className="structured-fields">
          {section.fields.map((field) => {
            const type = field.type ?? "text";
            const required = field.required ?? requiredDefault;
            const fieldClassName = field.wide ? "wide" : undefined;

            return (
              <label className={fieldClassName} key={field.name}>
                {field.label}

                {type === "textarea" ? (
                  <textarea
                    name={field.name}
                    placeholder={field.placeholder}
                    required={required}
                  />
                ) : type === "select" ? (
                  <select
                    defaultValue=""
                    name={field.name}
                    required={required}
                  >
                    <option disabled={required} value="">
                      {field.placeholder || (required ? "Seleziona…" : "Non specificato")}
                    </option>
                    {(field.options ?? []).filter(Boolean).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    placeholder={field.placeholder}
                    required={required}
                    step={type === "number" ? "any" : undefined}
                    type={type}
                  />
                )}
              </label>
            );
          })}
          </div>
        </details>
      ))}

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button className="form-button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
