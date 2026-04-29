// ============================================================
// shared/context.ts — 组织上下文（单一真相源）
// 所有 skill 的 prompt 模板通过此模块获取单位背景信息
// ============================================================

import { env } from "./env";

export interface OrgContext {
  /** 完整单位名称，如"中国邮政集团有限公司广东省分公司" */
  name: string;
  /** 简称，如"广东省分公司" */
  shortName: string;
  /** 上级单位，如"中国邮政集团有限公司" */
  parent: string;
  /** 单位负责人（一把手） */
  leader: string;
  /** 分管财务领导 */
  financeLeader: string;
}

export interface DocContext {
  org: OrgContext;
  /** 文档作者姓名 */
  author: string;
  /** 默认目标字数 */
  wordTarget: number;
  /** 发言稿字速（字/分钟），用于时长估算 */
  wordsPerMin: number;
}

export function loadOrgContext(): OrgContext {
  return {
    name:          env("DOC_ORG",            "中国邮政集团有限公司广东省分公司"),
    shortName:     env("DOC_ORG_SHORT",      "广东省分公司"),
    parent:        env("DOC_ORG_PARENT",     "中国邮政集团有限公司"),
    leader:        env("DOC_LEADER",         "陈智泉"),
    financeLeader: env("DOC_FINANCE_LEADER", "杨旻"),
  };
}

export function loadDocContext(): DocContext {
  return {
    org:         loadOrgContext(),
    author:      env("AUTHOR_NAME", ""),
    wordTarget:  parseInt(env("ARTICLE_WORD_TARGET", "1000")),
    wordsPerMin: parseInt(env("SPEECH_WORDS_PER_MIN", "160")),
  };
}

/**
 * 生成用于 prompt 开头的单位背景段落，帮助 AI 建立正确的组织语境。
 *
 * 示例输出：
 * ## 单位背景
 * - 本单位：中国邮政集团有限公司广东省分公司（简称"广东省分公司"）
 * - 上级单位：中国邮政集团有限公司
 * - 单位负责人（一把手）：陈智泉
 * - 分管财务领导：杨旻
 */
export function orgContextBlock(org: OrgContext): string {
  return [
    `## 单位背景`,
    ``,
    `- 本单位：${org.name}（简称"${org.shortName}"）`,
    `- 上级单位：${org.parent}`,
    `- 单位负责人（一把手）：${org.leader}`,
    `- 分管财务领导：${org.financeLeader}`,
  ].join("\n");
}
