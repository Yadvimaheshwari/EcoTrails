/**
 * Companion Chat Component
 * Interactive chat interface with Gemini AI companion
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import GeminiCompanionService, { CompanionMessage } from '../services/GeminiCompanionService';

interface CompanionChatProps {
  parkName: string;
  location?: { lat: number; lng: number };
  onClose: () => void;
}

const CompanionChat: React.FC<CompanionChatProps> = ({ parkName, location, onClose }) => {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Set context for companion
    GeminiCompanionService.setContext({
      parkName,
      location,
      timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening',
    });

    // Get initial park welcome message
    loadWelcomeMessage();
  }, [parkName, location]);

  const loadWelcomeMessage = async () => {
    setLoading(true);
    try {
      const welcome = await GeminiCompanionService.getParkInfo(parkName);
      const welcomeMessage: CompanionMessage = {
        id: 'welcome',
        type: 'conversation',
        content: welcome,
        timestamp: Date.now(),
        priority: 'low',
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error loading welcome:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: CompanionMessage = {
      id: `user-${Date.now()}`,
      type: 'conversation',
      content: inputText,
      timestamp: Date.now(),
      priority: 'medium',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await GeminiCompanionService.askQuestion(inputText);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMessage: CompanionMessage = {
        id: `error-${Date.now()}`,
        type: 'conversation',
        content: "I'm having trouble connecting. Please try again.",
        timestamp: Date.now(),
        priority: 'low',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: CompanionMessage }) => {
    const isUser = item.id.startsWith('user-');
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.companionMessage]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.companionText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Atlas Companion</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Atlas anything about nature, trails, wildlife..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          placeholderTextColor="#8E8B82"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>{loading ? '...' : '→'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2D4739',
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2D4739',
  },
  companionMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8DE',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  companionText: {
    color: '#2D4739',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8DE',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9F9F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    color: '#2D4739',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D4739',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default CompanionChat;
