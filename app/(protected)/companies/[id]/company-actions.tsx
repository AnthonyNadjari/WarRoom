"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

export function CompanyActions(props: { companyId: string; companyName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("companies").delete().eq("id", props.companyId);
    setDeleting(false);
    router.push("/companies");
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={"/companies/" + props.companyId + "/edit"}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete company"
        description={`Delete "${props.companyName}"? This will also delete all contacts and interactions for this company. This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
