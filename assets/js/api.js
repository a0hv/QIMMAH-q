// Universal Complete API Client for Al-Qimmah Platform
// Matches EXACT contract of server/routes for full frontend compatibility

const API = {
  tokenKey: 'alqimmah_auth_token',
  userKey: 'alqimmah_auth_user',
  storageDbKey: 'alqimmah_local_db',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setAuth(token, user) {
    if (token) localStorage.setItem(this.tokenKey, token);
    if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  },

  getUser() {
    try {
      const u = localStorage.getItem(this.userKey);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  checkAnswerCorrectness(userChoice, question) {
    if (userChoice === undefined || userChoice === null || userChoice === '') {
      return false; // Unanswered is NEVER correct!
    }

    const letters = ['أ', 'ب', 'ج', 'د'];
    const correctLetter = String(question.correct || question.correctAnswer || '').trim();
    const chosenStr = String(userChoice).trim();

    // Direct match (letter or text)
    if (chosenStr === correctLetter) return true;

    // Numeric index match (0 -> 'أ', 1 -> 'ب', etc.)
    if (typeof userChoice === 'number' && letters[userChoice] === correctLetter) return true;
    const num = parseInt(chosenStr, 10);
    if (!isNaN(num) && num >= 0 && num < letters.length && letters[num] === correctLetter) return true;

    // Options array text matching
    if (Array.isArray(question.options)) {
      // If student answered with option text
      const chosenOptIdx = question.options.findIndex(o => o && o.trim() === chosenStr);
      if (chosenOptIdx !== -1 && letters[chosenOptIdx] === correctLetter) return true;

      // If question.correct is full option text and student answered with letter
      const letterIdx = letters.indexOf(chosenStr);
      if (letterIdx !== -1 && question.options[letterIdx] && question.options[letterIdx].trim() === correctLetter) return true;

      // If both are option text
      if (chosenOptIdx !== -1 && question.options[chosenOptIdx] && question.options[chosenOptIdx].trim() === correctLetter) return true;
    }

    return false;
  },

  getBundle() {
    if (window.QIMMAH_DATA) return window.QIMMAH_DATA;

    // De-obfuscation logic if data is encrypted
    if (window.QIMMAH_DATA_OBFUSCATED) {
      try {
        const key = [0x3A, 0x7D, 0x9E, 0xC1, 0x42, 0xF8, 0x6B, 0x55];
        const binary = atob(window.QIMMAH_DATA_OBFUSCATED);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i) ^ key[i % key.length];
        }
        window.QIMMAH_DATA = JSON.parse(new TextDecoder().decode(bytes));
        return window.QIMMAH_DATA;
      } catch (e) {
        console.error("Failed to decode bundle data", e);
      }
    }
    return null;
  },

  studentsListKey: 'alqimmah_students_list',

  getStudentsList() {
    try {
      const saved = localStorage.getItem(this.studentsListKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    // Initial default students
    const bundle = this.getBundle();
    const list = (bundle && Array.isArray(bundle.users) && bundle.users.filter(u => u.role === 'student').length > 0)
      ? bundle.users.filter(u => u.role === 'student')
      : [
          { id: 'std-105', name: 'طالب القمة المتميز', accessCode: 'QIMMAH-105', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z' },
          { id: 'std-100', name: 'بطل القدرات اللفظية', accessCode: 'QIMMAH-100', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z' },
          { id: 'std-2026', name: 'طالب متدرب 2026', accessCode: 'QIMMAH-2026', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z' }
        ];

    this.saveStudentsList(list);
    return list;
  },

  saveStudentsList(list) {
    try {
      localStorage.setItem(this.studentsListKey, JSON.stringify(list));
      const bundle = this.getBundle();
      if (bundle) {
        bundle.users = [
          ...(bundle.users || []).filter(u => u.role !== 'student'),
          ...list
        ];
      }
    } catch (e) {}
  },

  skillsTestsKey: 'alqimmah_skills_tests',
  farisExamsKey: 'alqimmah_faris_exams',
  customExamsKey: 'alqimmah_custom_exams',
  customSkillsKey: 'alqimmah_custom_skills',
  platformSettingsKey: 'alqimmah_platform_settings',

  // Clear stale cache keys that had duplicate passages
  purgeLegacyCache() {
    try {
      localStorage.removeItem('alqimmah_faris_exams');
      localStorage.removeItem('alqimmah_skills_tests');
      localStorage.removeItem('alqimmah_faris_exams_v2');
      localStorage.removeItem('alqimmah_skills_tests_v2');
    } catch (e) {}
  },

  getSkillsTests() {
    this.purgeLegacyCache();
    // 1. Check if admin saved custom skill tests
    try {
      const s = localStorage.getItem(this.customSkillsKey);
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          const bundle = this.getBundle();
          if (bundle) bundle.skillsTests = parsed;
          return parsed;
        }
      }
    } catch (e) {}

    // 2. Default to official bundle.skillsTests
    const bundle = this.getBundle();
    return (bundle && bundle.skillsTests) ? bundle.skillsTests : { skills: [] };
  },

  saveSkillsTests(st) {
    try {
      localStorage.setItem(this.customSkillsKey, JSON.stringify(st));
    } catch (e) {
      console.error('Failed to save skills to localStorage', e);
    }
    const bundle = this.getBundle();
    if (bundle) bundle.skillsTests = st;
  },

  getFarisExams() {
    this.purgeLegacyCache();
    // 1. Check if admin saved custom exams
    try {
      const s = localStorage.getItem(this.customExamsKey);
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const bundle = this.getBundle();
          if (bundle) bundle.farisExams = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to save exams from localStorage', e);
    }

    // 2. Default to official bundle.farisExams
    const bundle = this.getBundle();
    return (bundle && Array.isArray(bundle.farisExams)) ? bundle.farisExams : [];
  },

  saveFarisExams(exams) {
    try {
      localStorage.setItem(this.customExamsKey, JSON.stringify(exams));
    } catch (e) {
      console.error('Failed to save exams to localStorage', e);
    }
    const bundle = this.getBundle();
    if (bundle) bundle.farisExams = exams;
  },

  getPlatformSettings() {
    try {
      const s = localStorage.getItem(this.platformSettingsKey);
      if (s) return JSON.parse(s);
    } catch (e) {}

    const bundle = this.getBundle();
    return (bundle && bundle.settings) ? bundle.settings : {
      platformName: 'منصة القمة في القدرات اللفظية',
      instructorName: 'الأستاذ جابر القاضي',
      instructorPhone: '0541378802',
      defaultExamDuration: 65,
      passingThresholdPercent: 75,
      certificateThresholdPercent: 80,
      allowStudentReview: true
    };
  },

  savePlatformSettings(settings) {
    try {
      localStorage.setItem(this.platformSettingsKey, JSON.stringify(settings));
    } catch (e) {}
    const bundle = this.getBundle();
    if (bundle) bundle.settings = settings;
  },

  purgeStudentData(studentId, accessCode) {
    if (!studentId && !accessCode) return;

    // 1. Remove specific localStorage db keys
    if (studentId) {
      localStorage.removeItem('alqimmah_db_' + studentId);
    }
    if (accessCode) {
      localStorage.removeItem('alqimmah_db_' + accessCode);
    }

    // 2. Scan and remove any stray matching localStorage keys
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('alqimmah_db_')) {
          if ((studentId && k.includes(studentId)) || (accessCode && k.includes(accessCode))) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    // 3. Remove student attempts from shared/fallback DB if present
    try {
      const shared = localStorage.getItem(this.storageDbKey);
      if (shared) {
        const parsed = JSON.parse(shared);
        if (Array.isArray(parsed.examAttempts)) {
          parsed.examAttempts = parsed.examAttempts.filter(a => a.studentId !== studentId && a.accessCode !== accessCode);
        }
        if (Array.isArray(parsed.skillAttempts)) {
          parsed.skillAttempts = parsed.skillAttempts.filter(a => a.studentId !== studentId && a.accessCode !== accessCode);
        }
        if (Array.isArray(parsed.mistakesVault)) {
          parsed.mistakesVault = parsed.mistakesVault.filter(m => m.studentId !== studentId);
        }
        localStorage.setItem(this.storageDbKey, JSON.stringify(parsed));
      }
    } catch (e) {}

    // 4. If current logged in user is this student, clear auth immediately
    const user = this.getUser();
    if (user && ((studentId && user.id === studentId) || (accessCode && user.accessCode === accessCode))) {
      this.clearAuth();
    }
  },

  getLocalDb() {
    const user = this.getUser();
    const studentId = (user && user.role === 'student' && user.id) ? user.id : null;
    const key = studentId ? ('alqimmah_db_' + studentId) : this.storageDbKey;

    try {
      const s = localStorage.getItem(key);
      if (s) {
        const parsed = JSON.parse(s);
        return {
          examAttempts: parsed.examAttempts || [],
          skillAttempts: parsed.skillAttempts || [],
          mistakesVault: []
        };
      }
    } catch (e) {}

    return {
      examAttempts: [],
      skillAttempts: [],
      mistakesVault: []
    };
  },

  saveLocalDb(db) {
    const user = this.getUser();
    const studentId = (user && user.role === 'student' && user.id) ? user.id : null;
    const key = studentId ? ('alqimmah_db_' + studentId) : this.storageDbKey;
    localStorage.setItem(key, JSON.stringify(db));
  },

  getAllStudentsDb() {
    const combined = {
      examAttempts: [],
      skillAttempts: [],
      mistakesVault: []
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('alqimmah_db_') || k === this.storageDbKey)) {
          try {
            const data = JSON.parse(localStorage.getItem(k));
            if (data) {
              if (Array.isArray(data.examAttempts)) combined.examAttempts.push(...data.examAttempts);
              if (Array.isArray(data.skillAttempts)) combined.skillAttempts.push(...data.skillAttempts);
              if (Array.isArray(data.mistakesVault)) combined.mistakesVault.push(...data.mistakesVault);
            }
          } catch(e) {}
        }
      }
    } catch(e) {}

    return combined;
  },

  async request(endpoint, options = {}) {
    const isFile = window.location.protocol === 'file:';
    const user = this.getUser() || {};
    const isAdmin = user.role === 'admin';

    // If not file protocol, attempt real backend server request first with a short timeout
    if (!isFile) {
      const url = '/api' + endpoint;
      const headers = options.headers || {};
      const token = this.getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for static hosts
        const response = await fetch(url, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            return data;
          }
        }
      } catch (err) {
        // Fallback to standalone handler below
      }
    }

    // Complete client-side handler using bundled questions
    // Admins have full access; students can only read their own data
    if (!isAdmin && endpoint.startsWith('/admin/')) {
      return {
        success: false,
        message: 'غير مصرح لك بالوصول لواجهة الإدارة.'
      };
    }

    return await this.handleClientFallback(endpoint, options);
  },

  async handleClientFallback(endpoint, options = {}) {
    const bundle = this.getBundle();
    const ldb = this.getLocalDb();
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

    // 1. Auth: Code Login
    if (endpoint === '/auth/code-login' || endpoint === '/auth/student-login') {
      const code = (body.accessCode || '').trim().replace(/\s+/g, '').toUpperCase();
      const stripped = code.replace(/-/g, '');

      // Check admin
      const adminCodes = ['Aa1482010FGFG', 'AA1482010FGFG', 'QIMMAH-ADMIN-2026', 'ADMIN777', 'ADMIN-777'];
      const isAdmin = adminCodes.some(c => c.toUpperCase() === code || c.toUpperCase().replace(/-/g, '') === stripped);

      if (isAdmin) {
        const adminUser = {
          id: 'user-admin-1',
          name: 'الأستاذ جابر القاضي',
          role: 'admin',
          email: 'admin@alqimmah.com'
        };
        const token = 'standalone-token-admin-' + Date.now();
        return {
          success: true,
          role: 'admin',
          message: 'مرحباً بك أستاذ جابر، تم فتح لوحة الإدارة والتحكم.',
          token,
          user: adminUser
        };
      }

      // Check student from persistent official students list
      const studentsList = this.getStudentsList();

      const student = studentsList.find(s => {
        const sCode = (s.accessCode || '').trim().replace(/\s+/g, '').toUpperCase();
        return sCode === code || sCode.replace(/-/g, '') === stripped;
      });

      if (student) {
        if (student.isActive === false) {
          return {
            success: false,
            message: 'تم تعطيل هذا الكود مؤقتاً. يرجى التواصل مع الأستاذ جابر القاضي لتفعيل الحساب.'
          };
        }
        const token = 'standalone-token-student-' + Date.now();
        student.lastLogin = new Date().toISOString();
        this.saveStudentsList(studentsList);
        return {
          success: true,
          role: 'student',
          message: 'أهلاً بك يا بطل! تم التحقق من كود الدخول بنجاح.',
          token,
          user: {
            id: student.id,
            name: student.name,
            role: 'student',
            accessCode: student.accessCode
          }
        };
      }

      // --- NO FALLBACK: code must be an officially generated student code from the admin panel ---
      // If we reach here, the code is not admin and not in the official students list
      return {
        success: false,
        message: 'كود الدخول غير صحيح أو غير مسجل. تواصل مع الأستاذ جابر القاضي للحصول على الكود.'
      };
    }

    // 2. Health check
    if (endpoint === '/health') {
      return { status: 'online', platform: 'منصة القمة في القدرات اللفظية', version: '1.0.0' };
    }

    // 3. User Me Profile
    if (endpoint === '/auth/me') {
      const user = this.getUser() || { id: 'std-105', name: 'طالب القمة', role: 'student', accessCode: 'QIMMAH-105' };
      return {
        success: true,
        user,
        stats: {
          completedExamsCount: ldb.examAttempts.length,
          averageScorePercent: ldb.examAttempts.length > 0
            ? Math.round(ldb.examAttempts.reduce((acc, cur) => acc + (cur.scorePercent || 0), 0) / ldb.examAttempts.length)
            : 0
        }
      };
    }

    // 4. Skills Overview List
    if (endpoint === '/skills') {
      const st = this.getSkillsTests();
      const skills = (st.skills || []).map(skill => {
        const skillAttempts = (ldb.skillAttempts || []).filter(a => a.skillId === skill.id);
        const completedTestIds = new Set(skillAttempts.map(a => a.testId));

        let totalQ = 0;
        let totalC = 0;
        skillAttempts.forEach(a => {
          const answeredInAttempt = (typeof a.answeredQuestionsCount === 'number') 
            ? a.answeredQuestionsCount 
            : (typeof a.answeredCount === 'number')
            ? a.answeredCount
            : (a.answers ? Object.keys(a.answers).length : (a.totalQuestions || 20));
          totalQ += answeredInAttempt;
          totalC += a.correctCount || 0;
        });
        const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

        return {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          icon: skill.icon || 'fa-brain',
          color: skill.color || '#10b981',
          totalTests: (skill.tests || []).length || 6,
          questionsPerTest: 20,
          completedTestsCount: completedTestIds.size,
          accuracyPercent: accuracy,
          isCompletedAll: (skill.tests || []).length > 0 && completedTestIds.size >= skill.tests.length
        };
      });

      return { success: true, skills };
    }

    // 5. Skill Detail (with its tests) -> GET /skills/:skillId
    const skillDetailMatch = endpoint.match(/^\/skills\/([a-zA-Z0-9_\-]+)$/);
    if (skillDetailMatch) {
      const skillId = skillDetailMatch[1];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);

      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };

      const skillAttempts = (ldb.skillAttempts || []).filter(a => a.skillId === skillId);
      const tests = (skill.tests || []).map(t => {
        const testAttempts = skillAttempts.filter(a => a.testId === t.id);
        const bestAttempt = testAttempts.sort((a, b) => b.scorePercent - a.scorePercent)[0];

        return {
          id: t.id,
          testNumber: t.testNumber,
          title: t.title,
          questionCount: t.questions ? t.questions.length : (t.questionCount || 20),
          passingScore: t.passingScore || 16,
          completed: !!bestAttempt,
          bestScore: bestAttempt ? bestAttempt.correctCount : null,
          bestPercent: bestAttempt ? bestAttempt.scorePercent : null,
          passed: bestAttempt ? bestAttempt.passed : false,
          attemptsCount: testAttempts.length
        };
      });

      return {
        success: true,
        skill: {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          icon: skill.icon,
          color: skill.color,
          totalTests: tests.length,
          questionsPerTest: 20,
          tests
        }
      };
    }

    // 6. Start Skill Practice Test -> GET /skills/:skillId/tests/:testId/start
    const skillTestStartMatch = endpoint.match(/^\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/start$/);
    if (skillTestStartMatch) {
      const skillId = skillTestStartMatch[1];
      const testId = skillTestStartMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };
      const test = (skill.tests || []).find(t => t.id === testId);
      if (!test) return { success: false, message: 'الاختبار غير موجود.' };

      const safeQuestions = (test.questions || []).map(q => ({
        id: q.id,
        num: q.num,
        skill: q.skill,
        skillTitle: q.skillTitle || null,
        passage: q.passage || null,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
        rule: q.rule || ''
      }));

      return {
        success: true,
        test: {
          id: test.id,
          testNumber: test.testNumber,
          title: test.title,
          skillId: skill.id,
          skillName: skill.name,
          questionCount: safeQuestions.length,
          passingScore: test.passingScore || 16
        },
        questions: safeQuestions
      };
    }

    // 7. Submit Skill Practice Test -> POST /skills/:skillId/tests/:testId/submit
    const skillTestSubmitMatch = endpoint.match(/^\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/submit$/);
    if (skillTestSubmitMatch) {
      const skillId = skillTestSubmitMatch[1];
      const testId = skillTestSubmitMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      const test = skill ? (skill.tests || []).find(t => t.id === testId) : null;

      const userAnswers = body.studentAnswers || body.answers || {};
      const questions = test ? test.questions : [];
      let correctCount = 0;
      const mistakes = [];

      questions.forEach(q => {
        const chosen = userAnswers[q.id];
        const isMatch = this.checkAnswerCorrectness(chosen, q);
        if (isMatch) {
          correctCount++;
        } else {
          const mistakeObj = {
            id: q.id,
            question: q.question,
            options: q.options,
            userChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
            correctAnswer: q.correct || q.correctAnswer || 'أ',
            explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
            rule: q.rule || '',
            skill: skillId
          };
          mistakes.push(mistakeObj);
        }
      });

      const total = questions.length || 20;
      const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const passed = scorePct >= 80;
      const user = this.getUser();

      const answeredKeys = Object.keys(userAnswers).filter(k => userAnswers[k] !== undefined && userAnswers[k] !== null && userAnswers[k] !== '');
      const answeredCount = answeredKeys.length;

      ldb.skillAttempts.push({
        id: 'att-sk-' + Date.now(),
        studentId: user ? user.id : 'std-105',
        skillId,
        testId,
        testTitle: test ? test.title : 'اختبار تدريبي',
        skillName: skill ? skill.name : 'المهارة',
        correctCount,
        answeredCount,
        answeredQuestionsCount: answeredCount,
        totalQuestions: total,
        scorePercent: scorePct,
        passed,
        submittedAt: new Date().toISOString(),
        answers: userAnswers
      });
      this.saveLocalDb(ldb);

      return {
        success: true,
        attempt: {
          testId,
          testTitle: test ? test.title : 'اختبار تدريبي',
          skillName: skill ? skill.name : 'المهارة',
          scorePercent: scorePct,
          correctCount,
          totalQuestions: total,
          passed,
          durationSeconds: body.durationSeconds || 0,
          mistakes
        },
        breakdown: questions.map((q, idx) => {
          const chosen = userAnswers[q.id];
          const isCorrect = this.checkAnswerCorrectness(chosen, q);
          return {
            num: idx + 1,
            question: q.question,
            passage: q.passage,
            options: q.options,
            studentChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
            correctChoice: q.correct || q.correctAnswer || 'أ',
            isCorrect,
            explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
            rule: q.rule || ''
          };
        })
      };
    }

    // 8. Faris Aggregated Exams (25 Exams by 5 Levels) -> GET /exams
    if (endpoint === '/exams') {
      const levels = (bundle && bundle.farisLevels) ? bundle.farisLevels : [];
      const exams = this.getFarisExams();
      const user = this.getUser();
      const studentAttempts = (ldb.examAttempts || []).filter(a => user && a.studentId === user.id);

      const mappedLevels = levels.map(lvl => {
        const examsInLevel = exams.filter(e => e.level === lvl.level).map(e => {
          const attempts = studentAttempts.filter(a => a.examId === e.id);
          const best = attempts.sort((a, b) => b.scorePercent - a.scorePercent)[0];
          return {
            id: e.id,
            examNumber: e.examNumber,
            title: e.title,
            level: e.level,
            levelTitle: e.levelTitle,
            questionCount: e.questionCount || (e.questions ? e.questions.length : 65),
            durationMinutes: e.durationMinutes || 60,
            passingScorePercent: e.passingScorePercent || 65,
            completed: !!best,
            bestScorePercent: best ? best.scorePercent : null,
            passed: best ? best.passed : false,
            attemptsCount: attempts.length
          };
        });
        return {
          ...lvl,
          isUnlocked: true,
          exams: examsInLevel
        };
      });

      return { success: true, levels: mappedLevels, totalExams: exams.length };
    }

    // 9. Start Faris Exam -> GET /exams/:examId/start
    const examStartMatch = endpoint.match(/^\/exams\/([a-zA-Z0-9_\-]+)\/start$/);
    if (examStartMatch) {
      const examId = examStartMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === examId || e.id === 'faris-' + examId || e.examNumber === parseInt(examId, 10));

      if (!exam) return { success: false, message: 'الاختبار غير موجود.' };

      const safeQuestions = (exam.questions || []).map(q => ({
        id: q.id,
        num: q.num,
        skill: q.skill,
        skillTitle: q.skillTitle || null,
        passage: q.passage || null,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
        rule: q.rule || ''
      }));

      return {
        success: true,
        exam: {
          id: exam.id,
          examNumber: exam.examNumber,
          title: exam.title,
          level: exam.level,
          levelTitle: exam.levelTitle,
          durationMinutes: exam.durationMinutes || 60,
          passingScorePercent: exam.passingScorePercent || 65,
          questionCount: safeQuestions.length
        },
        questions: safeQuestions
      };
    }

    // 10. Submit Faris Exam -> POST /exams/:examId/submit
    const examSubmitMatch = endpoint.match(/^\/exams\/([a-zA-Z0-9_\-]+)\/submit$/);
    if (examSubmitMatch) {
      const examId = examSubmitMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === examId || e.id === 'faris-' + examId);
      if (!exam) return { success: false, message: 'الاختبار غير موجود.' };

      const userAnswers = body.studentAnswers || body.answers || {};
      const questions = exam.questions || [];
      let correctCount = 0;
      const mistakes = [];

      questions.forEach(q => {
        const chosen = userAnswers[q.id];
        const isMatch = this.checkAnswerCorrectness(chosen, q);
        if (isMatch) {
          correctCount++;
        } else {
          const mistakeObj = {
            id: q.id,
            question: q.question,
            options: q.options,
            userChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
            correctAnswer: q.correct || q.correctAnswer || 'أ',
            explanation: q.explanation || 'مراجعة المهارة والقاعدة المطلوبة.',
            rule: q.rule || '',
            skill: q.skill || 'faris'
          };
          mistakes.push(mistakeObj);
        }
      });

      const total = questions.length || 65;
      const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const passThreshold = exam.passingScorePercent || 65;
      const passed = scorePct >= passThreshold;
      const user = this.getUser();

      const answeredKeys = Object.keys(userAnswers).filter(k => userAnswers[k] !== undefined && userAnswers[k] !== null && userAnswers[k] !== '');
      const answeredCount = answeredKeys.length;

      ldb.examAttempts.push({
        id: 'att-ex-' + Date.now(),
        studentId: user ? user.id : 'std-105',
        examId: exam.id,
        examTitle: exam.title,
        scorePercent: scorePct,
        correctAnswersCount: correctCount,
        answeredCount,
        answeredQuestionsCount: answeredCount,
        totalQuestions: total,
        passed,
        submittedAt: new Date().toISOString(),
        answers: userAnswers
      });

      this.saveLocalDb(ldb);

      return {
        success: true,
        results: {
          examId: exam.id,
          examTitle: exam.title,
          title: exam.title,
          scorePercent: scorePct,
          correctCount,
          correctAnswersCount: correctCount,
          totalQuestions: total,
          passed,
          passingScorePercent: passThreshold,
          passingThreshold: passThreshold,
          durationSeconds: body.durationSeconds || 0,
          mistakes,
          breakdown: questions.map((q, idx) => {
            const chosen = userAnswers[q.id];
            const isMatch = this.checkAnswerCorrectness(chosen, q);
            return {
              num: idx + 1,
              question: q.question,
              passage: q.passage,
              options: q.options,
              studentChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
              correctChoice: q.correct || q.correctAnswer || 'أ',
              isCorrect: isMatch,
              explanation: q.explanation || 'مراجعة المهارة والقاعدة المطلوبة.',
              rule: q.rule || ''
            };
          })
        }
      };
    }

    // 11. Student Next Step -> GET /students/next-step
    if (endpoint === '/students/next-step') {
      const attempts = ldb.examAttempts || [];
      const completedIds = new Set(attempts.map(a => a.examId));
      let nextExamNum = 1;
      for (let i = 1; i <= 25; i++) {
        if (!completedIds.has(`faris-${i}`)) {
          nextExamNum = i;
          break;
        }
      }
      return {
        success: true,
        nextStep: {
          type: 'exam',
          title: `انطلق مع النموذج ${nextExamNum} من الاختبارات المجمعة`,
          subtitle: `تابع مسيرتك نحو الـ 100% بحل النموذج رقم ${nextExamNum} ومحاكاة بيئة قياس الحقيقية.`,
          actionText: `ابدأ النموذج ${nextExamNum} ←`,
          actionTarget: `faris-${nextExamNum}`,
          badge: 'الخطوة التالية',
          badgeColor: 'emerald',
          icon: 'fa-rocket'
        }
      };
    }

    // 12. Student Streak -> GET /students/streak
    if (endpoint === '/students/streak') {
      return {
        success: true,
        currentStreak: 3,
        weekDays: [
          { dayName: 'السبت', active: true, isToday: false },
          { dayName: 'الأحد', active: true, isToday: false },
          { dayName: 'الإثنين', active: true, isToday: false },
          { dayName: 'الثلاثاء', active: false, isToday: true },
          { dayName: 'الأربعاء', active: false, isToday: false },
          { dayName: 'الخميس', active: false, isToday: false },
          { dayName: 'الجمعة', active: false, isToday: false }
        ]
      };
    }

    // 13. Student Mistakes Vault -> GET /students/mistakes (Cleaned / Deprecated)
    if (endpoint === '/students/mistakes') {
      return {
        success: true,
        mistakes: []
      };
    }

    // 13b. Resolve Mistake -> POST /students/mistakes/resolve
    if (endpoint === '/students/mistakes/resolve') {
      return { success: true, message: 'تم بنجاح' };
    }

    // 14. Student Achievements -> GET /students/achievements
    if (endpoint === '/students/achievements') {
      const st = (bundle && bundle.skillsTests) ? bundle.skillsTests : { skills: [] };
      const skillAttempts = ldb.skillAttempts || [];
      const examAttempts = ldb.examAttempts || [];
      

      // Skills summary
      const skillsSummary = (st.skills || []).map(skill => {
        const attempts = skillAttempts.filter(a => a.skillId === skill.id);
        const uniqueTests = new Set(attempts.map(a => a.testId));
        let best = 0;
        let totalP = 0;
        attempts.forEach(a => {
          if ((a.correctCount || 0) > best) best = a.correctCount;
          totalP += (a.scorePercent || 0);
        });
        const avg = attempts.length > 0 ? Math.round(totalP / attempts.length) : 0;
        return {
          skillId: skill.id,
          name: skill.name,
          icon: skill.icon || 'fa-brain',
          color: skill.color || '#10b981',
          totalTests: (skill.tests || []).length || 6,
          completedTestsCount: uniqueTests.size,
          bestScore: best,
          averagePercent: avg,
          attemptsCount: attempts.length
        };
      });

      // Overall calculations
      let totalSkillQ = 0, totalSkillC = 0;
      skillAttempts.forEach(a => { 
        let answeredInAttempt = (typeof a.answeredQuestionsCount === 'number') 
          ? a.answeredQuestionsCount 
          : (typeof a.answeredCount === 'number')
          ? a.answeredCount
          : (a.answers ? Object.keys(a.answers).length : null);
        if (answeredInAttempt === null) {
          answeredInAttempt = a.totalQuestions || 20;
        }
        totalSkillQ += answeredInAttempt; 
        totalSkillC += (a.correctCount || 0); 
      });

      let totalExamQ = 0, totalExamC = 0;
      examAttempts.forEach(a => { 
        let answeredInAttempt = (typeof a.answeredQuestionsCount === 'number') 
          ? a.answeredQuestionsCount 
          : (typeof a.answeredCount === 'number')
          ? a.answeredCount
          : (a.answers ? Object.keys(a.answers).length : null);
        if (answeredInAttempt === null) {
          answeredInAttempt = a.totalQuestions || 65;
        }
        totalExamQ += answeredInAttempt; 
        totalExamC += (a.correctAnswersCount || a.correctCount || 0); 
      });

      const totalQ = totalSkillQ + totalExamQ;
      const totalC = totalSkillC + totalExamC;
      const overallAcc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

      return {
        success: true,
        overall: {
          completedSkillTestsCount: new Set(skillAttempts.map(a => a.testId)).size,
          totalSkillAttemptsCount: skillAttempts.length,
          completedExamsCount: new Set(examAttempts.map(a => a.examId)).size,
          totalExamAttemptsCount: examAttempts.length,
          totalQuestionsAnswered: totalQ,
          totalCorrectAnswers: totalC,
          overallAccuracyPercent: overallAcc,
                  },
        skillsSummary,
        recentSkillAttempts: skillAttempts.slice(0, 30),
        recentExamAttempts: examAttempts.slice(0, 30),
              };
    }

    // 16. Admin Metrics -> GET /admin/metrics
    if (endpoint === '/admin/metrics') {
      const allData = this.getAllStudentsDb();
      const students = (bundle && bundle.users) ? bundle.users.filter(u => u.role === 'student') : [];
      const activeStudents = students.filter(s => s.isActive !== false);
      const attempts = allData.examAttempts || [];
      const totalAttempts = attempts.length;
      const passed = attempts.filter(a => a.passed).length;
      const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0;
      const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((a, b) => a + (b.scorePercent || 0), 0) / totalAttempts) : 0;

      return {
        success: true,
        metrics: {
          totalStudents: students.length,
          activeStudents: activeStudents.length,
          disabledStudents: students.length - activeStudents.length,
          totalAttempts,
          passRate,
          averageScore: avgScore,
          activeToday: activeStudents.length,
                  }
      };
    }

    // 17. Admin Exams List -> GET /admin/exams-list
    if (endpoint === '/admin/exams-list') {
      const exams = (bundle && bundle.farisExams) ? bundle.farisExams : [];
      return {
        success: true,
        exams: exams.map(e => ({
          id: e.id,
          examNumber: e.examNumber,
          title: e.title,
          levelTitle: e.levelTitle || 'المستوى العام',
          questionCount: e.questionCount || (e.questions ? e.questions.length : 65),
          durationMinutes: e.durationMinutes || 60,
          passingScorePercent: e.passingScorePercent || 65
        }))
      };
    }

    // 18. Admin Students Operations
    // 18a. Add Student -> POST /admin/students
    if (endpoint === '/admin/students' && options.method === 'POST') {
      const name = (body.name || 'طالب جديد').trim();
      const customCode = body.accessCode;
      const code = customCode && customCode.trim() ? customCode.trim().toUpperCase() : ('QIMMAH-' + Math.floor(100 + Math.random() * 900));
      
      const studentsList = this.getStudentsList();
      
      // Ensure unique ID
      const newId = 'std-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      
      // Purge any accidental leftover storage for this ID or Code so student starts 100% fresh
      this.purgeStudentData(newId, code);

      const newStd = {
        id: newId,
        name,
        accessCode: code,
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      studentsList.unshift(newStd);
      this.saveStudentsList(studentsList);

      return {
        success: true,
        message: `تم إضافة الطالب بنجاح! كود الوصول: ${code}`,
        student: newStd
      };
    }

    // 18b. Edit Student -> PUT /admin/students/:id
    const putStudentMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)$/);
    if (putStudentMatch && options.method === 'PUT') {
      const id = putStudentMatch[1];
      const studentsList = this.getStudentsList();
      const std = studentsList.find(u => u.id === id);
      if (std) {
        if (body.name) std.name = body.name.trim();
        if (body.phone) std.phone = body.phone.trim();
        if (body.notes) std.notes = body.notes.trim();
        if (body.accessCode) std.accessCode = body.accessCode.trim().toUpperCase();
        this.saveStudentsList(studentsList);
        return { success: true, message: 'تم تحديث بيانات الطالب بنجاح', student: std };
      }
      return { success: false, message: 'الطالب غير موجود.' };
    }

    // 18c. Toggle Student Status -> PATCH /admin/students/:id/toggle-status
    const toggleMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)\/toggle-status$/);
    if (toggleMatch) {
      const id = toggleMatch[1];
      const studentsList = this.getStudentsList();
      const std = studentsList.find(u => u.id === id);
      if (std) {
        std.isActive = !std.isActive;
        this.saveStudentsList(studentsList);
        return { success: true, message: std.isActive ? 'تم تفعيل حساب الطالب' : 'تم تعطيل حساب الطالب', isActive: std.isActive };
      }
      return { success: false, message: 'الطالب غير موجود' };
    }

    // 18d. Regenerate Code -> POST /admin/students/:id/regenerate-code
    const regenMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)\/regenerate-code$/);
    if (regenMatch) {
      const id = regenMatch[1];
      const studentsList = this.getStudentsList();
      const std = studentsList.find(u => u.id === id);
      const newCode = 'QIMMAH-' + Math.floor(100 + Math.random() * 900);
      if (std) {
        std.accessCode = newCode;
        this.saveStudentsList(studentsList);
        return { success: true, message: `تم توليد كود جديد: ${newCode}`, newAccessCode: newCode, accessCode: newCode };
      }
      return { success: false, message: 'الطالب غير موجود' };
    }

    // 18e. Delete Student -> DELETE /admin/students/:id
    // PURGES EVERYTHING: user record, local databases, attempt history, and active sessions!
    const delMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)$/);
    if (delMatch && options.method === 'DELETE') {
      const id = delMatch[1];
      let studentsList = this.getStudentsList();
      const targetStudent = studentsList.find(u => u.id === id);
      
      const targetCode = targetStudent ? targetStudent.accessCode : null;

      // 1. Purge all data associated with this student
      this.purgeStudentData(id, targetCode);

      // 2. Remove student from list and persist
      studentsList = studentsList.filter(u => u.id !== id);
      this.saveStudentsList(studentsList);

      return {
        success: true,
        message: 'تم حذف حساب الطالب وكافة سجلاته وبياناته نهائياً من الموقع.'
      };
    }

    // 18f. Bulk Status -> POST /admin/students/bulk-status
    if (endpoint === '/admin/students/bulk-status') {
      const ids = body.studentIds || [];
      const isActive = !!body.isActive;
      const studentsList = this.getStudentsList();
      studentsList.forEach(u => {
        if (ids.includes(u.id)) u.isActive = isActive;
      });
      this.saveStudentsList(studentsList);
      return { success: true, message: `تم تحديث حالة ${ids.length} طلاب بنجاح` };
    }

    // 18g. List Students -> GET /admin/students
    if (endpoint.startsWith('/admin/students')) {
      const allData = this.getAllStudentsDb();
      const students = this.getStudentsList();
      const mapped = students.map(s => {
        const attempts = (allData.examAttempts || []).filter(a => a.studentId === s.id);
        const comp = attempts.length;
        const avg = comp > 0 ? Math.round(attempts.reduce((a, b) => a + (b.scorePercent || 0), 0) / comp) : 0;
        const best = comp > 0 ? Math.max(...attempts.map(a => a.scorePercent || 0)) : 0;
        return {
          id: s.id,
          name: s.name,
          accessCode: s.accessCode,
          isActive: s.isActive !== false,
          createdAt: s.createdAt || '2026-10-23T00:00:00.000Z',
          lastLogin: s.lastLogin || null,
          examsCompleted: comp,
          passedExams: attempts.filter(a => a.passed).length,
          averageScore: avg,
          bestScore: best
        };
      });
      return {
        success: true,
        total: mapped.length,
        students: mapped
      };
    }

    // 19. Admin Skills Overview -> GET /admin/skills-overview
    if (endpoint === '/admin/skills-overview') {
      const st = this.getSkillsTests();
      const skills = (st.skills || []).map(s => {
        const tests = s.tests || [];
        const totalQuestions = tests.reduce((sum, t) => sum + (t.questions ? t.questions.length : (t.questionCount || 0)), 0);
        return {
          id: s.id,
          name: s.name,
          category: s.category || s.id,
          icon: s.icon || 'fa-brain',
          color: s.color || 'from-emerald-500 to-teal-700',
          testsCount: tests.length,
          questionsCount: totalQuestions
        };
      });
      return { success: true, skills };
    }

    // 20. Skill Tests List & Create -> GET, POST /admin/skills/:skillId/tests
    const adminSkillTestsMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests$/);
    if (adminSkillTestsMatch) {
      const skillId = adminSkillTestsMatch[1];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };

      if (options.method === 'POST') {
        const tests = skill.tests || [];
        const nextNum = tests.length + 1;
        const newTest = {
          id: `${skillId}-test-${Date.now()}`,
          testNumber: nextNum,
          title: body.title || `الاختبار التدريبي (${nextNum})`,
          description: body.description || `تدريبات متخصصة في مهارة ${skill.name}`,
          passingScore: parseInt(body.passingScore || 16, 10),
          passingScorePercent: parseInt(body.passingScorePercent || 80, 10),
          questions: []
        };
        tests.push(newTest);
        skill.tests = tests;
        this.saveSkillsTests(st);
        return { success: true, message: 'تم إنشاء الاختبار التدريبي بنجاح.', test: newTest };
      }

      // GET
      const mapped = (skill.tests || []).map(t => ({
        id: t.id,
        testNumber: t.testNumber,
        title: t.title,
        description: t.description,
        questionCount: t.questions ? t.questions.length : (t.questionCount || 0),
        passingScore: t.passingScore || 16,
        passingScorePercent: t.passingScorePercent || 80
      }));
      return { success: true, skill: { id: skill.id, name: skill.name }, tests: mapped };
    }

    // 21. Skill Test Questions Reorder -> POST /admin/skills/:skillId/tests/:testId/questions/reorder
    const adminSkillQReorderMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/questions\/reorder$/);
    if (adminSkillQReorderMatch) {
      const skillId = adminSkillQReorderMatch[1];
      const testId = adminSkillQReorderMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      const test = skill ? (skill.tests || []).find(t => t.id === testId) : null;
      if (!test || !test.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const { qId, direction } = body;
      const idx = test.questions.findIndex(q => q.id === qId);
      if (idx !== -1) {
        if (direction === 'up' && idx > 0) {
          const temp = test.questions[idx];
          test.questions[idx] = test.questions[idx - 1];
          test.questions[idx - 1] = temp;
        } else if (direction === 'down' && idx < test.questions.length - 1) {
          const temp = test.questions[idx];
          test.questions[idx] = test.questions[idx + 1];
          test.questions[idx + 1] = temp;
        }
        test.questions.forEach((q, i) => { q.num = i + 1; });
        this.saveSkillsTests(st);
        return { success: true, message: 'تم تغيير ترتيب السؤال بنجاح.', questions: test.questions };
      }
      return { success: false, message: 'السؤال غير موجود.' };
    }

    // 22. Skill Test Single Question Item -> GET, PUT, DELETE /admin/skills/:skillId/tests/:testId/questions/:qId
    const adminSkillQItemMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/questions\/([a-zA-Z0-9_\-]+)$/);
    if (adminSkillQItemMatch) {
      const skillId = adminSkillQItemMatch[1];
      const testId = adminSkillQItemMatch[2];
      const qId = adminSkillQItemMatch[3];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      const test = skill ? (skill.tests || []).find(t => t.id === testId) : null;
      if (!test || !test.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const qIdx = test.questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return { success: false, message: 'السؤال غير موجود.' };

      if (options.method === 'DELETE') {
        test.questions.splice(qIdx, 1);
        test.questions.forEach((q, i) => { q.num = i + 1; });
        test.questionCount = test.questions.length;
        this.saveSkillsTests(st);
        return { success: true, message: 'تم حذف السؤال بنجاح.', remainingCount: test.questions.length };
      }

      if (options.method === 'PUT' || options.method === 'PATCH') {
        const q = test.questions[qIdx];
        if (body.question !== undefined) q.question = (body.question || '').trim();
        if (body.passage !== undefined) q.passage = (body.passage || '').trim() || null;
        if (body.options) q.options = body.options;
        if (body.correct !== undefined) q.correct = (body.correct || 'أ').trim();
        if (body.explanation !== undefined) q.explanation = (body.explanation || '').trim();
        if (body.rule !== undefined) q.rule = (body.rule || '').trim();
        this.saveSkillsTests(st);
        return { success: true, message: 'تم تحديث السؤال بنجاح.', question: q };
      }

      // GET
      return { success: true, question: test.questions[qIdx] };
    }

    // 23. Skill Test Questions List & Create -> GET, POST /admin/skills/:skillId/tests/:testId/questions
    const adminSkillQuestionsMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/questions$/);
    if (adminSkillQuestionsMatch) {
      const skillId = adminSkillQuestionsMatch[1];
      const testId = adminSkillQuestionsMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };
      const test = (skill.tests || []).find(t => t.id === testId);
      if (!test) return { success: false, message: 'الاختبار غير موجود.' };

      if (!test.questions) test.questions = [];

      if (options.method === 'POST') {
        const qNum = test.questions.length + 1;
        const newQ = {
          id: `${testId}-q-${Date.now()}`,
          num: qNum,
          skill: skillId,
          skillTitle: skill.name,
          question: (body.question || '').trim(),
          passage: (body.passage || '').trim() || null,
          options: Array.isArray(body.options) ? body.options : [body.optionA || '', body.optionB || '', body.optionC || '', body.optionD || ''],
          correct: (body.correct || body.correctAnswer || 'أ').trim(),
          explanation: (body.explanation || '').trim() || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
          rule: (body.rule || '').trim()
        };
        test.questions.push(newQ);
        test.questionCount = test.questions.length;
        this.saveSkillsTests(st);
        return { success: true, message: 'تمت إضافة السؤال بنجاح.', question: newQ };
      }

      // GET
      return {
        success: true,
        skill: { id: skill.id, name: skill.name },
        test: { id: test.id, title: test.title, questionCount: test.questions.length },
        questions: test.questions
      };
    }

    // 24. Skill Test Item: GET, PUT, DELETE -> /admin/skills/:skillId/tests/:testId
    const adminSkillTestItemMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)$/);
    if (adminSkillTestItemMatch) {
      const skillId = adminSkillTestItemMatch[1];
      const testId = adminSkillTestItemMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };

      const testIdx = (skill.tests || []).findIndex(t => t.id === testId);
      if (testIdx === -1) return { success: false, message: 'الاختبار غير موجود.' };
      const test = skill.tests[testIdx];

      if (options.method === 'DELETE') {
        skill.tests.splice(testIdx, 1);
        skill.tests.forEach((t, i) => { t.testNumber = i + 1; });
        this.saveSkillsTests(st);
        return { success: true, message: 'تم حذف الاختبار التدريبي بنجاح.' };
      }

      if (options.method === 'PUT' || options.method === 'PATCH') {
        if (body.title) test.title = body.title;
        if (body.description !== undefined) test.description = body.description;
        if (body.passingScore !== undefined) test.passingScore = parseInt(body.passingScore, 10);
        if (body.passingScorePercent !== undefined) test.passingScorePercent = parseInt(body.passingScorePercent, 10);
        this.saveSkillsTests(st);
        return { success: true, message: 'تم تحديث بيانات الاختبار بنجاح.', test };
      }

      // GET
      return { success: true, skill: { id: skill.id, name: skill.name }, test };
    }

    // 25. Combined Exams List -> GET /admin/exams-list
    if (endpoint === '/admin/exams-list') {
      const exams = this.getFarisExams();
      const mapped = exams.map(e => ({
        id: e.id,
        examNumber: e.examNumber,
        title: e.title,
        level: e.level,
        levelTitle: e.levelTitle || `المستوى ${e.level}`,
        questionCount: e.questions ? e.questions.length : (e.questionCount || 0),
        durationMinutes: e.durationMinutes || 60,
        passingScorePercent: e.passingScorePercent || 65
      }));
      return { success: true, exams: mapped };
    }

    // 26. Combined Exam Create -> POST /admin/exams
    if (endpoint === '/admin/exams' && options.method === 'POST') {
      const exams = this.getFarisExams();
      const nextNum = exams.length > 0 ? Math.max(...exams.map(e => e.examNumber || 0)) + 1 : 1;
      const level = parseInt(body.level || 1, 10);
      const levelTitles = {
        1: 'المستوى الأول: التأسيس والتثبيت',
        2: 'المستوى الثاني: التوسع والتطبيق',
        3: 'المستوى الثالث: التحدي والمنافسة',
        4: 'المستوى الرابع: المحاكاة المتقدمة',
        5: 'المستوى الخامس: الماراثون والاحتراف'
      };
      const newExam = {
        id: `faris-${nextNum}-${Date.now()}`,
        examNumber: nextNum,
        title: body.title || `الاختبار المجمع (${nextNum})`,
        level: level,
        levelTitle: levelTitles[level] || `المستوى ${level}`,
        durationMinutes: parseInt(body.durationMinutes || 60, 10),
        passingScorePercent: parseInt(body.passingScorePercent || 65, 10),
        questionCount: 0,
        questions: []
      };
      exams.push(newExam);
      this.saveFarisExams(exams);
      return { success: true, message: 'تم إنشاء الاختبار المجمع بنجاح.', exam: newExam };
    }

    // 27. Combined Exam Settings -> PUT /admin/exams/:id/settings
    const examSettingMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/settings$/);
    if (examSettingMatch) {
      const id = examSettingMatch[1];
      const exams = this.getFarisExams();
      const ex = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (ex) {
        if (body.title) ex.title = body.title;
        if (body.level) {
          ex.level = parseInt(body.level, 10);
          const levelTitles = {
            1: 'المستوى الأول: التأسيس والتثبيت',
            2: 'المستوى الثاني: التوسع والتطبيق',
            3: 'المستوى الثالث: التحدي والمنافسة',
            4: 'المستوى الرابع: المحاكاة المتقدمة',
            5: 'المستوى الخامس: الماراثون والاحتراف'
          };
          ex.levelTitle = levelTitles[ex.level] || `المستوى ${ex.level}`;
        }
        if (body.durationMinutes) ex.durationMinutes = parseInt(body.durationMinutes, 10);
        if (body.passingScorePercent) ex.passingScorePercent = parseInt(body.passingScorePercent, 10);
        this.saveFarisExams(exams);
        return { success: true, message: 'تم حفظ إعدادات الاختبار بنجاح', exam: ex };
      }
      return { success: false, message: 'الاختبار غير موجود.' };
    }

    // 28. Combined Exam Questions Reorder -> POST /admin/exams/:id/questions/reorder
    const adminExamQReorderMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/questions\/reorder$/);
    if (adminExamQReorderMatch) {
      const id = adminExamQReorderMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (!exam || !exam.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const { qId, direction } = body;
      const idx = exam.questions.findIndex(q => q.id === qId);
      if (idx !== -1) {
        if (direction === 'up' && idx > 0) {
          const temp = exam.questions[idx];
          exam.questions[idx] = exam.questions[idx - 1];
          exam.questions[idx - 1] = temp;
        } else if (direction === 'down' && idx < exam.questions.length - 1) {
          const temp = exam.questions[idx];
          exam.questions[idx] = exam.questions[idx + 1];
          exam.questions[idx + 1] = temp;
        }
        exam.questions.forEach((q, i) => { q.num = i + 1; });
        this.saveFarisExams(exams);
        return { success: true, message: 'تم تغيير ترتيب السؤال بنجاح.', questions: exam.questions };
      }
      return { success: false, message: 'السؤال غير موجود.' };
    }

    // 29. Combined Exam Question Single Item -> GET, PUT, DELETE /admin/exams/:id/questions/:qId
    const adminExamQItemMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/questions\/([a-zA-Z0-9_\-]+)$/);
    if (adminExamQItemMatch) {
      const id = adminExamQItemMatch[1];
      const qId = adminExamQItemMatch[2];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (!exam || !exam.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const qIdx = exam.questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return { success: false, message: 'السؤال غير موجود.' };

      if (options.method === 'DELETE') {
        exam.questions.splice(qIdx, 1);
        exam.questions.forEach((q, i) => { q.num = i + 1; });
        exam.questionCount = exam.questions.length;
        this.saveFarisExams(exams);
        return { success: true, message: 'تم حذف السؤال بنجاح.', remainingCount: exam.questions.length };
      }

      if (options.method === 'PUT' || options.method === 'PATCH') {
        const q = exam.questions[qIdx];
        if (body.question !== undefined) q.question = (body.question || '').trim();
        if (body.passage !== undefined) q.passage = (body.passage || '').trim() || null;
        if (body.options) q.options = body.options;
        if (body.correct !== undefined) q.correct = (body.correct || 'أ').trim();
        if (body.explanation !== undefined) q.explanation = (body.explanation || '').trim();
        if (body.rule !== undefined) q.rule = (body.rule || '').trim();
        if (body.skill) {
          q.skill = body.skill;
          const skillTitles = {
            analogy: 'التناظر اللفظي',
            completion: 'إكمال الجمل',
            context: 'الخطأ السياقي',
            reading: 'استيعاب المقروء',
            odd: 'المفردة الشاذة'
          };
          q.skillTitle = skillTitles[body.skill] || q.skillTitle;
        }
        this.saveFarisExams(exams);
        return { success: true, message: 'تم تحديث السؤال بنجاح.', question: q };
      }

      // GET
      return { success: true, question: exam.questions[qIdx] };
    }

    // 30. Combined Exam Questions List & Create -> GET, POST /admin/exams/:id/questions
    const adminExamQuestionsMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/questions$/);
    if (adminExamQuestionsMatch) {
      const id = adminExamQuestionsMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (!exam) return { success: false, message: 'الاختبار غير موجود.' };
      if (!exam.questions) exam.questions = [];

      if (options.method === 'POST') {
        const qNum = exam.questions.length + 1;
        const skillTitles = {
          analogy: 'التناظر اللفظي',
          completion: 'إكمال الجمل',
          context: 'الخطأ السياقي',
          reading: 'استيعاب المقروء',
          odd: 'المفردة الشاذة'
        };
        const skillId = body.skill || 'analogy';
        const newQ = {
          id: `exam-${exam.examNumber || exam.id}-q-${Date.now()}`,
          num: qNum,
          skill: skillId,
          skillTitle: skillTitles[skillId] || body.skillTitle || 'مهارة لفظية',
          question: (body.question || '').trim(),
          passage: (body.passage || '').trim() || null,
          options: Array.isArray(body.options) ? body.options : [body.optionA || '', body.optionB || '', body.optionC || '', body.optionD || ''],
          correct: (body.correct || body.correctAnswer || 'أ').trim(),
          explanation: (body.explanation || '').trim() || 'مراجعة المهارة والقاعدة المطلوبة.',
          rule: (body.rule || '').trim()
        };
        exam.questions.push(newQ);
        exam.questionCount = exam.questions.length;
        this.saveFarisExams(exams);
        return { success: true, message: 'تمت إضافة السؤال بنجاح.', question: newQ };
      }

      // GET
      return {
        success: true,
        exam: {
          id: exam.id,
          examNumber: exam.examNumber,
          title: exam.title,
          level: exam.level,
          questionCount: exam.questions.length
        },
        questions: exam.questions
      };
    }

    // 31. Combined Exam Item Delete -> DELETE /admin/exams/:id
    const adminExamDeleteMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)$/);
    if (adminExamDeleteMatch && options.method === 'DELETE') {
      const id = adminExamDeleteMatch[1];
      const exams = this.getFarisExams();
      const exIdx = exams.findIndex(e => e.id === id || e.id === 'faris-' + id);
      if (exIdx === -1) return { success: false, message: 'الاختبار غير موجود.' };
      exams.splice(exIdx, 1);
      this.saveFarisExams(exams);
      return { success: true, message: 'تم حذف الاختبار المجمع بنجاح.' };
    }

    // 32. Backup Export -> GET /admin/backup/export
    if (endpoint === '/admin/backup/export') {
      const bundle = this.getBundle() || {};
      const fullData = {
        users: this.getStudentsList(),
        settings: this.getPlatformSettings(),
        skillsBank: bundle.skillsBank || {},
        skillsTests: this.getSkillsTests(),
        farisLevels: bundle.farisLevels || [],
        farisExams: this.getFarisExams()
      };
      return {
        success: true,
        exportDate: new Date().toISOString(),
        data: fullData,
        backup: fullData,
        skillsTests: fullData.skillsTests,
        farisExams: fullData.farisExams
      };
    }

    // 33. Backup Restore -> POST /admin/backup/restore
    if (endpoint === '/admin/backup/restore' && options.method === 'POST') {
      const data = body.data || body.backup || body;
      if (data.farisExams && Array.isArray(data.farisExams)) this.saveFarisExams(data.farisExams);
      if (data.skillsTests && (Array.isArray(data.skillsTests.skills) || Array.isArray(data.skillsTests))) this.saveSkillsTests(data.skillsTests);
      if (data.users && Array.isArray(data.users)) this.saveStudentsList(data.users);
      if (data.settings) this.savePlatformSettings(data.settings);
      return {
        success: true,
        message: 'تمت استعادة قاعدة البيانات والنسخة الاحتياطية بنجاح.'
      };
    }

    // 34. Platform Settings -> GET, PUT /admin/settings
    if (endpoint === '/admin/settings') {
      if (options.method === 'PUT' || options.method === 'POST') {
        const current = this.getPlatformSettings();
        if (body.instructorName) current.instructorName = body.instructorName.trim();
        if (body.instructorPhone) current.instructorPhone = body.instructorPhone.trim();
        if (body.passingThresholdPercent) current.passingThresholdPercent = parseInt(body.passingThresholdPercent, 10);
        this.savePlatformSettings(current);
        return {
          success: true,
          message: 'تم حفظ وتحديث إعدادات المنصة بنجاح.',
          settings: current
        };
      }
      return {
        success: true,
        settings: this.getPlatformSettings()
      };
    }

    // 35. Reset Database -> POST /admin/reset-database
    if (endpoint === '/admin/reset-database') {
      try {
        localStorage.removeItem(this.customExamsKey);
        localStorage.removeItem(this.customSkillsKey);
        localStorage.removeItem(this.platformSettingsKey);
      } catch (e) {}
      return {
        success: true,
        message: 'تمت استعادة قاعدة البيانات الأصلية المعتمدة للمنصة بنجاح.'
      };
    }

    return { success: true, data: [] };
  },

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

if (typeof window !== 'undefined') {
  window.API = API;
  try {
    API.purgeLegacyCache();
  } catch (e) {}
}

