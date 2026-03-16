import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

interface FieldBackgroundProps {
  sportId: string;
  fieldColor: string;
  lineColor: string;
}

function RugbyField({ lineColor }: { lineColor: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Halfway line */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '50%' }]} />
      {/* 22m lines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '25%' }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '75%' }]} />
      {/* Try lines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '10%', opacity: 0.6 }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '90%', opacity: 0.6 }]} />
      {/* Dead ball lines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '3%', opacity: 0.3 }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '97%', opacity: 0.3 }]} />
      {/* 10m lines (dashed effect with shorter width) */}
      <View style={[styles.hLineDashed, { borderColor: lineColor, top: '40%' }]} />
      <View style={[styles.hLineDashed, { borderColor: lineColor, top: '60%' }]} />
      {/* Touchlines */}
      <View style={[styles.vLine, { backgroundColor: lineColor, left: '8%' }]} />
      <View style={[styles.vLine, { backgroundColor: lineColor, right: '8%' }]} />
    </View>
  );
}

function FootballField({ lineColor }: { lineColor: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Halfway line */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '50%' }]} />
      {/* Centre circle */}
      <View style={[styles.centreCircle, { borderColor: lineColor }]} />
      {/* Penalty areas */}
      <View style={[styles.penaltyBox, { borderColor: lineColor, top: '5%' }]} />
      <View style={[styles.penaltyBox, { borderColor: lineColor, bottom: '5%' }]} />
      {/* Goal areas */}
      <View style={[styles.goalBox, { borderColor: lineColor, top: '5%' }]} />
      <View style={[styles.goalBox, { borderColor: lineColor, bottom: '5%' }]} />
      {/* Touchlines */}
      <View style={[styles.vLine, { backgroundColor: lineColor, left: '8%' }]} />
      <View style={[styles.vLine, { backgroundColor: lineColor, right: '8%' }]} />
      {/* Goal lines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '5%' }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, bottom: '5%' }]} />
    </View>
  );
}

function BasketballCourt({ lineColor }: { lineColor: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Half court line */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '50%' }]} />
      {/* Centre circle */}
      <View style={[styles.centreCircle, { borderColor: lineColor }]} />
      {/* Three-point arcs (simplified as semi-circles) */}
      <View style={[styles.threePointArc, { borderColor: lineColor, top: '8%' }]} />
      <View style={[styles.threePointArcBottom, { borderColor: lineColor, bottom: '8%' }]} />
      {/* Free throw lanes */}
      <View style={[styles.freethrowLane, { borderColor: lineColor, top: '5%' }]} />
      <View style={[styles.freethrowLane, { borderColor: lineColor, bottom: '5%' }]} />
      {/* Sidelines */}
      <View style={[styles.vLine, { backgroundColor: lineColor, left: '8%' }]} />
      <View style={[styles.vLine, { backgroundColor: lineColor, right: '8%' }]} />
      {/* Baselines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '5%' }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, bottom: '5%' }]} />
    </View>
  );
}

function TennisCourt({ lineColor }: { lineColor: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Net */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '50%', height: 2 }]} />
      {/* Baselines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '12%', height: 2 }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, bottom: '12%', height: 2 }]} />
      {/* Service lines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '33%' }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, bottom: '33%' }]} />
      {/* Centre service line */}
      <View style={[styles.centreServiceLine, { backgroundColor: lineColor }]} />
      {/* Singles sidelines */}
      <View style={[styles.vLine, { backgroundColor: lineColor, left: '18%' }]} />
      <View style={[styles.vLine, { backgroundColor: lineColor, right: '18%' }]} />
      {/* Doubles sidelines */}
      <View style={[styles.vLine, { backgroundColor: lineColor, left: '8%' }]} />
      <View style={[styles.vLine, { backgroundColor: lineColor, right: '8%' }]} />
    </View>
  );
}

function CricketPitch({ lineColor }: { lineColor: string }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Outer boundary circle */}
      <View style={[styles.boundaryCircle, { borderColor: lineColor }]} />
      {/* Inner circle (30-yard) */}
      <View style={[styles.innerCircle, { borderColor: lineColor }]} />
      {/* Pitch strip */}
      <View style={[styles.pitchStrip, { borderColor: lineColor }]} />
      {/* Crease lines */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '38%', marginHorizontal: '35%' }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '62%', marginHorizontal: '35%' }]} />
      {/* Popping crease */}
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '35%', marginHorizontal: '30%', opacity: 0.5 }]} />
      <View style={[styles.hLine, { backgroundColor: lineColor, top: '65%', marginHorizontal: '30%', opacity: 0.5 }]} />
    </View>
  );
}

export default function FieldBackground({ sportId, fieldColor, lineColor }: FieldBackgroundProps) {
  const renderField = () => {
    switch (sportId) {
      case 'rugby':
        return <RugbyField lineColor={lineColor} />;
      case 'football':
        return <FootballField lineColor={lineColor} />;
      case 'basketball':
        return <BasketballCourt lineColor={lineColor} />;
      case 'tennis':
        return <TennisCourt lineColor={lineColor} />;
      case 'cricket':
        return <CricketPitch lineColor={lineColor} />;
      default:
        return null;
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: fieldColor, opacity: 0.15 }]}>
      {renderField()}
    </View>
  );
}

const styles = StyleSheet.create({
  hLine: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    height: 1,
  },
  hLineDashed: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  vLine: {
    position: 'absolute',
    top: '5%',
    bottom: '5%',
    width: 1,
  },
  centreCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignSelf: 'center',
    top: '50%',
    marginTop: -50,
    left: W / 2 - 50,
  },
  penaltyBox: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: '15%',
    borderWidth: 1,
    borderTopWidth: 0,
  },
  goalBox: {
    position: 'absolute',
    left: '32%',
    right: '32%',
    height: '8%',
    borderWidth: 1,
    borderTopWidth: 0,
  },
  threePointArc: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    height: '20%',
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  threePointArcBottom: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    height: '20%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  freethrowLane: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    height: '15%',
    borderWidth: 1,
  },
  centreServiceLine: {
    position: 'absolute',
    left: '50%',
    width: 1,
    top: '33%',
    bottom: '33%',
  },
  boundaryCircle: {
    position: 'absolute',
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    borderWidth: 1,
    alignSelf: 'center',
    top: '50%',
    marginTop: -(W * 0.4),
    left: W * 0.1,
  },
  innerCircle: {
    position: 'absolute',
    width: W * 0.5,
    height: W * 0.5,
    borderRadius: W * 0.25,
    borderWidth: 1,
    alignSelf: 'center',
    top: '50%',
    marginTop: -(W * 0.25),
    left: W * 0.25,
  },
  pitchStrip: {
    position: 'absolute',
    left: '43%',
    right: '43%',
    top: '30%',
    bottom: '30%',
    borderWidth: 1,
  },
});
