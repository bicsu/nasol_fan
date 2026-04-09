import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>오류가 발생했습니다</Text>
          <Text style={styles.sub}>잠시 후 다시 시도해주세요</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emoji: { fontSize: 48 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A18',
    marginTop: 8,
  },
  sub: { fontSize: 13, color: '#888888' },
  button: {
    marginTop: 16,
    backgroundColor: '#D4537E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
