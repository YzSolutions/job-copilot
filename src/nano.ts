export function needsCloudChoice(availability: string): boolean {
  return availability === "unsupported" || availability === "unavailable";
}

export const cloudChoiceMessage = "On-device AI is unavailable. Nothing was sent. You may separately prepare, review, and approve a cloud request below.";
