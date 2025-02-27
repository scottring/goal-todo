import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { useAreas } from '../hooks/useAreas';
import { useGoalsContext } from '../contexts/GoalsContext';
import { Area } from '../types';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';

const AreaDetailsPage: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { getAreaById, loading: areasLoading } = useAreas();
  const { goals, loading: goalsLoading, deleteGoal } = useGoalsContext();
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    console.log('useEffect triggered, Area ID from URL:', areaId);
    if (areaId) {
      getAreaById(areaId)
        .then(area => {
          if (area) {
            setArea(area);
            console.log('Fetched Area:', area);
          } else {
            console.error("Area not found");
            setArea(null);
          }
        })
        .catch(error => console.error("Error fetching area:", error));
    }
  }, [areaId, getAreaById]);

  const areaGoals = goals.filter(goal => goal.areaId === areaId);
  console.log('Area Goals:', areaGoals);

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  const handleCardClick = (goalId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/goals/${goalId}`);
  };

  if (areasLoading || goalsLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/areas')} aria-label="Back to Areas">
            <ArrowLeft />
          </IconButton>
          <Box>
            {area && (
              <>
                <Typography variant="h4" component="h1" gutterBottom>
                  {area.name}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {area.description}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Goals in this Area</Typography>
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={() => area && navigate('/goals', { state: { preselectedAreaId: area.id } })}
            >
              Add Goal
            </Button>
          </Box>

          {areaGoals.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                No goals in this area yet
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {areaGoals.map((goal: any) => (
                <Grid item xs={12} md={6} key={goal.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      borderLeft: `4px solid ${area?.color || '#000000'}`,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: (theme) => theme.shadows[4]
                      }
                    }}
                    onClick={(e) => handleCardClick(goal.id, e)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="h6" component="h3">
                            {goal.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            onClick={(e) => { e.stopPropagation(); handleCardClick(goal.id, e); }}
                            aria-label="Edit goal"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }}
                            aria-label="Delete goal"
                            color="error"
                          >
                            <Trash2 fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {goal.description}
                      </Typography>
                      {goal.deadline && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: 'text.secondary' }}>
                          <Calendar style={{ marginRight: 4, width: 16, height: 16 }} />
                          {new Date(goal.deadline).toLocaleDateString()}
                        </Box>
                      )}
                      {goal.milestones && goal.milestones.length > 0 && (
                        <Box mt={2}>
                          <Typography variant="subtitle2">Milestones:</Typography>
                          <List dense>
                            {goal.milestones.map((milestone: any) => (
                              <ListItem key={milestone.id}>
                                <ListItemIcon>
                                  <ArrowForwardIos style={{ fontSize: 14 }} />
                                </ListItemIcon>
                                <ListItemText primary={milestone.name} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </ErrorBoundary>
  );
};

export default AreaDetailsPage;
