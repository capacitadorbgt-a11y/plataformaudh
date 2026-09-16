"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ActionResult = { error?: string | null } | void;

export function useSaveWithModal() {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
        setShowModal(true);
      }
    });
  }

  function goToEscuelas() {
    setShowModal(false);
    router.push("/escuelas");
  }

  function goTo(path: string) {
    setShowModal(false);
    router.push(path);
  }

  function closeModal() {
    setShowModal(false);
  }

  return { showModal, error, isPending, run, goToEscuelas, goTo, closeModal, setShowModal };
}
