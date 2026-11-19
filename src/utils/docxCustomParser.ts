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
  paragraph4CustomText?: string;
  paragraph5CustomText?: string;
  additionalParagraphs?: string[];
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

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

const toRoman = (num: number): string => {
  const romans: [number, string][] = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let n = num;
  let res = "";
  for (const [val, sym] of romans) {
    while (n >= val) {
      res += sym;
      n -= val;
    }
  }
  return res || String(num);
};

/**
 * Reconstructs numbered/lettered lines from mammoth HTML if the source .docx used
 * Word's built-in automatic list numbering (<ol><li>) instead of typed text prefixes.
 */
function buildStructuredLinesFromHtml(htmlText: string): string[] {
  if (typeof DOMParser === "undefined" || !htmlText) return [];

  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  const outputLines: string[] = [];
  let hasSeenMainPara1 = false;

  const formatListMarker = (level: number, index: number, isOrdered: boolean): string => {
    if (!isOrdered) return "-";
    if (level === 0) return `${index + 1}. `;
    if (level === 1) return `${String.fromCharCode(97 + (index % 26))}. `;
    if (level === 2) return `${toRoman(index + 1)}. `;
    return `(${index + 1}) `;
  };

  const walkNode = (node: Element, listLevel: number) => {
    const tag = node.tagName.toLowerCase();

    if (tag === "ol" || tag === "ul") {
      const isOrdered = tag === "ol";
      const effectiveLevel =
        listLevel === 0 && hasSeenMainPara1 ? 1 : listLevel;

      let itemIdx = 0;
      Array.from(node.children).forEach((child) => {
        if (child.tagName.toLowerCase() === "li") {
          const directParts: string[] = [];
          const nestedLists: Element[] = [];

          Array.from(child.childNodes).forEach((c) => {
            if (c.nodeType === Node.ELEMENT_NODE) {
              const el = c as Element;
              const cTag = el.tagName.toLowerCase();
              if (cTag === "ol" || cTag === "ul") {
                nestedLists.push(el);
              } else {
                const txt = (el.textContent || "").trim();
                if (txt) directParts.push(txt);
              }
            } else if (c.nodeType === Node.TEXT_NODE) {
              const txt = (c.textContent || "").trim();
              if (txt) directParts.push(txt);
            }
          });

          const liText = directParts.join(" ").replace(/\s+/g, " ").trim();
          if (liText) {
            const marker = formatListMarker(effectiveLevel, itemIdx, isOrdered);
            // Avoid double-numbering if text already starts with a marker
            const alreadyNumbered = /^\s*(?:\d+\.|[a-z]\.|[i|v|x]+\.|\(\d+\))\s+/i.test(liText);
            const finalLine = alreadyNumbered ? liText : `${marker}${liText}`;
            outputLines.push(finalLine);
            if (/^\s*1\.\s+/.test(finalLine)) {
              hasSeenMainPara1 = true;
            }
          }

          nestedLists.forEach((nl) => walkNode(nl, effectiveLevel + 1));
          itemIdx++;
        }
      });
      return;
    }

    if (["p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const txt = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (txt) {
        outputLines.push(txt);
        if (/^\s*1\.\s+/.test(txt)) {
          hasSeenMainPara1 = true;
        }
      }
      return;
    }

    Array.from(node.children).forEach((child) => walkNode(child, listLevel));
  };

  Array.from(doc.body.children).forEach((child) => walkNode(child, 0));
  return outputLines;
}

