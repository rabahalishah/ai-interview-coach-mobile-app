import React, { useState } from 'react';
import { View } from 'react-native';
import ProfileForm from '../components/ProfileForm';

export default function ProfileScreen({ profile, setProfile }) {
  const [targetJobTitle, setTargetJobTitle] = useState(profile.targetJobTitle || '');
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [loadingIndustries, setLoadingIndustries] = useState(false);

  // Optionally, you can fetch industries here if needed

  return (
    <View style={{ flex: 1 }}>
      <ProfileForm
        profile={profile}
        targetJobIndustryName={profile.targetJobIndustryName}
        targetJobTitle={targetJobTitle}
        setTargetJobTitle={setTargetJobTitle}
        industries={industries}
        loadingIndustries={loadingIndustries}
        showIndustryModal={showIndustryModal}
        setShowIndustryModal={setShowIndustryModal}
        onIndustrySelect={() => setShowIndustryModal(false)}
        onResumeUpload={() => {}}
      />
    </View>
  );
}
