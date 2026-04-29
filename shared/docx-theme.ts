// ============================================================
// shared/docx-theme.ts — DOCX 样式主题
// ============================================================

export interface DocxTheme {
  font: string;
  colors: {
    h1: string;
    h2: string;
    h3: string;
    border: string;
    light: string;
    tblHdr: string;
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  bodySize: number;
  indent: number;
}

export const defaultTheme: DocxTheme = {
  font: process.env["DOC_FONT"] || "Microsoft YaHei",
  colors: {
    h1: "1F3864",
    h2: "2E75B6",
    h3: "404040",
    border: "B8CCE4",
    light: "7F7F7F",
    tblHdr: "D6E4F7",
  },
  margins: {
    top: 1440,
    right: 1296,
    bottom: 1440,
    left: 1296,
  },
  bodySize: 22,
  indent: 440,
};
