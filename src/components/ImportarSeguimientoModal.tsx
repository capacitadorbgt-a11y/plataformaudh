"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importarSeguimientos, type SeguimientoParaImportar } from "@/app/(app)/seguimientos/actions";
import {
  coincidenciaMasCercana,
  htmlATabla,
  parseTablaSeguimientos,
  parsearFecha,
  sumarDias,
  textoPlanoATabla,
  type SeguimientoImportado,
} from "@/lib/importarSeguimientosDatos";

interface FilaEditable extends SeguimientoImportado {
  escuelaId: string | null;
}

export default function ImportarSeguimientoModal({ escuelas }: { escuelas: { id: string; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaEditable[] | null>(null);
  const [resultadoOk, setResultadoOk] = useState<number | null>(null);
  const zonaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function reiniciar() {
    setFilas(null);
    setError(null);
    setProgreso("");
    setResultadoOk(null);
  }

  function abrir() {
    reiniciar();
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    reiniciar();
  }

  function extraidosAEditables(extraidos: SeguimientoImportado[]): FilaEditable[] {
    return extraidos.map((f) => ({
      ...f,
      escuelaId: coincidenciaMasCercana(f.escuelaTexto, escuelas),
    }));
  }

  async function procesarImagen(archivo: Blob) {
    setProgreso("Leyendo texto de la imagen (OCR)...");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("spa");
    try {
      const {
        data: { text },
      } = await worker.recognize(archivo);
      await worker.terminate();
      if (!text.trim()) {
        setError("No se pudo leer texto en la imagen. Prueba con una imagen más nítida.");
        return;
      }
      await procesarTextoConIA(text);
    } catch (err) {
      await worker.terminate();
      throw err;
    }
  }

  async function procesarTextoConIA(texto: string) {
    setProgreso("Interpretando los datos con IA...");
    const r = await fetch("/api/importar-seguimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const datos = await r.json();
    if (!r.ok) {
      setError(datos.error || "No se pudo interpretar el texto con IA.");
      return;
    }
    const extraidos: SeguimientoImportado[] = (datos.seguimientos || []).map(
      (s: Record<string, unknown>): SeguimientoImportado => ({
        escuelaTexto: (s.escuela as string) || null,
        fecha_capacitacion: parsearFecha(s.fecha_capacitacion as string) || (s.fecha_capacitacion as string) || null,
        cargo: (s.cargo as string) || null,
        aspirantes: Array.isArray(s.aspirantes) ? (s.aspirantes as string[]) : [],
        pdv_solicitud: (s.pdv_solicitud as string) || null,
        analista: (s.analista as string) || null,
        capacitador: (s.capacitador as string) || null,
        aspirante_aprobado: (s.aspirante_aprobado as string) || null,
        fecha_ingreso: parsearFecha(s.fecha_ingreso as string),
        observaciones: (s.observaciones as string) || null,
      })
    );
    if (extraidos.length === 0) {
      setError("La IA no pudo identificar ningún seguimiento en el texto.");
      return;
    }
    setFilas(extraidosAEditables(extraidos));
  }

  async function procesarTabla(aoa: unknown[][]) {
    const extraidos = parseTablaSeguimientos(aoa);
    if (extraidos.length === 0) {
      setError("No se reconocieron columnas de una tabla de seguimientos en lo pegado/cargado.");
      return;
    }
    setFilas(extraidosAEditables(extraidos));
  }

  async function manejarPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    setError(null);
    setProcesando(true);
    try {
      const items = Array.from(e.clipboardData.items);
      const imagen = items.find((it) => it.kind === "file" && it.type.startsWith("image/"));

      if (imagen) {
        const archivo = imagen.getAsFile();
        if (archivo) {
          await procesarImagen(archivo);
          return;
        }
      }

      const html = e.clipboardData.getData("text/html");
      if (html && /<table/i.test(html)) {
        await procesarTabla(htmlATabla(html));
        return;
      }

      const texto = e.clipboardData.getData("text/plain");
      if (texto.includes("\t")) {
        await procesarTabla(textoPlanoATabla(texto));
        return;
      }
      if (texto.trim().length > 5) {
        await procesarTextoConIA(texto);
        return;
      }

      setError("No se detectó una imagen ni una tabla en lo pegado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar lo pegado.");
    } finally {
      setProcesando(false);
      setProgreso("");
    }
  }

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    setProcesando(true);
    setProgreso("Leyendo archivo de Excel...");
    try {
      const XLSX = await import("xlsx");
      const buffer = await archivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "" });
      await procesarTabla(aoa);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    } finally {
      setProcesando(false);
      setProgreso("");
    }
  }

  function actualizarFila(indice: number, cambios: Partial<FilaEditable>) {
    setFilas((prev) => prev?.map((f, i) => (i === indice ? { ...f, ...cambios } : f)) ?? null);
  }

  function quitarFila(indice: number) {
    setFilas((prev) => prev?.filter((_, i) => i !== indice) ?? null);
  }

  async function confirmarImportacion() {
    if (!filas || filas.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      const registros: SeguimientoParaImportar[] = filas.map((f) => ({
        escuela_id: f.escuelaId,
        escuela_nombre_libre: f.escuelaId ? null : f.escuelaTexto,
        fecha_capacitacion: f.fecha_capacitacion,
        cargo: f.cargo,
        aspirantes: f.aspirantes,
        pdv_solicitud: f.pdv_solicitud,
        analista: f.analista,
        capacitador: f.capacitador,
        aspirante_aprobado: f.aspirante_aprobado,
        fecha_ingreso: f.fecha_ingreso || (f.fecha_capacitacion ? sumarDias(f.fecha_capacitacion, 4) : null),
        observaciones: f.observaciones,
      }));

      const resultado = await importarSeguimientos(registros);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setResultadoOk(resultado.creados);
      setFilas(null);
      router.refresh();
    } finally {
      setProcesando(false);
    }
  }

  return (
    <>
      <button type="button" onClick={abrir} className="btn-secondary">
        Importar
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Importar seguimiento</h2>
              <button type="button" onClick={cerrar} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">
                ×
              </button>
            </div>

            {resultadoOk != null ? (
              <div className="text-center py-8">
                <p className="text-lg font-medium text-green-700">
                  Se {resultadoOk === 1 ? "creó 1 seguimiento" : `crearon ${resultadoOk} seguimientos`} correctamente.
                </p>
                <button type="button" onClick={cerrar} className="btn-primary mt-4">
                  Cerrar
                </button>
              </div>
            ) : !filas ? (
              <div className="space-y-4">
                <div
                  ref={zonaRef}
                  tabIndex={0}
                  onPaste={manejarPaste}
                  className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center text-sm text-neutral-500 focus:outline-none focus:border-udh-500 cursor-text"
                >
                  {procesando ? (
                    <span>{progreso || "Procesando..."}</span>
                  ) : (
                    <>
                      Haz clic aquí y pega (Ctrl+V) una <strong>imagen</strong> (captura de pantalla, foto) o una{" "}
                      <strong>tabla copiada de Excel</strong>.
                    </>
                  )}
                </div>

                <div className="text-center text-xs text-neutral-400">— o —</div>

                <label className="btn-secondary inline-block cursor-pointer">
                  Seleccionar archivo de Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={manejarArchivo}
                    disabled={procesando}
                  />
                </label>

                <p className="text-xs text-neutral-400">
                  Todos los procesos de capacitación duran 4 días: si no se indica la fecha de ingreso, se calcula
                  automáticamente como la fecha de capacitación + 4 días.
                </p>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-500">
                  Revisa y corrige los datos antes de crear{" "}
                  {filas.length === 1 ? "el seguimiento" : `los ${filas.length} seguimientos`}.
                </p>

                <div className="space-y-4">
                  {filas.map((f, i) => (
                    <div key={i} className="border border-neutral-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-400">Registro {i + 1}</span>
                        <button type="button" onClick={() => quitarFila(i)} className="text-xs text-red-500 hover:underline">
                          Quitar
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label">Escuela</label>
                          <select
                            className="input"
                            value={f.escuelaId ?? ""}
                            onChange={(e) => actualizarFila(i, { escuelaId: e.target.value || null })}
                          >
                            <option value="">— Usar texto libre: {f.escuelaTexto || "(sin dato)"} —</option>
                            {escuelas.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Fecha de capacitación</label>
                          <input
                            className="input"
                            type="date"
                            value={f.fecha_capacitacion ?? ""}
                            onChange={(e) => actualizarFila(i, { fecha_capacitacion: e.target.value || null })}
                          />
                        </div>
                        <div>
                          <label className="label">Cargo</label>
                          <input
                            className="input"
                            value={f.cargo ?? ""}
                            onChange={(e) => actualizarFila(i, { cargo: e.target.value || null })}
                          />
                        </div>
                        <div>
                          <label className="label">PDV solicitud</label>
                          <input
                            className="input"
                            value={f.pdv_solicitud ?? ""}
                            onChange={(e) => actualizarFila(i, { pdv_solicitud: e.target.value || null })}
                          />
                        </div>
                        <div>
                          <label className="label">Analista</label>
                          <input
                            className="input"
                            value={f.analista ?? ""}
                            onChange={(e) => actualizarFila(i, { analista: e.target.value || null })}
                          />
                        </div>
                        <div>
                          <label className="label">Capacitador</label>
                          <input
                            className="input"
                            value={f.capacitador ?? ""}
                            onChange={(e) => actualizarFila(i, { capacitador: e.target.value || null })}
                          />
                        </div>
                        <div>
                          <label className="label">Aspirante aprobado</label>
                          <input
                            className="input"
                            value={f.aspirante_aprobado ?? ""}
                            onChange={(e) => actualizarFila(i, { aspirante_aprobado: e.target.value || null })}
                          />
                        </div>
                        <div>
                          <label className="label">Fecha de ingreso</label>
                          <input
                            className="input"
                            type="date"
                            placeholder="capacitación + 4 días si se deja vacío"
                            value={f.fecha_ingreso ?? ""}
                            onChange={(e) => actualizarFila(i, { fecha_ingreso: e.target.value || null })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">Aspirantes (separados por coma)</label>
                          <input
                            className="input"
                            value={f.aspirantes.join(", ")}
                            onChange={(e) =>
                              actualizarFila(i, {
                                aspirantes: e.target.value
                                  .split(",")
                                  .map((n) => n.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">Observaciones</label>
                          <textarea
                            className="input"
                            rows={2}
                            value={f.observaciones ?? ""}
                            onChange={(e) => actualizarFila(i, { observaciones: e.target.value || null })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmarImportacion}
                    disabled={procesando || filas.length === 0}
                    className="btn-primary disabled:opacity-50"
                  >
                    {procesando
                      ? "Creando..."
                      : `Crear ${filas.length === 1 ? "seguimiento" : `${filas.length} seguimientos`}`}
                  </button>
                  <button type="button" onClick={reiniciar} className="btn-secondary" disabled={procesando}>
                    Empezar de nuevo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
