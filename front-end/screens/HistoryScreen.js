import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

export default function HistoryScreen({ navigation, profile }) {
  const items = profile?.interviewHistory || [];

  const renderItem = ({ item }) => {
  // Use score from LLM response, out of 5
  let score = item.score !== undefined ? item.score : 0;
    return (
      <TouchableOpacity
        onPress={() => {
          const interviewWithTranscript = {
            ...item,
            transcription: item.transcription || item.transcript || 'Interviewer: Can you tell me about a time you handled a difficult situation?\nYou: I led a project where...',
          };
          navigation.navigate('HistoryDetail', { interview: interviewWithTranscript });
        }}
        style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700' }}>{item.jobTitle || 'Session'}</Text>
              {item.sessionType && (
                <View style={{ marginLeft: 8, backgroundColor: item.sessionType === 'Practice' ? '#f3e8ff' : '#e0f7fa', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: item.sessionType === 'Practice' ? '#7c3aed' : '#00838f', fontSize: 12, fontWeight: '700' }}>{item.sessionType}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#7f8c8d', marginTop: 4 }}>
              {(() => {
                const d = new Date(item.date);
                const hh = d.getHours().toString().padStart(2, '0');
                const mm = d.getMinutes().toString().padStart(2, '0');
                // Dummy duration, or use item.duration if present
                const duration = item.duration || '3m 21s';
                return `${hh}:${mm}, ${duration}`;
              })()}
            </Text>
          </View>
          <View style={{ alignItems: 'center', marginLeft: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0b2545' }}>{score}</Text>
            <Text style={{ fontSize: 12, color: '#9aa6b8' }}>/5</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>History</Text>
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} ListEmptyComponent={<Text style={{ color: '#7f8c8d' }}>No history yet</Text>} />
    </View>
  );
}
