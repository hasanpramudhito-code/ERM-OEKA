import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Container 
} from '@mui/material';
import { Warning, Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            maxWidth: 500,
            width: '100%'
          }}
        >
          <Warning sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom color="error">
            Access Denied
          </Typography>
          
          <Typography variant="body1" color="textSecondary" paragraph>
            You don't have permission to access this page. 
            Please contact your administrator if you believe this is an error.
          </Typography>

          <Box mt={4} display="flex" gap={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => navigate('/')}
            >
              Go to Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;