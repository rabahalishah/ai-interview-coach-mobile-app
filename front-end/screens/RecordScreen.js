import React, { useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import { useAudioRecorder, RecordingPresets, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;


// Strict system prompt: require valid JSON only
const systemPrompt = `You are an Interview Help Coach for job candidates. 
Your role is to analyze interview recordings and provide constructive feedback.

Your tasks:
1. Identify the interviewer and candidate responses
2. Ensure responses are relevant to the job industry and job title. 
3. Analyze the candidate's answers for quality, tone, and enthusiasm
4. Provide areas of opportunity and strengths
5. Give specific recommendations for improvement
6. Be encouraging and help the candidate improve their interview skills.
7. If you do not have enough context to provide a meaningful answer, return a JSON object with a "needsMoreInfo" field set to true and a helpful message.

Return your response as a single valid JSON object with the following fields:
{
  "transcript": "Paste the full transcript here, using <INTERVIEWER> and <CANDIDATE> tags to separate responses.",
  "score": number (overall score out of 5),
  "opportunities": ["Area 1", "Area 2", "Area 3"],
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "scoringChart": { "Clarity": number, "Confidence": number, "Tone": number, "Enthusiasm": number, "Specificity": number },
  "needsMoreInfo": boolean (optional),
  "message": string (optional)
}
Return only valid JSON. Do not include any explanation or text outside the JSON.`;

;

export default function RecordScreen({ profile, setProfile, sessionType = 'live', navigation }) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [output, setOutput] = useState('Ready to record');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [llmResponse, setLlmResponse] = useState('');

  const record = async () => {
    // Allow recording even if user hasn't uploaded a resume or filled profile.
    // Recording is optional and users can upload later if desired.
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setOutput('Recording in progress...');
    setLlmResponse('');
  };

  const stopRecording = async () => {
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    setOutput('Recording stopped! Starting transcription...');
    if (uri) await transcribeAudio(uri);
  };

  const transcribeAudio = async (uri) => {
    try {
      setIsTranscribing(true);
      setOutput('Transcribing audio...');

      const formData = new FormData();
      formData.append('file', { uri: uri, type: 'audio/mp4', name: 'recording.m4a' });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Transcription failed');
      }

      const data = await response.json();
      // const transcription = data.text;
      const transcription = 'Why are you interested in this company? I have always been a hard working individual who has a nack for problem solving and thrives in collaborative environments. I believe this company values innovation and teamwork, which aligns perfectly with my own professional values and aspirations. Thank you.';

      setOutput(`Transcription:\n\n${transcription}`);

      await analyzeWithLLM(transcription);
    } catch (error) {
      console.error('Transcription error:', error);
      setOutput(`Error: ${error.message}`);
      Alert.alert('Transcription Error', error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const analyzeWithLLM = async (transcription) => {
    try {
      setOutput(`Analyzing with AI Coach`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcription }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'LLM analysis failed');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      console.log('LLM response:', aiResponse); // Debug log
      setLlmResponse(aiResponse);

      // Parse JSON from LLM response
      let parsed = null;
      try {
        parsed = JSON.parse(aiResponse);
      } catch (e) {
        console.error('Failed to parse LLM JSON:', e, aiResponse);
        Alert.alert('AI Error', 'Failed to parse AI response.');
        return;
      }

      if (parsed.needsMoreInfo) {
        Alert.alert('AI Needs More Info', parsed.message || 'Please provide a more complete transcript.');
        return;
      }

      const newInterview = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        industry: profile.targetJobIndustryName,
        jobTitle: profile.targetJobTitle,
        transcription: parsed.transcript || transcription,
        feedback: parsed.opportunities ? parsed.opportunities.join('\n') : '',
        strengths: parsed.strengths ? parsed.strengths.join('\n') : '',
        sessionType: sessionType === 'practice' ? 'Practice' : 'Live Record',
        duration: '3m 21s', // dummy duration
        score: parsed.score ? Math.round(Number(parsed.score)) : null,
        scoringChart: parsed.scoringChart || {},
      };
      setProfile(prev => ({ ...prev, interviewHistory: [newInterview, ...prev.interviewHistory] }));

      // After saving, navigate to History and open the new session
      setTimeout(() => {
        if (navigation && navigation.navigate) {
          navigation.navigate('History');
          setTimeout(() => {
            navigation.navigate('HistoryDetail', { interview: newInterview });
          }, 300);
        }
      }, 300);
    } catch (error) {
      console.error('LLM analysis error:', error);
      setLlmResponse(`Error analyzing response: ${error.message}`);
      Alert.alert('Analysis Error', error.message);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <View style={{ marginBottom: 12 }}>
        <Button title={recorderState.isRecording ? 'Stop Recording' : 'Start Recording'} onPress={recorderState.isRecording ? stopRecording : record} disabled={isTranscribing} />
        {/* Resume upload is optional — users may record without uploading a resume */}
      </View>

      {isTranscribing && (
        <View style={{ marginTop: 12 }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Processing...</Text>
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Transcription:</Text>
        <Text>{output}</Text>
      </View>

      {llmResponse !== '' && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700' }}>AI Coach Feedback:</Text>
          <Text>{llmResponse}</Text>

        </View>
      )}
    </View>
  );
}
