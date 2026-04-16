import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InterviewHistory({ history }) {
  if (history.length === 0) return null;

  return (
    <View style={styles.historyBox}>
      <Text style={styles.sectionTitle}>Interview History ({history.length})</Text>
      {history.slice(0, 3).map((interview) => (
        <View key={interview.id} style={styles.historyItem}>
          <Text style={styles.historyDate}>
            {new Date(interview.date).toLocaleDateString()}
          </Text>
          <Text style={styles.historyDetails}>
            {interview.jobTitle} - {interview.industry}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  historyBox: {
    margin: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  historyDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  historyDetails: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
});