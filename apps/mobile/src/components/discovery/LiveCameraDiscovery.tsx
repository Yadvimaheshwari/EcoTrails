/**
 * LiveCameraDiscovery Component (Mobile)
 * 
 * Pokemon Go-style real-time camera discovery with Gemini Vision AI.
 * 
 * Features:
 * - Live camera feed with AR-style overlay
 * - Real-time species/object identification using Gemini Vision
 * - XP rewards and badge awarding
 * - Haptic feedback on discoveries
 * - Beautiful animations for captures
 * 
 * Mobile Developers (Android/iOS):
 * - Uses expo-camera for camera access
 * - Uses expo-haptics for tactile feedback
 * - Animations via react-native-reanimated
 * - All Gemini API calls go through our backend (API key handled server-side)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { 
  visionService, 
  IdentificationResult, 
  RARITY_CONFIG, 
  CATEGORY_ICONS 
} from '../../services/visionService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiveCameraDiscoveryProps {
  visible: boolean;
  onClose: () => void;
  hikeId: string;
  currentLocation?: { lat: number; lng: number };
  onDiscoveryMade: (discovery: IdentificationResult, xpEarned: number) => void;
}

export const LiveCameraDiscovery: React.FC<LiveCameraDiscoveryProps> = ({
  visible,
  onClose,
  hikeId,
  currentLocation,
  onDiscoveryMade,
}) => {
  const cameraRef = useRef<Camera>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Animations
  const scanPulse = useSharedValue(1);
  const successScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    } else {
      // Reset state when modal closes
      setResult(null);
      setCapturedImage(null);
      setShowSuccess(false);
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isAnalyzing) return;

    // Haptic feedback on capture
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Pulse animation
    scanPulse.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    try {
      setIsAnalyzing(true);
      
      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      
      if (!photo.base64) {
        throw new Error('Failed to capture image');
      }
      
      setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);

      // Send to Gemini Vision API
      const response = await visionService.identifyImage(
        photo.base64,
        hikeId,
        currentLocation
      );

      if (response.success && response.identification) {
        setResult(response.identification);
        // Haptic for successful identification
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.warn('[LiveCamera] Capture failed:', error);
      // Show fallback result
      const fallback = await visionService.identifyImage('', hikeId, currentLocation);
      if (fallback.identification) {
        setResult(fallback.identification);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogDiscovery = useCallback(() => {
    if (!result) return;

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Show success animation
    setShowSuccess(true);
    successScale.value = withSpring(1, { damping: 10, stiffness: 100 });

    // Notify parent after animation
    setTimeout(() => {
      onDiscoveryMade(result, result.xp);
      setShowSuccess(false);
      setResult(null);
      setCapturedImage(null);
      successScale.value = 0;
    }, 2000);
  }, [result, onDiscoveryMade, successScale]);

  const handleRetry = () => {
    setResult(null);
    setCapturedImage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const scanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
  }));

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  if (!visible) return null;

  const rarityConfig = result ? RARITY_CONFIG[result.rarity] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Camera or Captured Image */}
        <View style={styles.cameraContainer}>
          {hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionIcon}>📷</Text>
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionText}>
                Please allow camera access to discover wildlife and nature on the trail.
              </Text>
              <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : capturedImage ? (
            <Animated.Image
              source={{ uri: capturedImage }}
              style={styles.capturedImage}
              resizeMode="cover"
              entering={FadeIn.duration(200)}
            />
          ) : (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={CameraType.back}
              ratio="16:9"
            />
          )}
        </View>

        {/* Viewfinder Overlay */}
        {hasPermission && !capturedImage && !isAnalyzing && (
          <View style={styles.viewfinderOverlay} pointerEvents="none">
            <View style={styles.viewfinderFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hintText}>Point at wildlife, plants, rocks, or landmarks</Text>
            <Text style={styles.subHintText}>Tap the scan button to identify</Text>
          </View>
        )}

        {/* Analyzing Overlay */}
        {isAnalyzing && (
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingContent}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.analyzingText}>Analyzing...</Text>
              <Text style={styles.analyzingSubText}>AI is identifying what you found</Text>
            </View>
          </View>
        )}

        {/* Result Card */}
        {result && !showSuccess && (
          <Animated.View 
            style={styles.resultContainer}
            entering={SlideInDown.springify().damping(15)}
          >
            <View style={[styles.resultCard, { borderColor: rarityConfig?.color }]}>
              {/* Rarity Badge */}
              <View style={styles.resultHeader}>
                <View style={[styles.rarityBadge, { backgroundColor: rarityConfig?.color }]}>
                  <Text style={styles.rarityText}>{rarityConfig?.label}</Text>
                </View>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpIcon}>⚡</Text>
                  <Text style={styles.xpText}>+{result.xp} XP</Text>
                </View>
              </View>

              {/* Species Info */}
              <View style={styles.speciesInfo}>
                <Text style={styles.categoryIcon}>{CATEGORY_ICONS[result.category]}</Text>
                <View style={styles.speciesDetails}>
                  <Text style={styles.speciesName}>{result.name}</Text>
                  {result.scientificName && (
                    <Text style={styles.scientificName}>{result.scientificName}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.description}>{result.description}</Text>

              {/* Confidence Bar */}
              <View style={styles.confidenceContainer}>
                <View style={styles.confidenceHeader}>
                  <Text style={styles.confidenceLabel}>Confidence</Text>
                  <Text style={styles.confidenceValue}>{Math.round(result.confidence)}%</Text>
                </View>
                <View style={styles.confidenceBarBg}>
                  <View 
                    style={[
                      styles.confidenceBar, 
                      { width: `${result.confidence}%`, backgroundColor: rarityConfig?.color }
                    ]} 
                  />
                </View>
              </View>

              {/* Fun Fact */}
              {result.funFacts && result.funFacts.length > 0 && (
                <View style={styles.funFactContainer}>
                  <Text style={styles.funFactLabel}>⭐ Fun Fact</Text>
                  <Text style={styles.funFactText}>{result.funFacts[0]}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Text style={styles.retryButtonText}>Retry Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.logButton, { backgroundColor: rarityConfig?.color }]} 
                  onPress={handleLogDiscovery}
                >
                  <Text style={styles.logButtonText}>✓ Log Discovery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Success Animation */}
        {showSuccess && result && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.successContent, successAnimatedStyle]}>
              <View style={[styles.successIcon, { backgroundColor: rarityConfig?.color }]}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Discovery Logged!</Text>
              <Text style={styles.successName}>{result.name}</Text>
              <View style={styles.successXp}>
                <Text style={styles.successXpIcon}>⚡</Text>
                <Text style={styles.successXpText}>+{result.xp} XP</Text>
              </View>
            </Animated.View>
          </View>
        )}

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.modeIndicator}>
            <Text style={styles.modeIcon}>🎯</Text>
            <Text style={styles.modeText}>Discovery Mode</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Capture Button */}
        {hasPermission && !capturedImage && !isAnalyzing && (
          <View style={styles.captureButtonContainer}>
            <Animated.View style={scanButtonStyle}>
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={handleCapture}
                activeOpacity={0.8}
              >
                <View style={styles.captureButtonInner}>
                  <Text style={styles.captureIcon}>📷</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  capturedImage: {
    flex: 1,
    width: '100%',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1F2937',
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 24,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10B981',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  hintText: {
    marginTop: SCREEN_WIDTH * 0.7 + 32,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  subHintText: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingContent: {
    alignItems: 'center',
  },
  analyzingText: {
    marginTop: 16,
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  analyzingSubText: {
    marginTop: 4,
    color: '#9CA3AF',
    fontSize: 14,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  resultCard: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  xpText: {
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 18,
  },
  speciesInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  speciesDetails: {
    flex: 1,
  },
  speciesName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scientificName: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  description: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  confidenceLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  confidenceValue: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  confidenceBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 4,
  },
  funFactContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  funFactLabel: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  funFactText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  logButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCheck: {
    fontSize: 48,
    color: '#FFF',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  successName: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 16,
  },
  successXp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successXpIcon: {
    fontSize: 24,
  },
  successXpText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 8,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  modeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureIcon: {
    fontSize: 28,
  },
});

export default LiveCameraDiscovery;
