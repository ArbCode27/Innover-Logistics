"use client";

import * as React from "react";

export const readFormDraft = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const clearFormDraft = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* el navegador puede bloquear el almacenamiento */
  }
};

export const useFormDraft = <T,>(
  key: string,
  watch: (callback: (value: T) => void) => { unsubscribe: () => void }
): void => {
  React.useEffect(() => {
    const subscription = watch((value) => {
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* el navegador puede bloquear el almacenamiento */
      }
    });
    return () => subscription.unsubscribe();
  }, [key, watch]);
};
