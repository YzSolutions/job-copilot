import { strFromU8, unzipSync } from "fflate";
import type { Resume } from "./prompts.js";

const MAX_DOCX_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_TEXT = 100_000;

function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function extractDocxText(xml: string): string {
  const output: string[] = [];
  // shortcut: reads standard Word main-document text only; add headers/footers if a supported resume needs them.
  for (const match of xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<\/w:p>/g)) {
    output.push(match[1] === undefined ? (match[0] === "</w:p>" ? "\n" : "\t") : decodeXml(match[1]));
  }
  return output.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseDocxBytes(bytes: Uint8Array, fileName: string): Resume {
  if (!fileName.toLowerCase().endsWith(".docx")) throw new Error(`${fileName} is not a DOCX file.`);
  if (bytes.byteLength > MAX_DOCX_BYTES) throw new Error(`${fileName} is larger than 5 MB.`);

  const archive = unzipSync(bytes, {
    filter: (entry) => entry.name === "word/document.xml"
  });
  const document = archive["word/document.xml"];
  if (!document) throw new Error(`${fileName} does not contain a readable Word document.`);

  const professionalText = extractDocxText(strFromU8(document));
  if (!professionalText) throw new Error(`${fileName} does not contain readable résumé text.`);
  if (professionalText.length > MAX_RESUME_TEXT) throw new Error(`${fileName} contains too much text.`);

  const label = fileName.replace(/\.docx$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { id, label, professionalText };
}

export async function parseDocxFile(file: File): Promise<Resume> {
  return parseDocxBytes(new Uint8Array(await file.arrayBuffer()), file.name);
}
