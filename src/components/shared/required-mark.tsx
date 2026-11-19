import { hints } from "@/lib/glossary";

export const RequiredMark: React.FC = () => {
  return (
    <span className="text-destructive" title={hints.required}>
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> ({hints.required})</span>
    </span>
  );
};
