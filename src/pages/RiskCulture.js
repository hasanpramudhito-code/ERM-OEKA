import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add,
  Assessment,
  People,
  TrendingUp,
  CheckCircle,
  Warning,
  BarChart,
  Psychology
} from '@mui/icons-material';
import RiskCultureService from '../services/riskCultureService';

const RiskCulture = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSurvey, setOpenSurvey] = useState(false);
  const [openResults, setOpenResults] = useState(false);
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [categoryScores, setCategoryScores] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]); // ✅ TAMBAHKAN STATE TERPISAH UNTUK QUESTIONS

  // Load surveys
  const loadSurveys = async () => {
    try {
      setLoading(true);
      const surveysData = await RiskCultureService.getAllSurveys();
      setSurveys(surveysData);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  // Start new survey
  const handleStartSurvey = () => {
    const defaultQuestions = RiskCultureService.getDefaultQuestions(); // ✅ AMBIL QUESTIONS DARI SERVICE
    setQuestions(defaultQuestions); // ✅ SET QUESTIONS TERPISAH
    setCurrentSurvey({
      title: 'Risk Culture Assessment - ' + new Date().toLocaleDateString(),
      description: 'Survey untuk mengukur maturity budaya risiko organisasi',
      status: 'draft'
    });
    setOpenSurvey(true);
    setAnswers({});
    setActiveStep(0);
  };

  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle next step
  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Submit survey
  const handleSubmitSurvey = async () => {
    try {
      const surveyData = {
        title: currentSurvey.title,
        description: currentSurvey.description,
        questions: questions, // ✅ GUNAKAN QUESTIONS DARI STATE
        organization_id: 'default',
        status: 'published'
      };

      const newSurvey = await RiskCultureService.createSurvey(surveyData);
      
      const responseData = {
        respondent_name: 'Anonymous',
        respondent_role: 'Employee',
        answers: answers,
        submitted_at: new Date()
      };

      await RiskCultureService.submitSurveyResponse(newSurvey.id, responseData);
      
      setOpenSurvey(false);
      setCurrentSurvey(null); // ✅ RESET CURRENT SURVEY
      setQuestions([]); // ✅ RESET QUESTIONS
      loadSurveys();
      
      // Show results
      await handleViewResults(newSurvey.id);
    } catch (error) {
      console.error('Error submitting survey:', error);
    }
  };

  // View survey results
  const handleViewResults = async (surveyId) => {
    try {
      const survey = await RiskCultureService.getSurveyById(surveyId);
      const responses = await RiskCultureService.getSurveyResponses(surveyId);
      const categories = RiskCultureService.calculateCategoryScores(responses);
      
      setCurrentSurvey(survey);
      setSurveyResponses(responses);
      setCategoryScores(categories);
      setOpenResults(true);
    } catch (error) {
      console.error('Error loading survey results:', error);
    }
  };

  // Get maturity level
  const getMaturityInfo = (score) => {
    return RiskCultureService.getMaturityLevel(score);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Risk Culture Assessment...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, boxShadow: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                🧠 Risk Culture Assessment
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Measure and Improve Your Organizational Risk Culture
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                SK-7 Compliance - Budaya Risiko dan Governance
              </Typography>
            </Box>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: 2,
              textAlign: 'center'
            }}>
              <Psychology sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6">Maturity Assessment</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {surveys.length}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Total Surveys
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="info.main">
                {surveys.reduce((sum, s) => sum + (s.total_responses || 0), 0)}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Total Responses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {surveys.length > 0 ? Math.round(surveys.reduce((sum, s) => sum + (s.average_score || 0), 0) / surveys.length) : 0}%
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Avg. Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', boxShadow: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <BarChart sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {surveys.length > 0 ? getMaturityInfo(Math.round(surveys.reduce((sum, s) => sum + (s.average_score || 0), 0) / surveys.length)).level : 'N/A'}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Maturity Level
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Button */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={handleStartSurvey}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          Start New Risk Culture Assessment
        </Button>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Measure your organization's risk culture maturity according to SK-7 standards
        </Typography>
      </Box>

      {/* Surveys List */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Risk Culture Survey History
              </Typography>

              {surveys.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No risk culture surveys conducted yet. Start your first assessment to measure organizational risk culture maturity.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell>Survey Title</TableCell>
                        <TableCell align="center">Date</TableCell>
                        <TableCell align="center">Responses</TableCell>
                        <TableCell align="center">Avg. Score</TableCell>
                        <TableCell align="center">Maturity Level</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {surveys.map((survey) => {
                        const maturity = getMaturityInfo(survey.average_score || 0);
                        
                        return (
                          <TableRow key={survey.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {survey.title}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {survey.description}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">
                                {survey.created_at?.toDate().toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="h6" fontWeight="bold">
                                {survey.total_responses || 0}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Typography variant="h6" fontWeight="bold" color={maturity.color}>
                                  {survey.average_score || 0}%
                                </Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={survey.average_score || 0}
                                  color={maturity.color}
                                  sx={{ width: 60, height: 8, borderRadius: 4 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={maturity.level}
                                color={maturity.color}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button 
                                variant="outlined" 
                                size="small"
                                onClick={() => handleViewResults(survey.id)}
                              >
                                View Results
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Survey Dialog */}
      <Dialog 
        open={openSurvey} 
        onClose={() => {
          setOpenSurvey(false);
          setCurrentSurvey(null);
          setQuestions([]);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Risk Culture Assessment
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Please rate each statement based on your experience in the organization
          </Typography>
        </DialogTitle>
        <DialogContent>
          {/* ✅ PERBAIKI: GUNAKAN questions DARI STATE, BUKAN currentSurvey.questions */}
          {questions.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {questions.map((question, index) => (
                  <Step key={question.id}>
                    <StepLabel>{`Q${index + 1}`}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {activeStep < questions.length && (
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {questions[activeStep].category}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      {questions[activeStep].question}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {questions[activeStep].description}
                    </Typography>
                  </FormLabel>
                  
                  <RadioGroup
                    value={answers[questions[activeStep].id] || ''}
                    onChange={(e) => handleAnswerChange(questions[activeStep].id, e.target.value)}
                    sx={{ mt: 2 }}
                  >
                    {questions[activeStep].options.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value.toString()}
                        control={<Radio />}
                        label={`${option.value} - ${option.label}`}
                        sx={{ 
                          mb: 1,
                          padding: 1,
                          borderRadius: 1,
                          '&:hover': { backgroundColor: 'grey.50' }
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleBack} 
            disabled={activeStep === 0}
          >
            Back
          </Button>
          <Box flex={1} />
          {activeStep < questions.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={!answers[questions[activeStep]?.id]}
            >
              Next Question
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmitSurvey}
              disabled={!answers[questions[activeStep]?.id]}
            >
              Submit Assessment
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Results Dialog */}
      <Dialog 
        open={openResults} 
        onClose={() => setOpenResults(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Risk Culture Assessment Results
          </Typography>
          {currentSurvey && (
            <Typography variant="body2" color="textSecondary">
              {currentSurvey.title} - {currentSurvey.created_at?.toDate().toLocaleDateString()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {currentSurvey && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Overall Score */}
              <Grid item xs={12}>
                <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Overall Risk Culture Score
                  </Typography>
                  <Typography variant="h1" fontWeight="bold">
                    {currentSurvey.average_score || 0}%
                  </Typography>
                  <Chip 
                    label={getMaturityInfo(currentSurvey.average_score || 0).level}
                    color={getMaturityInfo(currentSurvey.average_score || 0).color}
                    sx={{ 
                      mt: 2, 
                      color: 'white',
                      fontSize: '1.1rem',
                      padding: 1
                    }}
                  />
                  <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
                    {getMaturityInfo(currentSurvey.average_score || 0).description}
                  </Typography>
                </Card>
              </Grid>

              {/* Category Scores */}
              <Grid item xs={12}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Category Breakdown
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(categoryScores).map(([category, score]) => (
                    <Grid item xs={12} md={6} key={category}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {category}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={score}
                              color={getMaturityInfo(score).color}
                              sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="h6" fontWeight="bold" color={getMaturityInfo(score).color}>
                              {score}%
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Response Summary */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Response Summary
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight="bold">
                          {currentSurvey.total_responses || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Responses
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {currentSurvey.average_score || 0}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Average Score
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <CheckCircle sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                        <Typography variant="h4" fontWeight="bold">
                          {currentSurvey.completion_rate || 0}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Completion Rate
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResults(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RiskCulture;