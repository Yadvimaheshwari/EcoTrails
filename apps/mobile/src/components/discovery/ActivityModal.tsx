/**
 * Activity Modal Component (Mobile)
 * Handles different types of checkpoint activities for React Native
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CheckpointActivity } from './CheckpointCard';

interface ActivityModalProps {
  activity: CheckpointActivity;
  isCompleting: boolean;
  onComplete: (proof: any) => Promise<void>;
  onClose: () => void;
}

export function ActivityModal({ activity, isCompleting, onComplete, onClose }: ActivityModalProps) {
  const [proof, setProof] = useState<any>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [observationCount, setObservationCount] = useState(0);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const startTimer = () => {
    setTimerStarted(true);
    setTimerElapsed(0);
    
    timerRef.current = setInterval(() => {
      setTimerElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSubmit = async () => {
    stopTimer();
    
    let proofData: any = {};

    switch (activity.type) {
      case 'photo_challenge':
        if (!photoUri) {
          Alert.alert('Photo Required', 'Please take a photo first');
          return;
        }
        proofData = { photo_uri: photoUri, type: 'photo' };
        break;

      case 'trivia':
        if (!selectedAnswer) {
          Alert.alert('Answer Required', 'Please select an answer');
          return;
        }
        const criteria = activity.completion_criteria;
        const isCorrect = selectedAnswer === criteria.correct;
        proofData = { 
          answer: selectedAnswer, 
          correct: isCorrect,
          type: 'trivia'
        };
        if (!isCorrect) {
          Alert.alert('Incorrect', 'That\'s not quite right. Try again!');
          setSelectedAnswer('');
          return;
        }
        break;

      case 'observation':
        proofData = { 
          count: observationCount,
          type: 'observation'
        };
        break;

      case 'audio_listen':
      case 'mindfulness':
        const requiredSeconds = activity.completion_criteria?.duration_seconds || 0;
        if (timerElapsed < requiredSeconds) {
          Alert.alert(
            'Time Remaining',
            `Please complete the full ${Math.floor(requiredSeconds / 60)} minute activity`
          );
          return;
        }
        proofData = { 
          duration: timerElapsed,
          completed: true,
          type: activity.type
        };
        break;

      case 'scavenger_hunt':
        if (!photoUri) {
          Alert.alert('Photo Required', 'Please photograph your findings');
          return;
        }
        proofData = { 
          photo_uri: photoUri,
          count: observationCount,
          type: 'scavenger_hunt'
        };
        break;

      case 'exploration':
        proofData = { 
          completed: true,
          notes: notes,
          type: 'exploration'
        };
        break;

      default:
        proofData = { completed: true, type: 'generic' };
    }

    await onComplete(proofData);
  };

  const renderActivityContent = () => {
    switch (activity.type) {
      case 'photo_challenge':
        return (
          <View style={styles.contentSection}>
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel}>📸 Photo Challenge</Text>
              <Text style={styles.promptText}>{activity.prompt}</Text>
            </View>
            
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemoveButton}
                  onPress={() => setPhotoUri('')}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoButtonText}>Tap to capture photo</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'trivia':
        const criteria = activity.completion_criteria;
        return (
          <View style={styles.contentSection}>
            <View style={[styles.promptBox, styles.promptBoxPurple]}>
              <Text style={[styles.promptLabel, styles.promptLabelPurple]}>🧠 Trivia Challenge</Text>
              <Text style={[styles.promptText, styles.promptTextPurple]}>{criteria.question}</Text>
            </View>
            
            <View style={styles.optionsContainer}>
              {criteria.options.map((option: string) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setSelectedAnswer(option)}
                  style={[
                    styles.optionButton,
                    selectedAnswer === option && styles.optionButtonSelected,
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    selectedAnswer === option && styles.optionTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'observation':
        const minCount = activity.completion_criteria?.minimum || 1;
        return (
          <View style={styles.contentSection}>
            <View style={[styles.promptBox, styles.promptBoxGreen]}>
              <Text style={[styles.promptLabel, styles.promptLabelGreen]}>👁️ Observation</Text>
              <Text style={[styles.promptText, styles.promptTextGreen]}>{activity.prompt}</Text>
            </View>
            
            <View style={styles.counterSection}>
              <Text style={styles.counterLabel}>Minimum required: {minCount}</Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => setObservationCount(Math.max(0, observationCount - 1))}
                >
                  <Text style={styles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{observationCount}</Text>
                <TouchableOpacity
                  style={[styles.counterButton, styles.counterButtonAdd]}
                  onPress={() => setObservationCount(observationCount + 1)}
                >
                  <Text style={[styles.counterButtonText, styles.counterButtonTextAdd]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'audio_listen':
      case 'mindfulness':
        const requiredSeconds = activity.completion_criteria?.duration_seconds || 300;
        const requiredMinutes = Math.floor(requiredSeconds / 60);
        const isTimerComplete = timerElapsed >= requiredSeconds;
        
        return (
          <View style={styles.contentSection}>
            <View style={[styles.promptBox, styles.promptBoxIndigo]}>
              <Text style={[styles.promptLabel, styles.promptLabelIndigo]}>
                {activity.type === 'audio_listen' ? '👂 Listening' : '🧘 Mindfulness'}
              </Text>
              <Text style={[styles.promptText, styles.promptTextIndigo]}>{activity.prompt}</Text>
            </View>
            
            <View style={styles.timerSection}>
              <Text style={[
                styles.timerDisplay,
                isTimerComplete && styles.timerDisplayComplete
              ]}>
                {Math.floor(timerElapsed / 60)}:{(timerElapsed % 60).toString().padStart(2, '0')}
              </Text>
              <Text style={styles.timerLabel}>
                {isTimerComplete 
                  ? '✓ Time complete!' 
                  : `Minimum ${requiredMinutes} minute${requiredMinutes > 1 ? 's' : ''}`
                }
              </Text>
              
              {!timerStarted ? (
                <TouchableOpacity style={styles.timerButton} onPress={startTimer}>
                  <Text style={styles.timerButtonText}>Start Timer</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.timerButton, styles.timerButtonStop]} onPress={stopTimer}>
                  <Text style={styles.timerButtonText}>Stop Timer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 'scavenger_hunt':
        return (
          <View style={styles.contentSection}>
            <View style={[styles.promptBox, styles.promptBoxAmber]}>
              <Text style={[styles.promptLabel, styles.promptLabelAmber]}>🔍 Scavenger Hunt</Text>
              <Text style={[styles.promptText, styles.promptTextAmber]}>{activity.prompt}</Text>
              <Text style={styles.promptSubtext}>
                Find {activity.completion_criteria?.target_count || 3} different items
              </Text>
            </View>
            
            <View style={styles.scavengerCounter}>
              <Text style={styles.scavengerLabel}>Items found:</Text>
              <View style={styles.scavengerButtons}>
                <TouchableOpacity
                  style={styles.scavengerButton}
                  onPress={() => setObservationCount(Math.max(0, observationCount - 1))}
                >
                  <Text style={styles.scavengerButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.scavengerValue}>{observationCount}</Text>
                <TouchableOpacity
                  style={[styles.scavengerButton, styles.scavengerButtonAdd]}
                  onPress={() => setObservationCount(observationCount + 1)}
                >
                  <Text style={[styles.scavengerButtonText, styles.scavengerButtonTextAdd]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemoveButton}
                  onPress={() => setPhotoUri('')}
                >
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoButtonText}>Take photo of findings</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'exploration':
        return (
          <View style={styles.contentSection}>
            <View style={[styles.promptBox, styles.promptBoxTeal]}>
              <Text style={[styles.promptLabel, styles.promptLabelTeal]}>🗺️ Exploration</Text>
              <Text style={[styles.promptText, styles.promptTextTeal]}>{activity.prompt}</Text>
            </View>
            
            <TextInput
              style={styles.notesInput}
              placeholder="Share what you discovered..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>
        );

      default:
        return (
          <View style={styles.contentSection}>
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>{activity.prompt}</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{activity.title}</Text>
            <Text style={styles.description}>{activity.description}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollContent}>
          {renderActivityContent()}

          {activity.educational_note && (
            <View style={styles.educationalBox}>
              <Text style={styles.educationalText}>
                <Text style={styles.educationalLabel}>💡 Did you know?</Text> {activity.educational_note}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.xpText}>+{activity.xp} XP</Text>
            {activity.estimated_minutes && (
              <Text style={styles.timeText}>⏱️ {activity.estimated_minutes} min</Text>
            )}
          </View>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isCompleting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isCompleting}
            >
              <Text style={styles.submitButtonText}>
                {isCompleting ? 'Completing...' : 'Complete Activity'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E463B',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 32,
    color: '#94A3B8',
  },
  scrollContent: {
    flex: 1,
  },
  contentSection: {
    padding: 20,
  },
  promptBox: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  promptBoxPurple: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  promptBoxGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  promptBoxIndigo: {
    backgroundColor: '#E0E7FF',
    borderColor: '#A5B4FC',
  },
  promptBoxAmber: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  promptBoxTeal: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  promptLabelPurple: {
    color: '#6B21A8',
  },
  promptLabelGreen: {
    color: '#065F46',
  },
  promptLabelIndigo: {
    color: '#3730A3',
  },
  promptLabelAmber: {
    color: '#92400E',
  },
  promptLabelTeal: {
    color: '#115E59',
  },
  promptText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  promptTextPurple: {
    color: '#6B21A8',
  },
  promptTextGreen: {
    color: '#065F46',
  },
  promptTextIndigo: {
    color: '#3730A3',
  },
  promptTextAmber: {
    color: '#92400E',
  },
  promptTextTeal: {
    color: '#115E59',
  },
  promptSubtext: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
  },
  photoButton: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  photoPreview: {
    position: 'relative',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#4A7857',
    backgroundColor: '#D4E9D7',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  optionTextSelected: {
    color: '#1E463B',
  },
  counterSection: {
    alignItems: 'center',
    gap: 16,
  },
  counterLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonAdd: {
    backgroundColor: '#4A7857',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  counterButtonTextAdd: {
    color: '#fff',
  },
  counterValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4A7857',
    minWidth: 80,
    textAlign: 'center',
  },
  timerSection: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#475569',
  },
  timerDisplayComplete: {
    color: '#10B981',
  },
  timerLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  timerButton: {
    backgroundColor: '#4A7857',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  timerButtonStop: {
    backgroundColor: '#EF4444',
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scavengerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scavengerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  scavengerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scavengerButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scavengerButtonAdd: {
    backgroundColor: '#4A7857',
  },
  scavengerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scavengerButtonTextAdd: {
    color: '#fff',
  },
  scavengerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A7857',
    minWidth: 40,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 120,
  },
  educationalBox: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
  },
  educationalText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  educationalLabel: {
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 20,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  xpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
  },
  timeText: {
    fontSize: 14,
    color: '#64748B',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#4A7857',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
