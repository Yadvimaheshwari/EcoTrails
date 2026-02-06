import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../config/colors';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { useHikeStore } from '../store/useHikeStore';

export const HikeScreen: React.FC = ({ navigation }: any) => {
  const { currentHike } = useHikeStore();

  if (currentHike.status === 'active' || currentHike.status === 'paused') {
    navigation.navigate('DuringHike');
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text variant="h2" style={styles.title}>Start a Hike</Text>
        <Text variant="body" color="secondary" style={styles.subtitle}>
          Explore nearby trails and begin your adventure
        </Text>
        <Button
          title="Explore Trails"
          onPress={() => navigation.navigate('Explore')}
          size="lg"
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    marginTop: 16,
  },
});
