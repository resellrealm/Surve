// Full-screen image gallery.
// • Horizontal FlatList (pagingEnabled) — swipe between images.
// • Per-page pinch-zoom, double-tap, and pan-while-zoomed.
// • Swipe down to dismiss (translates backdrop + content, fades backdrop).
// • X close button, counter badge, dot strip.
//
// Gesture strategy (RNGH v2 simultaneous model):
//   • FlatList handles horizontal scrolling natively.
//   • Outer dismiss GestureDetector: failOffsetX([-12,12]) so horizontal
//     swipes fail immediately → FlatList wins.
//   • Each ZoomPage has its own GestureDetector (pinch + double-tap + pan).
//     The per-page pan is a no-op when scale=1, so the dismiss gesture runs
//     uncontested. When zoomed, the per-page pan translates the image and
//     isZoomed.value = true, so the outer dismiss gesture returns early.
//   • FlatList scrollEnabled is toggled via runOnJS when zoom changes so the
//     user cannot accidentally page while panning a zoomed image.

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from './PressableScale';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { Spacing, Typography } from '../../constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');
const MAX_SCALE = 4;
const DISMISS_THRESHOLD = 90;
const DISMISS_VELOCITY = 700;

// ─── ZoomPage ────────────────────────────────────────────────────────────────

interface ZoomPageHandle {
  reset: () => void;
}

interface ZoomPageProps {
  uri: string;
  isZoomed: SharedValue<boolean>;
  onZoomChange: (zoomed: boolean) => void;
}

const ZoomPage = forwardRef<ZoomPageHandle, ZoomPageProps>(
  ({ uri, isZoomed, onZoomChange }, ref) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const savedTx = useSharedValue(0);
    const savedTy = useSharedValue(0);

    const applyReset = useCallback(() => {
      scale.value = withTiming(1, { duration: 180 });
      savedScale.value = 1;
      tx.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(0, { duration: 180 });
      savedTx.value = 0;
      savedTy.value = 0;
    }, [scale, savedScale, tx, ty, savedTx, savedTy]);

    useImperativeHandle(ref, () => ({ reset: applyReset }), [applyReset]);

    const notifyZoom = useCallback(onZoomChange, [onZoomChange]);

    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = Math.min(
          Math.max(savedScale.value * e.scale, 0.8),
          MAX_SCALE,
        );
      })
      .onEnd(() => {
        if (scale.value < 1) {
          scale.value = withSpring(1);
          savedScale.value = 1;
          tx.value = withSpring(0);
          ty.value = withSpring(0);
          savedTx.value = 0;
          savedTy.value = 0;
          isZoomed.value = false;
          runOnJS(notifyZoom)(false);
        } else {
          savedScale.value = scale.value;
          const zoomed = scale.value > 1.05;
          isZoomed.value = zoomed;
          runOnJS(notifyZoom)(zoomed);
        }
      });

    // Pan the image when zoomed; no-op when at scale=1 so the outer dismiss
    // gesture can activate uncontested.
    const pan = Gesture.Pan()
      .minPointers(1)
      .maxPointers(2)
      .onUpdate((e) => {
        if (savedScale.value <= 1) return;
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      })
      .onEnd(() => {
        if (savedScale.value <= 1) return;
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(250)
      .onEnd(() => {
        if (savedScale.value > 1) {
          scale.value = withSpring(1);
          savedScale.value = 1;
          tx.value = withSpring(0);
          ty.value = withSpring(0);
          savedTx.value = 0;
          savedTy.value = 0;
          isZoomed.value = false;
          runOnJS(notifyZoom)(false);
        } else {
          scale.value = withSpring(2.5);
          savedScale.value = 2.5;
          isZoomed.value = true;
          runOnJS(notifyZoom)(true);
        }
      });

    const composed = Gesture.Simultaneous(
      pinch,
      Gesture.Simultaneous(pan, doubleTap),
    );

    const imageStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: scale.value },
      ],
    }));

    return (
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.page, imageStyle]}>
          <Image
            source={{ uri }}
            style={styles.pageImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityLabel="Gallery image, pinch to zoom"
          />
        </Animated.View>
      </GestureDetector>
    );
  },
);

// ─── ImageGallery ─────────────────────────────────────────────────────────────

