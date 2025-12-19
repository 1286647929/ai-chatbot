/**
 * 法律文书生成工具
 * 支持生成 Markdown 和 Word 格式的法律文书
 */

import { tool } from "ai";
import { z } from "zod";
import {
  type DocumentTemplate,
  DocumentTemplateType,
  documentTemplates,
  getTemplate,
  getTemplateList,
} from "../../../templates";

/**
 * 文书生成结果
 */
export interface DocumentGenerateResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的文书内容（Markdown 格式） */
  content?: string;
  /** 模板信息 */
  template?: {
    id: string;
    name: string;
  };
  /** 错误信息 */
  error?: string;
  /** 下载链接（如果生成了 Word 文档） */
  downloadUrl?: string;
}

/**
 * 填充模板内容
 * 将占位符替换为实际数据
 */
function fillTemplate(
  template: DocumentTemplate,
  data: Record<string, string>
): string {
  let content = template.content;

  // 添加当前年份
  const currentYear = new Date().getFullYear().toString();
  content = content.replace(/\{\{current_year\}\}/g, currentYear);

  // 替换所有占位符
  for (const field of template.fields) {
    const value = data[field.name] || field.defaultValue || "";
    const placeholder = new RegExp(`\\{\\{${field.name}\\}\\}`, "g");
    content = content.replace(placeholder, value);
  }

  // 清理未填充的占位符
  content = content.replace(/\{\{[^}]+\}\}/g, "________________");

  return content;
}

/**
 * 验证模板数据
 */
function validateTemplateData(
  template: DocumentTemplate,
  data: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of template.fields) {
    if (field.required && !data[field.name]) {
      missing.push(field.label);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * 列出可用模板工具
 */
export const listDocumentTemplates = tool({
  description: "列出所有可用的法律文书模板。使用此工具查看可以生成哪些类型的法律文书。",
  inputSchema: z.object({
    category: z
      .enum(["contract", "complaint", "letter", "all"])
      .default("all")
      .describe("模板类别：contract-合同、complaint-诉讼文书、letter-函件、all-全部"),
  }),
  execute: async ({ category }) => {
    let templates = getTemplateList();

    if (category !== "all") {
      templates = templates.filter((t) => t.category === category);
    }

    return {
      success: true,
      count: templates.length,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
      })),
    };
  },
});

/**
 * 获取模板详情工具
 */
export const getDocumentTemplateInfo = tool({
  description:
    "获取指定法律文书模板的详细信息，包括需要填写的字段列表。在生成文书前使用此工具了解需要哪些信息。",
  inputSchema: z.object({
    templateId: z
      .enum([
        DocumentTemplateType.RENTAL_CONTRACT,
        DocumentTemplateType.LABOR_CONTRACT,
        DocumentTemplateType.SERVICE_CONTRACT,
        DocumentTemplateType.CIVIL_COMPLAINT,
        DocumentTemplateType.ADMIN_COMPLAINT,
        DocumentTemplateType.LAWYER_LETTER,
        DocumentTemplateType.DEMAND_LETTER,
      ])
      .describe("模板 ID"),
  }),
  execute: async ({ templateId }) => {
    const template = getTemplate(templateId);

    if (!template) {
      return {
        success: false,
        error: `未找到模板: ${templateId}`,
      };
    }

    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        fields: template.fields.map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          defaultValue: f.defaultValue,
          options: f.options,
          description: f.description,
        })),
      },
    };
  },
});

/**
 * 生成法律文书工具
 */
export const generateDocument = tool({
  description: `生成法律文书。根据模板和用户提供的数据生成完整的法律文书（Markdown 格式）。

使用步骤：
1. 先使用 listDocumentTemplates 查看可用模板
2. 使用 getDocumentTemplateInfo 获取需要填写的字段
3. 收集用户提供的信息
4. 调用此工具生成文书

注意：生成的文书仅供参考，重要文书建议请律师审核。`,
  inputSchema: z.object({
    templateId: z
      .enum([
        DocumentTemplateType.RENTAL_CONTRACT,
        DocumentTemplateType.LABOR_CONTRACT,
        DocumentTemplateType.SERVICE_CONTRACT,
        DocumentTemplateType.CIVIL_COMPLAINT,
        DocumentTemplateType.ADMIN_COMPLAINT,
        DocumentTemplateType.LAWYER_LETTER,
        DocumentTemplateType.DEMAND_LETTER,
      ])
      .describe("模板 ID"),
    data: z
      .record(z.string())
      .describe("文书数据，键为字段名，值为填写内容"),
    validateOnly: z
      .boolean()
      .default(false)
      .describe("是否仅验证数据而不生成文书"),
  }),
  execute: async ({
    templateId,
    data,
    validateOnly,
  }): Promise<DocumentGenerateResult> => {
    const template = getTemplate(templateId);

    if (!template) {
      return {
        success: false,
        error: `未找到模板: ${templateId}`,
      };
    }

    // 验证数据完整性
    const validation = validateTemplateData(template, data);

    if (!validation.valid) {
      return {
        success: false,
        error: `缺少必填字段: ${validation.missing.join(", ")}`,
        template: {
          id: template.id,
          name: template.name,
        },
      };
    }

    // 仅验证模式
    if (validateOnly) {
      return {
        success: true,
        template: {
          id: template.id,
          name: template.name,
        },
        content: "数据验证通过，可以生成文书。",
      };
    }

    // 填充模板
    const content = fillTemplate(template, data);

    return {
      success: true,
      content,
      template: {
        id: template.id,
        name: template.name,
      },
    };
  },
});

// 导出所有文书生成相关工具
export const documentGeneratorTools = {
  listDocumentTemplates,
  getDocumentTemplateInfo,
  generateDocument,
};
