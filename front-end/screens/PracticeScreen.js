import React from 'react';
import RecordScreen from './RecordScreen';

// PracticeScreen mimics RecordScreen but passes sessionType="practice"
export default function PracticeScreen(props) {
  return <RecordScreen {...props} sessionType="practice" />;
}
