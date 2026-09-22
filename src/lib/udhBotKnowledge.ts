import type { SupabaseClient } from "@supabase/supabase-js";

export interface RespuestaBot {
  texto: string;
  enlace?: { href: string; texto: string };
}

export interface PerfilBot {
  nombre: string;
  role: "admin_udh" | "analista";
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// ---------------------------------------------------------------------
// Preguntas de uso (tutorial) — respuestas fijas, sin necesidad de IA.
// ---------------------------------------------------------------------
export interface TemaFaq {
  id: string;
  palabrasClave: string[];
  pregunta: string;
  respuesta: string;
  enlace?: { href: string; texto: string };
}

export const TEMAS_FAQ: TemaFaq[] = [
  {
    id: "panel-que-es",
    palabrasClave: ["panel", "inicio", "dashboard", "pantalla principal"],
    pregunta: "¿Qué muestra el Panel principal?",
    respuesta:
      "El Panel es la pantalla de inicio: muestra totales de escuelas por estado, seguimientos y entregas registrados, " +
      "zonas cubiertas, el buscador de escuela más cercana, seguimientos en proceso con demora (+3 días), el gráfico de " +
      "capacitaciones por escuela de los últimos 30 días, escuelas actualizadas recientemente y el seguimiento de " +
      "permanencia (3 a 6 meses tras el ingreso).",
    enlace: { href: "/", texto: "Ir al Panel" },
  },
  {
    id: "buscador-cercana",
    palabrasClave: ["escuela cercana", "escuela mas cercana", "buscador", "mapa", "punto de venta cercano", "pdv cercano"],
    pregunta: "¿Cómo uso el buscador de escuela cercana?",
    respuesta:
      "En el Panel, en el buscador 'Escuela de formación más cercana', escribe el nombre del punto de venta y " +
      "selecciónalo de la lista (los PDV que ya son escuela aparecen marcados primero). El sistema sugiere la escuela " +
      "activa o en revisión más próxima —priorizando la misma ciudad— con la distancia aproximada, y la ubica en el " +
      "mapa de Ecuador junto con el resto de escuelas.",
    enlace: { href: "/", texto: "Ir al Panel" },
  },
  {
    id: "escuelas-crear",
    palabrasClave: ["crear escuela", "nueva escuela", "agregar escuela", "registrar escuela"],
    pregunta: "¿Cómo creo una nueva escuela?",
    respuesta:
      "Solo Admin UDH puede crear escuelas. Ve a Escuelas y pulsa '+ Nueva escuela'. Completa nombre, provincia, " +
      "ciudad, zona, capacidad, estado inicial y observaciones, y guarda.",
    enlace: { href: "/escuelas/nueva", texto: "Ir a Nueva escuela" },
  },
  {
    id: "escuelas-filtrar-exportar",
    palabrasClave: ["filtrar escuelas", "buscar escuela", "exportar escuelas", "lista de escuelas"],
    pregunta: "¿Cómo filtro o exporto la lista de escuelas?",
    respuesta:
      "En Escuelas puedes filtrar por nombre/ciudad/provincia, ciudad exacta y estado. El botón 'Exportar' descarga " +
      "la tabla ya filtrada en Excel (.xls), CSV o PDF.",
    enlace: { href: "/escuelas", texto: "Ir a Escuelas" },
  },
  {
    id: "escuelas-estado",
    palabrasClave: ["cambiar estado escuela", "activar escuela", "desactivar escuela", "escuela inactiva", "escuela en revision"],
    pregunta: "¿Cómo cambio el estado de una escuela?",
    respuesta:
      "Entra a la ficha de la escuela y edita el campo Estado (Activo / En revisión / Inactivo) desde el formulario " +
      "principal. También cambia automáticamente cuando generas un informe de diagnóstico: si el Excel indica que el " +
      "PDV está apto para ser escuela, el estado pasa a Activo; si indica que no es apto, pasa a Inactivo.",
  },
  {
    id: "colaboradores",
    palabrasClave: ["colaborador", "datos bancarios", "cedula colaborador", "personal del pdv"],
    pregunta: "¿Cómo administro los colaboradores de una escuela?",
    respuesta:
      "Dentro de la ficha de cada escuela, en la sección Colaboradores (Admin/Polifuncional), Admin UDH puede agregar " +
      "o editar nombre, rol, cédula, fecha de ingreso y datos bancarios. Un Analista solo ve nombre, rol y fecha de " +
      "ingreso; la cédula y los datos bancarios están ocultos para ese rol.",
  },
  {
    id: "informes-generar",
    palabrasClave: ["generar informe", "informe de cumplimiento", "excel de diagnostico", "subir excel diagnostico"],
    pregunta: "¿Cómo genero el informe de cumplimiento de una escuela?",
    respuesta:
      "En la ficha de la escuela, sección Informes, pulsa 'Generar informe' y sube el Excel de diagnóstico (con las " +
      "pestañas DIAGNOSTICO, PLAN y FOTOS). El sistema arma un PDF con el resumen de cumplimiento, el cruce de " +
      "observaciones, conclusiones y recomendaciones, y lo guarda directo en la lista de Informes de esa escuela.",
  },
  {
    id: "informes-agregar",
    palabrasClave: ["agregar informe", "subir informe", "adjuntar pdf", "cargar informe"],
    pregunta: "¿Cómo subo un informe ya elaborado?",
    respuesta:
      "En la ficha de la escuela, sección Informes, usa el botón '+ Agregar informe' para subir directamente un " +
      "documento en formato PDF (no genera nada, solo lo adjunta a la lista).",
  },
  {
    id: "recompensas",
    palabrasClave: ["recompensa", "entrega", "material entregado", "cheque", "camiseta", "pago a escuela"],
    pregunta: "¿Cómo registro una recompensa o entrega?",
    respuesta:
      "Puedes registrarla desde la ficha de la escuela o desde la pestaña Recompensas/Entregas con '+ Nueva'. Elige " +
      "el tipo (camiseta, entrada de cine, cheque, pago u otro), cantidad, detalle y fecha. Desde la lista también " +
      "puedes editar una entrega existente.",
    enlace: { href: "/entregas", texto: "Ir a Recompensas" },
  },
  {
    id: "seguimientos-crear",
    palabrasClave: ["nuevo seguimiento", "crear seguimiento", "registrar aspirante", "registrar capacitacion"],
    pregunta: "¿Cómo registro un nuevo seguimiento de reclutamiento/capacitación?",
    respuesta:
      "Ve a Seguimientos y pulsa '+ Nuevo seguimiento'. Registra escuela, fecha de capacitación, aspirantes, cargo, " +
      "PDV que solicita, analista, capacitador y estado del proceso (En proceso / Finalizado), entre otros campos.",
    enlace: { href: "/seguimientos/nuevo", texto: "Ir a Nuevo seguimiento" },
  },
  {
    id: "seguimientos-filtrar",
    palabrasClave: ["filtrar seguimientos", "buscar seguimiento", "editar seguimiento", "exportar seguimientos"],
    pregunta: "¿Cómo filtro, edito o exporto seguimientos?",
    respuesta:
      "En Seguimientos hay filtros por fechas, escuela, capacitador y PDV solicitud. Selecciona una fila y pulsa " +
      "'Editar' para modificarla, o usa 'Exportar' para descargar la tabla filtrada en Excel, CSV o PDF.",
    enlace: { href: "/seguimientos", texto: "Ir a Seguimientos" },
  },
  {
    id: "encuestas",
    palabrasClave: ["encuesta", "satisfaccion", "calificacion capacitador"],
    pregunta: "¿Para qué sirve la sección Encuestas?",
    respuesta:
      "Encuestas registra la satisfacción de cada aspirante/colaborador con la capacitación recibida (limpieza, " +
      "temas, formadores, NPS, si finalizó el proceso, etc.), replicando el formulario oficial de satisfacción.",
    enlace: { href: "/encuestas", texto: "Ir a Encuestas" },
  },
  {
    id: "usuarios",
    palabrasClave: ["crear usuario", "dar de alta usuario", "permisos de usuario", "activar usuario", "desactivar usuario"],
    pregunta: "¿Cómo administro usuarios y permisos?",
    respuesta:
      "Solo Admin UDH ve la sección Usuarios: puede crear cuentas, asignar rol (Admin UDH / Analista), activar o " +
      "desactivar el acceso, y marcar qué herramientas puede usar cada usuario (Escuelas, Seguimientos, Entregas, " +
      "Encuestas).",
    enlace: { href: "/usuarios", texto: "Ir a Usuarios" },
  },
  {
    id: "auditoria",
    palabrasClave: ["auditoria", "quien hizo", "historial de cambios", "log"],
    pregunta: "¿Qué es la Auditoría?",
    respuesta:
      "Auditoría (solo Admin UDH) registra quién hizo qué y cuándo: inicios/cierres de sesión, creación/edición de " +
      "escuelas, colaboradores, seguimientos, entregas, encuestas, informes y cambios de usuarios. Se puede filtrar " +
      "por usuario, acción y rango de fechas.",
    enlace: { href: "/auditoria", texto: "Ir a Auditoría" },
  },
  {
    id: "roles",
    palabrasClave: ["diferencia admin analista", "roles", "que puede hacer un analista", "que puede hacer el admin"],
    pregunta: "¿Cuál es la diferencia entre Admin UDH y Analista?",
    respuesta:
      "Admin UDH tiene acceso completo: crea escuelas y usuarios, ve datos bancarios/cédula, elimina registros y " +
      "administra permisos. Analista trabaja con las herramientas que se le habiliten (Escuelas, Seguimientos, " +
      "Entregas, Encuestas) pero sin ver datos sensibles de colaboradores ni administrar usuarios.",
  },
  {
    id: "cerrar-sesion",
    palabrasClave: ["cerrar sesion", "salir", "logout"],
    pregunta: "¿Cómo cierro sesión?",
    respuesta: "Usa la opción 'Cerrar sesión' en la barra de navegación superior.",
  },
];

// ---------------------------------------------------------------------
// Preguntas sobre datos guardados — se responden con una consulta real
// a Supabase (respeta los permisos de la sesión del usuario).
// ---------------------------------------------------------------------
export interface AccionDato {
  id: string;
  palabrasClave: string[];
  pregunta: string;
  ejecutar: (supabase: SupabaseClient, perfil: PerfilBot) => Promise<RespuestaBot>;
}

export const ACCIONES_DATOS: AccionDato[] = [
  {
    id: "escuelas-total",
    palabrasClave: ["cuantas escuelas hay", "total de escuelas", "numero de escuelas"],
    pregunta: "¿Cuántas escuelas hay registradas?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("escuelas").select("*", { count: "exact", head: true });
      return { texto: `Actualmente hay ${count ?? 0} escuelas registradas en la plataforma.`, enlace: { href: "/escuelas", texto: "Ver escuelas" } };
    },
  },
  {
    id: "escuelas-activas",
    palabrasClave: ["escuelas activas", "cuantas activas"],
    pregunta: "¿Cuántas escuelas están activas?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("escuelas").select("*", { count: "exact", head: true }).eq("estado", "ACTIVO");
      return { texto: `Hay ${count ?? 0} escuelas en estado Activo.`, enlace: { href: "/escuelas?estado=ACTIVO", texto: "Ver escuelas activas" } };
    },
  },
  {
    id: "escuelas-revision",
    palabrasClave: ["escuelas en revision", "cuantas en revision"],
    pregunta: "¿Cuántas escuelas están en revisión?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("escuelas").select("*", { count: "exact", head: true }).eq("estado", "REVISION");
      return { texto: `Hay ${count ?? 0} escuelas en estado En revisión.`, enlace: { href: "/escuelas?estado=REVISION", texto: "Ver escuelas en revisión" } };
    },
  },
  {
    id: "escuelas-inactivas",
    palabrasClave: ["escuelas inactivas", "cuantas inactivas"],
    pregunta: "¿Cuántas escuelas están inactivas?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("escuelas").select("*", { count: "exact", head: true }).eq("estado", "INACTIVO");
      return { texto: `Hay ${count ?? 0} escuelas en estado Inactivo.`, enlace: { href: "/escuelas?estado=INACTIVO", texto: "Ver escuelas inactivas" } };
    },
  },
  {
    id: "seguimientos-proceso",
    palabrasClave: ["seguimientos en proceso", "cuantos en proceso"],
    pregunta: "¿Cuántos seguimientos están en proceso?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("seguimientos").select("*", { count: "exact", head: true }).eq("estado_proceso", "EN_PROCESO");
      return { texto: `Hay ${count ?? 0} seguimientos con estado En proceso.`, enlace: { href: "/seguimientos", texto: "Ver seguimientos" } };
    },
  },
  {
    id: "seguimientos-total",
    palabrasClave: ["cuantos seguimientos hay", "total de seguimientos", "seguimientos registrados"],
    pregunta: "¿Cuántos seguimientos hay registrados?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("seguimientos").select("*", { count: "exact", head: true });
      return { texto: `Hay ${count ?? 0} seguimientos registrados en total.`, enlace: { href: "/seguimientos", texto: "Ver seguimientos" } };
    },
  },
  {
    id: "entregas-total",
    palabrasClave: ["cuantas entregas", "recompensas registradas", "total de entregas"],
    pregunta: "¿Cuántas entregas/recompensas hay registradas?",
    ejecutar: async (supabase) => {
      const { count } = await supabase.from("entregas").select("*", { count: "exact", head: true });
      return { texto: `Hay ${count ?? 0} entregas/recompensas registradas.`, enlace: { href: "/entregas", texto: "Ver entregas" } };
    },
  },
  {
    id: "mi-perfil",
    palabrasClave: ["mi rol", "mis permisos", "quien soy", "mi usuario"],
    pregunta: "¿Cuál es mi rol y permisos?",
    ejecutar: async (_supabase, perfil) => {
      const rol = perfil.role === "admin_udh" ? "Admin UDH (acceso completo)" : "Analista";
      return { texto: `Estás conectado como ${perfil.nombre}, con rol ${rol}.` };
    },
  },
];

