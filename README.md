# Pi Extensions

Pi 扩展集合仓库，包含多个实用的 pi 扩展。

## 集成方式

### 全局安装（推荐）

```bash
git clone https://github.com/zhaoyaoyuan/pi-extensions.git
cp -r pi-extensions/feishu ~/.pi/agent/extensions/
cd ~/.pi/agent/extensions/feishu && npm install
```

### 项目级安装

```bash
mkdir -p .pi/extensions
cp -r pi-extensions/feishu .pi/extensions/
cd .pi/extensions/feishu && npm install
```

### settings.json 配置

```json
{
  "extensions": [
    "/path/to/pi-extensions/feishu"
  ]
}
```

### 临时加载（测试用）

```bash
pi -e ./feishu/index.ts
```

## 重新加载

修改扩展代码后，在 pi 中执行 `/reload` 热重载。

---

## 扩展列表

| 扩展 | 说明 | 文档 |
|------|------|------|
| [feishu](./feishu) | 飞书机器人扩展，支持长连接模式 | [README](./feishu/README.md) |

## 开发新扩展

参考 [Pi 扩展开发文档](https://github.com/earendil-works/pi-coding-agent/blob/main/docs/extensions.md)。

## License

MIT
