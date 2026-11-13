import test from "node:test";
import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import { parseDocxBytes } from "../dist-test/docx.js";

test("DOCX parser extracts local resume text and decodes XML", () => {
  const bytes = zipSync({
    "word/document.xml": strToU8('<w:document><w:body><w:p><w:r><w:t>Business &amp; Process</w:t></w:r></w:p><w:p><w:r><w:t>Healthcare</w:t></w:r></w:p></w:body></w:document>')
  });
  const resume = parseDocxBytes(bytes, "Business_Architect.docx");
  assert.equal(resume.label, "Business Architect");
  assert.equal(resume.professionalText, "Business & Process\nHealthcare");
});

test("DOCX parser rejects an archive without a Word document", () => {
  assert.throws(() => parseDocxBytes(zipSync({ "note.txt": strToU8("no") }), "resume.docx"), /readable Word document/);
});
