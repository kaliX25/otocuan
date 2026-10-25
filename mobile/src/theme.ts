export const C = {
  teal: '#0088A3', tealDark: '#006A80', tealDeep: '#007891', tealTint: '#E5F4F7', tealLine: '#D6EEF3',
  orange: '#FF7702', yellow: '#FCC025', orangeText: '#B84E00', orangeTint: '#FFF3E3', orangeLine: '#FF9A2E', onOrange: '#3A1A00',
  ink: '#13232B', body: '#34444C', muted: '#5B6B73', line: '#E3EAED', bg: '#F5F8F9', white: '#FFFFFF', chipBg: '#F2F5F6',
  red: '#B42318', redTint: '#FDECEC', green: '#2C7A55', greenTint: '#E3F4EA',
  // Nabung Yuk palette (from the team's illustration set)
  cream: '#FCF7EC', creamLine: '#EFE4CF', latteRed: '#E2312B', gGreen: '#158753', gGreenDark: '#0F6E43', gInk: '#11162B', gMuted: '#6B6255', gChip: '#FFF2DF',
};
export const F = {
  r: 'PlusJakartaSans_400Regular', m: 'PlusJakartaSans_500Medium', s: 'PlusJakartaSans_600SemiBold', b: 'PlusJakartaSans_700Bold', x: 'PlusJakartaSans_800ExtraBold',
  pop: 'Poppins_700Bold', popS: 'Poppins_600SemiBold', popM: 'Poppins_500Medium',
};
export const ORANGE_GRAD = ['#FCC025', '#FF7702'] as const;

export const rp = (n: number) => (n < 0 ? '- Rp' : 'Rp') + Math.round(Math.abs(n)).toLocaleString('id-ID');
export const rpSp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
export const num = (n: number) => Math.round(n).toLocaleString('id-ID');
export const jt = (n: number) => {
  const v = Math.abs(n) / 1e6;
  const t = (v >= 10 ? v.toFixed(0) : v.toFixed(1)).replace('.', ',').replace(/,0$/, '');
  return (n < 0 ? '- ' : '') + 'Rp' + t + ' jt';
};
export const digits = (v: string) => parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
