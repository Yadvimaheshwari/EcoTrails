/**
 * CaptureModal Component (Mobile)
 * Modal for capturing a discovery with photo and notes
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../config/colors';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Discovery, DISCOVERY_ICONS, DISCOVERY_COLORS } from '../../types/discovery';
import { Badge } from '../../types/badge';

interface CaptureModalProps {
  visible: boolean;
  discovery: Discovery;
  onClose: () => void;
  onCapture: (photoUri: string | null, notes: string) => Promise<{ badge: Badge | null }>;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  visible,
  discovery,
  onClose,
  onCapture,
}) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [awardedBadge, setAwardedBadge] = useState<Badge | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset state
      setPhotoUri(null);
      setNotes('');
      setIsCapturing(false);
      setCaptureSuccess(false);
      setAwardedBadge(null);

      // Animate in
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to capture discoveries.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    Keyboard.dismiss();

    try {
      const result = await onCapture(photoUri, notes);
      setCaptureSuccess(true);
      if (result.badge) {
        setAwardedBadge(result.badge);
      }

      // Close after showing success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      Alert.alert('Capture Failed', 'Could not save your discovery. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const markerColor = DISCOVERY_COLORS[discovery.type] || colors.primary;
  const icon = DISCOVERY_ICONS[discovery.type] || '📍';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <Animated.View
          style={[
            styles.modal,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: markerColor }]}>
                <Text style={styles.iconText}>{icon}</Text>
              </View>
              <View style={styles.headerContent}>
                <Text variant="caption" color="secondary">
                  Capture Discovery
                </Text>
                <Text variant="h3" numberOfLines={1}>
                  {discovery.title}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Success State */}
            {captureSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Text style={styles.successEmoji}>🎉</Text>
                </View>
                <Text variant="h2" style={styles.successTitle}>
                  Discovery Captured!
                </Text>
                {awardedBadge && (
                  <View style={styles.badgeAward}>
                    <Text style={styles.badgeIcon}>{awardedBadge.icon}</Text>
                    <Text variant="body" style={styles.badgeName}>
                      {awardedBadge.name} Badge Earned!
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* Photo Section */}
                <View style={styles.photoSection}>
                  {photoUri ? (
                    <View style={styles.photoPreview}>
                      <Image source={{ uri: photoUri }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => setPhotoUri(null)}
                      >
                        <Ionicons name="close-circle" size={28} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoButtons}>
                      <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                        <Ionicons name="camera" size={32} color={colors.primary} />
                        <Text variant="caption" color="secondary">
                          Take Photo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
                        <Ionicons name="images" size={32} color={colors.primary} />
                        <Text variant="caption" color="secondary">
                          Choose Photo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Notes Section */}
                <View style={styles.notesSection}>
                  <Text variant="label" style={styles.notesLabel}>
                    Add Notes (optional)
                  </Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="What did you observe? Any interesting details?"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                    value={notes}
                    onChangeText={setNotes}
                    maxLength={500}
                  />
                </View>

                {/* Capture Button */}
                <View style={styles.actions}>
                  <Button
                    title={isCapturing ? 'Saving...' : '✨ Capture Discovery'}
                    onPress={handleCapture}
                    disabled={isCapturing}
                    size="lg"
                    style={styles.captureButton}
                  />
                  {isCapturing && (
                    <ActivityIndicator
                      color={colors.primary}
                      size="small"
                      style={styles.loader}
                    />
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  photoSection: {
    padding: 20,
    paddingBottom: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  notesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  notesLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: {
    padding: 20,
    paddingTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  captureButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loader: {
    marginLeft: 12,
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 40,
  },
  successTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  badgeAward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeName: {
    fontWeight: '600',
    color: '#92400E',
  },
});
