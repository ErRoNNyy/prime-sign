import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Field } from "@/lib/types/database";

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function getPdfPageCount(bytes: ArrayBuffer | Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPageCount();
}

export async function stampFieldsOntoPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  fields: Array<Field & { recipientName?: string }>,
) {
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const field of fields) {
    if (!field.value) continue;
    const pages = pdf.getPages();
    const page = pages[field.page - 1];
    if (!page) continue;

    const { width, height } = page.getSize();
    const x = (field.x_pct / 100) * width;
    const yFromTop = (field.y_pct / 100) * height;
    const w = (field.w_pct / 100) * width;
    const h = (field.h_pct / 100) * height;
    const y = height - yFromTop - h;

    if (field.type === "signature" && field.value.startsWith("data:image")) {
      const base64 = field.value.split(",")[1];
      if (!base64) continue;
      const imageBytes = base64ToUint8Array(base64);
      const png = await pdf.embedPng(imageBytes);
      page.drawImage(png, { x, y, width: w, height: h });
    } else if (field.type === "approve" && field.value === "true") {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: rgb(0.15, 0.28, 0.12),
        borderWidth: 2,
        color: rgb(0.48, 0.55, 0.41),
      });
      const label = `Approved by ${field.recipientName ?? "signer"}`;
      page.drawText(label, {
        x: x + 4,
        y: y + h / 2 - 4,
        size: Math.min(11, h * 0.45),
        font,
        color: rgb(0.1, 0.13, 0.09),
        maxWidth: w - 8,
      });
    } else if (field.type === "approve" && field.value === "false") {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: rgb(0.55, 0.12, 0.12),
        borderWidth: 2,
        color: rgb(0.75, 0.22, 0.22),
      });
      const label = `Denied by ${field.recipientName ?? "signer"}`;
      page.drawText(label, {
        x: x + 4,
        y: y + h / 2 - 4,
        size: Math.min(11, h * 0.45),
        font,
        color: rgb(1, 1, 1),
        maxWidth: w - 8,
      });
    }
  }

  return pdf.save();
}
