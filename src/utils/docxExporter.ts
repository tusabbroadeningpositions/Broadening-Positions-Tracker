import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { ARMY_VACANCY_TEMPLATE_BASE64 } from "../data/announcementTemplate";
import { APPLICATION_MEMO_TEMPLATE_BASE64 } from "../data/applicationMemoTemplate";

export interface ApplicationMemoData {
  memoDate: string; // e.g. "14 August 2026"
  shopNcoicRankName: string; // e.g. "SFC JOHN DOE" -> MEMORANDUM FOR [SHOP NCOIC RANK AND NAME]
  positionTitle: string; // e.g. "FLIGHT LINE SUPERVISOR"
  applicantRankName: string; // e.g. "SSG JANE SMITH"
  qualifications: string[]; // Up to 3 qualification items (qual1, qual2, qual3)
  otherRoles?: string; // Roles performed at TUSAB
  interestReason: string; // Why interested in this position
  pertinentInfo?: string; // Any other pertinent info
  soldierNameCaps: string; // e.g. "JANE M. SMITH"
  soldierRankBranch: string; // e.g. "SSG, USA"
  elementLeaderNameCaps: string; // e.g. "ROBERT E. JOHNSON"
  elementLeaderRankBranch: string; // e.g. "SGM, USA"
  elementLeaderTitle?: string; // e.g. "Element Leader"
}

const formatDateToMilitary = (d: Date) => {
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getThirtyDaysAfter = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      return formatDateToMilitary(fallback);
    }
    d.setDate(d.getDate() + 30);
    return formatDateToMilitary(d);
  } catch {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return formatDateToMilitary(fallback);
  }
};

const escapeXml = (unsafe: string) => {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const generateHexId = () => {
  return Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, "0");
};

const generateSpacerXml = () => {
  return `<w:p w14:paraId="${generateHexId()}" w14:textId="77777777" w:rsidR="00A77B3E" w:rsidRDefault="00A77B3E"><w:pPr><w:suppressAutoHyphens/><w:ind w:firstLine="18pt"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:pPr></w:p>`;
};

const getEligibilityTextXml = (index: number, text: string, paraId: string) => {
  const cleanText = escapeXml(text);
  if (index === 0) {
    return `<w:p w14:paraId="${paraId}" w14:textId="1D502163" w:rsidR="00A77B3E" w:rsidRDefault="00A11293"><w:pPr><w:suppressAutoHyphens/><w:ind w:firstLine="18pt"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr><w:t xml:space="preserve">a.  Candidates must be ${cleanText} to apply for this position.</w:t></w:r></w:p>`;
  } else {
    const letter = String.fromCharCode(97 + index); // b, c, d...
    return `<w:p w14:paraId="${paraId}" w14:textId="51CEFD61" w:rsidR="00A77B3E" w:rsidRDefault="00A11293"><w:pPr><w:suppressAutoHyphens/><w:ind w:firstLine="18pt"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr><w:t xml:space="preserve">${letter}.  ${cleanText}</w:t></w:r></w:p>`;
  }
};

const getResponsibilityTextXml = (index: number, text: string, paraId: string) => {
  const cleanText = escapeXml(text);
  const letter = String.fromCharCode(97 + index); // a, b, c...
  return `<w:p w14:paraId="${paraId}" w14:textId="51CEFD61" w:rsidR="00A77B3E" w:rsidRDefault="00A11293"><w:pPr><w:suppressAutoHyphens/><w:ind w:firstLine="18pt"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr><w:t xml:space="preserve">${letter}.  ${cleanText}</w:t></w:r></w:p>`;
};

