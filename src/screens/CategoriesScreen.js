import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const timelineMock = [
  { id: '1', message: 'Ali picked up at 07:15' },
  { id: '2', message: 'Ali dropped at school at 07:45' },
  { id: '3', message: 'Ali picked up from school at 14:00' },
  { id: '4', message: 'Ali dropped at home at 14:30' },
];

export default function ParentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Parent Timeline</Text>
      <FlatList
        data={timelineMock}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.item}>{item.message}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#eef6ff' },
  header: { fontSize: 26, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, elevation: 2 },
  bullet: { fontSize: 20, marginRight: 8, color: '#007bff' },
  item: { fontSize: 18 },
});
