import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { CrtFrame, PhosphorText, PHOSPHOR, PHOSPHOR_FAINT, CRT_MONO } from "@/ui/CrtTerminal";
import { detectDeviceTimeZone } from "@/lib/device-timezone";
import { filterSettingCountries, settingCountryLabel } from "@/lib/setting-countries";
import { filterMobileLocales, mobileLocaleLabel, type Locale } from "@/i18n";

type Props = {
  locale: string;
  countryCode: string;
  onLocaleChange: (locale: string) => void;
  onCountryChange: (code: string) => void;
  onSave: () => void;
  saving?: boolean;
};

export function LocaleRegionCrtCard({
  locale,
  countryCode,
  onLocaleChange,
  onCountryChange,
  onSave,
  saving,
}: Props) {
  const [langQuery, setLangQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const deviceTz = detectDeviceTimeZone();

  const languages = useMemo(
    () => filterMobileLocales(langQuery, locale),
    [langQuery, locale]
  );
  const countries = useMemo(
    () => filterSettingCountries(countryQuery, locale),
    [countryQuery, locale]
  );

  return (
    <CrtFrame title="Terminal1:manpage">
      <View style={styles.body}>
        <PhosphorText dim style={styles.lede}>
          The settings page lists languages and countries. Search by name. Time zone follows this device.
        </PhosphorText>

        <PhosphorText style={styles.heading}>LANGUAGE</PhosphorText>
        <TextInput
          value={langQuery}
          onChangeText={setLangQuery}
          placeholder="search language"
          placeholderTextColor={PHOSPHOR_FAINT}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.search}
        />
        <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {languages.map((code) => {
            const active = locale === code;
            return (
              <Pressable key={code} onPress={() => onLocaleChange(code)} style={styles.row}>
                <PhosphorText dim={!active} glow={active}>
                  {active ? ">> " : "   "}
                  {mobileLocaleLabel(code as Locale, locale)}
                </PhosphorText>
                <PhosphorText faint style={styles.code}>
                  {code}
                </PhosphorText>
              </Pressable>
            );
          })}
        </ScrollView>

        <PhosphorText style={styles.heading}>COUNTRY</PhosphorText>
        <TextInput
          value={countryQuery}
          onChangeText={setCountryQuery}
          placeholder="search country"
          placeholderTextColor={PHOSPHOR_FAINT}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.search}
        />
        <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {countries.map((code) => {
            const active = countryCode === code;
            return (
              <Pressable key={code} onPress={() => onCountryChange(code)} style={styles.row}>
                <PhosphorText dim={!active} glow={active}>
                  {active ? ">> " : "   "}
                  {settingCountryLabel(code, locale)}
                </PhosphorText>
                <PhosphorText faint style={styles.code}>
                  {code}
                </PhosphorText>
              </Pressable>
            );
          })}
        </ScrollView>

        <PhosphorText style={styles.heading}>TIMEZONE</PhosphorText>
        <PhosphorText>
          {">> "}device {deviceTz}
        </PhosphorText>
        <PhosphorText dim style={styles.note}>
          Uses this smartphone clock. Not user-selectable.
        </PhosphorText>

        <Pressable onPress={onSave} disabled={saving} style={styles.write}>
          <PhosphorText glow>{saving ? "writing…" : "write"}</PhosphorText>
        </Pressable>
      </View>
    </CrtFrame>
  );
}

const styles = StyleSheet.create({
  body: { padding: 12, gap: 8 },
  lede: { fontSize: 11, lineHeight: 16, marginBottom: 4 },
  heading: { marginTop: 8, fontSize: 12, letterSpacing: 1 },
  search: {
    borderWidth: 1,
    borderColor: PHOSPHOR_FAINT,
    color: PHOSPHOR,
    fontFamily: CRT_MONO,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  list: { maxHeight: 168 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  code: { fontSize: 11 },
  note: { fontSize: 11 },
  write: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PHOSPHOR,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
});
