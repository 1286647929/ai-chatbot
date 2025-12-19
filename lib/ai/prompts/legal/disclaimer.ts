/**
 * 法律免责声明配置
 * 所有法律 Agent 的回复中必须包含适当的免责声明
 */

/**
 * 标准法律免责声明（完整版）
 * 用于法律咨询、案例分析等场景
 */
export const LEGAL_DISCLAIMER_FULL = `
## ⚖️ 重要声明

**本内容仅供参考，不构成法律意见。**

1. 以上分析基于您提供的信息和现行法律法规，可能因具体情况不同而有所差异。
2. 法律法规可能会更新变化，请以最新法律规定为准。
3. 涉及重大权益的决定，强烈建议咨询执业律师获取专业法律服务。
4. 本系统不对因使用上述信息而导致的任何损失承担责任。

如需法律援助，可拨打：12348（全国法律援助热线）
`;

/**
 * 简短法律免责声明
 * 用于简单查询、法规检索等场景
 */
export const LEGAL_DISCLAIMER_SHORT = `
---
*声明：以上内容仅供参考，不构成法律意见。重要决定请咨询执业律师。*
`;

/**
 * 紧急情况提示
 * 用于检测到人身安全等紧急情况时
 */
export const EMERGENCY_NOTICE = `
⚠️ **紧急情况提示**

如果您或他人正面临人身安全威胁，请立即：
- 拨打 **110**（报警）
- 拨打 **120**（急救）
- 拨打 **12348**（法律援助）

生命安全是第一位的，请优先保护好自己！
`;

/**
 * 诉讼时效提醒
 * 用于涉及时效性问题时的提醒
 */
export const STATUTE_OF_LIMITATIONS_NOTICE = `
⏰ **时效提醒**

民事诉讼时效通常为三年（自知道或应当知道权利被侵害之日起计算）。
请注意核实您的情况是否仍在诉讼时效期内，超过时效可能丧失胜诉权。
`;

/**
 * 刑事案件提示
 * 用于涉及刑事问题时
 */
export const CRIMINAL_CASE_NOTICE = `
🚨 **刑事案件提示**

如涉及刑事案件，请注意：
1. 如实陈述，配合司法机关调查
2. 有权聘请律师为您辩护
3. 被采取强制措施时，有权要求通知家属
4. 刑事案件涉及人身自由，务必寻求专业律师帮助
`;

/**
 * 根据内容类型获取适当的免责声明
 */
export type DisclaimerType =
  | "full"
  | "short"
  | "emergency"
  | "statute"
  | "criminal";

export function getDisclaimer(type: DisclaimerType = "short"): string {
  const disclaimers: Record<DisclaimerType, string> = {
    full: LEGAL_DISCLAIMER_FULL,
    short: LEGAL_DISCLAIMER_SHORT,
    emergency: EMERGENCY_NOTICE,
    statute: STATUTE_OF_LIMITATIONS_NOTICE,
    criminal: CRIMINAL_CASE_NOTICE,
  };

  return disclaimers[type];
}

/**
 * 组合多个免责声明
 */
export function combineDisclaimers(types: DisclaimerType[]): string {
  return types.map((type) => getDisclaimer(type)).join("\n");
}
