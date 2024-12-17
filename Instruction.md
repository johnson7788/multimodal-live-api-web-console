需要把当前的react项目，改成react native项目。
react项目的代码: src目录
react native项目的代码: gemapp，已经使用npx @react-native-community/cli@latest init gemapp进行了初始化

# 步骤，计划

1. 代码结构分析和准备
分析现有React项目的src目录结构
确认哪些组件需要重写，哪些可以复用
在gemapp项目中创建对应的目录结构

2. 组件转换
将React的div, span等HTML标签替换为React Native对应的组件（View, Text等）
调整样式代码，将CSS转换为React Native的StyleSheet
处理flex布局，因为React Native默认使用flexbox
替换所有的onClick为onPress等事件处理器

3. 路由处理
将React Router替换为React Navigation
设置新的导航结构
实现页面跳转逻辑

4. 状态管理迁移
如果使用Redux/MobX等状态管理，确保兼容性
调整异步操作和API调用

5. 平台特定功能适配
处理移动端特有功能（如触摸手势、相机等）
添加权限处理
适配不同屏幕尺寸

6. 资源文件处理
迁移图片等静态资源
调整图片分辨率和格式
处理字体文件

7. 测试和调试
在iOS和Android模拟器上测试
修复平台特定的问题
性能优化

8. 打包和发布准备
配置应用图标和启动屏
设置版本号和包名
准备发布相关配置

9. 建议
建议逐步迁移，先转换核心功能
保持原有React项目可运行，便于对比
多参考React Native官方文档
注意iOS和Android平台的差异性

