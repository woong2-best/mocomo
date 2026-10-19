import { readFile } from "fs/promises";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFForm, type PDFPage } from "pdf-lib";
import { countryDisplayName } from "@/lib/i18n/countries";
import type { PreparedTaxForm } from "@/lib/creator-payout/tax-form-input";

const W9 = "topmostSubform[0].Page1[0]";
const W8 = "topmostSubform[0].Page1[0]";

function templatePath(name: string): string {
  return path.join(process.cwd(), "src/lib/creator-payout/templates", name);
}

function irsDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}-${day}-${date.getUTCFullYear()}`;
}

function countryName(code: string): string {
  return countryDisplayName(code, "en");
}

async function loadTemplate(name: string, fontBytes: Buffer) {
  const bytes = await readFile(templatePath(name));
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  return { doc, font, form: doc.getForm() };
}

function setText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string) {
  if (!value) return;
  form.getTextField(name).setText(value);
}

function ensureWidgetAppearances(doc: PDFDocument, form: PDFForm) {
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      try {
        widget.getNormalAppearance();
      } catch {
        widget.setNormalAppearance(doc.context.register(doc.context.formXObject([])));
      }
    }
  }
}

function drawSignature(page: PDFPage, png: Awaited<ReturnType<PDFDocument["embedPng"]>>, x: number, y: number) {
  const width = 180;
  const height = Math.min(28, (png.height / png.width) * width);
  page.drawImage(png, { x, y, width, height });
}

export async function generateTaxFormPdf(input: PreparedTaxForm): Promise<Uint8Array> {
  const fontBytes = await readFile(templatePath("NotoSansKR-Regular.ttf"));
  if (input.kind === "W9") return fillW9(input, fontBytes);
  return fillW8(input, fontBytes);
}

async function fillW9(input: Extract<PreparedTaxForm, { kind: "W9" }>, fontBytes: Buffer) {
  const { doc, font, form } = await loadTemplate("fw9.pdf", fontBytes);
  setText(form, `${W9}.f1_01[0]`, input.fullName);
  setText(form, `${W9}.f1_02[0]`, input.businessName);
  setText(form, `${W9}.Address_ReadOrder[0].f1_07[0]`, input.street);
  setText(form, `${W9}.Address_ReadOrder[0].f1_08[0]`, input.cityLine);
  try {
    form.getCheckBox(`${W9}.Boxes3a-b_ReadOrder[0].c1_1[0]`).check();
  } catch {
    // The classification box is optional if this IRS revision renames it.
  }
  if (input.tinKind === "SSN") {
    setText(form, `${W9}.f1_11[0]`, input.tin.slice(0, 3));
    setText(form, `${W9}.f1_12[0]`, input.tin.slice(3, 5));
    setText(form, `${W9}.f1_13[0]`, input.tin.slice(5));
  } else {
    setText(form, `${W9}.f1_14[0]`, input.tin.slice(0, 2));
    setText(form, `${W9}.f1_15[0]`, input.tin.slice(2));
  }
  form.updateFieldAppearances(font);
  ensureWidgetAppearances(doc, form);
  form.flatten();
  const png = await doc.embedPng(input.signaturePng);
  const page = doc.getPage(0);
  page.drawText("X", { x: 73, y: 603, size: 9, font });
  drawSignature(page, png, 150, 168);
  page.drawText(irsDate(input.signedOn), { x: 430, y: 176, size: 9, font });
  return doc.save();
}

async function fillW8(input: Extract<PreparedTaxForm, { kind: "W8BEN" }>, fontBytes: Buffer) {
  const { doc, font, form } = await loadTemplate("fw8ben.pdf", fontBytes);
  setText(form, `${W8}.f_1[0]`, input.fullName);
  setText(form, `${W8}.f_2[0]`, countryName(input.citizenshipCode));
  setText(form, `${W8}.f_3[0]`, input.street);
  setText(form, `${W8}.f_4[0]`, input.cityLine);
  setText(form, `${W8}.f_5[0]`, countryName(input.residenceCountryCode));
  setText(form, `${W8}.f_10[0]`, input.foreignTin);
  setText(form, `${W8}.Date[0]`, irsDate(input.signedOn));
  setText(form, `${W8}.f_21[0]`, input.fullName);
  try {
    form.getCheckBox(`${W8}.c1_02[0]`).check();
  } catch {
    // Capacity checkbox is already part of the signed certification text.
  }
  form.updateFieldAppearances(font);
  ensureWidgetAppearances(doc, form);
  form.flatten();
  const png = await doc.embedPng(input.signaturePng);
  const page = doc.getPage(0);
  page.drawText("X", { x: 110, y: 97, size: 9, font });
  drawSignature(page, png, 112, 70);
  return doc.save();
}
