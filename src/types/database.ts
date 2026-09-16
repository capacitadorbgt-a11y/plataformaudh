export type UserRole = "admin_udh" | "analista";
export type EstadoEscuela = "ACTIVO" | "INACTIVO" | "REVISION";
export type RolColaborador = "ADMIN" | "POLI" | "OTRO";
export type TipoEntrega = "CAMISETA" | "ENTRADA_CINE" | "CHEQUE" | "OTRO";

export interface PermisosHerramientas {
  escuelas?: boolean;
  seguimientos?: boolean;
  entregas?: boolean;
}

export interface Profile {
  id: string;
  nombre: string;
  role: UserRole;
  activo: boolean;
  permisos: PermisosHerramientas;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: string | null;
  created_at: string;
}

export interface Escuela {
  id: string;
  nombre: string;
  capacidad: number | null;
  provincia: string | null;
  ciudad: string | null;
  zona: string | null;
  fecha_lanzamiento: string | null;
  fecha_ultima_visita: string | null;
  estado: EstadoEscuela;
  procesos_completados: number | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface Colaborador {
  id: string;
  escuela_id: string;
  nombre: string;
  rol: RolColaborador;
  cedula: string | null;
  datos_bancarios: string | null;
  fecha_ingreso: string | null;
  created_at: string;
}

export interface Informe {
  id: string;
  escuela_id: string;
  nombre_archivo: string;
  tipo_archivo: string | null;
  storage_path: string;
  tamano_bytes: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Entrega {
  id: string;
  escuela_id: string;
  tipo: TipoEntrega;
  cantidad: number | null;
  detalle: string | null;
  fecha: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AspiranteJson {
  nombre: string;
  aprobado: boolean;
}

export type EstadoProcesoSeguimiento = "EN_PROCESO" | "FINALIZADO";

export interface Seguimiento {
  id: string;
  escuela_id: string | null;
  escuela_nombre_libre: string | null;
  fecha_capacitacion: string | null;
  num_aspirantes: number | null;
  aspirantes: AspiranteJson[];
  cargo: string | null;
  estado_proceso: EstadoProcesoSeguimiento;
  num_ingreso: number | null;
  aspirante_aprobado: string | null;
  pdv_solicitud: string | null;
  encuesta: string | null;
  fecha_ingreso: string | null;
  reembolso: string | null;
  observaciones: string | null;
  analista: string | null;
  pago1: string | null;
  pago2: string | null;
  created_by: string | null;
  created_at: string;
}
