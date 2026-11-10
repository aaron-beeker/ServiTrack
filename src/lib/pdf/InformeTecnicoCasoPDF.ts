import { jsPDF } from 'jspdf';
import { Caso, DiagnosticoTecnicoCaso } from '@/types';
import {
  referenciaServicioCaso,
  createMurPdfDoc,
  distributeElasticHeight,
  drawClientAndDatesBox,
  drawConsideracionesBox,
  drawEquipmentBox,
  drawMeasuredSection,
  drawMurFooterAllPages,
  drawMurHeader,
  formatDateMur,
  LabeledSectionSpec,
  measureConsideracionesHeight,
  measureLabeledSections,
  MUR_LAYOUT,
  MurHeaderOptions,
  resolverNombreTecnico,
} from './pdfTheme';

const CONSIDERACIONES_DT =
  'El presente informe detalla las fallas, observaciones y condiciones identificadas durante el diagnóstico técnico del equipo. Las reparaciones se realizarán únicamente sobre los trabajos previamente autorizados. En caso de no autorizar alguna de las reparaciones recomendadas, el equipo será entregado en las condiciones resultantes de la intervención realizada, quedando registrada dicha incidencia en el presente informe. MUR Tecnología S.A.C. no será responsable por la persistencia o evolución de fallas previamente identificadas y no atendidas. En caso de alguna incidencia técnica en las siguientes 72 horas, realizar el reporte inmediato correspondiente.';

/**
 * Generación de INFORME DE DIAGNÓSTICO TÉCNICO (Ruta 2B) y ACTA DE DEVOLUCIÓN TÉCNICA.
 * Diseño minimalista oficial MUR Tecnología S.A.C. con tipografía Calibri.
 */
