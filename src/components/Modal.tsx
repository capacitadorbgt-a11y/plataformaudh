"use client";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children && <div className="text-sm text-neutral-500 mb-4">{children}</div>}
        <button type="button" onClick={onClose} className="btn-primary w-full mt-2">
          Cerrar
        </button>
      </div>
    </div>
  );
}
