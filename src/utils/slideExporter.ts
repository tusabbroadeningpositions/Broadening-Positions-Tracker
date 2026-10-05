import { formatNumberToWord } from "./docxExporter";

export interface SlideVacancyData {
  id: string;
  positionTitle: string;
  shopName: string;
  closeDeadlineDate: string;
  eligibilityRequirements?: string[];
  tierLevel?: string;
  isSpecialty?: boolean;
  isCommandAppointed?: boolean;
  slots?: number;
  pocRankName?: string;
  pocEmail?: string;
}

/**
 * Helper to truncate long text elegantly on the HTML5 Canvas
 */
const drawTruncatedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
) => {
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) {
    ctx.fillText(text, x, y);
  } else {
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    ctx.fillText(truncated + "...", x, y);
  }
};

/**
 * Helper to wrap and draw text on multiple lines if it exceeds maxWidth
 */
const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) => {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  // Render up to 2 lines
  const maxLines = Math.min(lines.length, 2);
  for (let i = 0; i < maxLines; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
};

/**
 * Generates a pixel-perfect, beautifully structured vacancies chart image
 * sized exactly to fit the chart content (no 16:9 extra space or padding).
 * This makes it perfect for direct copy-pasting onto presentation slides.
 */
export const exportVacancyBriefingSlide = (
  vacancies: SlideVacancyData[],
  titleSuffix: string = "Current Vacancies"
) => {
  const canvas = document.createElement("canvas");
  const tableWidth = 1720;
  
  // Clean up and slice up to 12 items
  const items = vacancies.slice(0, 12);
  const rowCount = items.length || 1; // At least one row for empty state placeholder
  
  // Calculate dynamic row height
  const rowHeight = rowCount > 8 ? 52 : 62;
  
  // Exact canvas dimensions based on table size
  const headerHeight = 55;
  const canvasHeight = headerHeight + rowCount * rowHeight;
  
  canvas.width = tableWidth;
  canvas.height = canvasHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Draw Professional Military Dark Theme Gradient Background
  const grad = ctx.createLinearGradient(0, 0, tableWidth, canvasHeight);
  grad.addColorStop(0, "#0b0f19"); // Deep Slate Navy
  grad.addColorStop(0.5, "#111827"); // Neutral Gray-900
  grad.addColorStop(1, "#1e293b"); // Slate blue-800
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, tableWidth, canvasHeight);

  // 2. Setup Layout and Column Widths/Positions matching exact user specified order
  const colWidths = {
    pos: 460,       // Position Title & Shop Name
    tier: 120,      // Tier Level
    slots: 140,     // # of Positions (simple numeral)
    rankReq: 340,   // Rank Requirement Column
    deadline: 240,  // Submission Deadline
    poc: 420        // POC Contact Block
  };

  const colPositions = {
    pos: 20,
    tier: colWidths.pos,
    slots: colWidths.pos + colWidths.tier,
    rankReq: colWidths.pos + colWidths.tier + colWidths.slots,
    deadline: colWidths.pos + colWidths.tier + colWidths.slots + colWidths.rankReq,
    poc: colWidths.pos + colWidths.tier + colWidths.slots + colWidths.rankReq + colWidths.deadline
  };

  // 3. Draw Professional Table Header Row
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)"; // Deepest slate block
  ctx.fillRect(0, 0, tableWidth, headerHeight);

  ctx.strokeStyle = "#10b981"; // Emerald border
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, tableWidth, headerHeight);

  ctx.fillStyle = "#e2e8f0"; // Bright grey
  ctx.font = "bold 13px 'Arial', sans-serif";
  
  ctx.textAlign = "left";
  ctx.fillText("VACANT POSITION TITLE", colPositions.pos, 34);
  
  ctx.textAlign = "center";
  ctx.fillText("TIER", colPositions.tier + colWidths.tier / 2, 34);
  ctx.fillText("# OF POSITIONS", colPositions.slots + colWidths.slots / 2, 34);
  
  ctx.textAlign = "left";
  ctx.fillText("RANK REQUIREMENT", colPositions.rankReq + 15, 34);
  
  ctx.textAlign = "center";
  ctx.fillText("SUBMISSION DEADLINE", colPositions.deadline + colWidths.deadline / 2, 34);
  
  ctx.textAlign = "left";
  ctx.fillText("CONTACT POC", colPositions.poc + 15, 34);

  // 4. Draw Rows or Empty Placeholder State
  if (items.length === 0) {
    const yRow = headerHeight;
    
    // Draw empty cell BG
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.fillRect(0, yRow, tableWidth, rowHeight);
    
    // Bottom border
    ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yRow + rowHeight);
    ctx.lineTo(tableWidth, yRow + rowHeight);
    ctx.stroke();
    
    // Placeholder text
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "italic 14px 'Arial', sans-serif";
    ctx.fillText("NO ACTIVE VACANCIES AT THIS TIME", tableWidth / 2, yRow + rowHeight / 2 + 5);
  } else {
    items.forEach((vac, index) => {
      const yRow = headerHeight + index * rowHeight;

      // Alternate Row BG to maximize legibility
      ctx.fillStyle = index % 2 === 0 ? "rgba(30, 41, 59, 0.35)" : "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(0, yRow, tableWidth, rowHeight);

      // Row Bottom Border Line
      ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yRow + rowHeight);
      ctx.lineTo(tableWidth, yRow + rowHeight);
      ctx.stroke();

      // Side Borders for table framing
      ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
      ctx.beginPath();
      ctx.moveTo(0, yRow);
      ctx.lineTo(0, yRow + rowHeight);
      ctx.moveTo(tableWidth, yRow);
      ctx.lineTo(tableWidth, yRow + rowHeight);
      ctx.stroke();

      // 4A. Position Title (Truncated to prevent overflow)
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      
      const titleY = rowCount > 8 ? yRow + 18 : yRow + 22;
      ctx.font = `bold ${rowCount > 8 ? "14px" : "16px"} 'Arial', sans-serif`;
      drawTruncatedText(ctx, vac.positionTitle, colPositions.pos, titleY, colWidths.pos - 40);
      
      // Shop name in green (Wrapped elegantly on up to 2 lines, preventing any overlap)
      ctx.fillStyle = "#10b981";
      ctx.font = `bold ${rowCount > 8 ? "9.5px" : "10.5px"} 'Courier New', monospace`;
      
      const shopY = rowCount > 8 ? yRow + 31 : yRow + 37;
      const shopLineHeight = rowCount > 8 ? 10 : 11;
      drawWrappedText(ctx, vac.shopName.toUpperCase(), colPositions.pos, shopY, colWidths.pos - 40, shopLineHeight);

      // 4B. Tier Level Pill Column
      const tierText = vac.tierLevel && vac.tierLevel !== "N/A" ? `Tier ${vac.tierLevel}` : "N/A";
      const isSpecialty = !!vac.isSpecialty;
      const isCmdAppointed = !!vac.isCommandAppointed;
      
      ctx.save();
      // Centered pill drawing
      const pillX = colPositions.tier + colWidths.tier / 2;
      const pillY = yRow + rowHeight / 2;
      ctx.translate(pillX, pillY);
      
      // Badge BG color
      if (isCmdAppointed) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.15)"; // Blue
        ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      } else if (isSpecialty) {
        ctx.fillStyle = "rgba(168, 85, 247, 0.15)"; // Purple
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      } else {
        ctx.fillStyle = "rgba(71, 85, 105, 0.3)"; // Slate
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      }
      
      // Draw pill
      ctx.beginPath();
      ctx.roundRect(-48, -11, 96, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isCmdAppointed ? "#60a5fa" : isSpecialty ? "#c084fc" : "#e2e8f0";
      ctx.font = "bold 10px 'Arial', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(tierText, 0, 4);
      ctx.restore();

      // 4C. # of Positions (Simple numeral representation)
      const slotsNum = Number(vac.slots) || 1;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${rowCount > 8 ? "14px" : "16px"} 'Arial', sans-serif`;
      ctx.fillText(String(slotsNum), colPositions.slots + colWidths.slots / 2, yRow + rowHeight / 2 + 5);

      // 4D. Rank Requirement Column
      const rankReq = vac.eligibilityRequirements?.[0] || "N/A";
      ctx.textAlign = "left";
      ctx.fillStyle = "#cbd5e1"; // Soft gray-blue text for legibility
      ctx.font = `${rowCount > 8 ? "12px" : "13.5px"} 'Arial', sans-serif`;
      drawTruncatedText(ctx, rankReq, colPositions.rankReq + 15, yRow + rowHeight / 2 + 5, colWidths.rankReq - 30);

      // 4E. Submission Deadline (Clean gold highlight)
      ctx.textAlign = "center";
      ctx.fillStyle = "#fbbf24"; // Golden amber
      ctx.font = `bold ${rowCount > 8 ? "12px" : "14px"} 'Courier New', monospace`;
      ctx.fillText(vac.closeDeadlineDate.toUpperCase(), colPositions.deadline + colWidths.deadline / 2, yRow + rowHeight / 2 + 5);

      // 4F. POC Contacts
      ctx.textAlign = "left";
      ctx.fillStyle = "#e2e8f0";
      ctx.font = `bold ${rowCount > 8 ? "12px" : "13.5px"} 'Arial', sans-serif`;
      ctx.fillText(vac.pocRankName || "N/A", colPositions.poc + 15, yRow + rowHeight / 2 - 5);
      
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${rowCount > 8 ? "10px" : "11px"} 'Courier New', monospace`;
      ctx.fillText(vac.pocEmail || "", colPositions.poc + 15, yRow + rowHeight / 2 + 10);
    });
  }

  // 5. Draw Table Frame Outer Border (Ensure crisp edges, offset by 1px)
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2.0;
  ctx.strokeRect(1, 1, tableWidth - 2, canvasHeight - 2);

  // 6. Download the Image
  try {
    const filename = `TUSAB_Vacancy_Chart_${titleSuffix.replace(/\s+/g, "_")}.png`;
    const dataUrl = canvas.toDataURL("image/png");
    
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error("Chart image export failed:", error);
  }
};
