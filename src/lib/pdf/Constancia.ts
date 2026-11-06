import { jsPDF } from 'jspdf';
import { Caso, InformeTecnicoCaso, OrdenServicio } from '@/types';
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

const CONSIDERACIONES_INFORME_SERVICIO =
  'El presente informe técnico deja constancia de las labores de diagnóstico, intervención en laboratorio y protocolo de pruebas de calidad (QA) efectuadas sobre el equipo descrito. El cliente o usuario receptor declara haber verificado la entrega y condición operativa consignada. La garantía técnica aplica exclusivamente sobre los repuestos instalados y la mano de obra detallada conforme a los términos de MUR Tecnología S.A.C. En caso de alguna incidencia técnica en las siguientes 72 horas, realizar el reporte inmediato correspondiente.';

/**
 * ETAPA 4: Generación del INFORME TÉCNICO DE SERVICIO para OrdenServicio (modelo clásico).
 */
export const generarInformeTecnico = async (
  orden: OrdenServicio,
  esAlquilerParam?: boolean,
  options?: { skipSave?: boolean }
): Promise<jsPDF> => {
  const { doc, fontFamily } = await createMurPdfDoc();

  const headerOpts: MurHeaderOptions = {
    titulo: 'INFORME TÉCNICO DE SERVICIO',
    codigo: orden.codigoDT,
    subtituloMeta: `Estado Final: ${orden.estadoGeneral}`,
  };

  let curY = drawMurHeader(doc, fontFamily, headerOpts);

  const rightRows: KeyValueRow[] = [
    { label: 'FECHA DE INGRESO:', value: formatDateMur(orden.ingreso.fechaIngreso) },
    { label: 'FECHA DE ENTREGA:', value: formatDateMur(orden.cierre.fechaEntrega, 'En proceso') },
    {
      label: 'TÉCNICO EJECUTOR:',
      value: orden.intervencion.tecnicoAsignado || 'Especialista de Taller',
    },
    { label: 'HORAS-HOMBRE:', value: `${orden.intervencion.horasHombre || 1} h` },
  ];

  curY = drawClientAndDatesBox(doc, fontFamily, curY, orden.ingreso.cliente, rightRows);
  curY = drawEquipmentBox(doc, fontFamily, curY, orden.ingreso.equipo);

  const repuestosInstalados =
    orden.diagnostico.requiereRepuestos &&
    orden.diagnostico.repuestosRequeridos &&
    orden.diagnostico.repuestosRequeridos.length > 0
      ? orden.diagnostico.repuestosRequeridos
          .map((r) => `[${r.partNumber}] ${r.descripcion} (Cant.: ${r.cantidad})`)
          .join('\n')
      : 'Ninguno (Mantenimiento físico y/o configuración lógica)';

  const qaDictamen =
    orden.intervencion.pruebasQA?.superoPruebas !== false
      ? 'Operativo / QA Conforme'
      : 'Observado / No Conforme';

  const specs: LabeledSectionSpec[] = [
    { label: 'FALLA REPORTADA:', content: orden.ingreso.fallaReportada, minHeight: 12 },
    {
      label: 'DIAGNÓSTICO:',
      content:
        orden.diagnostico.diagnosticoDetallado || 'Evaluación de hardware y software completada.',
      minHeight: 16,
    },
    {
      label: 'ACTIVIDADES\nREALIZADAS:',
      content:
        orden.intervencion.actividadesRealizadas ||
        'Servicio técnico especializado y pruebas integrales de operatividad.',
      minHeight: 24,
      elastic: true,
    },
    { label: 'CONTROL QA:', content: qaDictamen, minHeight: 11.5 },
    { label: 'PIEZAS / REPUESTOS:', content: repuestosInstalados, minHeight: 11.5 },
    {
      label: 'OBSERVACIONES:',
      content:
        orden.cierre.observacionesFinales ||
        'Equipo verificado con protocolo de encendido y funcionamiento conforme.',
      minHeight: 11.5,
    },
  ];

  const measured = measureLabeledSections(doc, fontFamily, specs);
  const { height: consH } = measureConsideracionesHeight(
    doc,
    fontFamily,
    `CONSIDERACIONES: ${CONSIDERACIONES_INFORME_SERVICIO}`
  );
  const sigReserve = 23.5 + MUR_LAYOUT.boxGap;
  distributeElasticHeight(curY, measured, sigReserve + MUR_LAYOUT.boxGap + consH, 40);

  for (const sec of measured) {
    curY = drawMeasuredSection(doc, fontFamily, curY, sec, headerOpts);
  }

  const esAlquiler =
    esAlquilerParam ??
    Boolean(
      orden.esAlquiler ||
        orden.origen === 'ALQUILER' ||
        Boolean(orden.contratoAlquiler?.trim()) ||
        orden.ingreso?.origen === 'ALQUILER' ||
        Boolean(orden.ingreso?.contratoAlquiler?.trim()) ||
        orden.ingreso?.esAlquiler
    );

  const receptorNom =
    orden.cierre.receptorNombre ||
    orden.ingreso.cliente.contacto ||
    orden.ingreso.cliente.razonSocial;
  const receptorDoc = orden.cierre.receptorDniRuc || orden.ingreso.cliente.ruc;

  curY = drawSignatureBoxes(
    doc,
    fontFamily,
    curY,
    {
      leftTitle: esAlquiler ? 'USUARIO' : 'CONFORMIDAD DEL CLIENTE',
      leftPrimary: esAlquiler ? receptorNom : `Receptor: ${receptorNom}`,
      leftSecondary: !esAlquiler && receptorDoc ? `DNI / RUC: ${receptorDoc}` : undefined,
      rightTitle: 'TÉCNICO RESPONSABLE',
      rightPrimary: orden.intervencion.tecnicoAsignado || 'Especialista Técnico',
      rightSecondary: 'MUR Tecnología S.A.C. - Laboratorio Técnico',
    },
    headerOpts
  );

  drawConsideracionesBox(
    doc,
    fontFamily,
    curY,
    'CONSIDERACIONES:',
    CONSIDERACIONES_INFORME_SERVICIO,
    headerOpts
  );
  drawMurFooterAllPages(doc, fontFamily);

  if (!options?.skipSave) {
    doc.save(`${orden.codigoDT}_InformeTecnico.pdf`);
  }

  return doc;
};

