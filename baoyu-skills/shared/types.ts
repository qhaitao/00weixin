// ============================================================
// shared/types.ts — 跨 Skill 共享类型定义（单一真相源）
// ============================================================

// ---------- Workspace Analysis ----------
// content-analyzer 生成模板，Agent AI 填写，article-writer 消费

export interface Analysis {
  topic: string;
  source_type: string;
  key_points: string[];
  insights: string[];
  data_facts: string[];
  suggested_structure: {
    title: string;
    sections: string[];
  };
  word_count_target: number;
  references: string[];
}

// ---------- 校验（article-writer 使用）----------

export function validateAnalysis(a: Analysis): string[] {
  const errors: string[] = [];
  if (!a.topic) errors.push("topic 为空");
  if (!a.key_points?.length) errors.push("key_points 为空");
  if (!a.insights?.length) errors.push("insights 为空（配图提示词质量会很差）");
  if (!a.suggested_structure?.sections?.length) errors.push("sections 为空");
  return errors;
}
