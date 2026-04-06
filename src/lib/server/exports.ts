import type { JobDetail, StructuredSummary } from "@/lib/types";

type DocxRuntime = Awaited<typeof import("docx")>;
type DocxParagraph = InstanceType<DocxRuntime["Paragraph"]>;
type DocxTable = InstanceType<DocxRuntime["Table"]>;

function sanitizeFilenamePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "meeting-summary";
}

function infoLines(job: JobDetail) {
  return [
    ["会议标题", job.title],
    ["会议时间", job.meetingAtText || "未填写"],
    ["会议地点", job.meetingLocation || "未填写"],
    ["音频文件", job.sourceFilename],
    ["会议时长", job.durationText],
    ["发言人数", `${job.speakerCount}`],
  ] as const;
}

function summaryMarkdownBody(job: JobDetail) {
  if (job.summaryMarkdown) {
    return job.summaryMarkdown.trim();
  }

  if (job.summaryJson) {
    return structuredToMarkdown(job.summaryJson);
  }

  return "";
}

function structuredToMarkdown(summary: StructuredSummary) {
  const lines: string[] = [];

  if (summary.attendees.length > 0) {
    lines.push("## 参会人");
    for (const attendee of summary.attendees) {
      lines.push(`- ${attendee.name}${attendee.role ? `（${attendee.role}）` : ""}`);
    }
    lines.push("");
  }

  if (summary.overview) {
    lines.push("## 会议概述");
    lines.push(summary.overview);
    lines.push("");
  }

  for (const topic of summary.topics) {
    lines.push(`## ${topic.title}`);
    for (const point of topic.points) {
      lines.push(`- ${point}`);
    }
    if (topic.conclusion) {
      lines.push(`\n**结论：** ${topic.conclusion}`);
    }
    lines.push("");
  }

  if (summary.decisions.length > 0) {
    lines.push("## 决议事项");
    for (const decision of summary.decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  if (summary.actionItems.length > 0) {
    lines.push("## 待办事项");
    lines.push("| 事项 | 负责人 | 截止时间 |");
    lines.push("| --- | --- | --- |");
    for (const item of summary.actionItems) {
      lines.push(`| ${item.task} | ${item.owner} | ${item.deadline ?? "待确认"} |`);
    }
    lines.push("");
  }

  if (summary.risks.length > 0) {
    lines.push("## 风险与遗留");
    for (const risk of summary.risks) {
      lines.push(`- ${risk}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function buildExportBaseName(job: JobDetail) {
  return sanitizeFilenamePart(job.title || job.sourceFilename);
}

export function buildMarkdownExport(job: JobDetail) {
  const lines: string[] = [
    `# ${job.title}`,
    "",
    "## 会议信息",
  ];

  for (const [label, value] of infoLines(job)) {
    lines.push(`- ${label}：${value}`);
  }

  const summaryBody = summaryMarkdownBody(job);
  if (summaryBody) {
    lines.push("");
    lines.push(summaryBody);
  }

  return `${lines.join("\n").trim()}\n`;
}

function tableRowsFromMarkdown(lines: string[], startIndex: number) {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line.startsWith("|")) break;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const isDivider = cells.every((cell) => /^:?-{3,}:?$/.test(cell));

    if (!isDivider) {
      rows.push(cells);
    }
    index += 1;
  }

  return { rows, nextIndex: index };
}

function summaryParagraphs(
  markdown: string,
  docx: Pick<DocxRuntime, "HeadingLevel" | "Paragraph" | "Table" | "TableCell" | "TableLayoutType" | "TableRow" | "TextRun" | "WidthType">,
) {
  const { HeadingLevel, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } = docx;
  const lines = markdown.split("\n");
  const children: Array<DocxParagraph | DocxTable> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      children.push(new Paragraph({
        text: line.slice(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 120 },
      }));
      continue;
    }

    if (line.startsWith("- ")) {
      children.push(new Paragraph({
        text: line.slice(2),
        bullet: { level: 0 },
        spacing: { after: 80 },
      }));
      continue;
    }

    if (line.startsWith("|")) {
      const { rows, nextIndex } = tableRowsFromMarkdown(lines, index);
      if (rows.length > 0) {
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: rows.map((row, rowIndex) => new TableRow({
            tableHeader: rowIndex === 0,
            children: row.map((cell) => new TableCell({
              width: { size: rowIndex === 0 ? 33 : 33, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: cell, bold: rowIndex === 0 })],
              })],
            })),
          })),
        }));
      }
      index = nextIndex - 1;
      continue;
    }

    if (line.startsWith("**结论：**")) {
      const conclusion = line.replace("**结论：**", "").trim();
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "结论：", bold: true }),
          new TextRun(conclusion),
        ],
        spacing: { after: 120 },
      }));
      continue;
    }

    children.push(new Paragraph({
      text: line,
      spacing: { after: 120 },
    }));
  }

  return children;
}

export async function buildWordDocxExport(job: JobDetail) {
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: infoLines(job).map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true })],
          })],
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          children: [new Paragraph(String(value))],
        }),
      ],
    })),
  });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: job.title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
        }),
        new Paragraph({
          text: "会议信息",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 120 },
        }),
        infoTable,
        ...summaryParagraphs(summaryMarkdownBody(job), {
          HeadingLevel,
          Paragraph,
          Table,
          TableCell,
          TableLayoutType,
          TableRow,
          TextRun,
          WidthType,
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