/**
 * Utility to parse uploaded .docx files and extract structured vacancy fields
 * while preserving all main numbered paragraphs (1., 2., 3., 4., 5., 6., ...)
 * and multi-level subparagraphs (a., b., i., ii., iii., (1), (2), etc.).
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

  let lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // If the Word doc used native automatic list numbering (<ol><li>), reconstruct explicit prefixes
  const hasExplicitMainNumbers =
    lines.some((l) => /^1\.\s+/.test(l)) && lines.some((l) => /^2\.\s+/.test(l));
  if (!hasExplicitMainNumbers && /<ol\b/i.test(htmlText)) {
    const htmlLines = buildStructuredLinesFromHtml(htmlText);
    if (htmlLines.some((l) => /^1\.\s+/.test(l))) {
      lines = htmlLines;
    }
  } else if (/<ol\b/i.test(htmlText)) {
    // Handle hybrid documents where main paragraphs are typed (1., 2., 3.)
    // but subparagraphs inside 2./3. used Word <ol> lists (so rawText lost "a.", "i.")
    const htmlLines = buildStructuredLinesFromHtml(htmlText);
    if (htmlLines.length >= lines.length) {
      lines = htmlLines;
    }
  }

  const normalizedText = lines.join("\n");

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
    additionalParagraphs: [],
  };

  // 3. Extract Header Metadata Fields (Memo Date & Subject/Title)

  // Memo Date (e.g., "14 August 2026" or "4 December 2024")
  const dateMatch = normalizedText.match(
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i
  );
  if (dateMatch) {
    result.memoDate = dateMatch[1];
  }

  // Subject / Position Title
  const subjMatch = normalizedText.match(
    /SUBJECT:\s*(?:Broadening Position Vacancy Announcement(?:\s+for|\s*-\s*)|\s*Vacancy Announcement(?:\s+for|\s*-\s*))?([^\r\n]+)/i
  );
  if (subjMatch) {
    let extractedSubj = subjMatch[1].trim();
    extractedSubj = extractedSubj
      .replace(/^(?:Broadening Position\s+)?Vacancy Announcement(?:\s+for|\s*-\s*)\s*/i, "")
      .replace(/^Broadening Position\s*-\s*/i, "")
      .trim();
    result.positionTitle = extractedSubj;
    result.bpTitle = extractedSubj;
  }

  // 4. Identify & Strip Signature Block from the Bottom (so the final numbered paragraph doesn't swallow it)
  let bodyEndIdx = lines.length;
  const sigSearchStart = Math.max(0, lines.length - 8);
  for (let i = sigSearchStart; i < lines.length; i++) {
    const line = lines[i];
    // Never treat a numbered paragraph or subparagraph as a signature block
    if (/^\d+\.\s+/.test(line) || /^[a-z]\.\s+/i.test(line)) continue;
    // Skip email / header keywords
    if (/MEMORANDUM|SUBJECT|OFFICIAL|ANAB|DISTRIBUTION|ENCL/i.test(line) || EMAIL_REGEX.test(line)) {
      continue;
    }
    const isAllCapsName = /^[A-Z][A-Z\s.,'-]{3,}$/.test(line) && line.trim().split(/\s+/).length >= 2;
    const nextLineLooksLikeRank =
      i + 1 < lines.length &&
      /\b(USA|USAR|ARNG|PVT|PV2|PFC|CPL|SPC|SGT|SSG|SFC|MSG|1SG|SGM|CSM|WO1|CW2|CW3|CW4|CW5|2LT|1LT|CPT|MAJ|LTC|COL|CIV)\b/i.test(
        lines[i + 1]
      );

    if (isAllCapsName && (nextLineLooksLikeRank || i >= lines.length - 4)) {
      result.signerNameCaps = line;
      if (i + 1 < lines.length) result.signerRank = lines[i + 1];
      if (i + 2 < lines.length) result.signerTitle = lines[i + 2];
      bodyEndIdx = i;
      break;
    }
  }

  const bodyLines = lines.slice(0, bodyEndIdx);

  // 5. Sequentially Parse ALL Main Numbered Paragraphs (1., 2., 3., 4., 5., 6., 7., ...)
  const sections = new Map<number, string[]>();
  let currentParaNum = 0;

  for (const line of bodyLines) {
    const mainMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (mainMatch) {
      const num = parseInt(mainMatch[1], 10);
      const rest = mainMatch[2].trim();
      // Start at paragraph 1, then accept consecutive numbered paragraphs (2, 3, 4, 5, 6, ...)
      if ((currentParaNum === 0 && num === 1) || (currentParaNum > 0 && num === currentParaNum + 1)) {
        currentParaNum = num;
        sections.set(num, rest ? [rest] : []);
        continue;
      }
    }

    if (currentParaNum > 0) {
      const list = sections.get(currentParaNum) || [];
      list.push(line);
      sections.set(currentParaNum, list);
    }
  }

  // Fallback for documents where Paragraph 1 wasn't sequentially caught (e.g. unusual formatting)
  if (!sections.has(1)) {
    const p1Fallback = normalizedText.match(/1\.\s+([^\r\n]+)/i);
    if (p1Fallback) sections.set(1, [p1Fallback[1].trim()]);
  }

  // 6. Process Paragraph 1 (Intro, Shop Name, Slots, Tier, Term, Specialty, Command-Appointed)
  if (sections.has(1)) {
    const p1Text = ensureTwoSpacesAfterSentence(sections.get(1)!.join(" ").replace(/\s+/g, " ").trim());
    result.paragraph1CustomText = p1Text;

    // Shop Name (e.g. "The Training Shop is seeking...", "The CT Element is seeking...")
    const shopMatch =
      p1Text.match(/The\s+([^.]+?)\s+is seeking/i) ||
      p1Text.match(/FOR COMMANDER,\s*([^.\n]+)/i);
    if (shopMatch) {
      result.shopName = shopMatch[1].trim();
    }

    // Slots / Position count
    const slotsMatch =
      p1Text.match(/(\d+)\s+(?:highly motivated NCOs|positions|vacancies|slots)/i) ||
      p1Text.match(/(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:highly motivated NCOs|positions|vacancies|slots)/i);
    if (slotsMatch) {
      const valStr = slotsMatch[1].toLowerCase();
      const wordToNum: Record<string, number> = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
      };
      result.slots = wordToNum[valStr] || parseInt(valStr, 10) || 1;
    } else {
      result.slots = 1;
    }

    // Tier Level
    const tierMatch = p1Text.match(/Tier\s+([1-4])/i);
    result.tierLevel = tierMatch ? tierMatch[1] : "1";

    // Is Specialty
    if (/specialty/i.test(p1Text)) {
      result.isSpecialty = true;
    }

    // Is Command Appointed
    if (/command-appointed|command appointed/i.test(p1Text)) {
      result.isCommandAppointed = true;
    }

    // Term duration
    const termMatch = p1Text.match(/term of ([^.]+)/i) || p1Text.match(/term length of ([^.]+)/i);
    if (termMatch) {
      result.termDuration = termMatch[1].trim();
    }
  }

  // 7. Process Paragraph 2 (Eligibility Requirements & multi-level subparagraphs)
  if (sections.has(2)) {
    const eligLines = [...sections.get(2)!];
    if (eligLines.length > 0) {
      const first = eligLines[0].trim();
      if (/^(?:eligibility(?:\s+requirements?)?|qualifications?|requirements?)\s*:?\s*$/i.test(first)) {
        eligLines.shift();
      } else {
        const inlineMatch = first.match(
          /^(?:eligibility(?:\s+requirements?)?|qualifications?|requirements?)\s*:\s*(.+)$/i
        );
        if (inlineMatch) {
          eligLines[0] = inlineMatch[1].trim();
        }
      }
    }
    const parsedElig = parseSubparagraphs(eligLines.join("\n"));
    if (parsedElig.length > 0) {
      result.eligibilityRequirements = parsedElig;
    }
  }

  // 8. Process Paragraph 3 (Duties & Responsibilities & multi-level subparagraphs)
  if (sections.has(3)) {
    const respLines = [...sections.get(3)!];
    if (respLines.length > 0) {
      const first = respLines[0].trim();
      if (/^(?:duties(?:\s+and\s+responsibilities)?|responsibilities)\s*:?\s*$/i.test(first)) {
        respLines.shift();
      } else {
        const inlineMatch = first.match(
          /^(?:duties(?:\s+and\s+responsibilities)?|responsibilities)\s*:\s*(.+)$/i
        );
        if (inlineMatch) {
          respLines[0] = inlineMatch[1].trim();
        }
      }
    }
    const parsedResp = parseSubparagraphs(respLines.join("\n"));
    if (parsedResp.length > 0) {
      result.responsibilities = parsedResp;
    }
  }

  // 9. Process Paragraph 4, Paragraph 5, and ANY Additional Paragraphs (6, 7, 8, ...)
  if (sections.has(4)) {
    result.paragraph4CustomText = formatSectionParagraphLines(sections.get(4)!);
  }

  if (sections.has(5)) {
    result.paragraph5CustomText = formatSectionParagraphLines(sections.get(5)!);
  }

  const extraParaNumbers = Array.from(sections.keys())
    .filter((n) => n >= 6)
    .sort((a, b) => a - b);

  const additionalParagraphs: string[] = [];
  for (const num of extraParaNumbers) {
    const formatted = formatSectionParagraphLines(sections.get(num)!);
    if (formatted) {
      additionalParagraphs.push(formatted);
    }
  }
  result.additionalParagraphs = additionalParagraphs;

  // 10. Extract POC Email, POC Rank/Name, and Closing Deadline Date
  // Search in reverse order from the final main paragraph (e.g. #6 -> #5 -> #4 -> full document)
  // because Army memos place POC & submission instructions in the final main paragraph.
  const searchCandidates: string[] = [
    ...[...additionalParagraphs].reverse(),
    ...(result.paragraph5CustomText ? [result.paragraph5CustomText] : []),
    ...(result.paragraph4CustomText ? [result.paragraph4CustomText] : []),
    normalizedText,
  ];

  // Email extraction (also inspect HTML mailto: hrefs in case email was hidden behind link display text)
  for (const candidate of searchCandidates) {
    const emailMatch = candidate.match(EMAIL_REGEX);
    if (emailMatch) {
      result.pocEmail = emailMatch[1].trim().replace(/[.,;:!?)]+$/, "");
      break;
    }
  }
  if (!result.pocEmail && htmlText) {
    const mailtoMatch = htmlText.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch) {
      result.pocEmail = mailtoMatch[1].trim();
    }
  }

  // POC Rank & Name extraction
  for (const candidate of searchCandidates) {
    const flat = candidate.replace(/\s+/g, " ");
    const pocMatch =
      flat.match(
        /(?:questions(?:\s+and\s+(?:application\s+packets?|memorandum|memoranda|packets?))?|applications?|packets?|memorandum|memoranda|inquiries)\s+(?:to|at)\s+([^@\n.;()]+?)\s+(?:at|via|by|\(|,)/i
      ) ||
      flat.match(
        /\bto\s+((?:PVT|PV2|PFC|CPL|SPC|SGT|SSG|SFC|MSG|1SG|SGM|CSM|SMA|WO1|CW2|CW3|CW4|CW5|2LT|1LT|CPT|MAJ|LTC|COL|Mr\.|Ms\.|Mrs\.|Dr\.|CIV)\s+[A-Za-z.'-]+(?:\s+[A-Za-z.'-]+){1,3})\s*(?:at|\(|,)/i
      ) ||
      flat.match(/(?:POC|Point\s+of\s+Contact)(?:\s+for\s+this\s+(?:announcement|position|vacancy|action))?\s*(?:is|:)\s*([^,@\n.()]+)/i);

    if (pocMatch && pocMatch[1]) {
      const cleanedPoc = pocMatch[1].replace(/\s+(?:at|or)$/i, "").trim();
      if (cleanedPoc && !EMAIL_REGEX.test(cleanedPoc)) {
        result.pocRankName = cleanedPoc;
        break;
      }
    }
  }

  // Closing Deadline Date extraction
  for (const candidate of searchCandidates) {
    const flat = candidate.replace(/\s+/g, " ");
    const fullMilitaryDateMatch = flat.match(
      /(?:deadline(?:\s+for\s+applying)?\s*(?:is|:)|NLT|no\s+later\s+than|suspense(?:\s+date)?\s*(?:is|:)|due(?:\s+by)?)\s*(?:at\s+)?(?:\d{4}\s*(?:hrs?|hours?)?\s*(?:on\s+)?)?(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{4})/i
    );
    if (fullMilitaryDateMatch && fullMilitaryDateMatch[1]) {
      result.closeDeadlineDate = fullMilitaryDateMatch[1].trim();
      break;
    }

    const fallbackDeadlineMatch = flat.match(
      /(?:NLT|no\s+later\s+than|deadline(?:\s+for\s+applying)?\s*(?:is|:))\s*([^.\n]+)/i
    );
    if (fallbackDeadlineMatch && fallbackDeadlineMatch[1]) {
      result.closeDeadlineDate = fallbackDeadlineMatch[1]
        .replace(/^\d{4}\s*(?:hrs?|hours?)?\s*(?:on\s+)?/i, "")
        .trim();
      break;
    }
  }

  return result;
}

