"use client";

import { useActionState, useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";

import { createProject, updateProject, type ProjectActionState } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";
import { projectCategories } from "@/lib/projects/constants";

const initialState: ProjectActionState = {};
const inputClass = "h-10 w-full rounded-xl border border-[#E8E8E8] bg-white px-3 text-sm text-foreground placeholder:text-slate-500 outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15";

type ProjectFormValues = {
  id?: string;
  name?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  location?: string;
  category?: string;
  customCategory?: string;
  budget?: string;
  currency?: string;
  startDate?: string;
  deadline?: string;
  description?: string;
};

type ProjectFormProps = {
  project?: ProjectFormValues;
  mode?: "create" | "edit";
  triggerLabel?: string;
  renderTrigger?: boolean;
  initialOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
};

export function ProjectForm({
  project,
  mode = "create",
  triggerLabel,
  renderTrigger = true,
  initialOpen = false,
  open: controlledOpen,
  onOpenChange,
  onClose,
}: ProjectFormProps) {
  const [open, setOpen] = useState(controlledOpen ?? initialOpen);

  const handleOpenChange = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setOpen(value);
    }
  };

  const openDialog = () => handleOpenChange(true);
  const closeDialog = () => {
    handleOpenChange(false);
    onClose?.();
  };

  const dialogKey = `${mode}-${project?.id ?? "new"}-${String(open)}`;
  const serverAction = mode === "edit" ? updateProject : createProject;
  const title = mode === "edit" ? "Edit project" : "Create a project";
  const submitLabel = mode === "edit" ? "Save changes" : "Create project";

  return (
    <>
      {renderTrigger && (
        <Button onClick={openDialog} type="button">
          {mode === "create" ? <><Plus className="size-4" />{triggerLabel ?? "New project"}</> : triggerLabel ?? "Edit project"}
        </Button>
      )}

      {open && (
        <ProjectFormDialog
          key={dialogKey}
          project={project}
          title={title}
          submitLabel={submitLabel}
          serverAction={serverAction}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

function ProjectFormDialog({
  project,
  title,
  submitLabel,
  serverAction,
  onClose,
}: {
  project?: ProjectFormValues;
  title: string;
  submitLabel: string;
  serverAction: (state: ProjectActionState, formData: FormData) => Promise<ProjectActionState>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(project?.category ?? "apartment");
  const [state, action, pending] = useActionState(serverAction, initialState);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onClose();
  }, [state.success, router, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 p-0 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <form action={action} className="flex h-full w-full max-w-xl flex-col border-l border-[#E8E8E8] bg-white shadow-2xl">
        <input type="hidden" name="projectId" value={project?.id ?? ""} />
        <div className="flex items-start justify-between border-b border-[#E8E8E8] p-6">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Projects</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
          </div>
          <button className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onClose()} type="button" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        {state.success ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saved</p>
              <h3 className="mt-3 text-2xl font-semibold text-foreground">Your project is ready.</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Your project details have been updated successfully.</p>
              <Button className="mt-6" type="button" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-7 overflow-y-auto p-6">
              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Project name" name="name" required defaultValue={project?.name} />
                <Field label="Client name" name="clientName" required defaultValue={project?.clientName} />
                <Field label="Client email" name="clientEmail" type="email" defaultValue={project?.clientEmail} />
                <Field label="Client phone" name="clientPhone" defaultValue={project?.clientPhone} />
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <Select label="Category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} options={projectCategories} />
                {category === "custom" && <Field label="Custom category" name="customCategory" required defaultValue={project?.customCategory} />}
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Location" name="location" defaultValue={project?.location} />
                <Field label="Budget" name="budget" type="number" defaultValue={project?.budget ?? "0"} min="0" step="0.01" />
                <Field label="Currency" name="currency" defaultValue={project?.currency ?? "EUR"} maxLength={3} />
                <Field label="Start date" name="startDate" type="date" defaultValue={project?.startDate} />
                <Field label="Deadline" name="deadline" type="date" defaultValue={project?.deadline} />
              </section>

              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span>Description</span>
                <textarea className="min-h-28 rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-slate-500 outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name="description" maxLength={3000} defaultValue={project?.description ?? ""} />
              </label>
              {state.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t p-5">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={pending} type="submit">
                {pending && <LoaderCircle className="size-4 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input className={inputClass} name={name} required={required} type={type} {...props} />
    </label>
  );
}

function Select({ label, name, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; options: readonly (readonly [string, string])[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select className={inputClass} name={name} {...props}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
