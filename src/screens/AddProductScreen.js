import React, {useState, useRef, useContext} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Switch,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../App';
import CustomText from '../components/CustomText';
import CustomView from '../components/CustomView';
import CustomInput from '../components/CustomInput';

const COLORS = {
  primary: '#C1121F',
  primaryDark: '#8B0000',
  primaryLight: '#FF4757',
  bg: '#F8F6F3',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textMuted: '#A8A8A8',
  border: '#EFEFEF',
  borderFocus: '#C1121F',
  tag: '#FFF0F0',
  tagText: '#C1121F',
  success: '#16A34A',
  successBg: '#F0FDF4',
  error: '#C1121F',
  inputBg: '#FAFAFA',
};

const CATEGORIES = [
  'Accessories',
  'Kitchen',
  'Home',
  'Lighting',
  'Clothing',
  'Other',
];

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  required = false,
  prefix,
  hint,
  error,
}) => {
  const {currentDirection} = useContext(LanguageContext);
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.spring(borderAnim, {
        toValue: 1,
        useNativeDriver: false,
        speed: 40,
      }),
      Animated.spring(labelAnim, {
        toValue: 1,
        useNativeDriver: false,
        speed: 40,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setFocused(false);

    Animated.spring(borderAnim, {
      toValue: 0,
      useNativeDriver: false,
      speed: 40,
    }).start();

    if (!value) {
      Animated.spring(labelAnim, {
        toValue: 0,
        useNativeDriver: false,
        speed: 40,
      }).start();
    }
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? COLORS.error : COLORS.border,
      error ? COLORS.error : COLORS.borderFocus,
    ],
  });

  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.textMuted, focused ? COLORS.primary : COLORS.textSub],
  });

  return (
    <CustomView style={styles.fieldWrapper}>
      <CustomView style={styles.fieldLabelRow}>
        <Animated.Text
          style={[
            styles.fieldLabel,
            {
              color: labelColor,
              direction: currentDirection || 'ltr',
              writingDirection: currentDirection || 'ltr',
              textAlign: currentDirection === 'rtl' ? 'right' : 'left',
              fontFamily: 'Tajawal-Regular',
            },
          ]}>
          {label}
          {required && (
            <CustomText style={styles.required} paddingTop={0}>
              {' '}
              *
            </CustomText>
          )}
        </Animated.Text>

        {hint && (
          <CustomText style={styles.fieldHint} paddingTop={0}>
            {hint}
          </CustomText>
        )}
      </CustomView>

      <Animated.View
        style={[
          styles.inputWrapper,
          {borderColor},
          multiline && styles.inputWrapperMulti,
        ]}>
        {prefix && (
          <CustomText
            style={[styles.inputPrefix, focused && styles.inputPrefixFocused]}
            paddingTop={0}>
            {prefix}
          </CustomText>
        )}

        <CustomInput
          style={[
            styles.input,
            multiline && styles.inputMulti,
            prefix && styles.inputWithPrefix,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={handleFocus}
          onBlur={handleBlur}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </Animated.View>

      {error && (
        <CustomView style={styles.errorRow}>
          <CustomText style={styles.errorText} paddingTop={0}>
            ⚠ {error}
          </CustomText>
        </CustomView>
      )}
    </CustomView>
  );
};

const CategorySelector = ({selected, onSelect}) => {
  const {t} = useTranslation();

  return (
    <CustomView style={styles.fieldWrapper}>
      <CustomText style={styles.fieldLabel} paddingTop={0}>
        {t('category')}{' '}
        <CustomText style={styles.required} paddingTop={0}>
          *
        </CustomText>
      </CustomText>

      <CustomView style={styles.categoryGrid}>
        {CATEGORIES.map(cat => {
          const active = selected === cat;

          return (
            <TouchableOpacity
              key={cat}
              onPress={() => onSelect(cat)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              activeOpacity={0.75}>
              <CustomText
                center
                style={[
                  styles.categoryChipText,
                  active && styles.categoryChipTextActive,
                ]}
                paddingTop={0}>
                {t(cat)}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </CustomView>
    </CustomView>
  );
};

const TagInput = ({tags, onAdd, onRemove}) => {
  const {t} = useTranslation();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();

    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      onAdd(trimmed);
      setInput('');
    }
  };

  return (
    <CustomView style={styles.fieldWrapper}>
      <CustomView style={styles.fieldLabelRow}>
        <CustomText style={styles.fieldLabel} paddingTop={0}>
          {t('tags')}
        </CustomText>

        <CustomText style={styles.fieldHint} paddingTop={0}>
          {tags.length}/5
        </CustomText>
      </CustomView>

      <CustomView style={styles.tagInputRow}>
        <CustomInput
          style={styles.tagTextInput}
          value={input}
          onChangeText={setInput}
          placeholder={t('tagsPlaceholder')}
          placeholderTextColor={COLORS.textMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />

        <TouchableOpacity
          onPress={handleAdd}
          style={[styles.tagAddBtn, !input.trim() && styles.tagAddBtnDisabled]}
          disabled={!input.trim()}
          activeOpacity={0.75}>
          <CustomText center style={styles.tagAddBtnText} paddingTop={0}>
            + {t('add')}
          </CustomText>
        </TouchableOpacity>
      </CustomView>

      {tags.length > 0 && (
        <CustomView style={styles.tagsRow}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag}
              onPress={() => onRemove(tag)}
              style={styles.tagChip}
              activeOpacity={0.7}>
              <CustomText style={styles.tagChipText} paddingTop={0}>
                {tag}
              </CustomText>

              <CustomText style={styles.tagChipRemove} paddingTop={0}>
                ✕
              </CustomText>
            </TouchableOpacity>
          ))}
        </CustomView>
      )}
    </CustomView>
  );
};

const SectionHeader = ({number, title, subtitle}) => (
  <CustomView style={styles.sectionHeader}>
    <View style={styles.sectionNumber}>
      <CustomText center style={styles.sectionNumberText} paddingTop={0}>
        {number}
      </CustomText>
    </View>

    <View>
      <CustomText style={styles.sectionTitle} paddingTop={0}>
        {title}
      </CustomText>

      {subtitle && (
        <CustomText style={styles.sectionSubtitle} paddingTop={0}>
          {subtitle}
        </CustomText>
      )}
    </View>
  </CustomView>
);

export default function AddProductScreen({navigation}) {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    imageUrl: '',
    tags: [],
    featured: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => {
    setForm(prev => ({...prev, [field]: value}));

    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: null}));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = t('nameRequired');
    }

    if (!form.category) {
      newErrors.category = t('categoryRequired');
    }

    if (!form.price.trim()) {
      newErrors.price = t('priceRequired');
    } else if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      newErrors.price = t('priceInvalid');
    }

    if (!form.description.trim()) {
      newErrors.description = t('descriptionRequired');
    } else if (form.description.trim().length < 20) {
      newErrors.description = t('descriptionShort');
    }

    if (form.imageUrl.trim() && !form.imageUrl.startsWith('http')) {
      newErrors.imageUrl = t('imageUrlInvalid');
    }

    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(t('alertTitle'), t('alertMessage'));
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1800);
  };

  const handleReset = () => {
    setForm({
      name: '',
      category: '',
      price: '',
      description: '',
      imageUrl: '',
      tags: [],
      featured: false,
    });
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <CustomView style={styles.successScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <CustomText center style={styles.successIconText} paddingTop={0}>
              ✓
            </CustomText>
          </View>

          <CustomText center style={styles.successTitle}>
            {t('successTitle')}
          </CustomText>

          <CustomText center style={styles.successSub}>
            "{form.name}" {t('successMessage')}
          </CustomText>

          <CustomView style={styles.successMeta}>
            <View style={styles.successMetaItem}>
              <CustomText center style={styles.successMetaLabel} paddingTop={0}>
                {t('category').toUpperCase()}
              </CustomText>

              <CustomText center style={styles.successMetaValue} paddingTop={0}>
                {t(form.category)}
              </CustomText>
            </View>

            <View style={styles.successMetaDivider} />

            <View style={styles.successMetaItem}>
              <CustomText center style={styles.successMetaLabel} paddingTop={0}>
                {t('price').toUpperCase()}
              </CustomText>

              <CustomText center style={styles.successMetaValue} paddingTop={0}>
                ${parseFloat(form.price).toFixed(2)}
              </CustomText>
            </View>

            <View style={styles.successMetaDivider} />

            <View style={styles.successMetaItem}>
              <CustomText center style={styles.successMetaLabel} paddingTop={0}>
                {t('featured').toUpperCase()}
              </CustomText>

              <CustomText center style={styles.successMetaValue} paddingTop={0}>
                {form.featured ? t('yes') : t('no')}
              </CustomText>
            </View>
          </CustomView>

          <TouchableOpacity
            style={styles.successBtn}
            onPress={handleReset}
            activeOpacity={0.85}>
            <CustomText center style={styles.successBtnText} paddingTop={0}>
              {t('addAnotherProduct')}
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successBtnOutline}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.75}>
            <CustomText
              center
              style={styles.successBtnOutlineText}
              paddingTop={0}>
              {t('backToProducts')}
            </CustomText>
          </TouchableOpacity>
        </View>
      </CustomView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <CustomView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <CustomText center style={styles.backBtnText} paddingTop={0}>
            {isRTL ? '→' : '←'}
          </CustomText>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <CustomText center style={styles.topBarEyebrow} paddingTop={0}>
            {t('admin')}
          </CustomText>

          <CustomText center style={styles.topBarTitle} paddingTop={0}>
            {t('title')}
          </CustomText>
        </View>

        <View style={styles.topBarRight}>
          <View style={styles.adminBadge}>
            <CustomText center style={styles.adminBadgeText} paddingTop={0}>
              ⚙
            </CustomText>
          </View>
        </View>
      </CustomView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <CustomView style={styles.progressRow}>
          {[1, 2, 3].map(step => (
            <CustomView key={step} style={styles.progressItem}>
              <View style={[styles.progressDot, styles.progressDotActive]} />

              {step < 3 && (
                <View style={[styles.progressLine, styles.progressLineActive]} />
              )}
            </CustomView>
          ))}

          <CustomText style={styles.progressLabel} paddingTop={0}>
            {t('progressLabel')}
          </CustomText>
        </CustomView>

        <View style={styles.section}>
          <SectionHeader
            number="1"
            title={t('basicInfo')}
            subtitle={t('basicInfoSubtitle')}
          />

          <FormField
            label={t('productName')}
            value={form.name}
            onChangeText={v => update('name', v)}
            placeholder={t('productNamePlaceholder')}
            required
            error={errors.name}
          />

          <CategorySelector
            selected={form.category}
            onSelect={v => update('category', v)}
          />

          {errors.category && (
            <CustomText
              style={[
                styles.errorText,
                {
                  marginTop: -8,
                  marginBottom: 12,
                  paddingLeft: isRTL ? 0 : 2,
                  paddingRight: isRTL ? 2 : 0,
                },
              ]}
              paddingTop={0}>
              ⚠ {errors.category}
            </CustomText>
          )}

          <FormField
            label={t('price')}
            value={form.price}
            onChangeText={v => update('price', v)}
            placeholder="0.00"
            keyboardType="decimal-pad"
            required
            prefix="$"
            hint={t('usd')}
            error={errors.price}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            number="2"
            title={t('productDetails')}
            subtitle={t('productDetailsSubtitle')}
          />

          <FormField
            label={t('description')}
            value={form.description}
            onChangeText={v => update('description', v)}
            placeholder={t('descriptionPlaceholder')}
            multiline
            numberOfLines={5}
            required
            hint={`${form.description.length} ${t('chars')}`}
            error={errors.description}
          />

          <FormField
            label={t('imageUrl')}
            value={form.imageUrl}
            onChangeText={v => update('imageUrl', v)}
            placeholder="https://images.unsplash.com/…"
            keyboardType="url"
            hint={t('optional')}
            error={errors.imageUrl}
          />

          <TagInput
            tags={form.tags}
            onAdd={tag => update('tags', [...form.tags, tag])}
            onRemove={tag => update('tags', form.tags.filter(t => t !== tag))}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            number="3"
            title={t('visibilitySettings')}
            subtitle={t('visibilitySettingsSubtitle')}
          />

          <CustomView style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <CustomText style={styles.toggleLabel} paddingTop={0}>
                {t('markAsFeatured')}
              </CustomText>

              <CustomText style={styles.toggleSub} paddingTop={0}>
                {t('markAsFeaturedSub')}
              </CustomText>
            </View>

            <Switch
              value={form.featured}
              onValueChange={v => update('featured', v)}
              trackColor={{false: COLORS.border, true: COLORS.primaryLight}}
              thumbColor={form.featured ? COLORS.primary : '#fff'}
              ios_backgroundColor={COLORS.border}
            />
          </CustomView>

          <View style={styles.summaryCard}>
            <CustomText style={styles.summaryTitle} paddingTop={0}>
              {t('previewSummary')}
            </CustomText>

            <CustomView style={styles.summaryRow}>
              <CustomText style={styles.summaryKey} paddingTop={0}>
                {t('name')}
              </CustomText>

              <CustomText style={styles.summaryVal} numberOfLines={1} paddingTop={0}>
                {form.name || '—'}
              </CustomText>
            </CustomView>

            <CustomView style={styles.summaryRow}>
              <CustomText style={styles.summaryKey} paddingTop={0}>
                {t('category')}
              </CustomText>

              <CustomText style={styles.summaryVal} paddingTop={0}>
                {form.category ? t(form.category) : '—'}
              </CustomText>
            </CustomView>

            <CustomView style={styles.summaryRow}>
              <CustomText style={styles.summaryKey} paddingTop={0}>
                {t('price')}
              </CustomText>

              <CustomText
                style={[styles.summaryVal, form.price && styles.summaryValPrice]}
                paddingTop={0}>
                {form.price ? `$${parseFloat(form.price || 0).toFixed(2)}` : '—'}
              </CustomText>
            </CustomView>

            <CustomView style={styles.summaryRow}>
              <CustomText style={styles.summaryKey} paddingTop={0}>
                {t('featured')}
              </CustomText>

              <View
                style={[
                  styles.summaryBadge,
                  form.featured && styles.summaryBadgeActive,
                ]}>
                <CustomText
                  center
                  style={[
                    styles.summaryBadgeText,
                    form.featured && styles.summaryBadgeTextActive,
                  ]}
                  paddingTop={0}>
                  {form.featured ? `✦ ${t('yes')}` : t('no')}
                </CustomText>
              </View>
            </CustomView>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnLoading]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <CustomText center style={styles.submitBtnText} paddingTop={0}>
                {t('publishProduct')}
              </CustomText>

              <CustomText center style={styles.submitBtnIcon} paddingTop={0}>
                {isRTL ? '←' : '→'}
              </CustomText>
            </>
          )}
        </TouchableOpacity>

        <CustomText center style={styles.footerNote}>
          {t('footerNote')}
        </CustomText>

        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 56,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.primary,
    marginBottom: 2,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  topBarRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  adminBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.tag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadgeText: {
    fontSize: 18,
    color: COLORS.primary,
  },

  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.border,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    marginLeft: 10,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  fieldWrapper: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  required: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputWrapperMulti: {
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 120,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginRight: 4,
  },
  inputPrefixFocused: {
    color: COLORS.primary,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
    minHeight: 24,
  },
  inputMulti: {
    minHeight: 96,
  },
  inputWithPrefix: {
    marginLeft: 4,
  },
  errorRow: {
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.tag,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
  },

  tagInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  tagTextInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  tagAddBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagAddBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  tagAddBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tag,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.tagText,
  },
  tagChipRemove: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  toggleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },

  summaryCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryKey: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: '60%',
  },
  summaryValPrice: {
    color: COLORS.primary,
    fontSize: 15,
  },
  summaryBadge: {
    backgroundColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  summaryBadgeActive: {
    backgroundColor: COLORS.tag,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  summaryBadgeTextActive: {
    color: COLORS.tagText,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  submitBtnLoading: {
    opacity: 0.8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  submitBtnIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 14,
    paddingHorizontal: 10,
  },

  successScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.success,
  },
  successIconText: {
    fontSize: 32,
    color: COLORS.success,
    fontWeight: '800',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 14,
    color: COLORS.textSub,
    lineHeight: 20,
    marginBottom: 24,
  },
  successMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  successMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  successMetaValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  successMetaDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  successBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  successBtnOutline: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
  },
  successBtnOutlineText: {
    color: COLORS.textSub,
    fontSize: 15,
    fontWeight: '600',
  },
});