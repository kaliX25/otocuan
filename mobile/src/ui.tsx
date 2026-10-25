import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleProp, Text, TextInput, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C, F, ORANGE_GRAD } from './theme';
import { useApp } from './store';

// ------------------------------------------------------------------ text
type TP = TextProps & { s?: number; w?: keyof typeof F; c?: string; style?: StyleProp<TextStyle>; center?: boolean; lh?: number };
export const T = ({ s = 14, w = 'r', c = C.ink, style, center, lh, ...p }: TP) => (
  <Text {...p} style={[{ fontSize: s, fontFamily: F[w], color: c, lineHeight: lh ?? Math.round(s * 1.4), textAlign: center ? 'center' : undefined }, style]} />
);

// ------------------------------------------------------------------ icons
const paths: Record<string, string[]> = {
  back: ['M15 18l-6-6 6-6'], close: ['M6 6l12 12', 'M18 6L6 18'], chev: ['M9 6l6 6-6 6'], chevL: ['M15 6l-6 6 6 6'],
  plus: ['M12 5v14', 'M5 12h14'], bell: ['M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8', 'M10 20a2 2 0 0 0 4 0'],
  home: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'], wallet: ['M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z', 'M16 13h2', 'M3 10h18'],
  calc: ['M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M8 7h8', 'M8 12h2', 'M14 12h2', 'M8 16h2', 'M14 16h2'],
  shield: ['M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z', 'M9 12l2 2 4-4'], flame: ['M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z'],
  bulb: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z'], chart: ['M4 19h16', 'M7 15l4-4 3 3 5-6'],
  alert: ['M12 3l9 16H3z', 'M12 10v4', 'M12 17h.01'], info: ['M12 8v5', 'M12 16h.01'], check: ['M5 12l5 5L20 7'], lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5z'],
  mail: ['M3 7l9 6 9-6', 'M3 5h18v14H3z'], logout: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'], trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'], help: ['M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14', 'M12 17h.01'], list: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
};
export function Icon({ name, size = 20, color = C.ink, sw = 2 }: { name: keyof typeof paths | 'target' | 'circleInfo'; size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {name === 'target' && (<><Circle cx={12} cy={12} r={9} /><Circle cx={12} cy={12} r={5} /><Circle cx={12} cy={12} r={1} /></>)}
      {(name === 'circleInfo' || name === 'info' || name === 'help') && <Circle cx={12} cy={12} r={9} />}
      {(paths[name as string] || []).map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}
export const Cup = ({ on, size = 20 }: { on: boolean; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill={on ? '#FFFFFF' : '#E4DCCD'} />
    <Path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16" stroke={on ? '#FFFFFF' : '#E4DCCD'} strokeWidth={1.8} fill="none" />
    {on && <Path d="M10 15c0-2 1-3 2.6-3.3-.2 1.7-1 2.7-2.6 3.3zM10 15c0-1.5-.8-2.3-2.1-2.5.1 1.3.8 2.1 2.1 2.5z" fill="#2E8B57" />}
  </Svg>
);

// ------------------------------------------------------------------ layout
export function Screen({ children, white, padTop = 44, scroll = true, bottom = 22, style }: { children: React.ReactNode; white?: boolean; padTop?: number; scroll?: boolean; bottom?: number; style?: ViewStyle }) {
  const inner = <View style={[{ paddingTop: padTop, paddingHorizontal: 18, paddingBottom: bottom, gap: 12, flexGrow: 1 }, style]}>{children}</View>;
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: white ? C.white : C.bg }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{inner}</ScrollView>
  ) : <View style={{ flex: 1, backgroundColor: white ? C.white : C.bg }}>{inner}</View>;
}
export const Spacer = () => <View style={{ flex: 1 }} />;
export const Row = ({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap }, style]}>{children}</View>
);
export const Card = ({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) =>
  onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ backgroundColor: C.white, borderRadius: 20, padding: 16, opacity: pressed ? 0.85 : 1 }, style]}>{children}</Pressable>
  ) : <View style={[{ backgroundColor: C.white, borderRadius: 20, padding: 16 }, style]}>{children}</View>;

