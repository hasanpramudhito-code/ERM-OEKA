import { db } from '../config/firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, query, 
  where, orderBy, Timestamp, limit 
} from 'firebase/firestore';

class RiskCultureService {
  
  // ✅ GET ALL RISK CULTURE SURVEYS
  async getAllSurveys(organizationId = 'default') {
    try {
      const surveysQuery = query(
        collection(db, 'risk_culture_surveys'),
        where('organization_id', '==', organizationId),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(surveysQuery);
      const surveys = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Retrieved ${surveys.length} risk culture surveys`);
      return surveys;
    } catch (error) {
      console.error('Error getting risk culture surveys:', error);
      
      // Fallback query
      if (error.code === 'failed-precondition') {
        const fallbackQuery = query(collection(db, 'risk_culture_surveys'));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        return fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      throw error;
    }
  }

  // ✅ GET SURVEY BY ID
  async getSurveyById(surveyId) {
    try {
      const surveyDoc = await getDoc(doc(db, 'risk_culture_surveys', surveyId));
      if (surveyDoc.exists()) {
        return { id: surveyDoc.id, ...surveyDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting survey:', error);
      throw error;
    }
  }

  // ✅ CREATE NEW SURVEY
  async createSurvey(surveyData) {
    try {
      const surveyWithMetadata = {
        ...surveyData,
        status: 'draft',
        total_responses: 0,
        average_score: 0,
        completion_rate: 0,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'risk_culture_surveys'), surveyWithMetadata);
      console.log('Risk culture survey created with ID:', docRef.id);
      return { id: docRef.id, ...surveyWithMetadata };
    } catch (error) {
      console.error('Error creating risk culture survey:', error);
      throw error;
    }
  }

  // ✅ UPDATE SURVEY
  async updateSurvey(surveyId, updateData) {
    try {
      const surveyRef = doc(db, 'risk_culture_surveys', surveyId);
      await updateDoc(surveyRef, {
        ...updateData,
        updated_at: Timestamp.now()
      });
      console.log('Survey updated:', surveyId);
    } catch (error) {
      console.error('Error updating survey:', error);
      throw error;
    }
  }

  // ✅ SUBMIT SURVEY RESPONSE
  async submitSurveyResponse(surveyId, responseData) {
    try {
      const responseWithMetadata = {
        ...responseData,
        survey_id: surveyId,
        submitted_at: Timestamp.now(),
        calculated_score: this.calculateResponseScore(responseData.answers)
      };
      
      const docRef = await addDoc(collection(db, 'risk_culture_responses'), responseWithMetadata);
      
      // Update survey statistics
      await this.updateSurveyStatistics(surveyId);
      
      console.log('Survey response submitted:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting survey response:', error);
      throw error;
    }
  }

  // ✅ CALCULATE RESPONSE SCORE
  calculateResponseScore(answers) {
    if (!answers || Object.keys(answers).length === 0) return 0;
    
    const totalScore = Object.values(answers).reduce((sum, answer) => {
      return sum + (parseInt(answer) || 0);
    }, 0);
    
    const maxPossibleScore = Object.keys(answers).length * 5; // Asumsi scale 1-5
    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  // ✅ UPDATE SURVEY STATISTICS
  async updateSurveyStatistics(surveyId) {
    try {
      // Get all responses for this survey
      const responsesQuery = query(
        collection(db, 'risk_culture_responses'),
        where('survey_id', '==', surveyId)
      );
      
      const querySnapshot = await getDocs(responsesQuery);
      const responses = querySnapshot.docs.map(doc => doc.data());
      
      if (responses.length === 0) return;
      
      // Calculate statistics
      const totalResponses = responses.length;
      const totalScore = responses.reduce((sum, response) => sum + (response.calculated_score || 0), 0);
      const averageScore = Math.round(totalScore / totalResponses);
      
      // Update survey
      await this.updateSurvey(surveyId, {
        total_responses: totalResponses,
        average_score: averageScore,
        completion_rate: this.calculateCompletionRate(surveyId, totalResponses),
        last_response_at: Timestamp.now()
      });
      
      console.log(`Survey ${surveyId} statistics updated: ${averageScore}% average`);
    } catch (error) {
      console.error('Error updating survey statistics:', error);
    }
  }

  // ✅ CALCULATE COMPLETION RATE
  async calculateCompletionRate(surveyId, totalResponses) {
    // Ini bisa dihitung berdasarkan total employees vs responses
    // Untuk sekarang, kita return percentage sederhana
    return Math.min(100, totalResponses * 10); // Mock calculation
  }

  // ✅ GET SURVEY RESPONSES
  async getSurveyResponses(surveyId) {
    try {
      const responsesQuery = query(
        collection(db, 'risk_culture_responses'),
        where('survey_id', '==', surveyId),
        orderBy('submitted_at', 'desc')
      );
      
      const querySnapshot = await getDocs(responsesQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting survey responses:', error);
      return [];
    }
  }

  // ✅ GET RISK CULTURE MATURITY LEVEL
  getMaturityLevel(score) {
    if (score >= 80) return { level: 'Advanced', color: 'success', description: 'Risk-aware culture established' };
    if (score >= 60) return { level: 'Proactive', color: 'info', description: 'Systematic risk management' };
    if (score >= 40) return { level: 'Developing', color: 'warning', description: 'Basic processes in place' };
    return { level: 'Initial', color: 'error', description: 'Ad-hoc risk management' };
  }

  // ✅ GET DEFAULT SURVEY QUESTIONS (SK-7 Compliance)
  getDefaultQuestions() {
    return [
      {
        id: 'q1',
        category: 'Leadership & Governance',
        question: 'Sejauh mana manajemen puncak mendemonstrasikan komitmen terhadap manajemen risiko?',
        description: 'Tingkat komitmen dan keterlibatan direksi dan manajemen senior',
        options: [
          { value: 1, label: 'Sangat Rendah' },
          { value: 2, label: 'Rendah' },
          { value: 3, label: 'Sedang' },
          { value: 4, label: 'Tinggi' },
          { value: 5, label: 'Sangat Tinggi' }
        ]
      },
      {
        id: 'q2', 
        category: 'Risk Awareness',
        question: 'Seberapa baik karyawan memahami risiko yang terkait dengan peran dan tanggung jawab mereka?',
        description: 'Tingkat pemahaman risiko di seluruh organisasi',
        options: [
          { value: 1, label: 'Sangat Rendah' },
          { value: 2, label: 'Rendah' },
          { value: 3, label: 'Sedang' },
          { value: 4, label: 'Tinggi' },
          { value: 5, label: 'Sangat Tinggi' }
        ]
      },
      {
        id: 'q3',
        category: 'Communication',
        question: 'Seberapa efektif komunikasi mengenai risiko berjalan di organisasi?',
        description: 'Efektivitas komunikasi bottom-up dan top-down tentang risiko',
        options: [
          { value: 1, label: 'Sangat Tidak Efektif' },
          { value: 2, label: 'Tidak Efektif' },
          { value: 3, label: 'Cukup Efektif' },
          { value: 4, label: 'Efektif' },
          { value: 5, label: 'Sangat Efektif' }
        ]
      },
      {
        id: 'q4',
        category: 'Decision Making',
        question: 'Sejauh mana pertimbangan risiko diintegrasikan dalam pengambilan keputusan?',
        description: 'Integrasi analisis risiko dalam proses pengambilan keputusan',
        options: [
          { value: 1, label: 'Sangat Terbatas' },
          { value: 2, label: 'Terbatas' },
          { value: 3, label: 'Cukup' },
          { value: 4, label: 'Baik' },
          { value: 5, label: 'Sangat Baik' }
        ]
      },
      {
        id: 'q5',
        category: 'Training & Competence',
        question: 'Seberapa memadai pelatihan dan pengembangan kompetensi manajemen risiko?',
        description: 'Ketersediaan dan kualitas program pelatihan manajemen risiko',
        options: [
          { value: 1, label: 'Sangat Tidak Memadai' },
          { value: 2, label: 'Tidak Memadai' },
          { value: 3, label: 'Cukup Memadai' },
          { value: 4, label: 'Memadai' },
          { value: 5, label: 'Sangat Memadai' }
        ]
      },
      {
        id: 'q6',
        category: 'Accountability',
        question: 'Sejauh mana akuntabilitas untuk manajemen risiko telah ditetapkan dengan jelas?',
        description: 'Kejelasan tanggung jawab dan akuntabilitas manajemen risiko',
        options: [
          { value: 1, label: 'Sangat Tidak Jelas' },
          { value: 2, label: 'Tidak Jelas' },
          { value: 3, label: 'Cukup Jelas' },
          { value: 4, label: 'Jelas' },
          { value: 5, label: 'Sangat Jelas' }
        ]
      }
    ];
  }

  // ✅ CALCULATE CATEGORY SCORES
  calculateCategoryScores(responses) {
    const categories = {};
    const questions = this.getDefaultQuestions();
    
    questions.forEach(q => {
      if (!categories[q.category]) {
        categories[q.category] = {
          totalScore: 0,
          responseCount: 0,
          questionCount: 0
        };
      }
      categories[q.category].questionCount++;
    });

    responses.forEach(response => {
      Object.entries(response.answers || {}).forEach(([questionId, answer]) => {
        const question = questions.find(q => q.id === questionId);
        if (question && categories[question.category]) {
          categories[question.category].totalScore += parseInt(answer);
          categories[question.category].responseCount++;
        }
      });
    });

    const result = {};
    Object.entries(categories).forEach(([category, data]) => {
      if (data.responseCount > 0) {
        const maxPossible = data.responseCount * 5;
        result[category] = Math.round((data.totalScore / maxPossible) * 100);
      } else {
        result[category] = 0;
      }
    });

    return result;
  }

  // ✅ GET OVERALL RISK CULTURE SCORE
  async getOverallRiskCultureScore(organizationId = 'default') {
    try {
      const surveys = await this.getAllSurveys(organizationId);
      if (surveys.length === 0) return 0;

      const activeSurveys = surveys.filter(s => s.status === 'published');
      if (activeSurveys.length === 0) return 0;

      const totalScore = activeSurveys.reduce((sum, survey) => sum + (survey.average_score || 0), 0);
      return Math.round(totalScore / activeSurveys.length);
    } catch (error) {
      console.error('Error calculating overall risk culture score:', error);
      return 0;
    }
  }
}

export default new RiskCultureService();