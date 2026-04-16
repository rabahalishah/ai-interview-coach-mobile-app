import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function ProfileForm({
  profile = {
    name: '',
    currentJobIndustry: '',
    currentJobTitle: '',
    resumeUploaded: false,
  },
  targetJobIndustryName,
  targetJobTitle,
  setTargetJobTitle,
  industries,
  loadingIndustries,
  showIndustryModal,
  setShowIndustryModal,
  onIndustrySelect,
  onResumeUpload,
}) {
  const [isUploading, setIsUploading] = useState(false);

  const pickDocument = async () => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'cancel' || result.canceled) {
        setIsUploading(false);
        return;
      }

      const file = result.assets ? result.assets[0] : result;
      await onResumeUpload(file);
      setIsUploading(false);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Resume Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Upload Your Resume</Text>
        <Text style={styles.helperText}>
          Upload your resume to extract your current job information
        </Text>
        
        <TouchableOpacity 
          style={[styles.uploadButton, profile.resumeUploaded && styles.uploadButtonSuccess]}
          onPress={pickDocument}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {profile.resumeUploaded ? '✓ Resume Uploaded - Upload New' : '📄 Upload Resume (PDF/Word)'}
            </Text>
          )}
        </TouchableOpacity>

        {profile.resumeUploaded && (
          <View style={styles.extractedInfo}>
            <Text style={styles.extractedTitle}>Extracted Information:</Text>
            <Text style={styles.extractedText}>Name: {profile.name || 'Not found'}</Text>
            <Text style={styles.extractedText}>Current Industry: {profile.currentJobIndustry || 'Not found'}</Text>
            <Text style={styles.extractedText}>Current Job Title: {profile.currentJobTitle || 'Not found'}</Text>
          </View>
        )}
      </View>

      {/* Target Job Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Set Your Target Role</Text>
        
        <Text style={styles.label}>Target Job Industry:</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowIndustryModal(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {loadingIndustries ? 'Loading industries...' : targetJobIndustryName || 'Select target industry'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal visible={showIndustryModal} transparent={true} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Target Industry</Text>
                <TouchableOpacity onPress={() => setShowIndustryModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={industries}
                keyExtractor={(item) => item.id}
                scrollEnabled={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.industryItem}
                    onPress={() => onIndustrySelect(item)}
                  >
                    <Text style={styles.industryItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Target Job Title:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter target job title (e.g., Senior Software Engineer)"
          value={targetJobTitle}
          onChangeText={setTargetJobTitle}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  section: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonSuccess: {
    backgroundColor: '#27ae60',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  extractedInfo: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  extractedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 6,
  },
  extractedText: {
    fontSize: 13,
    color: '#2e7d32',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
    paddingLeft: 10,
  },
  industryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  industryItemText: {
    fontSize: 14,
    color: '#333333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#f9f9f9',
  },
});