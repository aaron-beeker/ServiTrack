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
 * ETAPA 4: Generación del INFORME TÉCNICO FINAL
 * Reemplaza la hoja 'ConstAtenciónServicio' con el Informe Técnico de cierre,
 * incluyendo actividades de intervención, QA, y recuadros para firma y sello de conformidad.
 */
export const generarInformeTecnico = (orden: OrdenServicio) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  const primaryColor: [number, number, number] = [30, 58, 138]; // Azul corporativo
  const accentColor: [number, number, number] = [16, 185, 129]; // Verde esmeralda conformidad
  const textColor: [number, number, number] = [30, 41, 59];

  // 1. Encabezado Institucional
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('MUR TECNOLOGIA S.A.C.', 14, 18);
  
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20603786301  |  Informe Técnico Final y Conformidad de Servicio', 14, 24);
  doc.text('Jr. Rodin N.º 129 Dpto. 301, Surquillo - Lima', 14, 29);

  // Código de Informe Técnico Final
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`INFORME TÉCNICO N° ${orden.codigoDT}`, 110, 18);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estado Final: ${orden.estadoGeneral}`, 110, 24);

  const safeFormatDate = (val: string | null | undefined) => {
    if (!val) return 'N/A';
    try {
      return format(new Date(val), 'dd/MM/yyyy HH:mm');
    } catch {
      return String(val);
    }
  };

  // 2. Bloque Cliente y Entrega
  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    head: [['DATOS DEL CLIENTE', 'DATOS DE RECEPCIÓN Y ENTREGA']],
    body: [
      [
        `Razón Social: ${orden.ingreso.cliente.razonSocial}\nRUC: ${orden.ingreso.cliente.ruc}\nContacto: ${orden.ingreso.cliente.contacto}\nTeléfono: ${orden.ingreso.cliente.telefono || 'N/A'}`,
        `Fecha de Entrega: ${safeFormatDate(orden.cierre.fechaEntrega)}\nLugar: ${orden.cierre.lugarEntrega || 'Taller MUR Tecnología'}\nReceptor: ${orden.cierre.receptorNombre || orden.ingreso.cliente.contacto}\nDNI/RUC Receptor: ${orden.cierre.receptorDniRuc || orden.ingreso.cliente.ruc}`
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3.5, valign: 'top' }
  });

  // 3. Bloque Equipo
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    head: [['DATOS DEL EQUIPO INTERVENIDO', '']],
    body: [
      ['Tipo de Dispositivo:', orden.ingreso.equipo.tipoEquipo || 'Laptop'],
      ['Marca y Modelo:', `${orden.ingreso.equipo.marca} ${orden.ingreso.equipo.modelo}`],
      ['Número de Serie (S/N):', orden.ingreso.equipo.numeroSerie],
      ['Part Number (P/N):', orden.ingreso.equipo.partNumber || 'No especificado'],
    ],
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' }
    },
    styles: { fontSize: 9, cellPadding: 2.5 }
  });

  // 4. Detalle de la Intervención y Solución
  const repuestosInstalados = orden.diagnostico.requiereRepuestos && orden.diagnostico.repuestosRequeridos && orden.diagnostico.repuestosRequeridos.length > 0
    ? orden.diagnostico.repuestosRequeridos.map(r => `• [${r.partNumber}] ${r.descripcion} (${r.cantidad} und)`).join('\n')
    : 'Ninguno (Mantenimiento físico y/o configuración lógica)';

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    head: [['DETALLES DEL SERVICIO TÉCNICO Y CONTROL DE CALIDAD']],
    body: [
      [{ content: 'Falla Inicial Reportada:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      [orden.ingreso.fallaReportada],
      [{ content: 'Diagnóstico y Causa Raíz Comprobada:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      [orden.diagnostico.diagnosticoDetallado || 'Diagnóstico de hardware/software completado'],
      [{ content: 'Actividades Realizadas en Taller:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      [orden.intervencion.actividadesRealizadas || 'Servicio técnico, sustitución de partes y pruebas de operatividad.'],
      [{ content: 'Repuestos Homologados Instalados:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      [repuestosInstalados],
      [{ content: 'Datos de Intervención y Horas Invertidas:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      [`Técnico Ejecutor: ${orden.intervencion.tecnicoAsignado || 'Especialista de Taller'} | Horas-Hombre: ${orden.intervencion.horasHombre || 1} hrs | QA Operativo: ${orden.intervencion.pruebasQA?.superoPruebas !== false ? 'CONFORME (100% Operativo)' : 'OBSERVADO / NO CONFORME'}`],
      [{ content: 'Observaciones de Entrega:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      [orden.cierre.observacionesFinales || 'Equipo entregado en perfecto estado operativo con pruebas de encendido conformes.']
    ],
    styles: { fontSize: 8.5, cellPadding: 2.8 }
  });

  // 5. Cláusula de Conformidad
  const currentY = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const legalText = `DECLARACIÓN DE CONFORMIDAD Y ACEPTACIÓN DEL SERVICIO:
El cliente/receptor declara recibir el equipo en óptimas condiciones de funcionamiento y estética, habiendo verificado las pruebas de operatividad correspondientes.
La garantía del servicio técnico cubre exclusivamente los componentes instalados y la mano de obra documentada según los términos de MUR TECNOLOGÍA S.A.C.`;
  doc.text(legalText, 14, currentY);

  // 6. Recuadros para Firma y Sello de Conformidad (reemplaza ConstAtenciónServicio)
  const boxY = currentY + 12;
  
  // Recuadro Firma Cliente
  doc.setDrawColor(148, 163, 184);
  doc.rect(14, boxY, 86, 32);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA Y SELLO DE CONFORMIDAD DEL CLIENTE', 18, boxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receptor: ${orden.cierre.receptorNombre || orden.ingreso.cliente.contacto}`, 18, boxY + 24);
  doc.text(`DNI / RUC: ${orden.cierre.receptorDniRuc || orden.ingreso.cliente.ruc}`, 18, boxY + 29);

  // Recuadro Firma Técnico Responsable
  doc.rect(108, boxY, 88, 32);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA DEL TÉCNICO RESPONSABLE', 112, boxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Técnico: ${orden.intervencion.tecnicoAsignado || 'Técnico Especialista'}`, 112, boxY + 24);
  doc.text('MUR TECNOLOGIA S.A.C. - Laboratorio Técnico', 112, boxY + 29);

  // Pie de página
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('MUR TECNOLOGÍA S.A.C.  |  Informe Técnico de Servicio  |  Lima - Perú', 14, pageHeight - 8);

  // Guardar PDF como _InformeTecnico.pdf
  doc.save(`${orden.codigoDT}_InformeTecnico.pdf`);
};

// Alias para retrocompatibilidad
export const generarConstanciaAtencion = generarInformeTecnico;
