export const validationSchemas = {
  // Control Validation
  control: (controlData) => {
    const errors = {};
    
    if (!controlData.name?.trim()) {
      errors.name = 'Control name is required';
    } else if (controlData.name.length < 3) {
      errors.name = 'Control name must be at least 3 characters';
    }

    if (!controlData.description?.trim()) {
      errors.description = 'Control description is required';
    }

    if (!controlData.category) {
      errors.category = 'Control category is required';
    }

    if (!controlData.controlType) {
      errors.controlType = 'Control type is required';
    }

    if (!controlData.frequency) {
      errors.frequency = 'Testing frequency is required';
    }

    if (!controlData.owner?.trim()) {
      errors.owner = 'Control owner is required';
    }

    if (!controlData.objective?.trim()) {
      errors.objective = 'Control objective is required';
    }

    if (!controlData.testProcedure?.trim()) {
      errors.testProcedure = 'Test procedure is required';
    }

    return errors;
  },

  // KRI Validation
  kri: (kriData) => {
    const errors = {};

    if (!kriData.name?.trim()) {
      errors.name = 'KRI name is required';
    }

    if (!kriData.description?.trim()) {
      errors.description = 'KRI description is required';
    }

    if (!kriData.category) {
      errors.category = 'KRI category is required';
    }

    if (!kriData.unit?.trim()) {
      errors.unit = 'KRI unit is required';
    }

    if (!kriData.frequency) {
      errors.frequency = 'Measurement frequency is required';
    }

    if (kriData.targetValue === undefined || kriData.targetValue === null) {
      errors.targetValue = 'Target value is required';
    }

    // Threshold validation
    const thresholds = kriData.thresholds || {};
    if (thresholds.low === undefined || thresholds.low === null) {
      errors.thresholds = { ...errors.thresholds, low: 'Low threshold is required' };
    }
    if (thresholds.medium === undefined || thresholds.medium === null) {
      errors.thresholds = { ...errors.thresholds, medium: 'Medium threshold is required' };
    }
    if (thresholds.high === undefined || thresholds.high === null) {
      errors.thresholds = { ...errors.thresholds, high: 'High threshold is required' };
    }
    if (thresholds.critical === undefined || thresholds.critical === null) {
      errors.thresholds = { ...errors.thresholds, critical: 'Critical threshold is required' };
    }

    return errors;
  },

  // Deficiency Validation
  deficiency: (deficiencyData) => {
    const errors = {};

    if (!deficiencyData.title?.trim()) {
      errors.title = 'Deficiency title is required';
    }

    if (!deficiencyData.description?.trim()) {
      errors.description = 'Deficiency description is required';
    }

    if (!deficiencyData.severity) {
      errors.severity = 'Severity level is required';
    }

    if (!deficiencyData.category) {
      errors.category = 'Deficiency category is required';
    }

    if (!deficiencyData.identifiedDate) {
      errors.identifiedDate = 'Identification date is required';
    }

    return errors;
  },

  // Test Result Validation
  testResult: (resultData) => {
    const errors = {};

    if (!resultData.testDate) {
      errors.testDate = 'Test date is required';
    }

    if (!resultData.testedBy?.trim()) {
      errors.testedBy = 'Tester name is required';
    }

    if (!resultData.testType) {
      errors.testType = 'Test type is required';
    }

    if (!resultData.result) {
      errors.result = 'Test result is required';
    }

    if (resultData.effectivenessRating === undefined || resultData.effectivenessRating === null) {
      errors.effectivenessRating = 'Effectiveness rating is required';
    }

    if (!resultData.sampleSize?.trim()) {
      errors.sampleSize = 'Sample size is required';
    }

    if (resultData.exceptionsFound === undefined || resultData.exceptionsFound === null) {
      errors.exceptionsFound = 'Number of exceptions is required';
    }

    return errors;
  },

  // Risk Appetite Validation
  riskAppetite: (appetiteData) => {
    const errors = {};

    if (!appetiteData.riskCategory) {
      errors.riskCategory = 'Risk category is required';
    }

    if (!appetiteData.statement?.trim()) {
      errors.statement = 'Risk appetite statement is required';
    }

    if (!appetiteData.escalationProcess?.trim()) {
      errors.escalationProcess = 'Escalation process is required';
    }

    return errors;
  }
};

// Helper function to check if form is valid
export const isFormValid = (errors) => {
  return Object.keys(errors).length === 0;
};

// Helper function for real-time validation
export const validateField = (schema, field, value) => {
  const testData = { [field]: value };
  const fieldErrors = schema(testData);
  return fieldErrors[field];
};