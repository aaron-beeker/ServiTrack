import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Ticket, Cliente, Equipo } from '@/types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export const generarConstanciaAtencion = (
  ticket: Ticket,
  cliente: Cliente,
  equipo: Equipo
) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Constantes de estilo
  const primaryColor: [number, number, number] = [41, 128, 185]; 
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

  // Código
  doc.setFontSize(14);
  doc.setTextColor(231, 76, 60); 
  doc.setFont('helvetica', 'bold');
  doc.text(`CONSTANCIA DE ATENCIÓN N° ${ticket.codigoDT}`, 100, 20);

  // Helper to safely convert Date or Timestamp
  const safeDate = (date: any) => date instanceof Date ? date : (date?.toDate?.() || new Date(0));

  // 2. Bloque Cliente y Fechas
  let startY = 45;
  autoTable(doc, {
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    head: [['DATOS DEL CLIENTE', 'FECHA DE ATENCIÓN']],
    body: [
      [
        `Razón Social: ${cliente.razonSocial}\nContacto: ${cliente.nombreContacto}\nRUC/DNI: ${cliente.clienteId}`,
        `Fecha de Salida: ${ticket.reparacion?.fechaSalida ? format(safeDate(ticket.reparacion.fechaSalida), 'dd/MM/yyyy HH:mm') : 'N/A'}`
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
    ],
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' }
    },
    styles: { fontSize: 10, cellPadding: 3 }
  });

  // 4. Secciones Tabulares de Atención
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    head: [['DETALLES DEL SERVICIO TÉCNICO']],
    body: [
      [{ content: 'Falla Reportada:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.ingreso.fallaReportada],
      [{ content: 'Falla Real Encontrada:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.diagnostico?.fallaReal || 'N/A'],
      [{ content: 'Actividad Realizada:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.reparacion?.actividadRealizada || 'Ninguna actividad registrada'],
      [{ content: 'Repuestos Instalados:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.reparacion?.repuestosInstalados?.join(', ') || 'Ninguno'],
      [{ content: 'Estado Final del Equipo:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.estado],
      [{ content: 'Observaciones Finales:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
      [ticket.reparacion?.observacionesFinales || 'Ninguna'],
    ],
    styles: { fontSize: 10, cellPadding: 4 }
  });

  // 5. Conformidad y Firmas
  const currentY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  const legalText = `CONSIDERACIONES DE CONFORMIDAD:
Mediante la presente constancia, el cliente declara haber recibido el equipo arriba detallado en las condiciones descritas y a su entera satisfacción,
quedando conforme con el servicio técnico realizado por MUR TECNOLOGIA S.A.C.
Las reparaciones efectuadas cuentan con una garantía de acuerdo a la cotización comercial aprobada.`;
  
  doc.text(legalText, 14, currentY);

  // Lineas de firma
  const signatureY = currentY + 30;
  doc.line(30, signatureY, 90, signatureY); // Firma Cliente
  doc.text('Firma y Sello del Cliente', 40, signatureY + 5);

  doc.line(120, signatureY, 180, signatureY); // Firma Técnico
  doc.text('Firma Técnico Responsable', 125, signatureY + 5);

  // 6. Pie de página institucional
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('www.murtecnologia.com.pe | mesadeayuda@murtecnologia.com.pe | Telf: (01) XXX-XXXX', 14, pageHeight - 15);

  // Generar y descargar el PDF
  doc.save(`${ticket.codigoDT}_Constancia.pdf`);
};
