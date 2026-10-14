import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Caso, DiagnosticoTecnicoCaso } from '@/types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

/**
 * Generación de INFORME TÉCNICO FORMAL (Ruta 2B - Diagnóstico Técnico Formal)
 * Sustenta cotizaciones, repuestos requeridos, causa raíz, responsabilidades y dictamen técnico.
 */
export const generarInformeTecnicoCasoPDF = (caso: Caso, dt: DiagnosticoTecnicoCaso) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  const primaryColor: [number, number, number] = [35, 105, 161]; // #2369A1 Azul MUR
  const accentColor: [number, number, number] = [220, 38, 38]; // Rojo
  const headerColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const textColor: [number, number, number] = [51, 65, 85]; // Slate 700

  // 1. Cabecera Institucional
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('MUR TECNOLOGIA S.A.C.', 14, 18);

  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20603786301  |  Laboratorio Central de Diagnóstico', 14, 23);
  doc.text('Av. Alfredo Benavides 3082, Of. 503, Miraflores - Lima', 14, 27);
  doc.text('Tel: (01) 640-9200  |  soporte@murtecnologia.com', 14, 31);

  // Recuadro de Título
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME TÉCNICO DE EVALUACIÓN', 110, 18);

  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.text(`DT N° ${dt.codigoDT}`, 110, 23);

  doc.setFontSize(8.5);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Expediente Único: ${caso.codigoCaso}`, 110, 28);
  if (caso.contratoAlquiler) {
    doc.text(`Contrato Alquiler: ${caso.contratoAlquiler}`, 110, 32);
  }

  const safeFormatDate = (val: string | null | undefined) => {
    if (!val) return 'N/A';
    try {
      return format(new Date(val), 'dd/MM/yyyy HH:mm');
    } catch {
      return String(val);
    }
  };

  // 2. Tabla Datos Generales y Activo
  autoTable(doc, {
    startY: 37,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    head: [['DATOS DEL CLIENTE', 'IDENTIFICACIÓN DEL ACTIVO']],
    body: [
      [
        `Razón Social: ${caso.cliente.razonSocial}\nRUC: ${caso.cliente.ruc}\nContacto: ${caso.cliente.contacto || 'N/A'}\nTeléfono: ${caso.cliente.telefono || 'N/A'}`,
        `Equipo: ${caso.equipo.tipoEquipo}\nMarca / Modelo: ${caso.equipo.marca} ${caso.equipo.modelo}\nNúmero de Serie: ${caso.equipo.numeroSerie}\nFecha Diagnóstico: ${safeFormatDate(dt.fecha)}`
      ]
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: textColor }
  });

  // 3. Hallazgos y Causa Raíz
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    theme: 'grid',
    headStyles: { fillColor: headerColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    head: [['EVALUACIÓN TÉCNICA', 'DICTAMEN DEL LABORATORIO']],
    body: [
      ['Tipo de Falla', dt.tipoFalla],
      ['Técnico Evaluador', dt.tecnicoResponsable],
      ['Causa Raíz / Hallazgos', dt.hallazgos],
      ['Diagnóstico Detallado', dt.diagnosticoDetallado],
      ['Daños Físicos Observados', dt.danosFisicos || 'Sin daños físicos aparentes'],
      ['Solución / Recomendación', dt.solucionPropuesta || dt.recomendaciones || 'Intervención requerida']
    ],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: textColor },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 }
    }
  });

  // 4. Tabla de Repuestos Requeridos (si aplica)
  if (dt.requiereRepuestos && dt.repuestosRequeridos && dt.repuestosRequeridos.length > 0) {
    const filasRepuestos = dt.repuestosRequeridos.map(r => [
      r.partNumber,
      r.descripcion,
      r.cantidad.toString()
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      theme: 'grid',
      headStyles: { fillColor: [40, 116, 166], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      head: [['Part Number', 'Descripción del Repuesto / Componente', 'Cantidad']],
      body: filasRepuestos,
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: textColor }
    });
  }

  // 5. Estado de Decisión / Aprobación
  const posY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8.5);
  doc.setTextColor(...headerColor);
  doc.setFont('helvetica', 'bold');
  const txtAprobacion = dt.aprobacionCliente 
    ? (dt.aprobacionCliente.aprobado ? 'PROPUESTA APROBADA POR CLIENTE' : `RECHAZADO: ${dt.aprobacionCliente.motivoRechazo || 'Sin detalle'}`)
    : 'ESTADO: PENDIENTE DE APROBACIÓN DE COTIZACIÓN';
  doc.text(`Dictamen Comercial: ${txtAprobacion}`, 14, posY);

  // 6. Bloques de Firmas
  const firmasY = posY + 28;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, firmasY, 85, firmasY);
  doc.setFontSize(8.5);
  doc.setTextColor(...headerColor);
  doc.setFont('helvetica', 'bold');
  doc.text('LABORATORIO DE HARDWARE', 55, firmasY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(dt.tecnicoResponsable, 55, firmasY + 8, { align: 'center' });
  doc.text('MUR Tecnología S.A.C.', 55, firmasY + 12, { align: 'center' });

  doc.line(125, firmasY, 185, firmasY);
  doc.setFont('helvetica', 'bold');
  const esAlquiler = caso.origen === 'ALQUILER' || Boolean(caso.contratoAlquiler?.trim());
  const tituloFirma = esAlquiler ? 'USUARIO' : 'CONFORMIDAD DE CLIENTE';
  doc.text(tituloFirma, 155, firmasY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  const nombreFirma = caso.cliente.contacto || caso.cliente.razonSocial;
  doc.text(nombreFirma, 155, firmasY + 8, { align: 'center' });
  if (!esAlquiler && caso.cliente.ruc) {
    doc.text(`RUC: ${caso.cliente.ruc}`, 155, firmasY + 12, { align: 'center' });
  }

  doc.save(`InformeTecnico_${dt.codigoDT}_${caso.codigoCaso}.pdf`);
};
