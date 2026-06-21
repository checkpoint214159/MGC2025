export type CaregiverCopy = {
  heading: string;
  possessive: string;
  subject: string;
  actionVerb: string;
};

/** Copy tokens that reframe the dashboard to second-person-about-the-patient. */
export function caregiverCopy(isCaregiver: boolean, patientName: string): CaregiverCopy {
  if (isCaregiver) {
    return {
      heading: `Helping ${patientName}`,
      possessive: "their",
      subject: "they",
      actionVerb: "Help them with",
    };
  }
  return { heading: "", possessive: "your", subject: "you", actionVerb: "Do your" };
}
