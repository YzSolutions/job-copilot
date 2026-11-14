import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { Resume } from "./prompts.js";

const MAX_DOCX_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_TEXT = 25_000;

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

function encodeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function extractDocxText(xml: string): string {
  const output: string[] = [];
  // shortcut: reads standard Word main-document text only; add headers/footers if a supported resume needs them.
  for (const match of xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<\/w:p>/g)) {
    output.push(match[1] === undefined
      ? (match[0] === "</w:p>" || match[0].startsWith("<w:br") ? "\n" : "\t")
      : decodeXml(match[1]));
  }
  return output.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

type TextToken = { start: number; end: number; text: string };
type TextCharacter = { value: string; token: number; offset: number };

function normalizedDocumentText(xml: string): { text: string; characters: TextCharacter[]; tokens: TextToken[] } {
  const tokens: TextToken[] = [];
  const characters: TextCharacter[] = [];
  for (const match of xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<\/w:p>/g)) {
    if (match[1] !== undefined) {
      const text = decodeXml(match[1]);
      const openLength = match[0].indexOf(">") + 1;
      const token = tokens.push({ start: match.index + openLength, end: match.index + openLength + match[1].length, text }) - 1;
      for (let offset = 0; offset < text.length; offset += 1) characters.push({ value: text[offset], token, offset });
    } else {
      characters.push({
        value: match[0] === "</w:p>" || match[0].startsWith("<w:br") ? "\n" : "\t",
        token: -1,
        offset: -1
      });
    }
  }

  const cleaned: TextCharacter[] = [];
  for (const character of characters) {
    if (character.value === "\n") {
      while (cleaned.at(-1) && /[ \t]/.test(cleaned.at(-1)!.value)) cleaned.pop();
      if (cleaned.at(-1)?.value === "\n" && cleaned.at(-2)?.value === "\n") continue;
    }
    cleaned.push(character);
  }
  while (cleaned[0] && /\s/.test(cleaned[0].value)) cleaned.shift();
  while (cleaned.at(-1) && /\s/.test(cleaned.at(-1)!.value)) cleaned.pop();
  return { text: cleaned.map((character) => character.value).join(""), characters: cleaned, tokens };
}

function encodedReplacement(text: string): string {
  return encodeXml(text)
    .replace(/\t/g, '</w:t><w:tab/><w:t xml:space="preserve">')
    .replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
}

export function replaceDocxSection(xml: string, originalText: string, proposedText: string): string {
  const source = originalText.trim();
  const replacement = proposedText.trim();
  if (!source || !replacement) throw new Error("Both the original and tailored résumé sections are required.");
  const document = normalizedDocumentText(xml);
  const start = document.text.indexOf(source);
  if (start < 0) throw new Error("The approved original section was not found in this DOCX file.");
  if (document.text.indexOf(source, start + source.length) >= 0) {
    throw new Error("The approved original section appears more than once in this DOCX file.");
  }
  const matched = document.characters.slice(start, start + source.length).filter((character) => character.token >= 0);
  if (!matched.length) throw new Error("The approved section does not contain replaceable DOCX text.");
  const first = matched[0];
  const last = matched.at(-1)!;
  let output = xml;
  for (let index = last.token; index >= first.token; index -= 1) {
    const token = document.tokens[index];
    const before = index === first.token ? token.text.slice(0, first.offset) : "";
    const after = index === last.token ? token.text.slice(last.offset + 1) : "";
    const content = `${encodeXml(before)}${index === first.token ? encodedReplacement(replacement) : ""}${encodeXml(after)}`;
    output = `${output.slice(0, token.start)}${content}${output.slice(token.end)}`;
  }
  return output;
}

export function createTailoredDocx(bytes: Uint8Array, fileName: string, originalText: string, proposedText: string): Uint8Array {
  if (!fileName.toLowerCase().endsWith(".docx")) throw new Error(`${fileName} is not a DOCX file.`);
  if (bytes.byteLength > MAX_DOCX_BYTES) throw new Error(`${fileName} is larger than 5 MB.`);
  const archive = unzipSync(bytes);
  const document = archive["word/document.xml"];
  if (!document) throw new Error(`${fileName} does not contain a readable Word document.`);
  archive["word/document.xml"] = strToU8(replaceDocxSection(strFromU8(document), originalText, proposedText));
  return zipSync(archive);
}

export function tailoredResumeFileName(resumeLabel: string, company: string, title: string): string {
  const cleaned = [resumeLabel, company, title, "Tailored"]
    .map((part) => part.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, ""))
    .filter(Boolean)
    .join("_")
    .slice(0, 140)
    .replace(/_+$/g, "");
  return `${cleaned || "Tailored_Resume"}.docx`;
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

export function mergeResumes(existing: Resume[], imported: Resume[]): Resume[] {
  const importedIds = new Set(imported.map((resume) => resume.id));
  const merged = [...existing.filter((resume) => !importedIds.has(resume.id)), ...imported];
  if (merged.length > 5) throw new Error("Keep no more than five local résumés.");
  return merged;
}
