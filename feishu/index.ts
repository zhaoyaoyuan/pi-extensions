import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 飞书应用机器人扩展（长连接模式）
 * 
 * 配置文件优先级：
 *   1. 项目目录: .pi/feishu.json
 *   2. 全局目录: ~/.pi/agent/extensions/feishu/config.json
 * 
 * 配置格式：
 * {
 *   "appId": "cli_xxx",
 *   "appSecret": "xxx"
 * }
 * 
 * 飞书开放平台配置：
 *   1. 事件订阅 → 选择"使用长连接"
 *   2. 添加事件：im.message.receive_v1
 *   3. 启用机器人能力
 */

// ============ 动态导入飞书 SDK ============

let lark: typeof import("@larksuiteoapi/node-sdk") | null = null;

async function loadLarkSDK(): Promise<typeof import("@larksuiteoapi/node-sdk")> {
  if (lark) return lark;
  
  try {
    lark = await import("@larksuiteoapi/node-sdk");
    return lark;
  } catch {
    throw new Error(
      "请先安装飞书 SDK：\n" +
      "cd ~/.pi/agent/extensions/feishu && npm install"
    );
  }
}

// ============ 配置 ============

interface FeishuConfig {
  appId: string;
  appSecret: string;
}

interface LoadConfigResult {
  config: FeishuConfig | null;
  source: string;
}

async function loadConfig(): Promise<LoadConfigResult> {
  // 优先级：项目目录 .pi/feishu.json > 扩展目录 config.json
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const globalConfigPath = join(__dirname, "config.json");
  
  // 尝试从项目目录读取
  const projectConfigPath = join(process.cwd(), ".pi", "feishu.json");
  
  // 先尝试项目配置，再尝试全局配置
  const configPath = await readFile(projectConfigPath, "utf-8")
    .then(() => projectConfigPath)
    .catch(() => globalConfigPath);
  
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    
    if (!config.appId || !config.appSecret) {
      console.error("[feishu] 配置文件缺少 appId 或 appSecret");
      return { config: null, source: "" };
    }
    
    return {
      config: { appId: config.appId, appSecret: config.appSecret },
      source: configPath,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return { config: null, source: "" };
    }
    console.error("[feishu] 读取配置文件失败:", error.message);
    return { config: null, source: "" };
  }
}

// ============ 扩展主入口 ============