export const generarInformeTecnicoCasoPDF = async (
  caso: Caso,
  dt: DiagnosticoTecnicoCaso,
  options?: { skipSave?: boolean }
): Promise<jsPDF> => {
  const { doc, fontFamily } = await createMurPdfDoc();

  const esRechazado =
    dt.aprobacionCliente?.aprobado === false || caso.estado === 'CERRADO_SIN_REPARACION';
  const tituloDoc = esRechazado
    ? 'ACTA DE DEVOLUCIÓN TÉCNICA'
    : 'INFORME DE DIAGNÓSTICO TÉCNICO';

  const codigoCaso =
    (caso.codigoCaso && caso.codigoCaso !== 'undefined' ? caso.codigoCaso : caso.id) ||
    'CASO-000001';
  const incAsociada =
    (dt.incidenciaId ? caso.incidencias?.find((i) => i.id === dt.incidenciaId) : undefined) ||
    caso.incidencias?.[0];
  const codigoInc = incAsociada?.codigoINC || dt.incidenciaId || 'INC-001';

  const metaParts = [`Expediente: ${codigoCaso}`, `Incidencia: ${codigoInc}`];
  if (referenciaServicioCaso(caso)) {
    metaParts.push(referenciaServicioCaso(caso));
  }

  const headerOpts: MurHeaderOptions = {
    titulo: tituloDoc,
    codigo: dt.codigoDT,
    subtituloMeta: metaParts.join('  ·  '),
  };

  let curY = drawMurHeader(doc, fontFamily, headerOpts);

  // 1. Cliente y Fechas + Vínculo al Expediente
  const fechaIngresoRaw = incAsociada?.fecha || caso.fechaApertura || dt.fecha;
  const fechaDiagRaw = dt.fecha || new Date().toISOString();

  const tecnicoDt =
    resolverNombreTecnico(dt.tecnicoResponsable, undefined, dt.tecnicoId) || 'Laboratorio MUR';

  const rightRows = [
    { label: 'EXPEDIENTE:', value: `${codigoCaso} (${codigoInc})` },
    { label: 'FECHA DE INGRESO:', value: formatDateMur(fechaIngresoRaw) },
    { label: 'FECHA DIAGNÓSTICO:', value: formatDateMur(fechaDiagRaw) },
    { label: 'TÉCNICO EVALUADOR:', value: tecnicoDt },
    { label: 'TIPIFICACIÓN:', value: dt.tipoFalla || 'HARDWARE' },
  ];

  curY = drawClientAndDatesBox(doc, fontFamily, curY, caso.cliente, rightRows);

  // 2. Activo / Equipo
  curY = drawEquipmentBox(doc, fontFamily, curY, caso.equipo);

  // 3. Secciones técnicas modulares (idénticas al formato DT oficial)
  const fallaReportada =
    incAsociada?.descripcion?.trim() ||
    caso.incidencias?.[0]?.descripcion?.trim() ||
    'No especificada en el ingreso.';

  const diagnosticoPartes: string[] = [];
  if (dt.diagnosticoDetallado?.trim()) {
    diagnosticoPartes.push(dt.diagnosticoDetallado.trim());
  }
  if (
    dt.hallazgos?.trim() &&
    (!dt.diagnosticoDetallado ||
      !dt.diagnosticoDetallado.toLowerCase().includes(dt.hallazgos.trim().toLowerCase()))
  ) {
    diagnosticoPartes.push(`Causa raíz / Hallazgos: ${dt.hallazgos.trim()}`);
  }
  const diagnosticoTexto =
    diagnosticoPartes.join('\n') || 'Evaluación técnica de laboratorio completada.';

  let accionRecomendada =
    dt.solucionPropuesta?.trim() ||
    dt.recomendaciones?.trim() ||
    'Realizar intervención técnica en laboratorio previa autorización del cliente.';

  if (dt.aprobacionCliente) {
    const decisionStr = dt.aprobacionCliente.aprobado
      ? `Propuesta aprobada por el cliente (${formatDateMur(dt.aprobacionCliente.fechaDecision)}).`
      : `Propuesta no aprobada (${dt.aprobacionCliente.motivoRechazo || 'Devolución solicitada'}).`;
    accionRecomendada = `${accionRecomendada}\nResolución: ${decisionStr}`;
  }

  const observacionesTexto =
    dt.danosFisicos?.trim() || 'Sin daños físicos externos adicionales al desgaste normal por uso.';

  const piezasTexto =
    dt.requiereRepuestos && dt.repuestosRequeridos && dt.repuestosRequeridos.length > 0
      ? dt.repuestosRequeridos
          .map((r) => `[${r.partNumber}] ${r.descripcion} (Cant.: ${r.cantidad})`)
          .join('\n')
      : 'Ninguno';

  const specs: LabeledSectionSpec[] = [
    { label: 'FALLA REPORTADA:', content: fallaReportada, minHeight: 13.5 },
    { label: 'DIAGNÓSTICO:', content: diagnosticoTexto, minHeight: 36, elastic: true },
    { label: 'ACCIÓN\nRECOMENDADA:', content: accionRecomendada, minHeight: 14.5 },
    { label: 'OBSERVACIONES:', content: observacionesTexto, minHeight: 12.5 },
    { label: 'PIEZAS REQUERIDA:', content: piezasTexto, minHeight: 12.5 },
  ];

  const measured = measureLabeledSections(doc, fontFamily, specs);
  const { height: consH } = measureConsideracionesHeight(
    doc,
    fontFamily,
    `CONSIDERACIONES: ${CONSIDERACIONES_DT}`
  );
  distributeElasticHeight(curY, measured, MUR_LAYOUT.boxGap + consH, 55);

  for (const sec of measured) {
    curY = drawMeasuredSection(doc, fontFamily, curY, sec, headerOpts);
  }

  drawConsideracionesBox(doc, fontFamily, curY, 'CONSIDERACIONES:', CONSIDERACIONES_DT, headerOpts);
  drawMurFooterAllPages(doc, fontFamily);

  if (!options?.skipSave) {
    const nombreArchivo = esRechazado
      ? `ActaDevolucion_${dt.codigoDT}_${codigoCaso}_${caso.equipo.numeroSerie}.pdf`
      : `InformeDiagnostico_${dt.codigoDT}_${codigoCaso}_${caso.equipo.numeroSerie}.pdf`;
    doc.save(nombreArchivo);
  }

  return doc;
};
