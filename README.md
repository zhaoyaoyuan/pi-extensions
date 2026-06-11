# Pi Extensions

Pi 扩展集合仓库，包含多个实用的 pi 扩展。

## 集成方式

### 方式一：全局安装（推荐）

将扩展目录复制到 `~/.pi/agent/extensions/` 下：

```bash
# 复制单个扩展
cp -r ./feishu ~/.pi/agent/extensions/

# 或复制整个仓库的所有扩展
cp -r ./* ~/.pi/agent/extensions/
```

### 方式二：项目级安装

将扩展目录复制到项目的 `.pi/extensions/` 下：

```bash
mkdir -p .pi/extensions
cp -r ./feishu .pi/extensions/
```

### 方式三：通过 settings.json 配置

在 `~/.pi/agent/settings.json` 中添加扩展路径：

```json
{
  "extensions": [
    "/path/to/pi-extensions/feishu"
  ]
}
```

### 方式四：临时加载（仅测试用）

使用 `pi -e` 参数指定扩展路径：

```bash
pi -e ./feishu/index.ts
```

## 安装依赖

部分扩展需要额外的 npm 依赖。安装扩展后，需要进入扩展目录执行 `npm install`：

```bash
cd ~/.pi/agent/extensions/feishu
npm install
```

## 重新加载扩展

修改扩展代码后，可以在 pi 中执行 `/reload` 命令热重载扩展。

---

## 扩展列表

### 1. feishu（飞书机器人）

**功能描述：** 飞书应用机器人扩展，支持长连接模式，可以接收飞书群消息并自动回复。

**主要特性：**
- 🤖 自动接收飞书群消息并转发给 pi 处理
- 📤 支持通过 `feishu_notify` 工具发送通知到飞书群
- 💬 支持 `/feishu-send` 命令手动发送消息
- 🔧 支持 `/feishu-config` 命令查看配置状态
- 🔄 自动回复：pi 处理完成后自动将结果回复到飞书群

**配置说明：**

1. **创建飞书应用：**
   - 前往 [飞书开放平台](https://open.feishu.cn/) 创建应用
   - 启用「机器人」能力
   - 在「事件订阅」中选择「使用长连接」
   - 添加事件：`im.message.receive_v1`

2. **配置文件位置（优先级从高到低）：**
   - 项目目录：`.pi/feishu.json`
   - 全局目录：`~/.pi/agent/extensions/feishu/config.json`

3. **配置文件格式：**
   ```json
   {
     "appId": "cli_xxxxxxxxxxxxxxxx",
     "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   }
   ```

4. **使用方式：**
   - 在飞书群中 @机器人 发送消息，pi 会自动处理并回复
   - 使用 `/feishu-config` 查看连接状态
   - 使用 `/feishu-send <消息>` 手动发送消息到飞书群
   - 使用 `feishu_notify` 工具发送带格式的通知卡片

**依赖：**
- `@larksuiteoapi/node-sdk`（需在扩展目录执行 `npm install`）

---

## 开发新扩展

如需开发新的 pi 扩展，请参考 [Pi 扩展开发文档](https://github.com/earendil-works/pi-coding-agent/blob/main/docs/extensions.md)。

基本结构：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // 注册工具
  pi.registerTool({
    name: "my_tool",
    label: "My Tool",
    description: "工具描述",
    parameters: Type.Object({
      param1: Type.String({ description: "参数说明" }),
    }),
    async execute(toolCallId, params) {
      return {
        content: [{ type: "text", text: "结果" }],
        details: {},
      };
    },
  });

  // 注册命令
  pi.registerCommand("my-command", {
    description: "命令描述",
    handler: async (args, ctx) => {
      ctx.ui.notify("命令执行成功", "info");
    },
  });

  // 监听事件
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("扩展已加载", "info");
  });
}
```

## License

MIT
