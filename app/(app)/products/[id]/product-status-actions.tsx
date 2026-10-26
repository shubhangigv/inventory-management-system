"use client";

import { useActionState } from "react";
import { Archive, ArchiveRestore, Trash } from "lucide-react";
import { ConfirmSubmitButton, FormAlert, SubmitButton } from "@/app/components/form";
import { initialActionState } from "@/lib/action-state";
import { deleteProductAction, setProductActiveAction } from "../actions";

export function ProductStatusActions({ id, isActive, canDelete }: { id: string; isActive: boolean; canDelete: boolean }) {
  const [toggleState, toggleAction] = useActionState(() => setProductActiveAction(id, !isActive), initialActionState);
  const [deleteState, deleteAction] = useActionState(() => deleteProductAction(id), initialActionState);

  return (
    <div className="flex flex-col gap-3">
      <FormAlert state={deleteState.error ? deleteState : toggleState} />
      <div className="flex flex-wrap gap-2">
        <form action={toggleAction}>
          {isActive ? (
            <ConfirmSubmitButton variant="secondary" confirmMessage="Deactivate this product? It will no longer appear in new sales." pendingText="Saving…">
              <Archive className="size-4" aria-hidden /> Deactivate
            </ConfirmSubmitButton>
          ) : (
            <SubmitButton variant="secondary" pendingText="Saving…">
              <ArchiveRestore className="size-4" aria-hidden /> Reactivate
            </SubmitButton>
          )}
        </form>
        {canDelete && (
          <form action={deleteAction}>
            <ConfirmSubmitButton variant="danger" confirmMessage="Delete this product permanently?" pendingText="Deleting…">
              <Trash className="size-4" aria-hidden /> Delete
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