export function IconBtn({ name, onPress, label, bg = C.white, color = C.ink, children }: { name?: any; onPress: () => void; label: string; bg?: string; color?: string; children?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      {children ?? <Icon name={name} color={color} />}
    </Pressable>
  );
}
export function Header({ title, eyebrow, eyebrowColor = C.teal, right, onBack, close, grey }: { title: string; eyebrow?: string; eyebrowColor?: string; right?: React.ReactNode; onBack?: () => void; close?: boolean; grey?: boolean }) {
  const { nav } = useApp();
  return (
    <Row style={{ justifyContent: 'flex-start' }} gap={12}>
      <IconBtn name={close ? 'close' : 'back'} label={close ? 'Tutup' : 'Kembali'} bg={grey ? C.chipBg : C.white} onPress={onBack ?? nav.back} />
      <View style={{ flex: 1 }}>
        {eyebrow ? <T s={12} w="b" c={eyebrowColor} style={{ letterSpacing: 1 }}>{eyebrow}</T> : null}
        <T s={19} w="x">{title}</T>
      </View>
      {right}
    </Row>
  );
}
export const TabTitle = ({ eyebrow, title, color = C.teal, right }: { eyebrow: string; title: string; color?: string; right?: React.ReactNode }) => (
  <Row><View><T s={12} w="b" c={color} style={{ letterSpacing: 1 }}>{eyebrow}</T><T s={22} w="x">{title}</T></View>{right}</Row>
);

