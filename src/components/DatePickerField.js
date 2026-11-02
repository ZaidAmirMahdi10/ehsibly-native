import React, {useContext, useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import ModalSheet from './ModalSheet';
import {COLORS} from '../constants/theme';

// A labeled field that looks like SelectField but opens a small month-grid
// calendar instead of a keyboard. Kept dependency-free on purpose (no native
// datetime module to pod-install/rebuild): the whole picker is plain JS, so
// it hot-reloads like any other screen change. Value in/out is a plain
// `YYYY-MM-DD` string (or null) — exactly what the invoices endpoint's
// startDate/endDate params expect.

// Weekday initials are data, not UI copy (same spirit as the app's status
// maps), keyed by language so the header reads right in each script.
const WEEKDAYS = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  ar: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
  ckb: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
};

const pad2 = n => String(n).padStart(2, '0');
const toYMD = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const parseYMD = str => {
  if (!str) {
    return null;
  }
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) {
    return null;
  }
  return {y, m: m - 1, d};
};

const DatePickerField = ({label, value, onChange, placeholder, disabled}) => {
  const {t, i18n} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const weekdays = WEEKDAYS[i18n.language] || WEEKDAYS.en;

  const [visible, setVisible] = useState(false);
  const parsed = parseYMD(value);
  const today = new Date();
  // Which month the grid is showing — the selected date's month, else today.
  const [view, setView] = useState({
    y: parsed?.y ?? today.getFullYear(),
    m: parsed?.m ?? today.getMonth(),
  });

  const open = () => {
    const p = parseYMD(value);
    setView({y: p?.y ?? today.getFullYear(), m: p?.m ?? today.getMonth()});
    setVisible(true);
  };

  const changeMonth = delta => {
    setView(prev => {
      const next = new Date(prev.y, prev.m + delta, 1);
      return {y: next.getFullYear(), m: next.getMonth()};
    });
  };

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const isSelected = d =>
    parsed && parsed.y === view.y && parsed.m === view.m && parsed.d === d;
  const isToday = d =>
    today.getFullYear() === view.y &&
    today.getMonth() === view.m &&
    today.getDate() === d;

  const pick = d => {
    onChange(toYMD(view.y, view.m, d));
    setVisible(false);
  };

  return (
    <View style={styles.group}>
      {label ? <CustomText style={styles.label}>{label}</CustomText> : null}
      <TouchableOpacity
        style={[styles.field, isRTL && styles.fieldRTL, disabled && styles.fieldDisabled]}
        activeOpacity={0.7}
        disabled={disabled}
        onPress={open}>
        <CustomText style={[styles.fieldText, !value && styles.placeholder]} paddingTop={0}>
          {value || placeholder}
        </CustomText>
        <CustomText style={styles.icon} paddingTop={0}>
          📅
        </CustomText>
      </TouchableOpacity>

      <ModalSheet visible={visible} onClose={() => setVisible(false)} sheetStyle={styles.sheet}>
        <View style={[styles.navRow, isRTL && styles.navRowRTL]}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => changeMonth(-1)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CustomText style={styles.navArrow} paddingTop={0}>
              ‹
            </CustomText>
          </TouchableOpacity>
          <CustomText bold style={styles.navTitle} paddingTop={0}>
            {view.y}-{pad2(view.m + 1)}
          </CustomText>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => changeMonth(1)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CustomText style={styles.navArrow} paddingTop={0}>
              ›
            </CustomText>
          </TouchableOpacity>
        </View>

        <View style={[styles.weekRow, isRTL && styles.weekRowRTL]}>
          {weekdays.map((w, i) => (
            <View key={i} style={styles.cell}>
              <CustomText style={styles.weekLabel} paddingTop={0}>
                {w}
              </CustomText>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={[styles.weekRow, isRTL && styles.weekRowRTL]}>
            {week.map((d, di) => (
              <View key={di} style={styles.cell}>
                {d ? (
                  <TouchableOpacity
                    style={[
                      styles.dayBtn,
                      isToday(d) && styles.dayToday,
                      isSelected(d) && styles.daySelected,
                    ]}
                    onPress={() => pick(d)}>
                    <CustomText
                      style={[styles.dayText, isSelected(d) && styles.dayTextSelected]}
                      paddingTop={0}>
                      {d}
                    </CustomText>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => {
              onChange(null);
              setVisible(false);
            }}>
            <CustomText style={styles.footerBtnText} paddingTop={0}>
              {t('clear')}
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerBtn}
            onPress={() => {
              const n = new Date();
              onChange(toYMD(n.getFullYear(), n.getMonth(), n.getDate()));
              setVisible(false);
            }}>
            <CustomText style={[styles.footerBtnText, styles.footerBtnPrimary]} paddingTop={0}>
              {t('today')}
            </CustomText>
          </TouchableOpacity>
        </View>
      </ModalSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {marginBottom: 14, flex: 1},
  label: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldRTL: {flexDirection: 'row-reverse'},
  fieldDisabled: {backgroundColor: COLORS.bg, opacity: 0.6},
  fieldText: {fontSize: 14, color: COLORS.text},
  placeholder: {color: COLORS.textMuted},
  icon: {fontSize: 14},
  sheet: {padding: 16, maxWidth: 340},
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navRowRTL: {flexDirection: 'row-reverse'},
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {fontSize: 22, color: COLORS.primary, lineHeight: 24},
  navTitle: {fontSize: 16, color: COLORS.text},
  weekRow: {flexDirection: 'row'},
  weekRowRTL: {flexDirection: 'row-reverse'},
  cell: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2},
  weekLabel: {fontSize: 11, fontWeight: '700', color: COLORS.textMuted},
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {borderWidth: 1, borderColor: COLORS.primaryLight},
  daySelected: {backgroundColor: COLORS.primary},
  dayText: {fontSize: 14, color: COLORS.text},
  dayTextSelected: {color: '#fff', fontWeight: '700'},
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  footerBtn: {paddingVertical: 8, paddingHorizontal: 14},
  footerBtnText: {fontSize: 14, color: COLORS.textMuted, fontWeight: '600'},
  footerBtnPrimary: {color: COLORS.primary},
});

export default DatePickerField;
