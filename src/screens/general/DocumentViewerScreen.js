import React, {useContext, useEffect, useState} from 'react';
import {StatusBar, StyleSheet, TouchableOpacity, View, Image} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import RNFS from 'react-native-fs';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {fromByteArray} from 'base64-js';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import apiClient from '../../services/apiClient';
import {COLORS} from '../../constants/theme';

// Base cosmetic top padding for the header — kept as a raw constant (not
// read back off styles.header) since StyleSheet.create() output isn't
// guaranteed to still expose plain numeric fields at render time.
const HEADER_BASE_PADDING_TOP = 12;

const extensionForContentType = contentType => {
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'bin';
};

// The backend's file route (getInvoiceFile/:docId) isn't a presigned URL —
// it streams the file through an auth-gated endpoint. Confirmed dead ends
// before landing here:
// 1. react-native-webview doesn't reliably attach custom source.headers on
//    iOS — with headers set, WKWebView never even navigates.
// 2. A base64 data: URI crashes outright on iOS — WebView's cookie-sync
//    path force-routes non-http(s) sources through
//    `-[WKWebView loadFileURL:]`, which throws for anything but file://.
// 3. A real file:// URL fixed iOS (plus needing originWhitelist={['*']} —
//    file:// isn't in WebView's default whitelist), but on Android,
//    WebView has no built-in PDF renderer at all — it just shows blank,
//    no error, for a local PDF (unlike iOS's WKWebView, which uses PDFKit
//    automatically). allowFileAccess alone didn't fix that; it's a
//    fundamentally different limitation, not a permissions issue.
// So: fetch the bytes through apiClient (proven reliable on both
// platforms), write them to a real temp file, and hand that off to a
// dedicated renderer per type — react-native-pdf (PDFium/PDFKit-backed,
// not a browser engine) for PDFs, plain Image for pictures.
const DocumentViewerScreen = () => {
  const {t} = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const insets = useSafeAreaInsets();
  const {url, title} = route.params;

  const [fileUri, setFileUri] = useState(null);
  const [isPdf, setIsPdf] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get(url, {responseType: 'arraybuffer'});
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const base64 = fromByteArray(new Uint8Array(response.data));
      const ext = extensionForContentType(contentType);
      const path = `${RNFS.CachesDirectoryPath}/doc-preview-${Date.now()}.${ext}`;
      await RNFS.writeFile(path, base64, 'base64');
      setIsPdf(contentType.includes('pdf'));
      setFileUri(`file://${path}`);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <View
        style={[
          styles.header,
          {flexDirection: isRTL ? 'row-reverse' : 'row', paddingTop: HEADER_BASE_PADDING_TOP + insets.top},
        ]}>
        <TouchableOpacity style={styles.closeBtn} onPress={navigation.goBack} activeOpacity={0.7}>
          <CustomText style={styles.closeIcon} paddingTop={0}>
            ✕
          </CustomText>
        </TouchableOpacity>
        <CustomText bold style={styles.title} numberOfLines={1}>
          {title}
        </CustomText>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <LoadingState />
        </View>
      ) : error ? (
        <ErrorState message={t('documentLoadErrorMessage')} onRetry={load} />
      ) : isPdf ? (
        <Pdf source={{uri: fileUri}} style={styles.flex} onError={() => setError(true)} />
      ) : (
        <Image
          source={{uri: fileUri}}
          style={styles.flex}
          resizeMode="contain"
          onError={() => setError(true)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.bg},
  flex: {flex: 1},
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingTop: HEADER_BASE_PADDING_TOP,
    paddingBottom: 12,
    alignItems: 'center',
    columnGap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {color: '#fff', fontSize: 16, lineHeight: 18},
  title: {flex: 1, color: '#fff', fontSize: 15},
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
});

export default DocumentViewerScreen;
