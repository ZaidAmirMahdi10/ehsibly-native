import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  I18nManager,
} from 'react-native';

const transfers = [
  {
    id: 'YT20250503',
    company: 'شركة خيال الأمان للتجارة',
    date: '2026-03-14',
    status: 'تم الإرسال إلى البوالص',
    statusColor: '#4A90E2',
    creator: 'لا يوجد',
    auditor: 'لا يوجد',
    payment: '0%',
  },
  {
    id: '61-2026',
    company: 'شركة السقف للتجارة العامة',
    date: '2026-04-19',
    status: 'مقبولة',
    statusColor: '#35A853',
    creator: 'Hayder Hameed',
    auditor: 'لا يوجد',
    payment: '0%',
  },
  {
    id: 'cj260422',
    company: 'شركة نبع الرشيد للتجارة',
    date: '2026-04-22',
    status: 'هناك دفعة غير منفذة',
    statusColor: '#F4C400',
    creator: 'لا يوجد',
    auditor: 'لا يوجد',
    payment: '0%',
  },
];

export default function BankTransfersScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>طلبات حوالات</Text>
        <Text style={styles.subtitle}>المستخدم: Zahraa Adil</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.greenButton]}>
            <Text style={styles.actionText}>تصدير إلى إكسل</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.blueButton]}>
            <Text style={styles.actionText}>طباعة</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.whiteButton]}>
            <Text style={styles.purpleText}>فلترة</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.sectionTitle}>الفلاتر</Text>

        <FilterRow label="المعاملات" value="جميع المعاملات" />
        <FilterRow label="الشركات" value="جميع الشركات" />
        <FilterRow label="المرسل" value="All" />
        <FilterRow label="المستفيد" value="All" />

        <Text style={styles.searchLabel}>البحث بواسطة رقم الفاتورة</Text>

        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchText}>بحث</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="البحث بواسطة رقم الفاتورة"
            placeholderTextColor="#999"
            style={styles.input}
            textAlign="right"
          />
        </View>

        <View style={styles.checkboxRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkboxText}>تضمين المعاملات المكتملة</Text>
        </View>

        <View style={styles.checkboxRow}>
          <View style={styles.checkbox} />
          <Text style={styles.checkboxText}>تضمين المعاملات المرفوضة</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>المعاملات المصرفية</Text>
        <Text style={styles.countText}>{transfers.length} طلبات</Text>
      </View>

      {transfers.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.invoice}>{item.id}</Text>
            <View style={[styles.badge, {backgroundColor: item.statusColor}]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>

          <Text style={styles.company}>{item.company}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{item.date}</Text>
            <Text style={styles.infoLabel}>تاريخ آخر دفعة</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{item.creator}</Text>
            <Text style={styles.infoLabel}>المنشئ</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{item.auditor}</Text>
            <Text style={styles.infoLabel}>المدقق</Text>
          </View>

          <View style={styles.paymentBox}>
            <Text style={styles.paymentText}>المدفوع: {item.payment}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function FilterRow({label, value}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterValue}>⌄  {value}</Text>
      <Text style={styles.filterLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F8',
    padding: 16,
  },

  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7D3C98',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    textAlign: 'right',
  },

  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    marginTop: 8,
  },

  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 20,
  },

  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  greenButton: {
    backgroundColor: '#65B957',
  },

  blueButton: {
    backgroundColor: '#4DA3F5',
  },

  whiteButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#8E44AD',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },

  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  purpleText: {
    color: '#7D2DA8',
    fontWeight: '800',
    fontSize: 13,
  },

  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E7E1EA',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    textAlign: 'right',
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },

  filterValue: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 8,
    padding: 11,
    color: '#333',
    textAlign: 'right',
    backgroundColor: '#FAFAFA',
  },

  filterLabel: {
    width: 85,
    fontSize: 14,
    color: '#222',
    textAlign: 'right',
  },

  searchLabel: {
    textAlign: 'right',
    fontSize: 14,
    color: '#222',
    marginTop: 8,
    marginBottom: 8,
  },

  searchRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
  },

  searchButton: {
    width: 90,
    backgroundColor: '#7D2DA8',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  checkboxRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 8,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#777',
    borderRadius: 3,
    marginLeft: 8,
  },

  checkboxText: {
    fontSize: 14,
    color: '#333',
  },

  listHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  countText: {
    color: '#777',
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  cardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  invoice: {
    color: '#7D2DA8',
    fontWeight: '800',
    fontSize: 15,
    textDecorationLine: 'underline',
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    maxWidth: 150,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  company: {
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  infoLabel: {
    color: '#777',
    fontSize: 13,
    textAlign: 'right',
  },

  infoValue: {
    color: '#111',
    fontSize: 13,
    fontWeight: '600',
  },

  paymentBox: {
    marginTop: 12,
    backgroundColor: '#F4F4F4',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  paymentText: {
    fontWeight: '800',
    color: '#111',
  },
});