import { create } from 'zustand';

const MOCK_USERS = [
  { id: 1, name: 'Alice', role: 'team_member' },
  { id: 2, name: 'Bob', role: 'manager' },
  { id: 3, name: 'Charlie', role: 'teacher' }
];

const useUserStore = create((set) => ({
  users: MOCK_USERS,
  currentUser: MOCK_USERS[0],
  setCurrentUser: (user) => set({ currentUser: user }),
}));

export default useUserStore;
