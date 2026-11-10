import { jsPDF } from 'jspdf';
import { OrdenServicio } from '@/types';
import {
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
 * ETAPA 2: Generación del INFORME DE DIAGNÓSTICO TÉCNICO (modelo OrdenServicio).
 * Diseño minimalista oficial MUR Tecnología S.A.C. con tipografía Calibri.
 */
export const generarInformeDiagnostico = async (
  orden: OrdenServicio,
  options?: { skipSave?: boolean }
): Promise<jsPDF> => {
  const { doc, fontFamily } = await createMurPdfDoc();

  const esDevolucion = orden.estadoGeneral === 'CERRADO_SIN_REPARACION';
  const tituloDoc = esDevolucion
    ? 'ACTA DE DEVOLUCIÓN TÉCNICA'
    : 'INFORME DE DIAGNÓSTICO TÉCNICO';

  const headerOpts: MurHeaderOptions = {
    titulo: tituloDoc,
    codigo: orden.codigoDT,
    subtituloMeta: `Estado: ${orden.estadoGeneral}`,
  };

  let curY = drawMurHeader(doc, fontFamily, headerOpts);

  const rightRows = [
    { label: 'FECHA DE INGRESO:', value: formatDateMur(orden.ingreso.fechaIngreso) },
    {
      label: 'FECHA DIAGNÓSTICO:',
      value: formatDateMur(orden.diagnostico.fechaDiagnostico, 'Pendiente'),
    },
    {
      label: 'TÉCNICO EVALUADOR:',
      value: resolverNombreTecnico(orden.diagnostico.tecnicoDiagnostico) || 'Laboratorio MUR',
    },
    { label: 'TIPIFICACIÓN:', value: orden.diagnostico.tipoFalla || 'PENDIENTE' },
  ];

  curY = drawClientAndDatesBox(doc, fontFamily, curY, orden.ingreso.cliente, rightRows);
  curY = drawEquipmentBox(doc, fontFamily, curY, orden.ingreso.equipo);

  const piezasTexto =
    orden.diagnostico.requiereRepuestos &&
    orden.diagnostico.repuestosRequeridos &&
    orden.diagnostico.repuestosRequeridos.length > 0
      ? orden.diagnostico.repuestosRequeridos
          .map((r) => `[${r.partNumber}] ${r.descripcion} (Cant.: ${r.cantidad})`)
          .join('\n')
      : 'Ninguno';

  let accionTexto =
    orden.diagnostico.solucionPropuesta ||
    'Sustitución y montaje de componentes previa autorización del cliente.';
  if (orden.aprobacion) {
    const res = orden.aprobacion.aprobado
      ? `Aprobado para intervención (${formatDateMur(orden.aprobacion.fechaDecision)}).`
      : `Rechazado por el cliente (${orden.aprobacion.motivoRechazo || 'Devolución'}).`;
    accionTexto = `${accionTexto}\nResolución: ${res}`;
  }

  const specs: LabeledSectionSpec[] = [
    { label: 'FALLA REPORTADA:', content: orden.ingreso.fallaReportada, minHeight: 13.5 },
    {
      label: 'DIAGNÓSTICO:',
      content:
        orden.diagnostico.diagnosticoDetallado ||
        'En proceso de pruebas de descarte en laboratorio.',
      minHeight: 36,
      elastic: true,
    },
    { label: 'ACCIÓN\nRECOMENDADA:', content: accionTexto, minHeight: 14.5 },
    {
      label: 'OBSERVACIONES:',
      content:
        orden.diagnostico.danosFisicos ||
        'Equipo sin daños físicos aparentes al momento de la recepción.',
      minHeight: 12.5,
    },
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
    const nombreArchivo = esDevolucion
      ? `${orden.codigoDT}_ActaDevolucion.pdf`
      : `${orden.codigoDT}_InformeDiagnostico.pdf`;
    doc.save(nombreArchivo);
  }

  return doc;
};

// Alias para mantener compatibilidad
export const generarInformeDT = generarInformeDiagnostico;
