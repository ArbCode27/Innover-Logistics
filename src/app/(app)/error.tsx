"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const AppError = ({ error, reset }: AppErrorProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = () => {
    reset();
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-16" role="alert">
      <h1 className="text-2xl font-bold">No se pudo cargar esta pantalla</h1>
      <p className="text-sm text-muted-foreground">
        Los datos de inventario no se modificaron. Puedes volver a cargar la pantalla.
      </p>
      <div>
        <Button type="button" onClick={handleRetry} className="min-h-11">
          Reintentar
        </Button>
      </div>
    </div>
  );
};

export default AppError;
