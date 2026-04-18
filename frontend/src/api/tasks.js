import api from './axios'

export const getTasks = (params = {}) => 
  api.get('/tasks', { params })

export const getTasksByUser = (userId) => 
  api.get(`/tasks/user/${userId}`)

export const createTask = (data) => 
  api.post('/tasks', data)

export const updateTask = (id, data) => 
  api.patch(`/tasks/${id}`, data)

export const deleteTask = (id) => 
  api.delete(`/tasks/${id}`)

export const markTaskDone = (id) =>
  api.patch(`/tasks/${id}`, { status: 'done' })
