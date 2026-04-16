import AsyncStorage from '@react-native-async-storage/async-storage';

export const profileService = {
  async loadProfile(username) {
    try {
      const profileData = await AsyncStorage.getItem(`@profile_${username}`);
      if (profileData) {
        return JSON.parse(profileData);
      }
      return {
        name: '',
        currentJobIndustry: '',
        currentJobTitle: '',
        targetJobIndustry: '',
        targetJobIndustryName: 'Please select an option',
        targetJobTitle: '',
        resumeUploaded: false,
        interviewHistory: [],
      };
    } catch (error) {
      console.error('Error loading profile:', error);
      return {
        name: '',
        currentJobIndustry: '',
        currentJobTitle: '',
        targetJobIndustry: '',
        targetJobIndustryName: 'Please select an option',
        targetJobTitle: '',
        resumeUploaded: false,
        interviewHistory: [],
      };
    }
  },

  async saveProfile(username, profile) {
    try {
      const profileData = {
        ...profile,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`@profile_${username}`, JSON.stringify(profileData));
      return { success: true };
    } catch (error) {
      console.error('Error saving profile:', error);
      return { success: false, error: error.message };
    }
  },

  async updateResumeData(username, resumeData) {
    try {
      const profile = await this.loadProfile(username);
      const updatedProfile = {
        ...profile,
        name: resumeData.name || profile.name,
        currentJobIndustry: resumeData.currentJobIndustry || profile.currentJobIndustry,
        currentJobTitle: resumeData.currentJobTitle || profile.currentJobTitle,
        resumeUploaded: true,
      };
      await this.saveProfile(username, updatedProfile);
      return { success: true, profile: updatedProfile };
    } catch (error) {
      console.error('Error updating resume data:', error);
      return { success: false, error: error.message };
    }
  },

  async addInterviewToHistory(username, interview) {
    try {
      const profile = await this.loadProfile(username);
      const newInterview = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        ...interview,
      };
      
      profile.interviewHistory = [newInterview, ...(profile.interviewHistory || [])];
      await this.saveProfile(username, profile);
      return { success: true, interview: newInterview };
    } catch (error) {
      console.error('Error adding interview to history:', error);
      return { success: false, error: error.message };
    }
  },
};