export default async function (pi: ExtensionAPI) {
  let config: FeishuConfig | null = null;
  let configSource = "";
  let larkClient: any = null;
  let lastChatId: string | null = null;

  // ============ 注册 feishu_notify 工具 ============
  
  pi.registerTool({
    name: "feishu_notify",
    label: "飞书通知",
    description: "发送通知消息到飞书群。需要先在飞书群 @机器人 发过消息。",
    promptSnippet: "发送通知到飞书群",
    promptGuidelines: [
      "Use feishu_notify when the user asks to notify, report, or send results to Feishu/Lark.",
    ],
    parameters: Type.Object({
      title: Type.String({ description: "消息标题" }),
      content: Type.String({ description: "消息内容（支持 Markdown）" }),
      level: Type.Optional(Type.String({ description: "消息级别: info, success, warning, error" })),
    }),
    async execute(toolCallId, params) {
      if (!larkClient || !lastChatId) {
        return {
          content: [{ type: "text", text: "❌ 飞书未连接或没有可用的会话。请先在飞书群 @机器人 发一条消息。" }],
          details: { success: false },
        };
      }

      const colorMap: Record<string, string> = {
        info: "blue", success: "green", warning: "orange", error: "red",
      };
      const color = colorMap[params.level || "info"] || "blue";

      try {
        await larkClient.im.message.create({
          data: {
            receive_id: lastChatId,
            content: JSON.stringify({
              config: { wide_screen_mode: true },
              header: {
                title: { tag: "plain_text", content: params.title },
                template: color,
              },
              elements: [{ tag: "markdown", content: params.content }],
            }),
            msg_type: "interactive",
          },
          params: { receive_id_type: "chat_id" },
        });

        return {
          content: [{ type: "text", text: `✅ 已发送飞书通知: ${params.title}` }],
          details: { success: true },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ 发送失败: ${error}` }],
          details: { success: false },
        };
      }
    },
  });

  // ============ 注册 /feishu-send 命令 ============

  pi.registerCommand("feishu-send", {
    description: "发送消息到飞书群（使用最近一次收到消息的群）",
    handler: async (args, ctx) => {
      if (!args) {
        ctx.ui.notify("用法: /feishu-send <消息内容>", "warning");
        return;
      }

      if (!larkClient || !lastChatId) {
        ctx.ui.notify("❌ 飞书未连接或没有可用的会话", "error");
        return;
      }

      try {
        await larkClient.im.message.create({
          data: {
            receive_id: lastChatId,
            content: JSON.stringify({
              config: { wide_screen_mode: true },
              header: {
                title: { tag: "plain_text", content: "Pi 消息" },
                template: "blue",
              },
              elements: [{ tag: "markdown", content: args }],
            }),
            msg_type: "interactive",
          },
          params: { receive_id_type: "chat_id" },
        });
        ctx.ui.notify("✅ 已发送", "info");
      } catch (error) {
        ctx.ui.notify(`❌ 发送失败: ${error}`, "error");
      }
    },
  });

  // ============ 注册 /feishu-config 命令 ============

  pi.registerCommand("feishu-config", {
    description: "查看飞书配置状态",
    handler: async (_args, ctx) => {
      if (config) {
        const status = larkClient ? "已连接" : "未连接";
        ctx.ui.notify(
          `飞书配置:\n` +
          `  App ID: ${config.appId.slice(0, 8)}...\n` +
          `  状态: ${status}\n` +
          `  最近会话: ${lastChatId || "无"}\n` +
          `  配置来源: ${configSource}`,
          "info"
        );
      } else {
        ctx.ui.notify(
          `❌ 未找到飞书配置\n\n` +
          `配置文件位置（优先级从高到低）:\n` +
          `  1. 项目目录: .pi/feishu.json\n` +
          `  2. 全局目录: ~/.pi/agent/extensions/feishu/config.json\n\n` +
          `内容示例:\n{\n  "appId": "cli_xxx",\n  "appSecret": "xxx"\n}`,
          "warning"
        );
      }
    },
  });

  // ============ 启动长连接 ============

  pi.on("session_start", async (_event, ctx) => {
    // 加载配置
    const result = await loadConfig();
    config = result.config;
    configSource = result.source;
    
    if (!config) {
      ctx.ui.setStatus("feishu", "⚪ 飞书未配置");
      return;
    }

    ctx.ui.setStatus("feishu", "🟡 飞书连接中...");

    try {
      const sdk = await loadLarkSDK();
      
      // 创建 Lark 客户端
      larkClient = new sdk.Client({
        appId: config.appId,
        appSecret: config.appSecret,
        appType: sdk.AppType.SelfBuild,
      });

      // 创建 WebSocket 长连接客户端
      const wsClient = new sdk.WSClient({
        appId: config.appId,
        appSecret: config.appSecret,
        loggerLevel: sdk.LoggerLevel.error,
      });

      // 注册消息处理器
      wsClient.start({
        eventDispatcher: new sdk.EventDispatcher({}).register({
          "im.message.receive_v1": async (data: any) => {
            // SDK 回调 data 结构：data.message 直接在顶层，不是 data.event.message
            const message = data?.message;
            if (!message) {
              console.error("[feishu] 事件数据中缺少 message 字段");
              return;
            }

            // 只处理文本消息
            if (message.message_type !== "text") {
              return;
            }

            // 记录 chat_id
            lastChatId = message.chat_id;

            // 解析消息
            let text = "";
            try {
              const content = JSON.parse(message.content);
              text = content.text;
            } catch {
              return;
            }

            // 移除 @mention
            if (data.mentions) {
              for (const mention of data.mentions) {
                text = text.replace(mention.key, "").trim();
              }
            }

            if (!text.trim()) return;

            // 发送给 pi 处理
            pi.sendUserMessage(`[飞书消息] ${text}`);
          },
        }),
      });

      ctx.ui.setStatus("feishu", "🟢 飞书已连接");
      ctx.ui.notify("✅ 飞书长连接已建立", "info");

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      ctx.ui.setStatus("feishu", "🔴 飞书连接失败");
      ctx.ui.notify(`❌ 飞书连接失败: ${errorMsg}`, "error");
      console.error("[feishu] Connection error:", error);
    }
  });

  // ============ agent_end 自动回复 ============

  pi.on("agent_end", async (event, ctx) => {
    if (!larkClient || !lastChatId) return;

    // 检查最后一条用户消息是否来自飞书
    const userMessages = event.messages.filter((m: any) => m.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1];
    
    if (!lastUserMsg) return;
    
    const userContent = typeof lastUserMsg.content === "string" 
      ? lastUserMsg.content 
      : lastUserMsg.content.map((c: any) => c.type === "text" ? c.text : "").join("");
    
    // 只有来自飞书的消息才自动回复
    if (!userContent.startsWith("[飞书消息]")) return;

    // 获取 assistant 回复
    const assistantMessages = event.messages.filter((m: any) => m.role === "assistant");
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    
    if (!lastAssistant) return;

    const replyContent = typeof lastAssistant.content === "string"
      ? lastAssistant.content
      : lastAssistant.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("");

    // 截断过长内容
    const truncated = replyContent.length > 4000 
      ? replyContent.slice(0, 4000) + "\n\n... (内容过长，已截断)"
      : replyContent;

    // 回复到飞书
    try {
      await larkClient.im.message.create({
        data: {
          receive_id: lastChatId,
          content: JSON.stringify({
            config: { wide_screen_mode: true },
            header: {
              title: { tag: "plain_text", content: "Pi 回复" },
              template: "blue",
            },
            elements: [{ tag: "markdown", content: truncated }],
          }),
          msg_type: "interactive",
        },
        params: { receive_id_type: "chat_id" },
      });
      // 已回复飞书消息
    } catch (error) {
      console.error("[feishu] 回复失败:", error);
    }
  });
}
