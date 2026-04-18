import api from './axios';

export const getExecutionSequence = (userId) =>
  api.get(`/tasks/sequence/${userId}`);
