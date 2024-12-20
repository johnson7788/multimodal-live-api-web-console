import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import SidePanel from './components/side-panel/SidePanel';
import { Altair } from './components/altair/Altair';
import ControlTray from './components/control-tray/ControlTray';
import { RTCView } from 'react-native-webrtc';

const API_KEY = 'test'; 
const uri = `wss://192.168.50.111:8080`;

function Main(): React.JSX.Element {
  const [videoStream, setVideoStream] = useState<any>(null);

  return (
    <NavigationContainer>
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <SafeAreaView style={styles.container}>
          <View style={styles.streamingConsole}>
            <View style={styles.mainContent}>
              <View style={styles.mainAppArea}>
                <Altair />
                {videoStream && (
                  <RTCView
                    style={[styles.stream, !videoStream && styles.hidden]}
                    streamURL={videoStream?.toURL()}
                  />
                )}
              </View>
              <ControlTray
                supportsVideo={true}
                onVideoStreamChange={setVideoStream}
              />
            </View>
            <SidePanel />
          </View>
        </SafeAreaView>
      </LiveAPIProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  testContent: {
    flex: 1,
    backgroundColor: '#000',
  },
  testText: {
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  streamingConsole: {
    flex: 1,
    flexDirection: 'column',
  },
  mainContent: {
    flex: 0.7,
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

export default Main; 