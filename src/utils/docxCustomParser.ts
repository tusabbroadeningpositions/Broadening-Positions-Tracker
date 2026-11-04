import mammoth from "mammoth";
import { ensureTwoSpacesAfterSentence } from "./docxExporter";

export interface ParsedDocxResult {
  positionTitle?: string;
  shopName?: string;
  bpTitle?: string;
  slots?: number;
  tierLevel?: string;
  isSpecialty?: boolean;
  isCommandAppointed?: boolean;
  termDuration?: string;
  paragraph1CustomText?: string;
  paragraph5CustomText?: string;
  memoDate?: string;
  eligibilityRequirements?: string[];
  responsibilities?: string[];
  pocRankName?: string;
  pocEmail?: string;
  closeDeadlineDate?: string;
  signerNameCaps?: string;
  signerRank?: string;
  signerTitle?: string;
  customFile?: {
    fileName: string;
    fileData: string; // Base64 data URL
    mimeType: string;
  };
  rawText?: string;
  htmlText?: string;
}

/**
 * Utility to parse uploaded .docx files and extract structured vacancy fields
 * while preserving multi-level subparagraphs (a., b., i., ii., iii., (1), (2), etc.)
 */
export async function parseCustomVacancyDocx(file: File): Promise<ParsedDocxResult> {
  const arrayBuffer = await file.arrayBuffer();

  // 1. Read Base64 representation of file for direct attachment/download
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  // 2. Extract HTML & Raw Text via mammoth
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });

  const rawText = rawTextResult.value || "";
  const htmlText = htmlResult.value || "";

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: ParsedDocxResult = {
    customFile: {
      fileName: file.name,
      fileData: base64Data,
      mimeType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    rawText,
    htmlText,
    eligibilityRequirements: [],
    responsibilities: [],
  };

  // 3. Extract Metadata Fields via RegExp & Pattern Scanning

  // Memo Date (e.g., "14 August 2026" or "DATE: 12 MAY 2025")
  const dateMatch = rawText.match(/\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i);
  if (dateMatch) {
    result.memoDate = dateMatch[1];
  }

  // Subject / Position Title
  const subjMatch = rawText.match(/SUBJECT:\s*(?:Broadening Position Vacancy Announcement\s*-\s*|Vacancy Announcement\s*-\s*)?([^\r\n]+)/i);
  if (subjMatch) {
    let extractedSubj = subjMatch[1].trim();
    extractedSubj = extractedSubj.replace(/^Vacancy Announcement\s*-\s*/i, "").replace(/^Broadening Position\s*-\s*/i, "");
    result.positionTitle = extractedSubj;
    result.bpTitle = extractedSubj;
  }

  // Paragraph 1 extraction: Shop Name, Slots, Tier, Term, Specialty, Command-Appointed
  const p1Match = rawText.match(/1\.\s+([^\r\n]+(?:\r?\n(?!2\.)[^\r\n]+)*)/i);
  if (p1Match) {
    const p1Text = ensureTwoSpacesAfterSentence(p1Match[1].replace(/\s+/g, " ").trim());
    result.paragraph1CustomText = p1Text;

    // Shop Name (e.g. "The Training Shop is seeking...", "The CT Element is seeking...")
    const shopMatch = p1Text.match(/The\s+([^.]+?)\s+is seeking/i) || p1Text.match(/FOR COMMANDER,\s*([^.\n]+)/i);
    if (shopMatch) {
      result.shopName = shopMatch[1].trim();
    }

    // Slots / Position count
    const slotsMatch = p1Text.match(/(\d+)\s+(?:highly motivated NCOs|positions|vacancies|slots)/i) ||
                       p1Text.match(/(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:highly motivated NCOs|positions|vacancies|slots)/i);
    if (slotsMatch) {
      const valStr = slotsMatch[1].toLowerCase();
      const wordToNum: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      result.slots = wordToNum[valStr] || parseInt(valStr, 10) || 1;
    } else {
      result.slots = 1;
    }

    // Tier Level
    const tierMatch = p1Text.match(/Tier\s+([1-4])/i);
    if (tierMatch) {
      result.tierLevel = tierMatch[1];
    } else {
      result.tierLevel = "1";
    }

    // Is Specialty
    if (/specialty/i.test(p1Text)) {
      result.isSpecialty = true;
    }

    // Is Command Appointed
    if (/command-appointed/i.test(p1Text)) {
      result.isCommandAppointed = true;
    }

    // Term duration
    const termMatch = p1Text.match(/term of ([^.]+)/i) || p1Text.match(/term length of ([^.]+)/i);
    if (termMatch) {
      result.termDuration = termMatch[1].trim();
    }
  }

  // Section 2: Eligibility Requirements (including multi-level subparagraphs a., b., i., ii., iii., (1), (2), etc.)
  const eligibilitySectionMatch = rawText.match(/2\.\s+Eligibility requirements:?\s*([\s\S]*?)(?=3\.\s+Duties|\n\s*3\.\s+|\n\s*4\.\s+|$)/i);
  if (eligibilitySectionMatch) {
    const rawEligibilityText = eligibilitySectionMatch[1].trim();
    const eligibilityLines = parseSubparagraphs(rawEligibilityText);
    if (eligibilityLines.length > 0) {
      result.eligibilityRequirements = eligibilityLines;
    }
  }

  // Section 3: Duties & Responsibilities (including multi-level subparagraphs)
  const responsibilitiesSectionMatch = rawText.match(/3\.\s+Duties and responsibilities:?\s*([\s\S]*?)(?=4\.\s+To apply|\n\s*4\.\s+|\n\s*5\.\s+|$)/i);
  if (responsibilitiesSectionMatch) {
    const rawRespText = responsibilitiesSectionMatch[1].trim();
    const respLines = parseSubparagraphs(rawRespText);
    if (respLines.length > 0) {
      result.responsibilities = respLines;
    }
  }

  // Section 5: POC, Email, Close Deadline
  const p5Match = rawText.match(/5\.\s+([^\r\n]+(?:\r?\n(?![A-Z0-9\s]{4,}\n)[^\r\n]+)*)/i);
  if (p5Match) {
    const p5Text = ensureTwoSpacesAfterSentence(p5Match[1].replace(/\s+/g, " ").trim());
    result.paragraph5CustomText = p5Text;

    // Email
    const emailMatch = p5Text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      result.pocEmail = emailMatch[1].trim();
    }

    // Close deadline
    const deadlineMatch = p5Text.match(/NLT\s+([^.\n]+)/i) || p5Text.match(/deadline:?\s*([^.\n]+)/i) || p5Text.match(/no later than\s+([^.\n]+)/i);
    if (deadlineMatch) {
      result.closeDeadlineDate = deadlineMatch[1].trim();
    }

    // POC Name
    const pocNameMatch = p5Text.match(/questions and application packets to\s+([^@]+?)\s+at/i) || p5Text.match(/POC for this announcement is\s+([^@.\n]+)/i);
    if (pocNameMatch) {
      result.pocRankName = pocNameMatch[1].trim();
    }
  }

  // Signer block (at end of document)
  const endLines = lines.slice(-8);
  if (endLines.length >= 2) {
    // Look for ALL CAPS name line
    for (let i = 0; i < endLines.length; i++) {
      if (/^[A-Z\s.,'-]{4,}$/.test(endLines[i]) && !/MEMORANDUM|SUBJECT|FOR|OFFICIAL/i.test(endLines[i])) {
        result.signerNameCaps = endLines[i];
        if (i + 1 < endLines.length) result.signerRank = endLines[i + 1];
        if (i + 2 < endLines.length) result.signerTitle = endLines[i + 2];
        break;
      }
    }
  }

  return result;
}