export interface ImageGalleryProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageGallery({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageGalleryProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const n = images.length;

  // ── Page state ──────────────────────────────────────────────────────────────
  const [displayIdx, setDisplayIdx] = useState(initialIndex);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const pageRefs = useRef<(ZoomPageHandle | null)[]>([]);

  // ── Shared zoom signal (read on UI thread in dismiss gesture) ───────────────
  const isZoomed = useSharedValue(false);

  // ── Dismiss animation ───────────────────────────────────────────────────────
  const containerY = useSharedValue(0);
  const backdropAlpha = useSharedValue(0);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const doClose = useCallback(() => {
    haptics.tap();
    containerY.value = withTiming(SH, { duration: 260 }, (done) => {
      if (done) runOnJS(onClose)();
    });
    backdropAlpha.value = withTiming(0, { duration: 220 });
  }, [haptics, onClose, containerY, backdropAlpha]);

  const handleZoomChange = useCallback(
    (zoomed: boolean) => {
      setScrollEnabled(!zoomed);
    },
    [],
  );

  // ── Open / reset on visibility change ──────────────────────────────────────
  useEffect(() => {
    if (visible) {
      const idx = Math.min(Math.max(initialIndex, 0), Math.max(n - 1, 0));
      setDisplayIdx(idx);
      setScrollEnabled(true);
      isZoomed.value = false;
      // Animate in
      containerY.value = SH * 0.12;
      backdropAlpha.value = 0;
      containerY.value = withSpring(0, { damping: 22, stiffness: 180 });
      backdropAlpha.value = withTiming(1, { duration: 250 });
      // Scroll FlatList to correct page (deferred so FlatList has rendered)
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      });
      // Reset all zoom pages
      pageRefs.current.forEach((r) => r?.reset());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Dismiss gesture (wraps FlatList) ────────────────────────────────────────
  // failOffsetX: if horizontal movement exceeds ±12 pt, this gesture fails and
  // the FlatList's native scroll handler takes over.
  const dismissGesture = Gesture.Pan()
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      if (isZoomed.value) return;
      if (e.translationY > 0) {
        containerY.value = e.translationY;
        backdropAlpha.value = interpolate(
          e.translationY,
          [0, SH * 0.45],
          [1, 0.15],
          Extrapolation.CLAMP,
        );
      }
    })
    .onEnd((e) => {
      if (isZoomed.value) return;
      if (
        containerY.value > DISMISS_THRESHOLD ||
        e.velocityY > DISMISS_VELOCITY
      ) {
        containerY.value = withTiming(SH, { duration: 240 }, (done) => {
          if (done) runOnJS(onClose)();
        });
        backdropAlpha.value = withTiming(0, { duration: 200 });
      } else {
        containerY.value = withSpring(0, { damping: 20 });
        backdropAlpha.value = withTiming(1, { duration: 150 });
      }
    });

  // ── Animated styles ─────────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: containerY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: backdropAlpha.value,
  }));

  // ── FlatList callbacks ───────────────────────────────────────────────────────
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0) {
        const newIdx = viewableItems[0].index ?? 0;
        // Reset zoom on outgoing page
        pageRefs.current.forEach((r, i) => {
          if (i !== newIdx) r?.reset();
        });
        runOnJS(setDisplayIdx)(newIdx);
        isZoomed.value = false;
        runOnJS(setScrollEnabled)(true);
      }
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => (
      <ZoomPage
        ref={(r) => {
          pageRefs.current[index] = r;
        }}
        uri={item}
        isZoomed={isZoomed}
        onZoomChange={handleZoomChange}
      />
    ),
    [isZoomed, handleZoomChange],
  );

  const keyExtractor = useCallback((_: string, i: number) => String(i), []);

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: SW,
      offset: SW * index,
      index,
    }),
    [],
  );

  if (!visible || n === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={doClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={backdropStyle} />
        <Animated.View style={containerStyle}>
          <GestureDetector gesture={dismissGesture}>
            <FlatList
              ref={flatListRef}
              data={images}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
              initialScrollIndex={Math.min(
                Math.max(initialIndex, 0),
                Math.max(n - 1, 0),
              )}
              getItemLayout={getItemLayout}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig.current}
              windowSize={3}
              maxToRenderPerBatch={3}
              removeClippedSubviews={false}
              style={styles.flatList}
            />
          </GestureDetector>

          {/* Close button */}
          <PressableScale
            scaleValue={0.88}
            onPress={doClose}
            hitSlop={12}
            style={[
              styles.closeBtn,
              {
                top: insets.top + Spacing.md,
                backgroundColor: 'rgba(0,0,0,0.55)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close gallery"
          >
            <X size={22} color="#fff" strokeWidth={2.2} />
          </PressableScale>

          {/* Counter badge */}
          {n > 1 && (
            <View
              style={[
                styles.counter,
                {
                  top: insets.top + Spacing.md,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                },
              ]}
            >
              <Text style={styles.counterText}>
                {displayIdx + 1} / {n}
              </Text>
            </View>
          )}

          {/* Dot indicators */}
          {n > 1 && n <= 12 && (
            <View
              style={[styles.dots, { bottom: insets.bottom + Spacing.xl }]}
            >
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === displayIdx
                          ? '#fff'
                          : 'rgba(255,255,255,0.35)',
                      width: i === displayIdx ? 18 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Swipe-down hint */}
          <View
            style={[
              styles.swipeHint,
              { bottom: insets.bottom + Spacing.md + (n > 1 && n <= 12 ? 36 : 0) },
            ]}
          >
            <Text style={styles.swipeHintText}>Swipe down to close</Text>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flatList: {
    flex: 1,
  },
  page: {
    width: SW,
    height: SH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    width: SW,
    height: SH,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -32 }],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 14,
  },
  counterText: {
    ...Typography.caption1,
    color: '#fff',
    fontWeight: '600',
  },
  dots: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  swipeHint: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  swipeHintText: {
    ...Typography.caption2,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },
});
