import { jsPDF } from 'jspdf';
import { Caso, ConstanciaAtencionSimple } from '@/types';
import {
  createMurPdfDoc,
  distributeElasticHeight,
  drawClientAndDatesBox,
  drawConsideracionesBox,
  drawEquipmentBox,
  drawMeasuredSection,
  drawMurFooterAllPages,
  drawMurHeader,
  drawSignatureBoxes,
  formatDateMur,
  formatTimeMur,
  KeyValueRow,
  LabeledSectionSpec,
  measureConsideracionesHeight,
  measureLabeledSections,
  MUR_LAYOUT,
  MurHeaderOptions,
} from './pdfTheme';

const CONSIDERACIONES_CONSTANCIA =
  'La presente constancia deja registro de la atención técnica realizada en relación con la incidencia reportada. Durante la atención se ejecutaron las labores de verificación, descarte y validación funcional del activo conforme al alcance solicitado. El usuario o representante del cliente suscribe la atención efectuada, así como las observaciones o recomendaciones indicadas por el especialista técnico. Cualquier consulta posterior deberá canalizarse mediante la mesa de ayuda de MUR Tecnología S.A.C.';

/**
 * Generación de CONSTANCIA DE ATENCIÓN (Ruta 2A - Soporte Simple / Alquiler / Taller)
 * Identidad corporativa minimalista MUR Tecnología S.A.C. con tipografía Calibri.
 */
export const generarConstanciaAtencionPDF = async (
  caso: Caso,
  constancia: ConstanciaAtencionSimple,
  options?: { skipSave?: boolean }
): Promise<jsPDF> => {
  const { doc, fontFamily } = await createMurPdfDoc();

  const codigoCaso =
    (caso.codigoCaso && caso.codigoCaso !== 'undefined' ? caso.codigoCaso : caso.id) ||
    'CASO-000001';
  const incAsociada =
    (constancia.incidenciaId
      ? caso.incidencias?.find((i) => i.id === constancia.incidenciaId)
      : undefined) || caso.incidencias?.[0];
  const codigoInc = incAsociada?.codigoINC || constancia.incidenciaId || 'INC-001';

  const metaParts = [`Expediente: ${codigoCaso}`, `Incidencia: ${codigoInc}`];
  if (caso.contratoAlquiler?.trim()) {
    metaParts.push(`Contrato: ${caso.contratoAlquiler.trim()}`);
  }

  const headerOpts: MurHeaderOptions = {
    titulo: 'CONSTANCIA DE ATENCIÓN',
    codigo: constancia.codigoConstancia,
    subtituloMeta: metaParts.join('  ·  '),
  };

  let curY = drawMurHeader(doc, fontFamily, headerOpts);

  const fechaIngresoRaw = incAsociada?.fecha || caso.fechaApertura || constancia.fecha;
  const fechaSalidaRaw = constancia.fecha || new Date().toISOString();

  const fIn = formatDateMur(fechaIngresoRaw);
  const hIn = formatTimeMur(fechaIngresoRaw);
  const fOut = formatDateMur(fechaSalidaRaw);
  const hOut = formatTimeMur(fechaSalidaRaw);

  const rightRows: KeyValueRow[] = [
    { label: 'EXPEDIENTE:', value: `${codigoCaso} (${codigoInc})` },
    { label: 'FECHA DE INGRESO:', value: hIn ? `${fIn} (${hIn})` : fIn },
    { label: 'FECHA DE SALIDA:', value: hOut ? `${fOut} (${hOut})` : fOut },
    { label: 'TÉCNICO EJECUTOR:', value: constancia.tecnicoResponsable || 'Soporte MUR' },
  ];
  if (constancia.ticketItop?.trim()) {
    rightRows.push({ label: 'TICKET iTOP:', value: constancia.ticketItop.trim() });
  }

  curY = drawClientAndDatesBox(doc, fontFamily, curY, caso.cliente, rightRows);
  curY = drawEquipmentBox(doc, fontFamily, curY, caso.equipo);

  const fallaReportada =
    incAsociada?.descripcion?.trim() ||
    constancia.motivoSoporte?.trim() ||
    'No especificada.';
  const fallaReal =
    constancia.fallaReal?.trim() ||
    constancia.motivoSoporte?.trim() ||
    'Evaluación operativa sin fallas críticas de hardware.';
  const estadoEquipo = constancia.resultado?.trim() || 'Operativo / Incidencia solucionada';
  const observaciones = constancia.observaciones?.trim() || 'Ninguna';

  const specs: LabeledSectionSpec[] = [
    { label: 'FALLA REPORTADA:', content: fallaReportada, minHeight: 12.5 },
    { label: 'FALLA REAL:', content: fallaReal, minHeight: 13.5 },
    {
      label: 'ACTIVIDAD\nREALIZADA:',
      content: constancia.actividadesRealizadas || 'Atención técnica completada.',
      minHeight: 28,
      elastic: true,
    },
    { label: 'ESTADO EQUIPO:', content: estadoEquipo, minHeight: 11.5 },
    { label: 'OBSERVACIONES:', content: observaciones, minHeight: 11.5 },
  ];

  const measured = measureLabeledSections(doc, fontFamily, specs);
  const { height: consH } = measureConsideracionesHeight(
    doc,
    fontFamily,
    `CONSIDERACIONES: ${CONSIDERACIONES_CONSTANCIA}`
  );
  const sigReserve = 23.5 + MUR_LAYOUT.boxGap;
  distributeElasticHeight(curY, measured, sigReserve + MUR_LAYOUT.boxGap + consH, 45);

  for (const sec of measured) {
    curY = drawMeasuredSection(doc, fontFamily, curY, sec, headerOpts);
  }

  const esAlquiler = caso.origen === 'ALQUILER' || Boolean(caso.contratoAlquiler?.trim());
  curY = drawSignatureBoxes(
    doc,
    fontFamily,
    curY,
    {
      leftTitle: 'TÉCNICO EJECUTOR',
      leftPrimary: constancia.tecnicoResponsable || 'Especialista Técnico',
      leftSecondary: 'MUR Tecnología S.A.C.',
      rightTitle: esAlquiler ? 'USUARIO' : 'CONFORMIDAD DEL CLIENTE',
      rightPrimary: caso.cliente.contacto || caso.cliente.razonSocial,
      rightSecondary: !esAlquiler && caso.cliente.ruc ? `RUC/DNI: ${caso.cliente.ruc}` : undefined,
    },
    headerOpts
  );

  drawConsideracionesBox(
    doc,
    fontFamily,
    curY,
    'CONSIDERACIONES:',
    CONSIDERACIONES_CONSTANCIA,
    headerOpts
  );
  drawMurFooterAllPages(doc, fontFamily);

  if (!options?.skipSave) {
    doc.save(`Constancia_${constancia.codigoConstancia}_${codigoCaso}_${caso.equipo.numeroSerie}.pdf`);
  }

  return doc;
};