/**
 * Helper to parse a section text into subparagraphs & sub-subparagraphs (a., b., i., ii., iii., (1), (2), (a), (b))
 */
function parseSubparagraphs(sectionText: string): string[] {
  if (!sectionText) return [];

  // Split into lines while preserving line leading whitespace if present
  const rawLines = sectionText.split(/\r?\n/);
  const items: string[] = [];
  let currentBuffer = "";

  const subparagraphStartRegex = /^\s*(?:[a-z]\.|\([a-z]\)|[i|v|x]+\.|\([i|v|x]+\)|\(\d+\)|\d+\))\s+/i;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check if line starts a new subparagraph or sub-subparagraph marker
    if (subparagraphStartRegex.test(trimmed)) {
      if (currentBuffer.trim()) {
        items.push(ensureTwoSpacesAfterSentence(currentBuffer.trim()));
      }
      currentBuffer = trimmed;
    } else if (currentBuffer) {
      // Append continuation lines to current subparagraph
      currentBuffer += " " + trimmed;
    } else {
      currentBuffer = trimmed;
    }
  }

  if (currentBuffer.trim()) {
    items.push(ensureTwoSpacesAfterSentence(currentBuffer.trim()));
  }

  return items;
}

/**
 * Helper to determine subparagraph depth level for rendering and indentation
 * Level 0: Standard a., b., c.
 * Level 1: Sub-subparagraph i., ii., iii., iv., v. or (i), (ii)
 * Level 2: Sub-sub-subparagraph (1), (2), (3), (a), (b)
 */
export function getSubparagraphDepthLevel(itemText: string): number {
  if (!itemText) return 0;
  const trimmed = itemText.trim();

  // Sub-subparagraph (i., ii., iii., iv., v., vi., vii., viii., ix., x. or (i), (ii))
  if (/^\s*(?:[i|v|x]+\.|\([i|v|x]+\)|[i|v|x]+\))\s+/i.test(trimmed)) {
    return 1;
  }

  // Sub-sub-subparagraph ((1), (2), (3), 1), 2), (a), (b))
  if (/^\s*(?:\(\d+\)|\d+\)|\([a-z]\))\s+/i.test(trimmed)) {
    return 2;
  }

  // Indented text without standard a. / b. prefix
  if (/^\s{4,}/.test(itemText)) {
    return 1;
  }

  return 0;
}
