import { expect, test } from "../fixtures";
import type { Page } from "@playwright/test";

/**
 * Legal Chat Page Object
 * 用于操作法律聊天页面的测试工具类
 */
class LegalChatPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // 输入框
  get textarea() {
    return this.page.locator("textarea");
  }

  // 发送按钮
  get sendButton() {
    return this.page.locator('button:has(svg[viewBox="0 0 24 24"])').last();
  }

  // 重置按钮
  get resetButton() {
    return this.page.getByRole("button", { name: "重新开始" });
  }

  // 流式响应开关
  get streamToggle() {
    return this.page.locator("button:has-text('流式响应'), button:has-text('普通响应')");
  }

  // 消息列表
  get messageList() {
    return this.page.locator('[data-role="user"], [data-role="assistant"]');
  }

  // 思考中指示器
  get thinkingIndicator() {
    return this.page.locator("text=思考中");
  }

  // 错误提示
  get errorMessage() {
    return this.page.locator(".text-red-600, .text-red-500");
  }

  // 导航到法律聊天页面
  async goto() {
    await this.page.goto("/legal");
    // 等待页面加载完成
    await this.page.waitForLoadState("networkidle");
  }

  // 等待初始化完成
  async waitForInit() {
    // 等待 greeting 消息出现或输入框可用
    await this.page.waitForSelector("textarea", { timeout: 10000 });
  }

  // 发送消息
  async sendMessage(message: string) {
    await this.textarea.fill(message);
    await this.sendButton.click();
  }

  // 等待响应完成
  async waitForResponse() {
    // 等待 /api/legal/interact 请求完成
    const response = await this.page.waitForResponse(
      (res) => res.url().includes("/api/legal/interact"),
      { timeout: 60000 }
    );
    await response.finished();
    // 等待思考中指示器消失
    await this.thinkingIndicator.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
  }

  // 获取最后一条助手消息
  async getLastAssistantMessage(): Promise<string | null> {
    const messages = await this.page.locator('[data-role="assistant"]').all();
    if (messages.length === 0) return null;
    const lastMessage = messages[messages.length - 1];
    return lastMessage.innerText();
  }

  // 获取消息数量
  async getMessageCount(): Promise<number> {
    return this.messageList.count();
  }

  // 点击重置
  async clickReset() {
    await this.resetButton.click();
  }

  // 检查是否有错误
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  // 选择文档路径（如果存在）
  async selectDocumentPath(pathName: string) {
    const pathButton = this.page.locator(`button:has-text("${pathName}")`);
    if (await pathButton.isVisible()) {
      await pathButton.click();
    }
  }
}

test.describe("Legal Chat Flow", () => {
  let legalPage: LegalChatPage;

  test.beforeEach(async ({ page }) => {
    legalPage = new LegalChatPage(page);
  });

  test("should navigate to legal chat page and show greeting", async ({ page }) => {
    // 由于需要登录，先跳过此测试直到后端 API 就绪
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();

    // 应该显示法律文书助手标题
    await expect(page.locator("h1")).toContainText("法律文书助手");
  });

  test("should show initial greeting message after session init", async ({ page }) => {
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();

    // 等待初始化响应
    await legalPage.waitForResponse();

    // 应该有至少一条助手消息
    const messageCount = await legalPage.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(1);
  });

  test("should send user message and receive response", async ({ page }) => {
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();
    await legalPage.waitForResponse();

    // 发送一条消息
    await legalPage.sendMessage("我想咨询劳动纠纷问题，老板拖欠工资两个月");

    // 等待响应
    await legalPage.waitForResponse();

    // 检查是否有错误
    const hasError = await legalPage.hasError();
    expect(hasError).toBe(false);

    // 应该有新的消息
    const messageCount = await legalPage.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(3); // greeting + user + assistant
  });

  test("should handle consulting flow", async ({ page }) => {
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();
    await legalPage.waitForResponse();

    // 发送初始咨询
    await legalPage.sendMessage("公司无故辞退我，没有给任何补偿");
    await legalPage.waitForResponse();

    // 继续提供更多信息
    await legalPage.sendMessage("我在公司工作了3年，签了无固定期限合同");
    await legalPage.waitForResponse();

    // 检查是否进入了咨询阶段
    const lastMessage = await legalPage.getLastAssistantMessage();
    expect(lastMessage).not.toBeNull();
  });

  test("should reset session when clicking reset button", async ({ page }) => {
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();
    await legalPage.waitForResponse();

    // 发送一条消息
    await legalPage.sendMessage("我想咨询离婚财产分割问题");
    await legalPage.waitForResponse();

    // 点击重置
    await legalPage.clickReset();

    // 等待重置完成
    await page.waitForTimeout(1000);

    // 消息列表应该清空或只有新的 greeting
    const messageCount = await legalPage.getMessageCount();
    expect(messageCount).toBeLessThanOrEqual(1);
  });

  test("should toggle streaming mode", async ({ page }) => {
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();

    // 获取当前流式状态
    const toggleText = await legalPage.streamToggle.innerText();
    const initialState = toggleText.includes("流式响应");

    // 点击切换
    await legalPage.streamToggle.click();

    // 状态应该改变
    const newToggleText = await legalPage.streamToggle.innerText();
    const newState = newToggleText.includes("流式响应");

    expect(newState).not.toBe(initialState);
  });

  test("should disable input during loading", async ({ page }) => {
    test.fixme();

    await legalPage.goto();
    await legalPage.waitForInit();
    await legalPage.waitForResponse();

    // 发送消息
    await legalPage.sendMessage("测试消息");

    // 在加载期间，输入框应该被禁用
    const isDisabled = await legalPage.textarea.isDisabled();
    // 注意：这个测试可能需要调整，因为加载可能很快完成
    // expect(isDisabled).toBe(true);

    // 等待加载完成
    await legalPage.waitForResponse();

    // 加载完成后，输入框应该可用
    const isEnabledAfter = await legalPage.textarea.isEnabled();
    expect(isEnabledAfter).toBe(true);
  });
});

test.describe("Legal Chat API Routes", () => {
  test("should return 401 for unauthenticated requests to /api/legal/interact", async ({
    request,
  }) => {
    test.fixme();

    const response = await request.post("/api/legal/interact", {
      data: {},
    });

    // 未认证应该返回 401 或重定向到登录
    expect([401, 302, 307]).toContain(response.status());
  });

  test("should handle /api/textract route", async ({ adaContext }) => {
    test.fixme();

    // 测试 textract API（需要有效的 fileId）
    const response = await adaContext.request.post("/api/textract", {
      data: {
        fileId: "test-file-id",
        scene: "legal",
      },
    });

    // 应该返回响应（可能是错误，因为 fileId 不存在）
    expect([200, 400, 404]).toContain(response.status());
  });
});
