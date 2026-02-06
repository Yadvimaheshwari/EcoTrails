import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { useHikeStore } from '../store/useHikeStore';
import { dbService } from '../services/offlineQueue';

export const CaptureMomentScreen: React.FC = ({ navigation }: any) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video' | 'audio'>('photo');
  const [recording, setRecording] = useState(false);
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { currentHike } = useHikeStore();

  React.useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
    })();
  }, []);

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        const location = await Location.getCurrentPositionAsync();
        await dbService.addMediaToQueue(
          currentHike.id!,
          photo.uri,
          'photo',
          {
            timestamp: new Date().toISOString(),
            location: {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            },
            width: photo.width,
            height: photo.height,
          }
        );

        Alert.alert('Photo captured', 'Added to your hike');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handleStartVideo = async () => {
    if (!cameraRef.current) return;

    try {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: '720p',
      });

      if (video?.uri) {
        const location = await Location.getCurrentPositionAsync();
        await dbService.addMediaToQueue(
          currentHike.id!,
          video.uri,
          'video',
          {
            timestamp: new Date().toISOString(),
            location: {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            },
          }
        );

        Alert.alert('Video captured', 'Added to your hike');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to record video:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setRecording(false);
    }
  };

  const handleStopVideo = () => {
    cameraRef.current?.stopRecording();
    setRecording(false);
  };

  const handleRecordAudio = async () => {
    try {
      if (!audioPermission) {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Audio recording permission is required');
          return;
        }
        setAudioPermission(true);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        5000 // 5 seconds max
      );

      setAudioRecording(newRecording);

      setTimeout(async () => {
        await newRecording.stopAndUnloadAsync();
        const uri = newRecording.getURI();

        if (uri) {
          const location = await Location.getCurrentPositionAsync();
          await dbService.addMediaToQueue(
            currentHike.id!,
            uri,
            'audio',
            {
              timestamp: new Date().toISOString(),
              location: {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              },
              duration: 5000,
            }
          );

          Alert.alert('Audio recorded', 'Added to your hike');
          navigation.goBack();
        }

        setAudioRecording(null);
      }, 5000);
    } catch (error) {
      console.error('Failed to record audio:', error);
      Alert.alert('Error', 'Failed to record audio');
      setAudioRecording(null);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="h3" style={styles.marginBottom}>
            Camera permission required
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.modeSelector}>
          <TouchableOpacity
            onPress={() => setMode('photo')}
            style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
          >
            <Text variant="body" style={mode === 'photo' && { color: colors.surface }}>
              Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('video')}
            style={[styles.modeButton, mode === 'video' && styles.modeButtonActive]}
          >
            <Text variant="body" style={mode === 'video' && { color: colors.surface }}>
              Video
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('audio')}
            style={[styles.modeButton, mode === 'audio' && styles.modeButtonActive]}
          >
            <Text variant="body" style={mode === 'audio' && { color: colors.surface }}>
              Audio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'audio' ? (
        <View style={styles.audioContainer}>
          <View style={styles.center}>
            <Ionicons name="mic" size={64} color={colors.primary} />
            <Text variant="h3" style={styles.marginTop}>
              {audioRecording ? 'Recording...' : 'Record 5 seconds'}
            </Text>
            <TouchableOpacity
              style={[styles.captureButton, audioRecording && styles.captureButtonActive]}
              onPress={handleRecordAudio}
              disabled={audioRecording}
            >
              <Ionicons
                name={audioRecording ? 'stop-circle' : 'mic'}
                size={48}
                color={colors.surface}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.captureButton, recording && styles.captureButtonActive]}
              onPress={
                mode === 'photo'
                  ? handleCapturePhoto
                  : recording
                  ? handleStopVideo
                  : handleStartVideo
              }
            >
              <Ionicons
                name={recording ? 'stop-circle' : mode === 'photo' ? 'camera' : 'videocam'}
                size={48}
                color={colors.surface}
              />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonActive: {
    backgroundColor: colors.error,
  },
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marginTop: {
    marginTop: 24,
  },
  marginBottom: {
    marginBottom: 16,
  },
});
