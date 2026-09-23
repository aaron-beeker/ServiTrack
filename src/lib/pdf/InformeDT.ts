import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { OrdenServicio } from '@/types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

/**
 * ETAPA 2: Generación del INFORME DE DIAGNÓSTICO
 * Presenta al cliente la evaluación técnica, tipificación y requerimientos para su aprobación.
 */
export const generarInformeDiagnostico = (orden: OrdenServicio) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Colores corporativos MUR Tecnología
  const primaryColor: [number, number, number] = [30, 58, 138]; // Azul marino corporativo
  const accentColor: [number, number, number] = [220, 38, 38]; // Rojo código
  const textColor: [number, number, number] = [30, 41, 59];

  // 1. Encabezado Institucional
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('MUR TECNOLOGIA S.A.C.', 14, 18);
  
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20603786301  |  Servicio Técnico Especializado', 14, 24);
  doc.text('Jr. Rodin N.º 129 Dpto. 301, Surquillo - Lima', 14, 29);

  // Código de Informe: INFORME DE DIAGNÓSTICO
  const tituloDoc = orden.estadoGeneral === 'CERRADO_SIN_REPARACION'
    ? `ACTA DE DEVOLUCIÓN N° ${orden.codigoDT}`
    : `INFORME DE DIAGNÓSTICO N° ${orden.codigoDT}`;

  doc.setFontSize(14);
  doc.setTextColor(...accentColor);
  doc.setFont('helvetica', 'bold');
  doc.text(tituloDoc, 105, 18);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estado: ${orden.estadoGeneral}`, 105, 24);

  const safeFormatDate = (val: string | null | undefined) => {
    if (!val) return 'Pendiente';
    try {
      return format(new Date(val), 'dd/MM/yyyy HH:mm');
    } catch {
      return String(val);
    }
  };

  // 2. Bloque Cliente y Fechas
  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    head: [['DATOS DEL CLIENTE', 'DATOS DE ATENCIÓN Y REGISTRO']],
    body: [
      [
        `Razón Social: ${orden.ingreso.cliente.razonSocial}\nRUC: ${orden.ingreso.cliente.ruc}\nContacto: ${orden.ingreso.cliente.contacto}\nTeléfono: ${orden.ingreso.cliente.telefono || 'N/A'}\nCorreo: ${orden.ingreso.cliente.correo || 'N/A'}`,
        `Código DT: ${orden.codigoDT}\nFecha de Ingreso: ${safeFormatDate(orden.ingreso.fechaIngreso)}\nFecha de Diagnóstico: ${safeFormatDate(orden.diagnostico.fechaDiagnostico)}\nRegistrado por: ${orden.ingreso.registradoPor}`
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3.5, valign: 'top' }
  });

  // 3. Bloque Equipo
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    head: [['DATOS DEL EQUIPO EN EVALUACIÓN', '']],
    body: [
      ['Tipo de Dispositivo:', orden.ingreso.equipo.tipoEquipo || 'Laptop'],
      ['Marca:', orden.ingreso.equipo.marca],
      ['Modelo:', orden.ingreso.equipo.modelo],
      ['Número de Serie (S/N):', orden.ingreso.equipo.numeroSerie],
      ['Part Number (P/N):', orden.ingreso.equipo.partNumber || 'No especificado'],
    ],
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' }
    },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // Formateo de repuestos
  const repuestosTexto = orden.diagnostico.requiereRepuestos && orden.diagnostico.repuestosRequeridos && orden.diagnostico.repuestosRequeridos.length > 0
    ? orden.diagnostico.repuestosRequeridos
        .map(r => `• ${r.cantidad}x [${r.partNumber}] ${r.descripcion}`)
        .join('\n')
    : 'No requiere repuestos (Servicio lógico / Mantenimiento / Limpieza)';

  // 4. Evaluación Técnica y Diagnóstico Detallado
  const cuerpoEvaluacion: any[] = [
    [{ content: 'Falla Reportada Inicial por el Usuario:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    [orden.ingreso.fallaReportada],
    [{ content: 'Tipificación de Origen de Falla:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    [`Tipo: ${orden.diagnostico.tipoFalla || 'PENDIENTE'} | Técnico Evaluador: ${orden.diagnostico.tecnicoDiagnostico || 'No asignado'}`],
    [{ content: 'Condición Estética y Daños Físicos Externos:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    [orden.diagnostico.danosFisicos || 'Equipo sin daños físicos aparentes al momento de la recepción.'],
    [{ content: 'Diagnóstico Técnico Detallado y Causa Raíz:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    [orden.diagnostico.diagnosticoDetallado || 'En proceso de pruebas de descarte en taller.'],
    [{ content: 'Componentes Requeridos del Catálogo Homologado:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    [repuestosTexto],
    [{ content: 'Requerimiento de Servicio o Mantenimiento:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    [orden.diagnostico.solucionPropuesta || 'Sustitución y montaje de componentes según especificación.']
  ];

  if (orden.aprobacion) {
    cuerpoEvaluacion.push(
      [{ content: 'Resolución de Propuesta Técnica con el Cliente:', styles: { fontStyle: 'bold', fillColor: [224, 231, 255] } }],
      [
        `Decisión: ${orden.aprobacion.aprobado ? 'APROBADO PARA INTERVENCIÓN' : 'RECHAZADO POR EL CLIENTE'}\nFecha: ${safeFormatDate(orden.aprobacion.fechaDecision)}${orden.aprobacion.motivoRechazo ? `\nMotivo de Rechazo: ${orden.aprobacion.motivoRechazo}` : ''}`
      ]
    );
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    head: [['EVALUACIÓN TÉCNICA Y DIAGNÓSTICO DE CAUSA RAÍZ']],
    body: cuerpoEvaluacion,
    styles: { fontSize: 8.5, cellPadding: 2.8 }
  });

  // 5. Bloque Legal
  const finalY = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const legalText = `CONSIDERACIONES DEL INFORME DE DIAGNÓSTICO:
1. El presente informe técnico de diagnóstico detalla la evaluación y pruebas de descarte realizadas conforme al estándar de MUR TECNOLOGIA S.A.C.
2. Toda intervención física y reemplazo de piezas está sujeta a la aprobación formal de la propuesta técnica por parte del cliente.
3. Para cualquier consulta referente a esta evaluación, citar el código correlativo ${orden.codigoDT}.`;
  doc.text(legalText, 14, finalY);

  // 6. Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('MUR TECNOLOGÍA S.A.C.  |  Informe de Diagnóstico Técnico  |  Lima - Perú', 14, pageHeight - 10);

  // Guardar PDF con el nombre exacto
  const nombreArchivo = orden.estadoGeneral === 'CERRADO_SIN_REPARACION'
    ? `${orden.codigoDT}_ActaDevolucion.pdf`
    : `${orden.codigoDT}_InformeDiagnostico.pdf`;

  doc.save(nombreArchivo);
};

// Alias para mantener compatibilidad
export const generarInformeDT = generarInformeDiagnostico;
