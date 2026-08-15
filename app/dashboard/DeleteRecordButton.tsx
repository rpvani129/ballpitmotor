"use client";

export default function DeleteRecordButton({ action, fields, label = "Delete", confirmMessage, className = "button danger compact-button" }: { action: (formData: FormData) => void | Promise<void>; fields: Record<string, string>; label?: string; confirmMessage: string; className?: string }) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm(confirmMessage)) event.preventDefault(); }}>
    {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <button className={className} type="submit">{label}</button>
  </form>;
}
