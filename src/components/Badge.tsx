const ESTADO_STYLES: Record<string, string> = {
  ACTIVO: "bg-green-100 text-green-700",
  INACTIVO: "bg-red-100 text-red-700",
  REVISION: "bg-amber-100 text-amber-700",
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`badge ${ESTADO_STYLES[estado] ?? "bg-neutral-100 text-neutral-700"}`}>
      {estado}
    </span>
  );
}

export function RolBadge({ rol }: { rol: string }) {
  const styles: Record<string, string> = {
    ADMIN: "bg-udh-100 text-udh-700",
    POLI: "bg-blue-100 text-blue-700",
    OTRO: "bg-neutral-100 text-neutral-700",
  };
  return <span className={`badge ${styles[rol] ?? styles.OTRO}`}>{rol}</span>;
}