/**
 * Generación del INFORME TÉCNICO DE SERVICIO para Expedientes / Casos (Etapas 3 y 4).
 * Incorpora correlativo único IT-XXXXXX, vínculo explícito al Expediente CASO-XXXXXX,
 * diagnóstico, actividades ejecutadas, horas-hombre, checklist QA y regla de firmas.
 */
export const generarInformeTecnicoFinalCaso = async (
  caso: Caso,
  options?: { skipSave?: boolean; informe?: InformeTecnicoCaso | null; osId?: string }
): Promise<jsPDF> => {
  const { doc, fontFamily } = await createMurPdfDoc();

  const codigoCaso =
    (caso.codigoCaso && caso.codigoCaso !== 'undefined' ? caso.codigoCaso : caso.id) ||
    'CASO-000001';

  const osActiva = options?.osId
    ? caso.ordenesServicio?.find((o) => o.codigoOS === options.osId || o.id === options.osId)
    : options?.informe?.ordenServicioId
      ? caso.ordenesServicio?.find(
          (o) =>
            o.codigoOS === options.informe?.ordenServicioId ||
            o.id === options.informe?.ordenServicioId
        )
      : caso.ordenesServicio?.[caso.ordenesServicio.length - 1];

  const informeActivo =
    options?.informe ||
    (osActiva
      ? caso.informesTecnicos?.find(
          (it) =>
            (osActiva.informeTecnicoId && it.codigoInforme === osActiva.informeTecnicoId) ||
            it.ordenServicioId === osActiva.codigoOS ||
            it.ordenServicioId === osActiva.id
        )
      : undefined) ||
    caso.informesTecnicos?.[caso.informesTecnicos.length - 1];

  const dtRefId = osActiva?.diagnosticoId || informeActivo?.diagnosticoId;
  const ultimoDT = dtRefId
    ? caso.diagnosticos?.find((d) => d.codigoDT === dtRefId || d.id === dtRefId) ||
      caso.diagnosticos?.[caso.diagnosticos.length - 1]
    : caso.diagnosticos?.[caso.diagnosticos.length - 1];

  const incRefId =
    osActiva?.incidenciaId || informeActivo?.incidenciaId || ultimoDT?.incidenciaId;
  const primeraInc = incRefId
    ? caso.incidencias?.find((i) => i.id === incRefId || i.codigoINC === incRefId) ||
      caso.incidencias?.[0]
    : caso.incidencias?.[0];

  const entrega = caso.entrega;
  const esAlquiler = caso.origen === 'ALQUILER' || Boolean(caso.contratoAlquiler?.trim());

  const codigoInforme =
    informeActivo?.codigoInforme || osActiva?.informeTecnicoId || 'IT-000001';

  const metaParts = [`Expediente: ${codigoCaso}`];
  if (ultimoDT?.codigoDT) {
    metaParts.push(`Diagnóstico: ${ultimoDT.codigoDT}`);
  }
  if (osActiva?.codigoOS) {
    metaParts.push(`Orden: ${osActiva.codigoOS}`);
  }
  if (caso.contratoAlquiler?.trim()) {
    metaParts.push(`Contrato: ${caso.contratoAlquiler.trim()}`);
  }

  const headerOpts: MurHeaderOptions = {
    titulo: 'INFORME TÉCNICO DE SERVICIO',
    codigo: codigoInforme,
    subtituloMeta: metaParts.join('  ·  '),
  };

  let curY = drawMurHeader(doc, fontFamily, headerOpts);

  const fechaIngresoRaw =
    primeraInc?.fecha || caso.fechaApertura || new Date().toISOString();
  const fechaSalidaRaw =
    entrega?.fechaEntrega ||
    informeActivo?.fechaEmision ||
    osActiva?.fechaFin ||
    osActiva?.pruebasQA?.fechaPruebas ||
    caso.fechaCierre ||
    new Date().toISOString();

  const fIn = formatDateMur(fechaIngresoRaw);
  const hIn = formatTimeMur(fechaIngresoRaw);
  const fOut = formatDateMur(fechaSalidaRaw);
  const hOut = formatTimeMur(fechaSalidaRaw);

  const tecnicoNombre =
    informeActivo?.tecnicoResponsable ||
    osActiva?.tecnicoAsignado ||
    ultimoDT?.tecnicoResponsable ||
    'Especialista de Taller';
  const horasHombre =
    informeActivo?.horasHombre || osActiva?.horasHombreReales || osActiva?.horasHombre || 1;

  const trazabilidadLinea = [
    primeraInc?.codigoINC,
    ultimoDT?.codigoDT,
    osActiva?.codigoOS,
  ]
    .filter(Boolean)
    .join(' / ') || 'INC-001';

  const rightRows: KeyValueRow[] = [
    { label: 'EXPEDIENTE:', value: codigoCaso },
    { label: 'TRAZABILIDAD:', value: trazabilidadLinea },
    { label: 'FECHA DE INGRESO:', value: hIn ? `${fIn} (${hIn})` : fIn },
    { label: 'FECHA DE SALIDA:', value: hOut ? `${fOut} (${hOut})` : fOut },
    { label: 'TÉCNICO / TIEMPO:', value: `${tecnicoNombre} (${horasHombre} h)` },
  ];

  curY = drawClientAndDatesBox(doc, fontFamily, curY, caso.cliente, rightRows);
  curY = drawEquipmentBox(doc, fontFamily, curY, caso.equipo);

  const fallaReportada =
    primeraInc?.descripcion?.trim() || 'Servicio técnico solicitado por el usuario.';
  const diagnosticoTexto =
    ultimoDT?.diagnosticoDetallado?.trim() ||
    ultimoDT?.hallazgos?.trim() ||
    informeActivo?.resumenDiagnostico?.trim() ||
    'Inspección técnica general y verificación de componentes internos.';
  const actividadesTexto =
    osActiva?.actividadesRealizadas?.trim() ||
    osActiva?.actividades?.trim() ||
    informeActivo?.resumenActividades?.trim() ||
    'Intervención técnica especializada y validación funcional en laboratorio.';

  const repuestosInstalados =
    ultimoDT?.requiereRepuestos &&
    ultimoDT?.repuestosRequeridos &&
    ultimoDT.repuestosRequeridos.length > 0
      ? ultimoDT.repuestosRequeridos
          .map((r) => `[${r.partNumber}] ${r.descripcion} (Cant.: ${r.cantidad})`)
          .join('\n')
      : osActiva?.piezasReemplazadas?.trim() || 'Ninguno';

  const resultadoOperatividad =
    osActiva?.pruebasQA?.resultadoOperatividad ||
    informeActivo?.dictamenFinal ||
    (osActiva?.pruebasQA?.superoQA ? 'REPARADO' : 'REPARADO');

  const estadoEquipo =
    resultadoOperatividad === 'INOPERATIVO' || caso.estado === 'INOPERATIVO'
      ? 'INOPERATIVO (Equipo con daño irreversible o baja técnica)'
      : resultadoOperatividad === 'OBSERVADO' || caso.estado === 'OBSERVADO'
        ? 'OBSERVADO EN PRUEBAS (Requiere re-evaluación)'
        : 'REPARADO / OPERATIVO (Control QA Conforme)';

  const qaChecklist = osActiva?.pruebasQA?.checklist;
  const qaChecksCount = qaChecklist
    ? [
        qaChecklist.encendidoPostBios,
        qaChecklist.funcionamientoRepuesto,
        qaChecklist.pruebasRedPuertos,
        qaChecklist.limpiezaExterna,
      ].filter(Boolean).length
    : null;
  const qaDetalleExtra = [
    qaChecksCount !== null ? `Protocolo QA: ${qaChecksCount}/4 verificaciones superadas` : '',
    osActiva?.pruebasQA?.observacionesQA?.trim() || '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const controlQATexto = qaDetalleExtra ? `${estadoEquipo}\n${qaDetalleExtra}` : estadoEquipo;
  const obsFinales = entrega?.observaciones?.trim() || 'Ninguna';

  const specs: LabeledSectionSpec[] = [
    { label: 'FALLA REPORTADA:', content: fallaReportada, minHeight: 11.5 },
    { label: 'DIAGNÓSTICO:', content: diagnosticoTexto, minHeight: 15 },
    {
      label: 'ACTIVIDADES\nREALIZADAS:',
      content: actividadesTexto,
      minHeight: 22,
      elastic: true,
    },
    { label: 'CONTROL QA:', content: controlQATexto, minHeight: 12 },
    { label: 'PIEZAS / REPUESTOS:', content: repuestosInstalados, minHeight: 11.5 },
    { label: 'OBSERVACIONES:', content: obsFinales, minHeight: 11.5 },
  ];

  const measured = measureLabeledSections(doc, fontFamily, specs);
  const { height: consH } = measureConsideracionesHeight(
    doc,
    fontFamily,
    `CONSIDERACIONES: ${CONSIDERACIONES_INFORME_SERVICIO}`
  );
  const sigReserve = 23.5 + MUR_LAYOUT.boxGap;
  distributeElasticHeight(curY, measured, sigReserve + MUR_LAYOUT.boxGap + consH, 40);

  for (const sec of measured) {
    curY = drawMeasuredSection(doc, fontFamily, curY, sec, headerOpts);
  }

  const receptorNom =
    entrega?.receptorNombre || caso.cliente.contacto || caso.cliente.razonSocial;
  const receptorDoc = entrega?.receptorDniRuc || caso.cliente.ruc;

  curY = drawSignatureBoxes(
    doc,
    fontFamily,
    curY,
    {
      leftTitle: esAlquiler ? 'USUARIO' : 'CONFORMIDAD DEL CLIENTE',
      leftPrimary: esAlquiler ? receptorNom : `Receptor: ${receptorNom}`,
      leftSecondary: !esAlquiler && receptorDoc ? `DNI / RUC: ${receptorDoc}` : undefined,
      rightTitle: 'TÉCNICO RESPONSABLE',
      rightPrimary: tecnicoNombre,
      rightSecondary: 'MUR Tecnología S.A.C. - Laboratorio Técnico',
    },
    headerOpts
  );

  drawConsideracionesBox(
    doc,
    fontFamily,
    curY,
    'CONSIDERACIONES:',
    CONSIDERACIONES_INFORME_SERVICIO,
    headerOpts
  );
  drawMurFooterAllPages(doc, fontFamily);

  if (!options?.skipSave) {
    doc.save(
      `InformeTecnico_${codigoInforme}_${codigoCaso}_${caso.equipo.numeroSerie || 'EQUIPO'}.pdf`
    );
  }

  return doc;
};

// Alias para retrocompatibilidad
export const generarConstanciaAtencion = generarInformeTecnico;
