"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

import { deleteProject } from "@/app/projects/actions";
import { Button } from "@/components/ui/button";

type ProjectDeleteButtonProps = {
  projectId: string;
};

export function ProjectDeleteButton({ projectId }: ProjectDeleteButtonProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteProject, {});

  useEffect(() => {
    if (!state.success) return;
    router.push("/projects");
  }, [state.success, router]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this project and all associated rooms?")) {
          event.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Button variant="ghost" type="submit" className="text-red-400 hover:text-red-200">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        <Trash2 className="size-4" />
        Delete project
      </Button>
      {state.error && <p className="mt-2 text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
