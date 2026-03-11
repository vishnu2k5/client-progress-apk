import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

let toastRef = null;

export const showToast = (message, type = 'success') => {
  if (toastRef) {
    toastRef.show(message, type);
  }
};

export default function Toast() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [type, setType] = React.useState('success');

  useEffect(() => {
    toastRef = {
      show: (msg, t = 'success') => {
        // Stop any running animation before starting a new one
        if (animationRef.current) {
          animationRef.current.stop();
          fadeAnim.setValue(0);
        }

        setMessage(msg);
        setType(t);
        setVisible(true);

        const animation = Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(1800),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]);

        animationRef.current = animation;
        animation.start(({ finished }) => {
          if (finished) {
            setVisible(false);
            animationRef.current = null;
          }
        });
      },
    };

    return () => {
      toastRef = null;
    };
  }, [fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        type === 'success' && styles.success,
        type === 'error' && styles.error,
        { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }) }] },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  success: {
    backgroundColor: '#22c55e',
  },
  error: {
    backgroundColor: '#dc2626',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
