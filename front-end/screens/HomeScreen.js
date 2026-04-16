import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import styles from '../src/styles/appStyles';

export default function HomeScreen({ navigation, profile }) {
  const recent = profile?.interviewHistory || [];

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('HistoryDetail', { interview: item })} style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10 }}>
      <Text style={{ fontWeight: '700' }}>{item.jobTitle || 'Sample Session'}</Text>
      <Text style={{ color: '#7f8c8d', marginTop: 4 }}>{new Date(item.date).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 16 }}>
      <View style={{ backgroundColor: '#2f80ed', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>87%</Text>
        <Text style={{ color: '#fff', marginTop: 6 }}>Confidence Score</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
  <TouchableOpacity style={{ flex: 1, marginRight: 8, padding: 16, backgroundColor: '#fff', borderRadius: 8 }} onPress={() => navigation.navigate('Live Record')}>
          <Text style={{ fontWeight: '700' }}>Record</Text>
          <Text style={{ color: '#7f8c8d', marginTop: 6 }}>Start a new session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, marginLeft: 8, padding: 16, backgroundColor: '#fff', borderRadius: 8 }} onPress={() => navigation.navigate('Profile')}>
          <Text style={{ fontWeight: '700' }}>Profile</Text>
          <Text style={{ color: '#7f8c8d', marginTop: 6 }}>View / edit profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Recent Insights</Text>
      <FlatList data={recent} keyExtractor={(i) => i.id} renderItem={renderItem} ListEmptyComponent={<Text style={{ color: '#7f8c8d' }}>No sessions yet</Text>} />
    </View>
  );
}
