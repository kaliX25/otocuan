import React from 'react';
import { Platform, Pressable, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { AppProvider, TAB_ROOTS, useApp } from './src/store';
import { C } from './src/theme';
import { Icon, Loading, T } from './src/ui';
import { Consent, Login, Onboarding, Otp, Setup, Splash } from './src/screens/onboarding';
import { AddTx, Finance, Home, TxList } from './src/screens/main';
import { Deposit, DepositDone, EditGoal, GoalDp, GoalEf } from './src/screens/goals';
import { Consult, ConsultDone, Planner, Readiness, Scenarios } from './src/screens/plan';
import { Article, Delete, Deleted, EditProfile, Export, Help, Notifications, Privacy, Profile, Reminders } from './src/screens/account';
import { GamiBroken, GamiDeposit, GamiIntro, GamiProgress, GamiStreak, GamiSuccess } from './src/screens/gami';

const SCREENS: Record<string, React.ComponentType> = {
  splash: Splash, onboarding: Onboarding, login: Login, otp: Otp, consent: Consent, setup: Setup,
  home: Home, finance: Finance, txlist: TxList, add_tx: AddTx,
  goal_dp: GoalDp, goal_ef: GoalEf, deposit: Deposit, deposit_done: DepositDone, edit_goal: EditGoal,
  planner: Planner, scenarios: Scenarios, readiness: Readiness, consult: Consult, consult_done: ConsultDone,
  reminders: Reminders, notifications: Notifications, profile: Profile, edit_profile: EditProfile, privacy: Privacy,
  export: Export, delete: Delete, deleted: Deleted, help: Help, article: Article,
  gami_intro: GamiIntro, gami: GamiIntro, gami_streak: GamiStreak, gami_deposit: GamiDeposit, gami_success: GamiSuccess, gami_progress: GamiProgress, gami_broken: GamiBroken,
};

function BottomNav() {
  const { nav } = useApp();
  const cur = nav.route.name;
  const items: [string, string, any][] = [['home', 'Home', 'home'], ['finance', 'Keuangan', 'wallet'], ['goal_dp', 'Target', 'target'], ['planner', 'Planner', 'calc'], ['readiness', 'Kesiapan', 'shield']];
  return (
    <View style={{ height: 70, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', paddingHorizontal: 6 }} accessibilityRole="tablist">
      {items.map(([k, label, icon]) => {
        const on = cur === k || (k === 'goal_dp' && cur === 'goal_ef');
        return (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => nav.tab(k)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Icon name={icon} size={22} color={on ? C.teal : C.muted} sw={on ? 2.2 : 2} />
            <T s={11} w={on ? 'x' : 's'} c={on ? C.teal : C.muted}>{label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Fab() {
  const { nav } = useApp();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Tambah transaksi" onPress={() => nav.go('add_tx')}
      style={{ position: 'absolute', right: 18, bottom: 86, width: 56, height: 56, borderRadius: 18, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', shadowColor: C.orange, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
      <Icon name="plus" size={24} color={C.onOrange} sw={2.6} />
    </Pressable>
  );
}

function Shell() {
  const { view, nav, toast } = useApp();
  const name = nav.route.name;
  const Screen = SCREENS[name] || Home;
  const needsData = !['splash', 'onboarding', 'login', 'otp'].includes(name);
  const isTab = TAB_ROOTS.includes(name);
  return (
    <View style={{ flex: 1 }}>
      {needsData && !view ? <Loading /> : <Screen key={name + JSON.stringify(nav.route.params || {})} />}
      {name === 'home' && view ? <Fab /> : null}
      {isTab && view ? <BottomNav /> : null}
      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: isTab ? 96 : 30, alignItems: 'center' }}>
          <View accessibilityLiveRegion="polite" style={{ backgroundColor: C.ink, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, maxWidth: 340 }}><T s={13} w="s" c={C.white} center>{toast}</T></View>
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#DCE8EC' : C.bg, alignItems: 'center' }}>
        <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 430, backgroundColor: C.bg, overflow: 'hidden' }} edges={['top', 'bottom']}>
          {loaded ? <AppProvider><Shell /></AppProvider> : <Loading />}
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
