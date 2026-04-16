import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@recruitme_users';
const CURRENT_USER_KEY = '@recruitme_current_user';

export const authService = {
  async checkLoginStatus() {
    try {
      const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error checking login status:', error);
      return null;
    }
  },

  async signup(username, password, fullName) {
    try {
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users = usersData ? JSON.parse(usersData) : {};

      if (users[username]) {
        throw new Error('Username already exists');
      }

      const newUser = {
        username,
        password, // In production, hash this!
        fullName,
        createdAt: new Date().toISOString(),
      };

      users[username] = newUser;
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

      // Print all stored users to console
      console.log('=== ALL STORED USERS ===');
      Object.values(users).forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Password: ${user.password}`);
        console.log(`  Full Name: ${user.fullName}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log('---');
      });
      console.log('========================');

      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async login(username, password) {
    try {
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users = usersData ? JSON.parse(usersData) : {};

      const user = users[username];
      if (!user || user.password !== password) {
        throw new Error('Invalid username or password');
      }

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async logout() {
    try {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};