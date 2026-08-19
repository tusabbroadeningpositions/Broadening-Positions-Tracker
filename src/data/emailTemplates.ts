import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "roster_update_approved",
    name: "Roster Update Request Approved",
    description: "Sent to the user when their Broadening Position roster change request is approved and updated.",
    variables: ["{requestor}", "{jobTitle}", "{category}", "{requestedLastName}", "{requestedRank}"],
    subject: "BP Tracker change request: {jobTitle}",
    body: `Dear {requestor},

Your request to change {jobTitle} has been approved and updated.

Respectfully,

The BP Team`
  },
  {
    id: "roster_update_rejected",
    name: "Roster Update Request Rejected",
    description: "Sent to the user when their Broadening Position roster change request is rejected.",
    variables: ["{requestor}", "{jobTitle}", "{category}", "{reason}"],
    subject: "BP Tracker {jobTitle} update rejected",
    body: `Dear {requestor},

Your request to change {jobTitle} on the BP tracker has been rejected.

Reason: {reason}

Respectfully,

The BP Team`
  },
  {
    id: "vacancy_approved",
    name: "Vacancy Announcement Approved",
    description: "Sent to the POC when their submitted vacancy announcement draft is approved and published.",
    variables: ["{positionTitle}", "{shopName}", "{pocRankName}"],
    subject: "Vacancy Announcement for {positionTitle} has been approved.",
    body: `Your vacancy announcement draft for {positionTitle} has been approved by the Broadening Positions Management Team and has been added to the BP vacancies page.

You may now send the vacancy announcement to ELs for full dissemination. Please use the EL distro list in Outlook.

Respectfully,

The Broadening Positions Management Team`
  },
  {
    id: "vacancy_rejected",
    name: "Vacancy Announcement Needs Edits",
    description: "Sent to the POC when their submitted vacancy announcement draft requires changes or feedback.",
    variables: ["{positionTitle}", "{shopName}", "{pocRankName}", "{editUrl}", "{feedback}"],
    subject: "Vacancy Announcement Draft {positionTitle}: Feedback",
    body: `Your Vacancy Announcement Draft needs edits: {editUrl}

Feedback: {feedback}

Respectfully,
Broadening Positions Team`
  }
];

/**
 * Fetch all email templates from Firestore. Falls back to defaults if not found or empty.
 */
export async function getEmailTemplatesFromFirestore(): Promise<EmailTemplate[]> {
  const path = "email_templates";
  try {
    const snap = await getDocs(collection(db, "email_templates"));
    if (snap.empty) {
      return DEFAULT_TEMPLATES;
    }
    const templatesMap = new Map<string, EmailTemplate>();
    snap.docs.forEach(doc => {
      const data = doc.data();
      templatesMap.set(doc.id, {
        id: doc.id,
        name: data.name || "",
        description: data.description || "",
        variables: data.variables || [],
        subject: data.subject || "",
        body: data.body || ""
      });
    });

    // Merge with defaults to ensure all exist
    return DEFAULT_TEMPLATES.map(def => {
      const dbTemp = templatesMap.get(def.id);
      if (dbTemp) {
        return {
          ...def,
          subject: dbTemp.subject,
          body: dbTemp.body
        };
      }
      return def;
    });
  } catch (err) {
    console.warn("Failed to fetch email templates from Firestore, using defaults:", err);
    return DEFAULT_TEMPLATES;
  }
}

/**
 * Save an email template to Firestore.
 */
export async function saveEmailTemplateToFirestore(template: EmailTemplate): Promise<void> {
  const path = `email_templates/${template.id}`;
  try {
    await setDoc(doc(db, "email_templates", template.id), {
      id: template.id,
      name: template.name,
      description: template.description,
      variables: template.variables,
      subject: template.subject,
      body: template.body,
      admin_secret: "DUTY_TRACKER_SECRET_2024",
      updatedAt: new Date().toISOString()
    });
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Helper to replace variables inside template text.
 */
export function formatEmailTemplate(
  text: string,
  replacements: Record<string, string>
): string {
  let result = text;
  Object.entries(replacements).forEach(([key, value]) => {
    // Escape regex characters just in case
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(safeKey, "g"), value || "");
  });
  return result;
}