// ------------------------------------------------------------------ controls
type BtnV = 'o' | 't' | 'g' | 'd' | 'plain';
export function Btn({ title, onPress, v = 't', disabled, style, h = 52, small, icon }: { title: string; onPress: () => void; v?: BtnV; disabled?: boolean; style?: StyleProp<ViewStyle>; h?: number; small?: boolean; icon?: any }) {
  const { busy } = useApp();
  const fg = v === 'o' ? C.onOrange : v === 'g' ? C.tealDark : v === 'plain' ? C.ink : C.white;
  const content = (
    <Row style={{ justifyContent: 'center', height: h }} gap={8}>
      {icon ? <Icon name={icon} color={fg} size={18} sw={2.4} /> : null}
      <T s={small ? 14 : 15.5} w="b" c={fg}>{title}</T>
    </Row>
  );
  const base: ViewStyle = { borderRadius: 16, overflow: 'hidden', opacity: disabled ? 0.45 : 1 };
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled || busy }} disabled={busy} onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85 }, v === 't' && { backgroundColor: C.teal }, v === 'd' && { backgroundColor: C.red },
        v === 'g' && { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.teal }, v === 'plain' && { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line }, style]}>
      {v === 'o' ? <LinearGradient colors={ORANGE_GRAD as any} style={{ borderRadius: 16 }}>{content}</LinearGradient> : content}
    </Pressable>
  );
}
export function Chip({ label, sub, on, onPress, tone = 'teal', style, round }: { label: string; sub?: string; on?: boolean; onPress: () => void; tone?: 'teal' | 'orange'; style?: StyleProp<ViewStyle>; round?: boolean }) {
  const onBg = tone === 'teal' ? C.tealTint : C.orangeTint, onB = tone === 'teal' ? C.teal : C.orangeLine, onC = tone === 'teal' ? C.tealDark : C.orangeText;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={[{ minHeight: round ? 38 : 46, borderRadius: round ? 19 : 14, borderWidth: 1.5, borderColor: on ? onB : C.line, backgroundColor: on ? onBg : C.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6 }, style]}>
      <T s={13.5} w="b" c={on ? onC : C.body} center>{label}</T>
      {sub ? <T s={11.5} w="s" c={on ? onC : C.muted} center>{sub}</T> : null}
    </Pressable>
  );
}
export function Seg({ items, value, onChange, bg = '#E9EFF1' }: { items: [string, string][]; value: string; onChange: (v: string) => void; bg?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, backgroundColor: bg, borderRadius: 12, padding: 4 }}>
      {items.map(([k, label]) => (
        <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: value === k }} onPress={() => onChange(k)}
          style={{ flex: 1, height: 38, borderRadius: 9, backgroundColor: value === k ? C.white : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <T s={13} w={value === k ? 'b' : 's'} c={value === k ? C.ink : C.muted}>{label}</T>
        </Pressable>
      ))}
    </View>
  );
}
export const Toggle = ({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) => (
  <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onPress}
    style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: on ? C.teal : '#CBD7DB', alignItems: on ? 'flex-end' : 'flex-start' }}>
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.white }} />
  </Pressable>
);
export const Bar = ({ pct, color = C.teal, bg = C.tealLine, h = 8, grad }: { pct: number; color?: string; bg?: string; h?: number; grad?: boolean }) => (
  <View style={{ height: h, borderRadius: h / 2, backgroundColor: bg, overflow: 'hidden' }}>
    {grad ? <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={ORANGE_GRAD as any} style={{ width: `${Math.min(100, pct)}%`, height: h, borderRadius: h / 2 }} />
      : <View style={{ width: `${Math.min(100, pct)}%`, height: h, borderRadius: h / 2, backgroundColor: color }} />}
  </View>
);
export function Field({ label, value, onChangeText, placeholder, keyboardType, nativeID, big, editable = true, maxLength, secure }: { label?: string; value: string; onChangeText?: (t: string) => void; placeholder?: string; keyboardType?: any; nativeID?: string; big?: boolean; editable?: boolean; maxLength?: number; secure?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <T s={13} w="b" c={C.muted} nativeID={nativeID ? nativeID + '-l' : undefined}>{label}</T> : null}
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA8AE" keyboardType={keyboardType}
        editable={editable} maxLength={maxLength} secureTextEntry={secure}
        style={{ height: big ? 64 : 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, fontFamily: F.s, fontSize: big ? 28 : 15, color: editable ? C.ink : C.muted, backgroundColor: editable ? C.white : C.chipBg, letterSpacing: big ? 12 : 0, textAlign: big ? 'center' : 'left' } as any} />
    </View>
  );
}
export const ListItem = ({ title, right, onPress, last, danger, icon }: { title: string; right?: string; onPress: () => void; last?: boolean; danger?: boolean; icon?: any }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line, opacity: pressed ? 0.6 : 1 })}>
    {icon ? <Icon name={icon} color={danger ? C.red : C.tealDark} /> : null}
    <T s={14} w="s" c={danger ? C.red : C.ink} style={{ flex: 1 }}>{title}</T>
    {right ? <T s={12} c={C.muted}>{right}</T> : <Icon name="chev" size={16} color={C.muted} />}
  </Pressable>
);
export const Tag = ({ text, fg, bg }: { text: string; fg: string; bg: string }) => (
  <View style={{ backgroundColor: bg, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}><T s={11} w="x" c={fg}>{text}</T></View>
);
export const Note = ({ text, tone = 'orange', icon = 'circleInfo' }: { text: React.ReactNode; tone?: 'orange' | 'teal' | 'red'; icon?: any }) => {
  const bg = tone === 'orange' ? C.orangeTint : tone === 'teal' ? C.tealTint : C.redTint, fg = tone === 'orange' ? C.orangeText : tone === 'teal' ? C.tealDark : C.red;
  return <Row style={{ backgroundColor: bg, borderRadius: 14, padding: 12, alignItems: 'flex-start', justifyContent: 'flex-start' }}><Icon name={icon} size={18} color={fg} /><T s={12.5} lh={18} style={{ flex: 1 }}>{text}</T></Row>;
};
export const Loading = () => <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.teal} /></View>;
export const GradBox = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <LinearGradient colors={ORANGE_GRAD as any} style={style}>{children}</LinearGradient>;
export { Rect };
