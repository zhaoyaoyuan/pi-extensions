# Feishu Bot Extension

飞书应用机器人扩展，支持 WebSocket 长连接模式。

## 功能特性

- 🤖 自动接收飞书群消息并转发给 pi 处理
- 📤 支持通过 `feishu_notify` 工具发送通知卡片
- 💬 支持 `/feishu-send` 命令手动发送消息
- 🔧 支持 `/feishu-config` 命令查看配置状态
- 🔄 pi 处理完成后自动回复到飞书群

## 前置条件

1. 前往 [飞书开放平台](https://open.feishu.cn/) 创建应用
2. 启用「机器人」能力
3. 在「事件订阅」中选择「使用长连接」
4. 添加事件：`im.message.receive_v1`

## 配置

配置文件位置（优先级从高到低）：

1. 项目目录：`.pi/feishu.json`
2. 全局目录：`~/.pi/agent/extensions/feishu/config.json`

配置格式：

```json
{
  "appId": "cli_xxxxxxxxxxxxxxxx",
  "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## 使用方法

### 自动交互

在飞书群中 @机器人 发送消息，pi 会自动处理并回复。

### 命令

| 命令 | 说明 |
|------|------|
| `/feishu-config` | 查看飞书连接状态 |
| `/feishu-send <消息>` | 手动发送消息到飞书群 |

### 工具

| 工具 | 说明 |
|------|------|
| `feishu_notify` | 发送带格式的通知卡片到飞书群 |

## 安装

```bash
# 安装依赖
npm install
```

## 测试连接

```bash
node test-connection.js
```