export const generateVacancyMemoBlob = (draft: any): Blob => {
  const binaryString = atob(ARMY_VACANCY_TEMPLATE_BASE64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const zip = new PizZip(bytes.buffer);

  // Pre-process XML files to handle dynamic eligibility and responsibilities by replacing XML paragraph nodes directly
  Object.keys(zip.files).forEach((filename) => {
    if (filename.endsWith(".xml")) {
      let xmlText = zip.files[filename].asText();
      
      // 1. Replace the date (4 December 2024 -> [memoDate])
      if (xmlText.includes("4 December 2024")) {
        xmlText = xmlText.replace("4 December 2024", "[memoDate]");
      }
      
      // 2. Pre-process Eligibility requirements
      const eligibilityRequirements = (draft.eligibilityRequirements || []) as string[];
      const activeReqs = eligibilityRequirements.filter((r: string) => r.trim() !== "");
      const eligParaIds = ["2B9AC5E1", "2B9AC5E3", "2B9AC5E5", "2B9AC5E7"];
      const eligSpacerIds = ["2B9AC5E2", "2B9AC5E4", "2B9AC5E6", "2B9AC5E8"];
      
      if (activeReqs.length <= 4) {
        eligParaIds.forEach((paraId, i) => {
          const paraRegex = new RegExp(`<w:p [^>]*w14:paraId="${paraId}"[^>]*>[\\s\\S]*?<\\/w:p>`);
          const spacerId = eligSpacerIds[i];
          const spacerRegex = new RegExp(`<w:p [^>]*w14:paraId="${spacerId}"[^>]*>[\\s\\S]*?<\\/w:p>`);
          
          if (i < activeReqs.length) {
            const itemXml = getEligibilityTextXml(i, activeReqs[i], paraId);
            xmlText = xmlText.replace(paraRegex, itemXml);
          } else {
            xmlText = xmlText.replace(paraRegex, "");
            xmlText = xmlText.replace(spacerRegex, "");
          }
        });
      } else {
        // More than 4 items
        eligParaIds.forEach((paraId, i) => {
          const paraRegex = new RegExp(`<w:p [^>]*w14:paraId="${paraId}"[^>]*>[\\s\\S]*?<\\/w:p>`);
          if (i < 3) {
            const itemXml = getEligibilityTextXml(i, activeReqs[i], paraId);
            xmlText = xmlText.replace(paraRegex, itemXml);
          } else if (i === 3) {
            // Construct combined XML starting from index 3
            let combinedXml = getEligibilityTextXml(3, activeReqs[3], paraId);
            for (let j = 4; j < activeReqs.length; j++) {
              combinedXml += generateSpacerXml() + getEligibilityTextXml(j, activeReqs[j], generateHexId());
            }
            xmlText = xmlText.replace(paraRegex, combinedXml);
          }
        });
      }
      
      // 3. Pre-process Responsibilities
      const responsibilities = (draft.responsibilities || []) as string[];
      const activeResps = responsibilities.filter((r: string) => r.trim() !== "");
      const respParaIds = ["2B9AC5EB", "2B9AC5ED", "2B9AC5EF", "2B9AC5F1", "2B9AC5F3", "2B9AC5F5", "2B9AC5F7"];
      const respSpacerIds = ["2B9AC5EC", "2B9AC5EE", "2B9AC5F0", "2B9AC5F2", "2B9AC5F4", "2B9AC5F6", "2B9AC5F8"];
      
      if (activeResps.length <= 7) {
        respParaIds.forEach((paraId, i) => {
          const paraRegex = new RegExp(`<w:p [^>]*w14:paraId="${paraId}"[^>]*>[\\s\\S]*?<\\/w:p>`);
          const spacerId = respSpacerIds[i];
          const spacerRegex = new RegExp(`<w:p [^>]*w14:paraId="${spacerId}"[^>]*>[\\s\\S]*?<\\/w:p>`);
          
          if (i < activeResps.length) {
            const itemXml = getResponsibilityTextXml(i, activeResps[i], paraId);
            xmlText = xmlText.replace(paraRegex, itemXml);
          } else {
            xmlText = xmlText.replace(paraRegex, "");
            xmlText = xmlText.replace(spacerRegex, "");
          }
        });
      } else {
        // More than 7 items
        respParaIds.forEach((paraId, i) => {
          const paraRegex = new RegExp(`<w:p [^>]*w14:paraId="${paraId}"[^>]*>[\\s\\S]*?<\\/w:p>`);
          if (i < 6) {
            const itemXml = getResponsibilityTextXml(i, activeResps[i], paraId);
            xmlText = xmlText.replace(paraRegex, itemXml);
          } else if (i === 6) {
            // Construct combined XML starting from index 6
            let combinedXml = getResponsibilityTextXml(6, activeResps[6], paraId);
            for (let j = 7; j < activeResps.length; j++) {
              combinedXml += generateSpacerXml() + getResponsibilityTextXml(j, activeResps[j], generateHexId());
            }
            xmlText = xmlText.replace(paraRegex, combinedXml);
          }
        });
      }
      
      zip.file(filename, xmlText);
    }
  });

  const doc = new Docxtemplater(zip, {
    delimiters: { start: "[", end: "]" },
    paragraphLoop: true,
    linebreaks: true,
  });

  const memoDate = draft.memoDate || formatDateToMilitary(new Date());
  const data = {
    "Position Title": (draft.positionTitle || "").trim(),
    "shop name": (draft.shopName || "").trim(),
    "BP title": (draft.bpTitle || "").trim(),
    "x": (draft.tierLevel || "").trim(),
    "x to x years": (draft.termDuration || "").trim(),
    "Rank Name": (draft.pocRankName || "").trim() || "SFC Jane Doe",
    "email address": (draft.pocEmail || "").trim() || "jane.doe.mil@army.mil",
    "enter date": (draft.closeDeadlineDate || "").trim() || getThirtyDaysAfter(memoDate),
    "SHOP NCOIC's NAME - all caps": (draft.signerNameCaps || "").trim() || "JANE D. DOE",
    "RANK, USA": (draft.signerRank || "").trim() || "SFC, USA",
    "Title, i.e., TUSAB Training NCOIC": (draft.signerTitle || "").trim() || "TUSAB NCOIC",
    "memoDate": memoDate
  };

  doc.render(data);

  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
};

export const downloadVacancyMemo = (draft: any) => {
  try {
    const out = generateVacancyMemoBlob(draft);
    const url = URL.createObjectURL(out);
    const a = document.createElement("a");
    a.href = url;
    const sanitizedTitle = (draft.positionTitle || "Vacancy_Announcement").replace(/[^a-zA-Z0-9]/g, "_");
    a.download = `Vacancy_Announcement_${sanitizedTitle}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to generate memo Word document:", error);
    alert("Failed to export Word document. Please contact system administrator.");
  }
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const downloadApplicationMemo = async (data: ApplicationMemoData) => {
  try {
    const templateBytes = base64ToUint8Array(APPLICATION_MEMO_TEMPLATE_BASE64);
    const zip = new PizZip(templateBytes);

    // Remove customXml and docMetadata to prevent SharePoint/compliance locks
    Object.keys(zip.files).forEach((f) => {
      if (f.startsWith("customXml/") || f.startsWith("docMetadata/")) {
        zip.remove(f);
      }
    });

    if (zip.files["[Content_Types].xml"]) {
      let contentTypes = zip.files["[Content_Types].xml"].asText();
      contentTypes = contentTypes.replace(/<Override PartName="\/customXml\/itemProps\d\.xml"[^>]*\/>/g, "");
      contentTypes = contentTypes.replace(/<Override PartName="\/docMetadata\/LabelInfo\.xml"[^>]*\/>/g, "");
      zip.file("[Content_Types].xml", contentTypes);
    }

    if (zip.files["_rels/.rels"]) {
      let mainRels = zip.files["_rels/.rels"].asText();
      mainRels = mainRels.replace(/<Relationship [^>]*Target="docMetadata\/LabelInfo\.xml"[^>]*\/>/g, "");
      zip.file("_rels/.rels", mainRels);
    }

    if (zip.files["word/_rels/document.xml.rels"]) {
      let docRels = zip.files["word/_rels/document.xml.rels"].asText();
      docRels = docRels.replace(/<Relationship [^>]*Target="\.\.\/customXml\/item\d\.xml"[^>]*\/>/g, "");
      zip.file("word/_rels/document.xml.rels", docRels);
    }

    let docXml = zip.files["word/document.xml"].asText();

    function replaceParagraphContent(docXmlStr: string, targetSubstr: string, newText: string): string {
      const singlePRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g;
      return docXmlStr.replace(singlePRegex, (fullPara) => {
        const plainText = fullPara.replace(/<[^>]+>/g, "");
        if (!plainText.includes(targetSubstr)) {
          return fullPara;
        }

        if (!newText || newText.trim() === "") {
          return ""; // Delete this single paragraph completely if empty
        }

        const openTagMatch = fullPara.match(/^<w:p\b[^>]*>/);
        const openTag = openTagMatch ? openTagMatch[0] : "<w:p>";
        const closeTag = "</w:p>";

        const pPrMatch = fullPara.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
        const pPr = pPrMatch ? pPrMatch[0] : "";

        const rPr = `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;

        const lines = newText.split("\n");
        let runs = "";
        lines.forEach((line, i) => {
          if (i > 0) runs += `<w:r>${rPr}<w:br/></w:r>`;
          runs += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
        });

        return `${openTag}${pPr}${runs}${closeTag}`;
      });
    }

    // Format inputs
    const memoDate = data.memoDate || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const shopNcoic = data.shopNcoicRankName || "";
    const positionTitle = data.positionTitle || "";
    const applicantRankName = data.applicantRankName || "";

    const quals = (data.qualifications || []).filter((q) => q && q.trim() !== "");

    const otherRoles = data.otherRoles || "";
    const interestReason = data.interestReason || "";
    const pertinentInfo = data.pertinentInfo || "";

    const soldierName = (data.soldierNameCaps || "").toUpperCase();
    const soldierRankBranch = data.soldierRankBranch || "SSG, USA";
    const elName = (data.elementLeaderNameCaps || "").toUpperCase();
    const elRankBranch = data.elementLeaderRankBranch || "SGM, USA";
    const elTitle = data.elementLeaderTitle || "Element Leader";

    let xml = docXml;

    // 1. Date
    if (memoDate) {
      xml = replaceParagraphContent(xml, "3 March 2022", memoDate);
    }

    // 2. Shop NCOIC
    if (shopNcoic) {
      xml = replaceParagraphContent(xml, "[SHOP NCOIC RANK AND NAME]", `MEMORANDUM FOR ${shopNcoic}`);
    }

    // 3. Subject Position Title
    if (positionTitle) {
      xml = replaceParagraphContent(xml, "[BROADENING POSITION JOB TITLE]", `SUBJECT: Application for ${positionTitle} Vacancy`);
    }

    // 4. Intro Applicant Rank, Name & Position Title
    if (applicantRankName && positionTitle) {
      xml = replaceParagraphContent(xml, "I, [RANK AND NAME]", `I, ${applicantRankName}, request consideration for the ${positionTitle} position.`);
    } else if (applicantRankName) {
      xml = replaceParagraphContent(xml, "I, [RANK AND NAME]", `I, ${applicantRankName}, request consideration for the position.`);
    }

    // 5. Qualifications
    if (quals.length > 0 && quals[0].trim()) {
      xml = replaceParagraphContent(xml, "QUALIFICATION #1", quals[0]);
    } else {
      xml = replaceParagraphContent(xml, "QUALIFICATION #1", "");
    }

    if (quals.length > 1 && quals[1].trim()) {
      xml = replaceParagraphContent(xml, "QUALIFICATION #2", quals[1]);
    } else {
      xml = replaceParagraphContent(xml, "QUALIFICATION #2", "");
    }

    if (quals.length > 2) {
      const rPr = `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
      let additionalParas = "";
      for (let i = 2; i < quals.length; i++) {
        if (!quals[i].trim()) continue;
        const text = quals[i];
        const pPr = `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="18"/></w:numPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr>`;
        const run = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
        additionalParas += `<w:p w14:paraId="77${i}00000" w14:textId="77777777" w:rsidR="00013133" w:rsidRDefault="001A4088">${pPr}${run}</w:p>`;
      }
      const singlePRegex = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g;
      xml = xml.replace(singlePRegex, (para) => {
        const plainText = para.replace(/<[^>]+>/g, "");
        if (plainText.includes("QUALIFICATION #3")) {
          return additionalParas;
        }
        return para;
      });
    } else {
      xml = replaceParagraphContent(xml, "QUALIFICATION #3", "");
    }

    // 6. Other roles
    if (otherRoles) {
      xml = replaceParagraphContent(xml, "[IF APPLICABLE, SPEAK ABOUT OTHER ROLES", otherRoles);
    } else {
      xml = replaceParagraphContent(xml, "[IF APPLICABLE, SPEAK ABOUT OTHER ROLES", "N/A");
    }

    // 7. Reason for interest
    if (interestReason) {
      xml = replaceParagraphContent(xml, "[TELL THE PANEL WHY YOU ARE INTERESTED", interestReason);
    }

    // 8. Pertinent info
    xml = replaceParagraphContent(xml, "[INCLUDE ANY OTHER PERTINENT INFO", pertinentInfo);

    // 9. Soldier Name (Caps)
    if (soldierName) {
      xml = replaceParagraphContent(xml, "[SOLDIER’S NAME]", soldierName);
    }

    // 10. Soldier Rank & Branch
    if (soldierRankBranch) {
      xml = replaceParagraphContent(xml, "SSG, USA", soldierRankBranch);
    }

    // 11. Element Leader Name (Caps)
    if (elName) {
      xml = replaceParagraphContent(xml, "[ELEMENT LEADER’S NAME]", elName);
    }

    // 12. Element Leader Rank & Branch
    if (elRankBranch) {
      xml = replaceParagraphContent(xml, "SGM, USA", elRankBranch);
    }

    // 13. Element Leader Title
    if (elTitle && elTitle !== "Element Leader") {
      xml = replaceParagraphContent(xml, "Element Leader", elTitle);
    }

    // Re-assemble document XML
    zip.file("word/document.xml", xml);

    // Generate zip file buffer
    const blob = zip.generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE",
    });

    // Trigger browser download
    const safeTitle = (data.positionTitle || "Position").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeName = (data.soldierNameCaps || "Applicant").replace(/[^a-zA-Z0-9_-]/g, "_");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Application_Memo_${safeTitle}_${safeName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to generate application memo:", err);
    alert("Error generating document: " + (err instanceof Error ? err.message : String(err)));
  }
};
