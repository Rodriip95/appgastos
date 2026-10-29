"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAllMyData } from "@/lib/actions/account";

const PHRASE = "ELIMINAR";

export function ResetDataForm() {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ready = value.trim() === PHRASE;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    startTransition(async () => {
      const res = await deleteAllMyData(value);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Listo, tu cuenta quedó como nueva");
      setValue("");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm">
          Escribe <strong className="font-semibold">{PHRASE}</strong> para confirmar
        </Label>
        <Input
          id="reset-confirm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="h-11 text-base"
        />
      </div>
      <Button type="submit" variant="destructive" size="lg" className="h-12 w-full text-base" disabled={!ready || pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Eliminar toda mi información
      </Button>
    </form>
  );
}
