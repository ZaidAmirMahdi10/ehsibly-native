import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const busMock = [
  { id: '1', route: 'Route 1', driver: 'Ahmed', students: 12 },
  { id: '2', route: 'Route 2', driver: 'Fatima', students: 9 },
];

export default function AdminScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <FlatList
        data={busMock}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.route}>🚍 {item.route}</Text>
            <Text style={styles.detail}>Driver: {item.driver}</Text>
            <Text style={styles.detail}>Students: {item.students}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff8f0' },
  header: { fontSize: 26, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  route: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  detail: { fontSize: 16, marginBottom: 3 },
});
