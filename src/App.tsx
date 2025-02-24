import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { AreasProvider } from './contexts/AreasContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { SharedGoalsProvider } from './contexts/SharedGoalsContext';
import { WeeklyPlanningProvider } from './contexts/WeeklyPlanningContext';
import AppRoutes from './routes';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="goal-todo-theme">
      <AuthProvider>
        <FirestoreProvider>
          <AreasProvider>
            <GoalsProvider>
              <SharedGoalsProvider>
                <WeeklyPlanningProvider>
                  <AppRoutes />
                  <Toaster />
                </WeeklyPlanningProvider>
              </SharedGoalsProvider>
            </GoalsProvider>
          </AreasProvider>
        </FirestoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
