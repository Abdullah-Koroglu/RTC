import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { C } from '@/constants/colors';
import { IcX, IcSend } from './Icons';

export interface ChatMessage {
  id: string;
  peerId: string;
  text: string;
  ts: number;
  isSelf: boolean;
}

interface ChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
}

const SCREEN_W = Dimensions.get('window').width;

export function ChatPanel({ open, messages, onClose, onSend }: ChatPanelProps) {
  const [text, setText] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_W)).current;
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: open ? 0 : SCREEN_W,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [open, slideAnim]);

  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [open, messages.length]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.msgWrapper, item.isSelf ? styles.msgSelf : styles.msgOther]}>
      {!item.isSelf && (
        <Text style={styles.senderName}>{item.peerId}</Text>
      )}
      <View style={[styles.bubble, item.isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
        <Text style={styles.bubbleText}>{item.text}</Text>
      </View>
      <Text style={styles.msgTime}>
        {new Date(item.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>In-call chat</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <IcX s={14} c="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No messages yet</Text>
          }
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity onPress={send} style={styles.sendBtn}>
            <IcSend s={16} c="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(11,13,20,0.97)',
    zIndex: 200,
  },
  inner: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  listContent: {
    padding: 14,
    gap: 14,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
    paddingTop: 40,
  },
  msgWrapper: {
    marginBottom: 14,
  },
  msgSelf: {
    alignItems: 'flex-end',
  },
  msgOther: {
    alignItems: 'flex-start',
  },
  senderName: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 11,
    marginBottom: 3,
    paddingLeft: 3,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleSelf: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 3,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderBottomLeftRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  bubbleText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 20,
  },
  msgTime: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 10,
    marginTop: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: 'white',
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
