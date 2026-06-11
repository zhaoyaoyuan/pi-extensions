const { Client, WSClient, AppType, LoggerLevel, EventDispatcher } = require('@larksuiteoapi/node-sdk');
const { readFile } = require('fs/promises');
const { join } = require('path');

async function testConnection() {
  console.log('🔍 测试飞书WebSocket连接...\n');

  // 读取配置
  let config;
  try {
    const content = await readFile(join(process.cwd(), '.pi', 'feishu.json'), 'utf-8');
    config = JSON.parse(content);
    console.log('✅ 配置文件读取成功');
    console.log('   App ID:', config.appId);
  } catch (error) {
    console.log('❌ 配置文件读取失败:', error.message);
    return;
  }

  // 创建客户端
  const client = new Client({
    appId: config.appId,
    appSecret: config.appSecret,
    appType: AppType.SelfBuild,
  });

  // 创建WebSocket客户端
  const wsClient = new WSClient({
    appId: config.appId,
    appSecret: config.appSecret,
    loggerLevel: LoggerLevel.debug, // 使用debug级别获取更多信息
  });

  console.log('\n📡 尝试建立WebSocket连接...');

  // 注册事件处理器
  const dispatcher = new EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      console.log('\n🎉 收到消息事件！');
      console.log('事件数据:', JSON.stringify(data, null, 2));
      
      try {
        // SDK 回调 data 结构：data.message 直接在顶层
        const message = data.message;
        console.log('消息内容:', message.content);
      } catch (error) {
        console.log('❌ 解析消息失败:', error.message);
        console.log('原始数据:', data);
      }
    },
  });

  // 启动WebSocket连接
  try {
    await wsClient.start({
      eventDispatcher: dispatcher,
    });
    
    console.log('✅ WebSocket连接已建立');
    console.log('\n📋 测试说明:');
    console.log('1. 在飞书群中 @机器人 发送一条消息');
    console.log('2. 观察此终端的输出');
    console.log('3. 按 Ctrl+C 退出测试');
    console.log('\n等待消息中...');
    
  } catch (error) {
    console.log('❌ WebSocket连接失败:', error.message);
    console.log('\n可能的原因:');
    console.log('1. App ID 或 App Secret 错误');
    console.log('2. 应用未启用机器人能力');
    console.log('3. 事件订阅未配置');
    console.log('4. 网络连接问题');
  }
}

testConnection().catch(console.error);