import type { ReactNode } from "react";
import { ChevronRight, Filter } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { QuickFormField } from "../crm/kit";

/**
 * Primitive di impaginazione condivise (pannello, tabella, form rapido).
 * Estratte da main.tsx senza modifiche di comportamento.
 */

export function Panel({
  title,
  action,
  onPanelAction,
  children,
  className = "",
}: {
  title: string;
  action?: string;
  onPanelAction?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (/^filtr[oi]/i.test(title)) {
    return <details className="workspace-panel panel-filter span-12" open>
      <summary><Filter size={16} aria-hidden="true" /><span>{title}</span><ChevronRight size={16} aria-hidden="true" /></summary>
      <div className="filter-content">
        {action && onPanelAction && <button className="filter-reset" type="button" onClick={onPanelAction}>{action}</button>}
        {children}
      </div>
    </details>;
  }

  return (
    <motion.section
      className={`workspace-panel ${className}`}
      initial={reduceMotion ? false : { y: 10, scale: 0.995 }}
      animate={reduceMotion ? undefined : { y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <header>
        <h2>{title}</h2>
        {action && onPanelAction ? (
          <button type="button" onClick={(event) => {
            if (action === "Filtri") {
              const filters = event.currentTarget.closest(".workspace-grid")?.querySelector<HTMLDetailsElement>(".panel-filter");
              if (filters) {
                filters.open = true;
                filters.querySelector("summary")?.focus();
                return;
              }
            }
            onPanelAction();
          }}>
            <Filter size={14} />
            {action}
          </button>
        ) : action ? (
          <span className="panel-action-label">
            <Filter size={14} />
            {action}
          </span>
        ) : null}
      </header>
      {children}
    </motion.section>
  );
}

export function DataTable({
  columns,
  rows,
  actions = [],
  emptyMessage = "Nessun dato disponibile per questa vista.",
}: {
  columns: string[];
  rows: string[][];
  actions?: { label: string; onClick: (rowIndex: number) => void }[];
  emptyMessage?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            {actions.length ? <th>Azioni</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <motion.tr
                key={row.join("-")}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: Math.min(rowIndex * 0.015, 0.12), duration: 0.18 }}
              >
                {row.map((cell, index) => (
                  <td key={`${cell}-${index}`}>{cell}</td>
                ))}
                {actions.length ? (
                  <td className="row-actions">
                    {actions.map((action) => (
                      <button key={action.label} type="button" onClick={() => action.onClick(rowIndex)}>
                        {action.label}
                      </button>
                    ))}
                  </td>
                ) : null}
              </motion.tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (actions.length ? 1 : 0)}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {text ? <small>{text}</small> : null}
    </div>
  );
}

export function QuickForm({
  fields,
  button,
  onSubmit,
  required = true,
}: {
  fields: QuickFormField[];
  button: string;
  onSubmit: (values: Record<string, string>) => void;
  required?: boolean;
}) {
  const fieldName = (field: QuickFormField) => typeof field === "string" ? field : field.name;
  const fieldRequired = (field: QuickFormField) =>
    typeof field === "string" ? required : field.required ?? required;
  const fieldPlaceholder = (field: QuickFormField) =>
    typeof field === "string" ? field : field.placeholder ?? field.name;

  return (
    <form
      className="quick-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const values = fields.reduce<Record<string, string>>((accumulator, field) => {
          const name = fieldName(field);
          accumulator[name] = String(formData.get(name) || "").trim();
          return accumulator;
        }, {});
        onSubmit(values);
        event.currentTarget.reset();
      }}
    >
      {fields.map((field) => (
        <label key={fieldName(field)}>
          {fieldName(field)}
          {typeof field === "string" || !field.options ? (
            <input name={fieldName(field)} required={fieldRequired(field)} placeholder={fieldPlaceholder(field)} />
          ) : (
            <select name={field.name} required={fieldRequired(field)}>
              {field.options.map((option) => (
                <option key={option || "empty"} value={option}>
                  {option || "Qualsiasi"}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
      <button type="submit">{button}</button>
    </form>
  );
}
