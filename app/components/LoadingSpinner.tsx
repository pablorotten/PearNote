import React, { useRef, useEffect } from 'react'
import { View, Text, Animated } from 'react-native'
import { styles } from '../styles'

export function LoadingSpinner() {
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      })
    )
    loop.start()
    return () => loop.stop()
  }, [])
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })
  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
      <Text style={styles.loadingText}>Loading kollection...</Text>
    </View>
  )
}
