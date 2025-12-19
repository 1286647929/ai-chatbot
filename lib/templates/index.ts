/**
 * 法律文书模板定义
 */

/**
 * 文书模板类型
 */
export const DocumentTemplateType = {
  /** 租赁合同 */
  RENTAL_CONTRACT: "rental_contract",
  /** 劳动合同 */
  LABOR_CONTRACT: "labor_contract",
  /** 服务合同 */
  SERVICE_CONTRACT: "service_contract",
  /** 民事起诉状 */
  CIVIL_COMPLAINT: "civil_complaint",
  /** 行政起诉状 */
  ADMIN_COMPLAINT: "admin_complaint",
  /** 律师函 */
  LAWYER_LETTER: "lawyer_letter",
  /** 催告函 */
  DEMAND_LETTER: "demand_letter",
} as const;

export type DocumentTemplateType =
  (typeof DocumentTemplateType)[keyof typeof DocumentTemplateType];

/**
 * 模板字段定义
 */
export interface TemplateField {
  /** 字段名 */
  name: string;
  /** 字段标签（显示用） */
  label: string;
  /** 字段类型 */
  type: "text" | "date" | "number" | "textarea" | "select";
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  defaultValue?: string;
  /** 选项（用于 select 类型） */
  options?: string[];
  /** 描述 */
  description?: string;
}

/**
 * 文书模板
 */
export interface DocumentTemplate {
  /** 模板 ID */
  id: DocumentTemplateType;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板类别 */
  category: "contract" | "complaint" | "letter";
  /** 必填字段 */
  fields: TemplateField[];
  /** 模板内容（Markdown 格式，包含占位符） */
  content: string;
}

/**
 * 租赁合同模板
 */
export const rentalContractTemplate: DocumentTemplate = {
  id: DocumentTemplateType.RENTAL_CONTRACT,
  name: "房屋租赁合同",
  description: "标准房屋租赁合同模板，适用于住宅和商业用房",
  category: "contract",
  fields: [
    { name: "landlord_name", label: "出租方姓名", type: "text", required: true },
    { name: "landlord_id", label: "出租方身份证号", type: "text", required: true },
    { name: "tenant_name", label: "承租方姓名", type: "text", required: true },
    { name: "tenant_id", label: "承租方身份证号", type: "text", required: true },
    { name: "property_address", label: "房屋地址", type: "text", required: true },
    { name: "property_area", label: "建筑面积（平方米）", type: "number", required: true },
    { name: "rent_amount", label: "月租金（元）", type: "number", required: true },
    { name: "deposit_amount", label: "押金（元）", type: "number", required: true },
    { name: "lease_start", label: "租赁开始日期", type: "date", required: true },
    { name: "lease_end", label: "租赁结束日期", type: "date", required: true },
    { name: "payment_date", label: "每月付款日", type: "number", required: true, defaultValue: "1" },
  ],
  content: `# 房屋租赁合同

出租方（甲方）：{{landlord_name}}
身份证号码：{{landlord_id}}

承租方（乙方）：{{tenant_name}}
身份证号码：{{tenant_id}}

根据《中华人民共和国民法典》及相关法律法规的规定，甲乙双方在平等、自愿、协商一致的基础上，就房屋租赁事宜达成如下协议：

## 第一条 租赁房屋

甲方将位于 **{{property_address}}** 的房屋出租给乙方使用。该房屋建筑面积为 **{{property_area}}** 平方米。

## 第二条 租赁期限

租赁期限自 **{{lease_start}}** 起至 **{{lease_end}}** 止。

## 第三条 租金及支付方式

1. 月租金为人民币 **{{rent_amount}}** 元整。
2. 乙方应于每月 **{{payment_date}}** 日前支付当月租金。
3. 押金为人民币 **{{deposit_amount}}** 元整，于签订本合同时一次性支付。

## 第四条 房屋使用

1. 乙方应按约定用途使用房屋，不得擅自改变房屋结构和用途。
2. 乙方应妥善使用和保管房屋及其附属设施。

## 第五条 合同解除

1. 租赁期满，本合同自然终止。
2. 双方协商一致，可提前解除合同。
3. 一方严重违约，另一方有权解除合同并要求赔偿。

## 第六条 押金退还

租赁期满或合同解除后，甲方应在乙方结清费用并交还房屋后 **15** 日内退还押金。

## 第七条 争议解决

本合同在履行过程中发生的争议，由双方协商解决；协商不成的，依法向房屋所在地人民法院起诉。

## 第八条 其他

本合同一式两份，甲乙双方各执一份，自双方签字之日起生效。

甲方签字：________________  日期：________________

乙方签字：________________  日期：________________
`,
};

/**
 * 民事起诉状模板
 */
