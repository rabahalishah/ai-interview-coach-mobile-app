import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { RadarChart } from 'react-native-gifted-charts';

// Radar chart using react-native-gifted-charts
function SkillRadarChart({ scoringChart }) {
  const categories = ['Clarity', 'Confidence', 'Tone', 'Enthusiasm', 'Specificity'];
  const values = categories.map(cat => scoringChart[cat] || 0);
  
  const data = categories.map((cat, index) => ({
    value: scoringChart[cat] || 0,
  }));

return (
    <View style={{ alignItems: 'center', paddingVertical: 5 }}>
      <RadarChart
        data={values}
        labels= {categories}
        maxValue={5}
        // Blue stroke only - no fill/shading
        strokeColor="#3b82f6"
        strokeWidth={2.5}
        frontColor="transparent" // Remove fill
        gradientColor="transparent" // Remove gradient
        fillColor="transparent" // Remove all shading
        // Data points
        dataPointsColor="#2563eb"
        dataPointsRadius={5}
        dataPointsWidth={2}
        // Grid - bolder dotted lines
        gridColor="#000000ff"
        gridStrokeWidth={10}
        gridType="dotted" // Make grid lines dashed/dotted
        // Chart dimensions - centered and straight
        chartSize={300}
        // Labels
        labelsConfig={{
          fontSize: 20,
          fontWeight: '600',
          color: '#1f2937',
        }}
        axisLabels={categories}
        axisLabelFontSize={20}
        axisLabelColor="#111827"
        axisLabelFontWeight="700"
        // Remove any 3D/perspective effects
        isAnimated={false}
        is3D={true}
        noGradient={true}
        hideOrigin={false}
        // Alignment
        rotation={0} // Start from top (0 degrees)
        startAngle={90} // Adjust to make it perfectly straight
      />
    </View>
  );
}

import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import styles from '../src/styles/appStyles';

function parseMessages(transcription) {
  if (!transcription) return [];
  const lines = transcription.split('\n').map(l => l.trim()).filter(Boolean);
  const messages = [];
  lines.forEach(line => {
    if (line.toLowerCase().startsWith('interviewer:')) {
      messages.push({ role: 'interviewer', text: line.replace(/interviewer:/i, '').trim() });
    } else if (line.toLowerCase().startsWith('you:')) {
      messages.push({ role: 'you', text: line.replace(/you:/i, '').trim() });
    } else {
      // continuation of previous message
      if (messages.length) messages[messages.length - 1].text += '\n' + line;
    }
  });
  return messages;
}

