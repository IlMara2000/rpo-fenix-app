import type { FormEvent } from "react";

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
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
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
    <form className="quick-form" onSubmit={handleSubmit}>
      {sections.map((section, sectionIndex) => (
        <details key={`${section.title}-${sectionIndex}`} open>
          <summary>{section.title}</summary>
          {section.description ? <p>{section.description}</p> : null}

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
        </details>
      ))}

      <button className="form-button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
