-- Nuevos valores de estado.
-- Van en una migración aparte: PostgreSQL no permite usar un valor de enum
-- recién agregado dentro de la misma transacción.

ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE public.serial_status ADD VALUE IF NOT EXISTS 'reserved';
