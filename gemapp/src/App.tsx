import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import SidePanel from './components/side-panel/SidePanel';
import { Altair } from './components/altair/Altair';
import ControlTray from './components/control-tray/ControlTray';
import { RTCView } from 'react-native-webrtc';

// 从环境变量获取 Gemini API 密钥
// 注意：React Native 需要使用不同的环境变量配置方式
const API_KEY = ''; // TODO: 使用 react-native-config 来管理环境变量

// 设置 Gemini API 的 WebSocket 连接地址
const host = 'generativelanguage.googleapis.com';
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  // 在 React Native 中管理视频流状态
  const [videoStream, setVideoStream] = useState<any>(null);

  return (
    <NavigationContainer>
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <SafeAreaView style={styles.container}>
          <View style={styles.streamingConsole}>
            <SidePanel />
            <View style={styles.mainContent}>
              <View style={styles.mainAppArea}>
                <Altair />
                {videoStream && (
                  <RTCView
                    style={[
                      styles.stream,
                      !videoStream && styles.hidden
                    ]}
                    streamURL={videoStream?.toURL()}
                  />
                )}
              </View>

              <ControlTray
                supportsVideo={true}
                onVideoStreamChange={setVideoStream}
              />
            </View>
          </View>
        </SafeAreaView>
      </LiveAPIProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  streamingConsole: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
  mainAppArea: {
    flex: 1,
    position: 'relative',
  },
  stream: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    display: 'none',
  },
});

export default App; 