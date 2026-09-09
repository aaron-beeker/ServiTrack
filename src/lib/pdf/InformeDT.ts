import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Ticket, Cliente, Equipo } from '@/types';

// Extend jsPDF interface to include lastAutoTable which is added by jspdf-autotable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export const generarInformeDT = (
  ticket: Ticket,
  cliente: Cliente,
  equipo: Equipo
) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Constantes de estilo
  const primaryColor: [number, number, number] = [41, 128, 185]; // Azul corporativo ejemplo
  const textColor: [number, number, number] = [44, 62, 80];
  
  // 1. Encabezado Institucional
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('MUR TECNOLOGIA S.A.C.', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20603786301', 14, 26);
  doc.text('Jr. Rodin N.º 129 Dpto. 301, Surquillo - Lima', 14, 32);

  // Código de Informe
  doc.setFontSize(16);
  doc.setTextColor(231, 76, 60); // Rojo para el código
  doc.setFont('helvetica', 'bold');
  doc.text(`INFORME N° ${ticket.codigoDT}`, 130, 20);

  // 2. Bloque Cliente y Fechas
  let startY = 45;
  autoTable(doc, {
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    head: [['DATOS DEL CLIENTE', 'FECHAS']],
    body: [
      [
        `Razón Social: ${cliente.razonSocial}\nContacto: ${cliente.nombreContacto}\nRUC/DNI: ${cliente.clienteId}`,
        `Ingreso: ${format(ticket.ingreso.fecha, 'dd/MM/yyyy HH:mm')}\nDiagnóstico: ${ticket.diagnostico ? format(ticket.diagnostico.fecha, 'dd/MM/yyyy HH:mm') : 'Pendiente'}`
      ],
    ],
    styles: { fontSize: 10, cellPadding: 4, valign: 'middle' }
  });

  // 3. Bloque Equipo
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    head: [['DATOS DEL EQUIPO', '']],
    body: [
      ['Tipo:', equipo.tipo],
      ['Marca:', equipo.marca],
      ['Modelo:', equipo.modelo],
      ['Número de Serie:', equipo.numeroSerie],
      ['Part Number:', equipo.partNumber || 'N/A'],
    ],
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' }
    },
    styles: { fontSize: 10, cellPadding: 3 }
  });

  // 4. Secciones Tabulares del Diagnóstico
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    head: [['EVALUACIÓN TÉCNICA']],
    body: [
      [{ content: 'Falla Reportada por el Cliente:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.ingreso.fallaReportada],
      [{ content: 'Diagnóstico Técnico:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.diagnostico?.diagnosticoTecnico || 'No diagnosticado'],
      [{ content: 'Falla Real Encontrada:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.diagnostico?.fallaReal || 'No definido'],
      [{ content: 'Acción Recomendada:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.diagnostico?.accionRecomendada || 'No definida'],
      [{ content: 'Observaciones / Daño Físico al Ingreso:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.ingreso.danoFisico || 'Ninguno'],
      [{ content: 'Repuestos / Piezas Requeridas:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.diagnostico?.repuestos?.join(', ') || 'Ninguno'],
    ],
    styles: { fontSize: 10, cellPadding: 4 }
  });

  // 5. Bloque Legal de Consideraciones
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  const legalText = `CONSIDERACIONES:
1. El presente informe técnico detalla la evaluación inicial del equipo. Las reparaciones están sujetas a la aprobación de la cotización derivada.
2. Toda reparación o mantenimiento autorizado cuenta con garantía según lo especificado en la cotización comercial.
3. El cliente tiene 72 horas tras la recepción del equipo para reportar incidencias relacionadas a este servicio técnico.`;
  
  doc.text(legalText, 14, doc.lastAutoTable.finalY + 10);

  // 6. Pie de página institucional
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('www.murtecnologia.com.pe | mesadeayuda@murtecnologia.com.pe | Telf: (01) XXX-XXXX', 14, pageHeight - 15);

  // Generar y descargar el PDF
  doc.save(`${ticket.codigoDT}_InformeDT.pdf`);
};
