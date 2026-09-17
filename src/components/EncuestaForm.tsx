"use client";

import { useState } from "react";
import type { Encuesta, FormadorRating } from "@/types/database";

const BUCKETS = ["1-2", "3-4", "5-6", "7-8", "9-10"] as const;
const ASPECTOS: { clave: keyof Omit<FormadorRating, "nombre" | "fortaleza_debilidad">; label: string }[] = [
  { clave: "conocimiento", label: "Conocimiento de los temas impartidos" },
  { clave: "claridad", label: "Claridad para explicar los procedimientos" },
  { clave: "organizacion", label: "Organización de la capacitación" },
  { clave: "acompanamiento", label: "Acompañamiento durante la práctica" },
  { clave: "actitud", label: "Actitud respetuosa y profesional" },
  { clave: "resolucion", label: "Resolución de dudas y preguntas" },
];

function GridFormador({
  prefijo,
  formador,
}: {
  prefijo: string;
  formador?: FormadorRating;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="py-1 pr-2 font-medium">Aspecto</th>
            {BUCKETS.map((b) => (
              <th key={b} className="py-1 px-2 font-medium text-center">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ASPECTOS.map((a) => (
            <tr key={a.clave} className="border-t border-neutral-100">
              <td className="py-2 pr-2 text-neutral-700">{a.label}</td>
              {BUCKETS.map((b) => (
                <td key={b} className="py-2 px-2 text-center">
                  <input
                    type="radio"
                    name={`${prefijo}_${a.clave}`}
                    value={b}
                    defaultChecked={formador?.[a.clave] === b}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BloqueFormador({
  numero,
  prefijo,
  formador,
  opcional,
}: {
  numero: number;
  prefijo: string;
  formador?: FormadorRating;
  opcional: boolean;
}) {
  return (
    <div className="border border-neutral-100 rounded-lg p-4 space-y-3">
      <div>
        <label className="label">Nombre Formador {numero}{opcional ? " (opcional)" : ""}</label>
        <input className="input" name={`${prefijo}_nombre`} defaultValue={formador?.nombre ?? ""} required={!opcional} />
      </div>
      <div>
        <label className="label mb-2">Califique los siguientes aspectos del capacitador (escala 1 al 10)</label>
        <GridFormador prefijo={prefijo} formador={formador} />
      </div>
      <div>
        <label className="label">Mencione al menos una debilidad y una fortaleza del formador</label>
        <textarea
          className="input"
          name={`${prefijo}_fortaleza_debilidad`}
          rows={2}
          defaultValue={formador?.fortaleza_debilidad ?? ""}
        />
      </div>
    </div>
  );
}

const CARGOS = ["Administrador", "Polifuncional MT", "Polifuncional TC", "Otros"];
const MOTIVOS_DESERCION = [
  "Falta de tiempo",
  "Problemas con el horario",
  "El contenido fue muy extenso",
  "Exceso de trabajo en el punto de venta",
  "El trabajo fue diferente al que le mencionaron",
  "Motivos personales",
  "Otro",
];

export default function EncuestaForm({
  action,
  pdvs,
  encuesta,
  error,
}: {
  action: (formData: FormData) => void;
  pdvs: { id: string; nombre: string }[];
  encuesta?: Encuesta;
  error?: string;
}) {
  const [cargo, setCargo] = useState(encuesta?.cargo ?? "");
  const [finalizo, setFinalizo] = useState(encuesta?.finalizo_proceso ?? "");
  const [motivo, setMotivo] = useState(encuesta?.motivo_no_finalizo ?? "");
  const [mostrarFormador2, setMostrarFormador2] = useState((encuesta?.formadores?.length ?? 0) >= 2);
  const [mostrarFormador3, setMostrarFormador3] = useState((encuesta?.formadores?.length ?? 0) >= 3);

  const f1 = encuesta?.formadores?.[0];
  const f2 = encuesta?.formadores?.[1];
  const f3 = encuesta?.formadores?.[2];

  return (
    <form action={action} className="space-y-6">
      {/* Identificación */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Identificación</h2>

        <div>
          <label className="label">Capacitador</label>
          <select className="input" name="capacitador" defaultValue={encuesta?.capacitador ?? ""} required>
            <option value="">— Selecciona —</option>
            <option value="Alli">Alli</option>
            <option value="Isra">Isra</option>
            <option value="Caro">Caro</option>
          </select>
        </div>

        <div>
          <label className="label">Nombre y Apellido Encuestado</label>
          <input className="input" name="nombre_encuestado" defaultValue={encuesta?.nombre_encuestado ?? ""} required />
        </div>

        <div>
          <label className="label">Fecha de Capacitación</label>
          <input className="input" type="date" name="fecha_capacitacion" defaultValue={encuesta?.fecha_capacitacion ?? ""} required />
        </div>

        <div>
          <label className="label mb-1">Seleccione el cargo</label>
          <div className="flex flex-wrap gap-4">
            {CARGOS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cargo"
                  value={c}
                  checked={cargo === c}
                  onChange={() => setCargo(c)}
                  required
                />
                {c}
              </label>
            ))}
          </div>
          {cargo === "Otros" && (
            <input
              className="input mt-2"
              name="cargo_otro"
              placeholder="Especifique el cargo"
              defaultValue={encuesta?.cargo_otro ?? ""}
            />
          )}
        </div>

        <div>
          <label className="label">Seleccione el PDV de Capacitación</label>
          <select className="input" name="pdv_capacitacion" defaultValue={encuesta?.pdv_capacitacion ?? ""} required>
            <option value="">— Selecciona un PDV —</option>
            {pdvs.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Información general */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Información General</h2>

        <div>
          <label className="label">Califique del 1 al 10 la limpieza y organización del PDV en primera impresión</label>
          <select className="input" name="limpieza_organizacion" defaultValue={encuesta?.limpieza_organizacion ?? ""}>
            <option value="">— Selecciona —</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">¿Qué temas recuerda haber visto durante la capacitación? Describa cada día</label>
          <textarea className="input" name="temas_recordados" rows={3} defaultValue={encuesta?.temas_recordados ?? ""} />
        </div>

        <div>
          <label className="label mb-1">¿Considera que el tiempo dedicado a cada tema fue suficiente para comprenderlo?</label>
          <div className="flex flex-wrap gap-4">
            {["Si", "Parcialmente", "No"].map((op) => (
              <label key={op} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tiempo_suficiente"
                  value={op}
                  defaultChecked={encuesta?.tiempo_suficiente === op}
                />
                {op}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">¿Hubo algún tema o procedimiento que considere debió explicarse con mayor profundidad?</label>
          <textarea className="input" name="tema_profundidad" rows={2} defaultValue={encuesta?.tema_profundidad ?? ""} />
        </div>

        <div>
          <label className="label">¿Qué fue lo que más le gustó de la capacitación?</label>
          <textarea className="input" name="que_le_gusto" rows={2} defaultValue={encuesta?.que_le_gusto ?? ""} />
        </div>

        <div>
          <label className="label">¿Qué fue lo que menos le gustó de la capacitación?</label>
          <textarea className="input" name="que_no_le_gusto" rows={2} defaultValue={encuesta?.que_no_le_gusto ?? ""} />
        </div>

        <div>
          <label className="label">
            NPS — En una escala del 1 al 10, ¿qué calificación general le daría a la capacitación recibida?
          </label>
          <select className="input" name="nps" defaultValue={encuesta?.nps ?? ""}>
            <option value="">— Selecciona —</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calificación formadores */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Calificación Formadores</h2>
          <p className="text-xs text-neutral-400">¿Con qué personas tuvo contacto en el PDV? ¿Quiénes le capacitaron?</p>
        </div>

        <BloqueFormador numero={1} prefijo="formador1" formador={f1} opcional={false} />

        {mostrarFormador2 ? (
          <BloqueFormador numero={2} prefijo="formador2" formador={f2} opcional />
        ) : (
          <button type="button" className="btn-secondary text-sm" onClick={() => setMostrarFormador2(true)}>
            + Agregar formador 2
          </button>
        )}

        {mostrarFormador2 && !mostrarFormador3 && (
          <button type="button" className="btn-secondary text-sm" onClick={() => setMostrarFormador3(true)}>
            + Agregar formador 3
          </button>
        )}
        {mostrarFormador3 && <BloqueFormador numero={3} prefijo="formador3" formador={f3} opcional />}
      </div>

      {/* Finalizó el proceso */}
      <div className="card p-6 space-y-4">
        <div>
          <label className="label mb-1">Finalizó el Proceso</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="finalizo_proceso"
                value="SI"
                checked={finalizo === "SI"}
                onChange={() => setFinalizo("SI")}
                required
              />
              SI
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="finalizo_proceso"
                value="NO"
                checked={finalizo === "NO"}
                onChange={() => setFinalizo("NO")}
                required
              />
              NO
            </label>
          </div>
        </div>

        {finalizo === "SI" && (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            <h3 className="text-sm font-semibold text-neutral-600">Colaboradores que TRABAJAN en PDV</h3>
            <div>
              <label className="label">
                ¿Al finalizar la capacitación, los temas que vio le sirvieron para desempeñar correctamente sus
                funciones en el punto de venta?
              </label>
              <div className="flex flex-col gap-2">
                {["Sí, completamente", "Sí, en su mayoría", "Parcialmente", "No"].map((op) => (
                  <label key={op} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="desempeno_funciones"
                      value={op}
                      defaultChecked={encuesta?.desempeno_funciones === op}
                    />
                    {op}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Observaciones adicionales</label>
              <textarea
                className="input"
                name="observaciones_colaborador"
                rows={2}
                defaultValue={encuesta?.observaciones_colaborador ?? ""}
              />
            </div>
          </div>
        )}

        {finalizo === "NO" && (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            <h3 className="text-sm font-semibold text-neutral-600">Desertores</h3>
            <div>
              <label className="label">¿Cuál fue el principal motivo por el que no pudo finalizar la capacitación?</label>
              <div className="flex flex-col gap-2">
                {MOTIVOS_DESERCION.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="motivo_no_finalizo"
                      value={m}
                      checked={motivo === m}
                      onChange={() => setMotivo(m)}
                    />
                    {m}
                  </label>
                ))}
              </div>
              {motivo === "Otro" && (
                <input
                  className="input mt-2"
                  name="motivo_otro"
                  placeholder="Especifique el motivo"
                  defaultValue={encuesta?.motivo_otro ?? ""}
                />
              )}
            </div>
            <div>
              <label className="label">¿Qué habría facilitado que completara la capacitación?</label>
              <input
                className="input"
                name="que_habria_facilitado"
                defaultValue={encuesta?.que_habria_facilitado ?? ""}
              />
            </div>
            <div>
              <label className="label">Observaciones adicionales</label>
              <textarea
                className="input"
                name="observaciones_desertor"
                rows={2}
                defaultValue={encuesta?.observaciones_desertor ?? ""}
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full">Guardar encuesta</button>
    </form>
  );
}
