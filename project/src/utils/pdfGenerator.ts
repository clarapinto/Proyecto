interface ProposalItem {
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AwardDetails {
  requestNumber: string;
  requestTitle: string;
  requestDescription: string;
  supplierName: string;
  supplierContact: string;
  awardedDate: string;
  roundNumber: number;
  subtotal: number;
  feeAmount: number;
  totalAmount: number;
  contractFeePercentage: number;
  items: ProposalItem[];
  contextualInfo?: string | null;
}

export async function generateAwardPDF(details: AwardDetails) {
  const jsPDFModule = await import('jspdf/dist/jspdf.es.min.js');
  const jsPDF = jsPDFModule.default || jsPDFModule;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE ADJUDICACIÓN', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('INFORMACIÓN DE LA SOLICITUD', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Número de Solicitud: ${details.requestNumber}`, margin, yPos);
  yPos += 6;
  doc.text(`Título: ${details.requestTitle}`, margin, yPos);
  yPos += 6;

  const descLines = doc.splitTextToSize(details.requestDescription, pageWidth - 2 * margin);
  doc.text('Descripción:', margin, yPos);
  yPos += 6;
  doc.setTextColor(60);
  doc.text(descLines, margin + 5, yPos);
  yPos += descLines.length * 5 + 5;

  doc.setTextColor(0);
  doc.text(`Fecha de Adjudicación: ${new Date(details.awardedDate).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`, margin, yPos);
  yPos += 6;
  doc.text(`Ronda de Adjudicación: ${details.roundNumber}`, margin, yPos);
  yPos += 12;

  doc.setDrawColor(0, 102, 204);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROVEEDOR ADJUDICADO', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${details.supplierName}`, margin, yPos);
  yPos += 6;
  doc.text(`Contacto: ${details.supplierContact}`, margin, yPos);
  yPos += 12;

  doc.setDrawColor(0, 102, 204);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DE LA PROPUESTA ADJUDICADA', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍTEMS DE LA PROPUESTA', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  details.items.forEach((item, index) => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFillColor(240, 248, 255);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.item_name}`, margin + 2, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    if (item.description) {
      const itemDescLines = doc.splitTextToSize(item.description, pageWidth - 2 * margin - 10);
      doc.setTextColor(60);
      doc.text(itemDescLines, margin + 5, yPos);
      yPos += itemDescLines.length * 5 + 2;
    }

    doc.setTextColor(0);
    doc.text(`Cantidad: ${item.quantity}`, margin + 5, yPos);
    yPos += 5;
    doc.text(`Precio Unitario: $${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 5, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${item.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
  });

  if (details.contextualInfo) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN ADICIONAL', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    const contextLines = doc.splitTextToSize(details.contextualInfo, pageWidth - 2 * margin);
    doc.setTextColor(60);
    doc.text(contextLines, margin + 2, yPos);
    yPos += contextLines.length * 5 + 10;
  }

  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  yPos += 5;
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO', margin, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
  doc.text('Subtotal:', margin + 5, yPos);
  doc.text(`$${details.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 10;

  doc.text(`Honorarios de Contrato (${details.contractFeePercentage}%):`, margin + 5, yPos);
  doc.text(`$${details.feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 12;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(220, 240, 255);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
  doc.text('TOTAL ADJUDICADO:', margin + 5, yPos + 7);
  doc.setTextColor(0, 102, 204);
  doc.text(`$${details.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 5, yPos + 7, { align: 'right' });
  yPos += 20;

  yPos = pageHeight - 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Este documento certifica la adjudicación de la solicitud al proveedor indicado.', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('Generado automáticamente por el Sistema de Gestión de Compras.', pageWidth / 2, yPos, { align: 'center' });

  const fileName = `Adjudicacion_${details.requestNumber}_${details.supplierName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
