import React, { memo, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import { AudioPulse } from "../audio-pulse/AudioPulse";

interface ControlTrayProps {
  supportsVideo?: boolean;
  onVideoStreamChange?: (stream: any) => void;
  children?: React.ReactNode;
}

interface MediaStreamButtonProps {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
  disabled?: boolean;
}

const MediaStreamButton = memo(({ 
  isStreaming, 
  onIcon, 
  offIcon, 
  start, 
  stop,
  disabled 
}: MediaStreamButtonProps) => (
  <TouchableOpacity
    style={[styles.actionButton, disabled && styles.disabledButton]}
    onPress={isStreaming ? stop : start}
    disabled={disabled}
  >
    <Icon
      name={isStreaming ? onIcon : offIcon}
      size={24}
      color={disabled ? styles.disabledButton.color : styles.actionButton.color}
    />
  </TouchableOpacity>
));

const ControlTray: React.FC<ControlTrayProps> = ({
  children,
  onVideoStreamChange = () => {},
  supportsVideo = false,
}) => {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] = useState<any>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };

    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <View style={styles.container}>
      <View style={[styles.actionsNav, !connected && styles.disabled]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.micButton]}
          onPress={() => setMuted(!muted)}
        >
          <Icon
            name={muted ? 'mic-off' : 'mic'}
            size={24}
            color={styles.micButton.color}
          />
        </TouchableOpacity>

        <View style={[styles.actionButton, styles.outlined]}>
          <AudioPulse volume={volume} active={connected} />
        </View>

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={changeStreams(screenCapture)}
              stop={changeStreams()}
              onIcon="stop"
              offIcon="screen-share"
              disabled={!connected}
            />
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon="videocam-off"
              offIcon="videocam"
              disabled={!connected}
            />
          </>
        )}
        {children}
      </View>

      <View style={styles.connectionContainer}>
        <View style={styles.connectionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              connected && styles.connectedButton
            ]}
            onPress={connected ? disconnect : connect}
          >
            <Icon
              name={connected ? 'stop_circle' : 'play_circle_filled'}
              size={24}
              color={connected ? '#2962FF' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
  },
  actionsNav: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#404547',
    borderRadius: 27,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 10,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#2D3133',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#8D9295',
  },
  micButton: {
    backgroundColor: '#D93025',
    color: '#000000',
  },
  outlined: {
    backgroundColor: '#FBFBFB',
    borderWidth: 1,
    borderColor: '#2D3133',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#404547',
    color: '#404547',
  },
  connectedButton: {
    backgroundColor: '#1565C0',
  },
  connectionContainer: {
    alignItems: 'center',
    gap: 4,
  },
  connectionButtonContainer: {
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#404547',
    backgroundColor: '#FBFBFB',
    padding: 10,
  },
});

export default memo(ControlTray); 