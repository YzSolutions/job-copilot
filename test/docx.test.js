import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { createTailoredDocx, mergeResumes, parseDocxBytes, replaceDocxSection, tailoredResumeFileName } from "../dist-test/docx.js";

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

test("additional imports preserve existing resumes and replace matching variants", () => {
  const existing = [{ id: "business", label: "Business", professionalText: "Old" }];
  assert.deepEqual(mergeResumes(existing, [
    { id: "business", label: "Business", professionalText: "Updated" },
    { id: "healthcare", label: "Healthcare", professionalText: "Health" }
  ]), [
    { id: "business", label: "Business", professionalText: "Updated" },
    { id: "healthcare", label: "Healthcare", professionalText: "Health" }
  ]);
});

test("tailored DOCX replaces one exact section across Word runs and preserves other files", () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>Led executive </w:t></w:r><w:r><w:t>workshops.</w:t></w:r></w:p><w:p><w:r><w:t>Keep this line.</w:t></w:r></w:p></w:body></w:document>';
  const source = zipSync({ "word/document.xml": strToU8(xml), "word/styles.xml": strToU8("styles") });
  const tailored = createTailoredDocx(source, "Business Architect.docx", "Led executive workshops.", "Led executive workshops that aligned transformation priorities.");
  const archive = unzipSync(tailored);
  assert.equal(strFromU8(archive["word/styles.xml"]), "styles");
  assert.match(strFromU8(archive["word/document.xml"]), /aligned transformation priorities/);
  assert.equal(parseDocxBytes(tailored, "Tailored.docx").professionalText, "Led executive workshops that aligned transformation priorities.\nKeep this line.");
});

test("tailored DOCX refuses a missing or ambiguous original section", () => {
  const repeated = '<w:document><w:body><w:p><w:r><w:t>Same section</w:t></w:r></w:p><w:p><w:r><w:t>Same section</w:t></w:r></w:p></w:body></w:document>';
  assert.throws(() => replaceDocxSection(repeated, "Same section", "Improved"), /more than once/);
  assert.throws(() => replaceDocxSection(repeated, "Missing section", "Improved"), /not found/);
});

test("tailored résumé filename is Windows-safe and bounded", () => {
  const fileName = tailoredResumeFileName("Yahya Zia: Business Architect", "Example/Company", "Senior * Architect");
  assert.equal(fileName, "Yahya_Zia_Business_Architect_Example_Company_Senior_Architect_Tailored.docx");
  assert.ok(fileName.length <= 145);
});