export const CHIPS_INICIALES = [
  "¿Cómo genero un informe de escuela?",
  "¿Cómo agrego un seguimiento?",
  "¿Cuántas escuelas activas hay?",
  "¿Cómo uso el buscador de escuela cercana?",
];

export interface ResultadoBusqueda {
  tipo: "faq" | "dato" | "sin_match";
  respuesta?: RespuestaBot;
}

export async function responderPregunta(
  pregunta: string,
  supabase: SupabaseClient,
  perfil: PerfilBot
): Promise<ResultadoBusqueda> {
  const texto = normalizar(pregunta);

  // 1) Preguntas sobre datos: se exige que TODAS las palabras clave de la
  //    accion (cada una como frase) aparezcan en el texto, para evitar
  //    falsos positivos con el FAQ general.
  for (const accion of ACCIONES_DATOS) {
    if (accion.palabrasClave.some((clave) => texto.includes(normalizar(clave)))) {
      const respuesta = await accion.ejecutar(supabase, perfil);
      return { tipo: "dato", respuesta };
    }
  }

  // 2) FAQ de uso: se puntua por coincidencia de palabras clave y se toma
  //    la de mayor puntaje (minimo 1 coincidencia).
  let mejor: { tema: TemaFaq; puntaje: number } | null = null;
  for (const tema of TEMAS_FAQ) {
    const puntaje = tema.palabrasClave.filter((clave) => texto.includes(normalizar(clave))).length;
    if (puntaje > 0 && (!mejor || puntaje > mejor.puntaje)) {
      mejor = { tema, puntaje };
    }
  }
  if (mejor) {
    return { tipo: "faq", respuesta: { texto: mejor.tema.respuesta, enlace: mejor.tema.enlace } };
  }

  return { tipo: "sin_match" };
}
