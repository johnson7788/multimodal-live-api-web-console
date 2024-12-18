import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const { log, logs } = useLoggerStore();
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("none");

  // 自动滚动到底部
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [logs]);

  // 监听日志事件
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  const handleSubmit = () => {
    if (textInput.trim()) {
      client.send([{ text: textInput }]);
      setTextInput("");
    }
  };

  return (
    <View style={[styles.sidePanel, open && styles.sidePanelOpen]}>
      <View style={styles.header}>
        {open && <Text style={styles.headerTitle}>控制台</Text>}
        <TouchableOpacity
          style={styles.openerButton}
          onPress={() => setOpen(!open)}
        >
        </TouchableOpacity>
      </View>

      <View style={styles.indicators}>
        {open && (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedOption}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedOption(itemValue)}
            >
              {filterOptions.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
        )}
        <View style={[
          styles.streamingIndicator, 
          connected && styles.connected,
          { minWidth: open ? 136 : 30 }
        ]}>
          <Text style={styles.streamingText}>
            {connected ? `🔵${open ? " Streaming" : ""}` : `⏸️${open ? " Paused" : ""}`}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.loggerContainer}
        contentContainerStyle={styles.loggerContent}
      >
        <Logger filter={selectedOption as LoggerFilterType} />
      </ScrollView>

      {open && (
        <View style={[styles.inputContainer, !connected && styles.disabled]}>
          <View style={styles.inputContent}>
            <TextInput
              style={styles.input}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Type something..."
              placeholderTextColor="#707577"
              multiline
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSubmit}
              disabled={!connected}
            >
              <Icon name="send" size={24} color={connected ? "#707577" : "#404547"} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidePanel: {
    backgroundColor: '#1A1D1E',
    width: 40,
    flex: 0.3,
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: '#404547',
  },
  sidePanelOpen: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3133',
    height: 50,
  },
  headerTitle: {
    color: '#E1E2E3',
    fontSize: 21,
    fontWeight: '500',
  },
  openerButton: {
    padding: 4,
  },
  indicators: {
    flexDirection: 'row',
    padding: 24,
    justifyContent: 'flex-end',
    gap: 21,
  },
  pickerContainer: {
    backgroundColor: '#1C1F21',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2D3133',
    overflow: 'hidden',
    width: 193,
    height: 30,
  },
  picker: {
    color: '#E1E2E3',
    height: 30,
    width: '100%',
  },
  streamingIndicator: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2D3133',
    backgroundColor: '#1C1F21',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
  },
  connected: {
    borderColor: '#0D9C53',
  },
  streamingText: {
    color: '#E1E2E3',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    fontSize: 14,
  },
  loggerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  loggerContent: {
    flexGrow: 1,
  },
  inputContainer: {
    height: 50,
    borderTopWidth: 1,
    borderTopColor: '#2D3133',
    padding: 14,
  },
  inputContent: {
    flexDirection: 'row',
    backgroundColor: '#1C1F21',
    borderWidth: 1,
    borderColor: '#2A2F31',
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: '#E1E2E3',
    padding: 0,
    fontSize: 13,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  disabled: {
    opacity: 0.5,
  },
}); 