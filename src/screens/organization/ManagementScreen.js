import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

import CustomText from '../../components/CustomText';
import SegmentedTabs from '../../components/SegmentedTabs';
import SubCompaniesSection from './management/SubCompaniesSection';
import SuppliersSection from './management/SuppliersSection';
import BanksSection from './management/BanksSection';
import {COLORS} from '../../constants/theme';

const SECTIONS = {
  SUBCOMPANIES: 'subcompanies',
  SUPPLIERS: 'suppliers',
  BANKS: 'banks',
};

const ManagementScreen = () => {
  const {t} = useTranslation();
  const [section, setSection] = useState(SECTIONS.SUBCOMPANIES);

  const tabs = [
    {key: SECTIONS.SUBCOMPANIES, label: t('subCompaniesTab')},
    {key: SECTIONS.SUPPLIERS, label: t('suppliersTab')},
    {key: SECTIONS.BANKS, label: t('banksTab')},
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <CustomText bold center style={styles.title}>
        {t('managementTab')}
      </CustomText>
      <SegmentedTabs tabs={tabs} value={section} onChange={setSection} />
      <View style={styles.body}>
        {section === SECTIONS.SUBCOMPANIES ? (
          <SubCompaniesSection />
        ) : section === SECTIONS.SUPPLIERS ? (
          <SuppliersSection />
        ) : (
          <BanksSection />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: COLORS.bg},
  title: {fontSize: 18, color: COLORS.text, marginTop: 10},
  body: {flex: 1},
});

export default ManagementScreen;
