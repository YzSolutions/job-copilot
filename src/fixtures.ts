import type { Resume } from "./prompts.js";

export const fictionalJob = `Northstar Health is hiring a Business Transformation Lead to map current-state processes, facilitate executive workshops, define measurable future-state improvements, and guide responsible AI adoption. Candidates should have healthcare transformation, business architecture, requirements analysis, and cross-functional stakeholder leadership experience.`;

export const fictionalResumes: Resume[] = [
  {
    id: "business-architecture",
    label: "Business Architecture",
    professionalText: `Transformation consultant who maps current-state processes, facilitates stakeholder workshops, translates operating needs into business capabilities, and develops future-state roadmaps. Led requirements and process improvement engagements for fictional healthcare clients.`
  },
  {
    id: "technical-delivery",
    label: "Technical Delivery",
    professionalText: `Technical delivery lead experienced in application releases, infrastructure coordination, incident response, and software development planning for fictional retail clients.`
  }
];

export const cloudFixture = {
  jobRequirements: "Healthcare transformation, executive workshops, measurable process improvement.",
  sectionId: "summary",
  sectionText: "Consultant experienced in business analysis and technology projects.",
  verifiedEvidence: "Facilitated executive workshops; mapped healthcare processes; created transformation roadmaps."
};