export default function HistoryDetailScreen({ route }) {
  const { interview } = route.params || {};
  const [showReport, setShowReport] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [sessionName, setSessionName] = useState(interview?.jobTitle || 'Session Detail');
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState(interview?.transcription || interview?.transcript || interview?.transcriptionText || '');

  // Use structured interview fields
  const score = interview?.score ?? 'N/A'; // out of 5
  const strengths = interview?.strengths ?? '';
  const opportunities = interview?.feedback ?? '';
  const scoringChart = interview?.scoringChart ?? {};
  const transcriptToShow = interview?.transcription || '';

  // Parse transcript into bubbles (split by <INTERVIEWER> and <CANDIDATE> tags)
  function parseTranscriptBubbles(transcript) {
    if (!transcript) return [];
    const regex = /<(INTERVIEWER|CANDIDATE)>\s*([^<]*)/gi;
    const bubbles = [];
    let match;
    while ((match = regex.exec(transcript)) !== null) {
      bubbles.push({ role: match[1], text: match[2].trim() });
    }
    return bubbles;
  }
  const bubbles = parseTranscriptBubbles(transcriptToShow);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.detailHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            {editingName ? (
              <TextInput
                value={sessionName}
                onChangeText={setSessionName}
                style={{ fontSize: 22, fontWeight: '700', borderBottomWidth: 1, borderColor: '#e0e0e0' }}
                onBlur={() => setEditingName(false)}
                autoFocus
              />
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)}>
                <Text style={{ fontSize: 22, fontWeight: '700' }}>{sessionName}</Text>
              </TouchableOpacity>
            )}
            <Text style={{ color: '#7f8c8d', marginTop: 6 }}>{new Date(interview?.date).toLocaleString()}</Text>
          </View>
        </View>
        {/* Show session type tag */}
        {interview?.sessionType && (
          <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: interview.sessionType === 'Practice' ? '#f3e8ff' : '#e0f7fa', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: interview.sessionType === 'Practice' ? '#7c3aed' : '#00838f', fontSize: 12, fontWeight: '700' }}>{interview.sessionType}</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 16 }}>
        {/* Mock playback bar */}
        <View style={styles.playBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>▶  </Text>
            <View style={{ flex: 1, height: 6, backgroundColor: '#e6eefb', borderRadius: 3, marginHorizontal: 12 }}>
              <View style={{ width: '40%', height: 6, backgroundColor: '#2f80ed', borderRadius: 3 }} />
            </View>
            <Text style={{ color: '#7f8c8d' }}>{'04:20'}</Text>
          </View>
          </View>

          {/* View Full Transcript toggle and report panel */}
          <View style={{ marginTop: 18 }}>
            <TouchableOpacity onPress={() => setShowReport(!showReport)} style={[styles.reportButton, { alignSelf: 'flex-end' }]}> 
              <Text style={styles.reportButtonText}>{showReport ? 'View Full Transcript' : 'View Report'}</Text>
            </TouchableOpacity>

            {showReport ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.scoreCard}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>OVERALL SCORE</Text>
                  <Text style={styles.scoreNumber}>{score}
                    <Text style={{ fontSize: 18, color: '#9aa6b8' }}>/5</Text></Text>
                  <Text style={styles.percentText}>Top 5% of candidates</Text>
                </View>

                {/* Radar chart for scoringChart */}
                <View style={styles.radarCard}>
                  <Text style={{ fontWeight: '700', marginBottom: 4 }}>Skill Breakdown</Text>
                  <SkillRadarChart scoringChart={scoringChart} />
                </View>

                {/* Strengths Section */}
                <View style={{ marginTop: 10, backgroundColor: '#e6f4ea', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 4 }}>Strengths</Text>
                  <Text style={{ color: '#166534' }}>{strengths}</Text>
                </View>

                {/* Opportunities Section */}
                <View style={{ marginTop: 10, backgroundColor: '#fbeee6', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 4 }}>Opportunities</Text>
                  <Text style={{ color: '#b91c1c' }}>{opportunities}</Text>
                </View>
              </View>
            ) : null}
          </View>
      </View>

      {/* Transcript section, hidden by default, shown when toggled */}
      {!showReport && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, flex: 1 }}>Transcript</Text>
            {editingTranscript ? (
              <TouchableOpacity onPress={() => setEditingTranscript(false)}>
                <Text style={{ color: '#2f80ed', fontWeight: '700' }}>Done</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditingTranscript(true)}>
                <Text style={{ color: '#2f80ed', fontWeight: '700' }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingTranscript ? (
            <TextInput
              value={transcriptText}
              onChangeText={setTranscriptText}
              multiline
              style={{ minHeight: 120, backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 15, color: '#1f2937' }}
            />
          ) : (
            <>
              {bubbles.length === 0 && (
                <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8 }}>
                  <Text style={{ color: '#7f8c8d' }}>No transcript available</Text>
                </View>
              )}
              {bubbles.map((m, idx) => (
                <View key={idx} style={[styles.messageRow, { alignItems: m.role === 'CANDIDATE' ? 'flex-end' : 'flex-start' }]}> 
                  <Text style={styles.roleLabel}>{m.role === 'CANDIDATE' ? 'YOU' : 'INTERVIEWER'}</Text>
                  <View style={m.role === 'CANDIDATE' ? styles.youBubble : styles.interviewerBubble}>
                    <Text style={{ color: '#1f2937' }}>{m.text}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
          <TouchableOpacity style={[styles.reportButton, { marginTop: 12, alignSelf: 'flex-end', opacity: editingTranscript ? 1 : 0.5 }]} disabled={!editingTranscript}>
            <Text style={styles.reportButtonText}>Resubmit to AI (coming soon)</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
