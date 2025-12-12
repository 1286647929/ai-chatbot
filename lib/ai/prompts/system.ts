import type { Geo } from "@vercel/functions";

/**
 * 基础系统提示词
 */
export const regularPrompt =
  "You are a friendly assistant! Keep your responses concise and helpful.";

/**
 * 请求上下文提示（地理位置等）
 */
export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;