/**
 * Formats lines of a main body section (e.g. Paragraph 4, 5, 6+),
 * joining wrapped prose while preserving subparagraph lines (a., b., i., ii., (1)).
 */
function formatSectionParagraphLines(sectionLines: string[]): string {
  if (!sectionLines || sectionLines.length === 0) return "";

  const subMarkerRegex = /^\s*(?:[a-z]\.|\([a-z]\)|[i|v|x]+\.|\([i|v|x]+\)|\(\d+\)|\d+\))\s+/i;
  const output: string[] = [];
  let buffer = "";

  for (const rawLine of sectionLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (subMarkerRegex.test(trimmed)) {
      if (buffer.trim()) {
        output.push(ensureTwoSpacesAfterSentence(buffer.trim()));
      }
      buffer = trimmed;
    } else if (buffer) {
      buffer += " " + trimmed;
    } else {
      buffer = trimmed;
    }
  }

  if (buffer.trim()) {
    output.push(ensureTwoSpacesAfterSentence(buffer.trim()));
  }

  return output.join("\n");
}

/**
 * Helper to parse a section text into subparagraphs & sub-subparagraphs (a., b., i., ii., iii., (1), (2), (a), (b))
 */
function parseSubparagraphs(sectionText: string): string[] {
  if (!sectionText) return [];

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