export const civilComplaintTemplate: DocumentTemplate = {
  id: DocumentTemplateType.CIVIL_COMPLAINT,
  name: "民事起诉状",
  description: "标准民事起诉状模板，适用于民间借贷、合同纠纷等民事案件",
  category: "complaint",
  fields: [
    { name: "plaintiff_name", label: "原告姓名", type: "text", required: true },
    { name: "plaintiff_gender", label: "原告性别", type: "select", required: true, options: ["男", "女"] },
    { name: "plaintiff_birth", label: "原告出生日期", type: "date", required: true },
    { name: "plaintiff_nationality", label: "原告民族", type: "text", required: true, defaultValue: "汉族" },
    { name: "plaintiff_id", label: "原告身份证号", type: "text", required: true },
    { name: "plaintiff_address", label: "原告住址", type: "text", required: true },
    { name: "plaintiff_phone", label: "原告联系电话", type: "text", required: true },
    { name: "defendant_name", label: "被告姓名/名称", type: "text", required: true },
    { name: "defendant_address", label: "被告住址", type: "text", required: true },
    { name: "defendant_phone", label: "被告联系电话", type: "text", required: false },
    { name: "case_type", label: "案由", type: "text", required: true, description: "如：民间借贷纠纷、买卖合同纠纷" },
    { name: "claim_amount", label: "诉讼请求金额（元）", type: "number", required: false },
    { name: "claims", label: "诉讼请求", type: "textarea", required: true },
    { name: "facts", label: "事实与理由", type: "textarea", required: true },
    { name: "court_name", label: "受诉法院", type: "text", required: true },
  ],
  content: `# 民事起诉状

## 原告

姓名：{{plaintiff_name}}
性别：{{plaintiff_gender}}
出生日期：{{plaintiff_birth}}
民族：{{plaintiff_nationality}}
身份证号码：{{plaintiff_id}}
住址：{{plaintiff_address}}
联系电话：{{plaintiff_phone}}

## 被告

名称/姓名：{{defendant_name}}
住址：{{defendant_address}}
联系电话：{{defendant_phone}}

## 案由

{{case_type}}

## 诉讼请求

{{claims}}

## 事实与理由

{{facts}}

## 证据清单

1. ________________
2. ________________
3. ________________

综上所述，原告的合法权益受到侵害，特依据相关法律规定向贵院提起诉讼，恳请贵院依法支持原告的诉讼请求。

此致

**{{court_name}}**

具状人（原告）：________________

日期：________________
`,
};

/**
 * 律师函模板
 */
export const lawyerLetterTemplate: DocumentTemplate = {
  id: DocumentTemplateType.LAWYER_LETTER,
  name: "律师函",
  description: "标准律师函模板，用于催告、警告或正式通知",
  category: "letter",
  fields: [
    { name: "law_firm", label: "律师事务所名称", type: "text", required: true },
    { name: "lawyer_name", label: "律师姓名", type: "text", required: true },
    { name: "lawyer_license", label: "律师执业证号", type: "text", required: true },
    { name: "client_name", label: "委托人名称", type: "text", required: true },
    { name: "recipient_name", label: "收函方名称", type: "text", required: true },
    { name: "recipient_address", label: "收函方地址", type: "text", required: true },
    { name: "subject", label: "函件主题", type: "text", required: true },
    { name: "content", label: "函件正文", type: "textarea", required: true },
    { name: "demands", label: "要求事项", type: "textarea", required: true },
    { name: "deadline", label: "答复期限（天）", type: "number", required: true, defaultValue: "7" },
  ],
  content: `# 律师函

**{{law_firm}}**

律函字〔{{current_year}}〕第 _____ 号

**收函方：** {{recipient_name}}
**地址：** {{recipient_address}}

**主题：** {{subject}}

{{recipient_name}}：

{{law_firm}} 接受 {{client_name}} 的委托，指派 {{lawyer_name}} 律师（执业证号：{{lawyer_license}}）就相关事宜，向贵方发出本律师函。

## 事实陈述

{{content}}

## 律师意见

基于上述事实，根据《中华人民共和国民法典》及相关法律法规的规定，我方委托人依法享有相应的合法权利。

## 郑重要求

{{demands}}

请贵方于收到本函之日起 **{{deadline}}** 日内，就上述事项作出书面答复并采取相应措施。

若贵方逾期不予答复或拒绝履行，我方委托人将依法采取进一步法律措施，届时由此产生的一切法律后果及诉讼费用将由贵方承担。

特此函告。

**{{law_firm}}**
**律师：{{lawyer_name}}**

日期：________________

---
*本函一式两份，委托人、收函方各执一份。*
`,
};

/**
 * 所有模板映射
 */
export const documentTemplates: Record<DocumentTemplateType, DocumentTemplate> = {
  [DocumentTemplateType.RENTAL_CONTRACT]: rentalContractTemplate,
  [DocumentTemplateType.CIVIL_COMPLAINT]: civilComplaintTemplate,
  [DocumentTemplateType.LAWYER_LETTER]: lawyerLetterTemplate,
  // 以下模板待扩展
  [DocumentTemplateType.LABOR_CONTRACT]: {
    ...rentalContractTemplate,
    id: DocumentTemplateType.LABOR_CONTRACT,
    name: "劳动合同",
    description: "标准劳动合同模板（待完善）",
    content: "劳动合同模板待完善...",
  },
  [DocumentTemplateType.SERVICE_CONTRACT]: {
    ...rentalContractTemplate,
    id: DocumentTemplateType.SERVICE_CONTRACT,
    name: "服务合同",
    description: "标准服务合同模板（待完善）",
    content: "服务合同模板待完善...",
  },
  [DocumentTemplateType.ADMIN_COMPLAINT]: {
    ...civilComplaintTemplate,
    id: DocumentTemplateType.ADMIN_COMPLAINT,
    name: "行政起诉状",
    description: "标准行政起诉状模板（待完善）",
    content: "行政起诉状模板待完善...",
  },
  [DocumentTemplateType.DEMAND_LETTER]: {
    ...lawyerLetterTemplate,
    id: DocumentTemplateType.DEMAND_LETTER,
    name: "催告函",
    description: "催款催告函模板（待完善）",
    content: "催告函模板待完善...",
  },
};

/**
 * 获取模板列表
 */
export function getTemplateList(): Array<{
  id: DocumentTemplateType;
  name: string;
  description: string;
  category: string;
}> {
  return Object.values(documentTemplates).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
  }));
}

/**
 * 获取模板
 */
export function getTemplate(
  templateId: DocumentTemplateType
): DocumentTemplate | undefined {
  return documentTemplates[templateId];
}
