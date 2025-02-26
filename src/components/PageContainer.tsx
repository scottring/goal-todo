import React from 'react';
import { Box, Container, Typography, Paper, useTheme, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  noPadding?: boolean;
  noPaper?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  children,
  action,
  breadcrumbs,
  maxWidth = 'lg',
  noPadding = false,
  noPaper = false
}) => {
  const theme = useTheme();

  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs 
          separator={<ChevronRight size={16} />} 
          aria-label="breadcrumb"
          sx={{ mb: 2 }}
        >
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast || !item.path ? (
              <Typography key={index} color="text.primary" fontWeight={500}>
                {item.label}
              </Typography>
            ) : (
              <Link 
                key={index} 
                component={RouterLink} 
                to={item.path} 
                color="inherit"
                underline="hover"
              >
                {item.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {action && (
          <Box>
            {action}
          </Box>
        )}
      </Box>

      {noPaper ? (
        <Box>{children}</Box>
      ) : (
        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: 2,
            p: noPadding ? 0 : 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {children}
        </Paper>
      )}
    </Container>
  );
};

export default PageContainer; 