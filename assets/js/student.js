// Student Dashboard & Exam Runner Engine - Upgraded with High UX Standards
const StudentApp = {
  activeExam: null,
  activeQuestions: [],
  currentQuestionIndex: 0,
  studentAnswers: {}, // { questionId: 'أ' }
  flaggedQuestions: new Set(),
  crossedOutOptions: {}, // { questionId: Set(['أ', 'ج']) }
  examTimerInterval: null,
  examSecondsRemaining: 0,
  examStartTime: null,
  isTimedMode: true,
  pendingExamId: null,

  // Practice & Skill Test State
  isSkillTestMode: false,
  currentSkillId: null,
  currentTestId: null,
  skillTestTitle: '',
  skillTestAnswers: {},
  skillTestStartTime: null,
  practiceSkill: null,
  practiceQuestions: [],
  practiceIndex: 0,
  practiceSelectedChoice: null,
  practiceConfirmed: false,
  practiceCrossedOut: new Set(),

  // Current Dashboard Tab: 'skills' | 'exams' | 'achievements'
  activeTab: 'skills',

  // Initialize Student Dashboard
  async initDashboard() {
    this.resetState();
    this.renderSkeletons();
    await this.loadStudentProfile();
    await this.loadNextStep();
  },

  resetState() {
    if (this.examTimerInterval) clearInterval(this.examTimerInterval);
    this.activeExam = null;
    this.activeQuestions = [];
    this.currentQuestionIndex = 0;
    this.studentAnswers = {};
    this.flaggedQuestions = new Set();
    this.crossedOutOptions = {};
    this.examTimerInterval = null;
    this.examSecondsRemaining = 0;
    this.examStartTime = null;
    this.pendingExamId = null;

    this.isSkillTestMode = false;
    this.currentSkillId = null;
    this.currentTestId = null;
    this.skillTestTitle = '';
    this.skillTestAnswers = {};
    this.skillTestStartTime = null;
    this.practiceSkill = null;
    this.practiceQuestions = [];
    this.practiceIndex = 0;
    this.practiceSelectedChoice = null;
    this.practiceConfirmed = false;
    this.practiceCrossedOut.clear();
  },

  renderSkeletons() {
    const nextStepBox = document.getElementById('studentNextStepBox');
    if (nextStepBox) {
      nextStepBox.innerHTML = `
        <div class="skeleton-box h-28 w-full"></div>
      `;
    }
  },

  async loadStudentProfile() {
    const res = await API.get('/auth/me');
    if (res.success && res.user) {
      document.querySelectorAll('.student-name-display').forEach(el => el.textContent = res.user.name);
      document.querySelectorAll('.student-group-display').forEach(el => el.textContent = res.user.group || 'القسم العام');
      document.querySelectorAll('.student-code-display').forEach(el => el.textContent = res.user.accessCode || '-');
    }
  },

  // ROUTE-AWARE NAVIGATION HELPER
  switchDashboardTab(tabName) {
    if (tabName === 'skills') {
      window.location.hash = '#student/skills';
    } else if (tabName === 'exams') {
      window.location.hash = '#student/aggregated-tests';
    } else if (tabName === 'achievements') {
      window.location.hash = '#student/achievements';
    } else if (tabName === 'book') {
      window.location.hash = '#student/foundation-book';
    } else if (tabName === 'profile') {
      window.location.hash = '#student/profile';
    } else {
      window.location.hash = '#student';
    }
  },

  // 1. SMART NEXT ACTION ("جاهز لخطوة اليوم؟")
  async loadNextStep() {
    const res = await API.get('/students/next-step');
    const container = document.getElementById('studentNextStepBox');
    if (!container) return;

    if (res.success && res.nextStep) {
      const step = res.nextStep;
      container.innerHTML = `
        <div class="pplx-card p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-200 dark:border-fog/15 bg-gradient-to-l from-slate-100 via-white to-slate-50 dark:from-forest-800 dark:via-forest-900 dark:to-forest-850">
          <div class="relative z-10 text-center md:text-right">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-500/25">
              <i class="fa-solid ${step.icon || 'fa-bolt'}"></i>
              <span>جاهز لخطوة اليوم؟</span>
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black font-serif text-slate-900 dark:text-parchment mb-2">${step.title}</h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-fog max-w-xl leading-relaxed">${step.subtitle}</p>
          </div>

          <div class="relative z-10 flex items-center gap-3 w-full md:w-auto">
            <button onclick="StudentApp.handleNextStepAction('${step.actionTarget}')" class="btn-pill-primary w-full md:w-auto py-3.5 px-8 text-sm">
              <span>${step.actionText}</span>
              <i class="fa-solid fa-arrow-left text-xs mr-1"></i>
            </button>
          </div>
        </div>
      `;
    }
  },

  handleNextStepAction(target) {
    if (target.startsWith('faris-')) {
      this.startExam(target);
    } else if (target === 'skills') {
      this.switchDashboardTab('skills');
    } else {
      this.switchDashboardTab('exams');
    }
  },

  // 2. 7-DAY STUDY STREAK ("أسبوعك")
  async loadWeeklyStreak() {
    const res = await API.get('/students/streak');
    const container = document.getElementById('weeklyStreakContainer');
    const counterEl = document.getElementById('streakDaysCount');
    if (!container) return;

    if (res.success && res.weekDays) {
      if (counterEl) counterEl.textContent = res.currentStreak || 1;

      container.innerHTML = res.weekDays.map(day => `
        <div class="flex flex-col items-center gap-2 flex-1">
          <span class="text-[11px] font-bold ${day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
            ${day.dayName}
          </span>
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition-all ${day.active ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : (day.isToday ? 'border-2 border-dashed border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')}">
            ${day.active ? '<i class="fa-solid fa-check"></i>' : (day.isToday ? '<i class="fa-solid fa-dot-circle animate-pulse"></i>' : '<i class="fa-solid fa-minus text-[10px]"></i>')}
          </div>
        </div>
      `).join('');
    }
  },

  // 4. SKILLS OVERVIEW & 6 TRAINING TESTS PER SKILL (20 QUESTIONS EACH)
  async loadSkillsOverview() {
    const overviewWrap = document.getElementById('skillsOverviewWrap');
    const detailWrap = document.getElementById('skillDetailWrap');
    if (overviewWrap) overviewWrap.classList.remove('hidden');
    if (detailWrap) detailWrap.classList.add('hidden');

    const res = await API.get('/skills');
    const container = document.getElementById('skillsMasteryContainer');
    if (!container) return;

    if (res.success && res.skills) {
      container.innerHTML = res.skills.map(skill => `
        <div onclick="StudentApp.openSkillTests('${skill.id}')" class="pplx-card p-6 sm:p-7 border border-slate-200 dark:border-fog/15 cursor-pointer flex flex-col justify-between group hover:border-emerald-500/40 transition">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold border border-emerald-500/20">
                <i class="fa-solid ${skill.icon || 'fa-brain'}"></i>
              </div>
              <span class="text-xs font-bold px-3 py-1 rounded-full ${skill.completedTestsCount > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                ${skill.completedTestsCount > 0 ? `الدقة: ${skill.accuracyPercent}%` : 'جاهز للبدء'}
              </span>
            </div>

            <h3 class="text-xl font-black font-serif text-slate-900 dark:text-parchment mb-2">${skill.name}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">${skill.description}</p>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              <span>الإنجاز: <strong class="font-mono">${skill.completedTestsCount}</strong> من <strong class="font-mono">${skill.totalTests || 6}</strong> اختبارات</span>
              <span class="font-mono">20 سؤالاً / اختبار</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-5 overflow-hidden border border-slate-200 dark:border-slate-700/50">
              <div class="bg-emerald-500 h-2 rounded-full transition-all duration-500" style="width: ${Math.round((skill.completedTestsCount / (skill.totalTests || 6)) * 100)}%"></div>
            </div>

            <button onclick="event.stopPropagation(); StudentApp.openSkillTests('${skill.id}')" class="btn-pill-primary w-full py-3 text-xs sm:text-sm">
              <span>استعراض الاختبارات التدريبية (6)</span>
              <i class="fa-solid fa-arrow-left text-xs mr-1"></i>
            </button>
          </div>
        </div>
      `).join('');
    }
  },

  // OPEN A SINGLE SKILL'S 6 TRAINING TESTS (EACH 20 QUESTIONS)
  async openSkillTests(skillId) {
    App.switchLayout('student');
    App.switchStudentSubview('viewStudentSkills');

    App.showLoading(true);
    const res = await API.get(`/skills/${skillId}`);
    App.showLoading(false);

    if (!res.success || !res.skill) {
      App.showToast(res.message || 'تعذر تحميل اختبارات المهارة.', 'error');
      return;
    }

    const skill = res.skill;
    this.currentSkillId = skill.id;

    // Switch views in skills section
    const overviewWrap = document.getElementById('skillsOverviewWrap');
    const detailWrap = document.getElementById('skillDetailWrap');
    if (overviewWrap) overviewWrap.classList.add('hidden');
    if (detailWrap) detailWrap.classList.remove('hidden');

    // Populate skill header
    document.getElementById('skillDetailTitle').textContent = skill.name;
    document.getElementById('skillDetailDesc').textContent = skill.description;
    const iconContainer = document.getElementById('skillDetailIcon');
    if (iconContainer) {
      iconContainer.innerHTML = `<i class="fa-solid ${skill.icon || 'fa-brain'}"></i>`;
    }

    // Render the 6 distinct tests
    const container = document.getElementById('skillTestsListContainer');
    if (container) {
      container.innerHTML = (skill.tests || []).map(test => `
        <div class="pplx-card p-6 border ${test.completed ? (test.passed ? 'border-emerald-500/50' : 'border-amber-500/50') : 'border-slate-200 dark:border-fog/15'} flex flex-col justify-between group hover:border-emerald-500/40 transition">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-mono font-bold text-slate-400">الاختبار التدريبي (${test.testNumber})</span>
              ${test.completed ? `
                <span class="text-xs font-mono font-bold px-3 py-1 rounded-full ${test.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'}">
                  ${test.passed ? 'ناجح ✓' : 'يحتاج إعادة'}: ${test.bestScore} / 20 (${test.bestPercent}%)
                </span>
              ` : `
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  غير منجز
                </span>
              `}
            </div>

            <h4 class="text-lg font-black font-serif text-slate-900 dark:text-parchment mb-2">${test.title}</h4>
            
            <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-6 font-mono">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-list-check text-emerald-500"></i>
                <span><strong>20 سؤالاً بالتمام</strong> منتقاة من بنك التأسيس</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-bullseye text-blue-500"></i>
                <span>درجة الاجتياز: 16 من 20 (80%)</span>
              </div>
              ${test.lastAttemptAt ? `
                <div class="flex items-center gap-2 text-[11px] text-slate-400">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                  <span>آخر محاولة: ${new Date(test.lastAttemptAt).toLocaleDateString('ar-SA')}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="pt-4 border-t border-slate-200 dark:border-fog/15 flex items-center gap-2">
            <button onclick="StudentApp.startSkillTest('${skill.id}', '${test.id}')" class="${test.completed ? 'btn-pill-ghost' : 'btn-pill-primary'} w-full py-2.5 text-xs sm:text-sm">
              <i class="fa-solid ${test.completed ? 'fa-rotate-right' : 'fa-play'} ml-1"></i>
              <span>${test.completed ? 'إعادة الاختبار (20 سؤالاً)' : 'بدء الاختبار التدريبي (20 سؤالاً)'}</span>
            </button>
          </div>
        </div>
      `).join('');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  backToSkillsList() {
    const overviewWrap = document.getElementById('skillsOverviewWrap');
    const detailWrap = document.getElementById('skillDetailWrap');
    if (overviewWrap) overviewWrap.classList.remove('hidden');
    if (detailWrap) detailWrap.classList.add('hidden');
    this.loadSkillsOverview();
  },

  // START 20-QUESTION SKILL TRAINING TEST
  async startSkillTest(skillId, testId) {
    App.showLoading(true);
    const res = await API.get(`/skills/${skillId}/tests/${testId}/start`);
    App.showLoading(false);

    if (!res.success || !res.questions || res.questions.length === 0) {
      if (res.unauthorized) {
        App.openAuthModal('يرجى إدخال كود الطالب أولاً لبدء الاختبار.');
        return;
      }
      App.showToast(res.message || 'تعذر بدء الاختبار التدريبي.', 'error');
      return;
    }

    this.isSkillTestMode = true;
    this.currentSkillId = skillId;
    this.currentTestId = testId;
    this.skillTestTitle = res.test.title;
    this.skillTestAnswers = {};
    this.skillTestStartTime = Date.now();

    this.practiceSkill = { id: skillId, name: res.test.skillName };
    this.practiceQuestions = res.questions; // exactly 20 questions!
    this.practiceIndex = 0;
    this.practiceSelectedChoice = null;
    this.practiceConfirmed = false;
    this.practiceCrossedOut.clear();
    this.practiceCrossedOutPerQ = {};
    this.practiceConfirmedAnswers = {};
    this.flaggedPracticeQuestions = new Set();

    App.switchView('viewPracticeRunner');
    this.renderPracticePalette();
    this.renderPracticeQuestion();
  },

  // PRACTICE / SKILL TEST QUESTION PALETTE
  renderPracticePalette() {
    const palette = document.getElementById('practiceQuestionPalette');
    if (!palette || !this.practiceQuestions) return;

    palette.innerHTML = this.practiceQuestions.map((q, idx) => {
      const isAnswered = (this.skillTestAnswers && this.skillTestAnswers[q.id] !== undefined);
      const isFlagged = this.flaggedPracticeQuestions && this.flaggedPracticeQuestions.has(q.id);
      const isActive = (idx === this.practiceIndex);

      let colorClass = 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300';
      if (isFlagged) {
        colorClass = 'bg-amber-400 text-slate-900 font-extrabold shadow-sm';
      } else if (isAnswered) {
        colorClass = 'bg-emerald-500 text-white font-extrabold shadow-sm';
      }

      const activeClass = isActive ? 'ring-2 ring-emerald-500 scale-105 z-10' : '';

      return `
        <button onclick="StudentApp.jumpToPracticeQuestion(${idx})"
          class="palette-btn w-9 h-9 rounded font-mono text-xs font-bold transition flex items-center justify-center relative ${colorClass} ${activeClass}">
          ${idx + 1}
        </button>
      `;
    }).join('');
  },

  jumpToPracticeQuestion(index) {
    if (index < 0 || index >= this.practiceQuestions.length) return;
    this.practiceIndex = index;
    this.renderPracticeQuestion();
    this.renderPracticePalette();
  },

  toggleFlagPracticeQuestion() {
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    if (!this.flaggedPracticeQuestions) this.flaggedPracticeQuestions = new Set();

    if (this.flaggedPracticeQuestions.has(q.id)) {
      this.flaggedPracticeQuestions.delete(q.id);
    } else {
      this.flaggedPracticeQuestions.add(q.id);
    }

    this.updatePracticeFlagUI();
    this.renderPracticePalette();
  },

  updatePracticeFlagUI() {
    const q = this.practiceQuestions[this.practiceIndex];
    const btn = document.getElementById('btnFlagPracticeQuestion');
    if (!btn || !q) return;

    const isFlagged = this.flaggedPracticeQuestions && this.flaggedPracticeQuestions.has(q.id);
    if (isFlagged) {
      btn.innerHTML = `<i class="fa-solid fa-bookmark text-amber-500"></i> <span class="text-amber-500 font-extrabold">مميز للمراجعة</span>`;
    } else {
      btn.innerHTML = `<i class="fa-regular fa-bookmark"></i> <span>تمييز للمراجعة</span>`;
    }
  },

  prevPracticeQuestion() {
    if (this.practiceIndex > 0) {
      this.practiceIndex--;
      this.renderPracticeQuestion();
      this.renderPracticePalette();
    }
  },

  // PRACTICE / SKILL TEST QUESTION RENDERER
  renderPracticeQuestion() {
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    // Load state for this question
    if (!this.practiceCrossedOutPerQ) this.practiceCrossedOutPerQ = {};
    if (!this.practiceCrossedOutPerQ[q.id]) this.practiceCrossedOutPerQ[q.id] = new Set();
    const crossedOutSet = this.practiceCrossedOutPerQ[q.id];

    const currentChoice = this.skillTestAnswers[q.id] || null;
    this.practiceSelectedChoice = currentChoice;
    const isConfirmed = !!(this.practiceConfirmedAnswers && this.practiceConfirmedAnswers[q.id]);
    this.practiceConfirmed = isConfirmed;

    // Title & progress
    const titleEl = document.getElementById('practiceTitleDisplay');
    if (titleEl) titleEl.textContent = this.isSkillTestMode ? this.skillTestTitle : `تدريب: ${this.practiceSkill.name}`;
    
    const skillTag = document.getElementById('practiceSkillTitle');
    if (skillTag) skillTag.textContent = this.practiceSkill ? this.practiceSkill.name : 'تدريب المهارة';

    const counterEl = document.getElementById('practiceProgressCounter');
    if (counterEl) counterEl.textContent = `السؤال ${this.practiceIndex + 1} من ${this.practiceQuestions.length}`;

    // Prev button state
    const btnPrev = document.getElementById('btnPrevPractice');
    if (btnPrev) {
      btnPrev.disabled = (this.practiceIndex === 0);
      btnPrev.classList.toggle('opacity-40', this.practiceIndex === 0);
      btnPrev.classList.toggle('cursor-not-allowed', this.practiceIndex === 0);
    }

    // Passage (for reading comprehension)
    const passageBox = document.getElementById('practicePassageBox');
    const passageText = document.getElementById('practicePassageText');
    if (passageBox) {
      if (q.passage) {
        passageBox.classList.remove('hidden');
        if (passageText) passageText.textContent = q.passage;
      } else {
        passageBox.classList.add('hidden');
        if (passageText) passageText.textContent = '';
      }
    }

    document.getElementById('practiceQuestionText').textContent = q.question;

    const optionsContainer = document.getElementById('practiceOptionsContainer');
    const letters = ['أ', 'ب', 'ج', 'د'];
    const correctLetter = q.correct || q.correctAnswer || 'أ';

    optionsContainer.innerHTML = q.options.map((opt, idx) => {
      const letter = letters[idx];
      const isSelected = (currentChoice === letter);
      const isCrossed = crossedOutSet.has(letter);

      let btnClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';
      let iconClass = 'practice-status-icon hidden text-lg';

      if (isConfirmed) {
        if (letter === correctLetter) {
          btnClass = 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-bold';
          iconClass = 'practice-status-icon fa-solid fa-circle-check text-emerald-600 block text-lg';
        } else if (isSelected && letter !== correctLetter) {
          btnClass = 'border-rose-500 bg-rose-100 dark:bg-rose-900/60 text-rose-950 dark:text-rose-100 font-bold';
          iconClass = 'practice-status-icon fa-solid fa-circle-xmark text-rose-600 block text-lg';
        }
      } else if (isSelected) {
        btnClass = 'selected border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-bold';
      }

      if (isCrossed) {
        btnClass += ' crossed-out opacity-40 line-through';
      }

      return `
        <div class="relative group">
          <button id="practiceOpt_${letter}" onclick="StudentApp.selectPracticeOption('${letter}')" 
            ${isConfirmed ? 'disabled' : ''}
            class="option-btn w-full p-4 text-right rounded-2xl border-2 ${btnClass} font-semibold flex items-center justify-between hover:border-emerald-500 transition">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
                ${letter}
              </span>
              <span class="text-base">${opt}</span>
            </div>
            <i class="${iconClass}"></i>
          </button>
          
          <!-- Cross-out Button (استبعاد خيار) -->
          ${!isConfirmed ? `
          <button onclick="StudentApp.togglePracticeCrossOut('${letter}', event)" title="استبعاد هذا الخيار" class="absolute left-3 top-3.5 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center text-xs transition z-10">
            <i class="fa-solid fa-strikethrough"></i>
          </button>
          ` : ''}
        </div>
      `;
    }).join('');

    // Feedback Box
    const feedbackBox = document.getElementById('practiceFeedbackBox');
    const cheerEl = document.getElementById('practiceCheerMessage');
    const explEl = document.getElementById('practiceExplanationText');
    const ruleEl = document.getElementById('practiceRuleText');

    if (isConfirmed) {
      const isCorrect = (currentChoice === correctLetter);
      if (isCorrect) {
        feedbackBox.className = 'p-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 transition-all';
        cheerEl.innerHTML = `<span class="text-emerald-700 dark:text-emerald-300 font-black text-lg"><i class="fa-solid fa-award mr-2"></i> أحسنت يا بطل! إجابة صحيحة وموفقة 🌟</span>`;
      } else {
        feedbackBox.className = 'p-6 rounded-3xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/40 transition-all';
        cheerEl.innerHTML = `<span class="text-rose-700 dark:text-rose-300 font-black text-lg"><i class="fa-solid fa-lightbulb mr-2"></i> محاولة جيدة! الإجابة الصحيحة هي (${correctLetter}) 💡</span>`;
      }
      explEl.textContent = q.explanation || 'تحليل لغوي دقيق واستبعاد للخيارات غير المنسجمة.';
      ruleEl.textContent = q.rule || 'القاعدة المنهجية لاختبارات القدرات العامة.';
      feedbackBox.classList.remove('hidden');

      document.getElementById('btnConfirmPractice').classList.add('hidden');
    } else {
      feedbackBox.classList.add('hidden');
      const confirmBtn = document.getElementById('btnConfirmPractice');
      confirmBtn.classList.remove('hidden');
      confirmBtn.disabled = !currentChoice;
    }

    // Next / Submit button text
    const nextBtn = document.getElementById('btnNextPractice');
    if (this.practiceIndex + 1 >= this.practiceQuestions.length) {
      nextBtn.innerHTML = `<span>تسليم الاختبار</span> <i class="fa-solid fa-flag-checkered"></i>`;
    } else {
      nextBtn.innerHTML = `<span>السؤال التالي</span> <i class="fa-solid fa-chevron-left"></i>`;
    }

    this.updatePracticeFlagUI();
  },

  togglePracticeCrossOut(letter, e) {
    if (e) e.stopPropagation();
    if (this.practiceConfirmed) return;
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    if (!this.practiceCrossedOutPerQ) this.practiceCrossedOutPerQ = {};
    if (!this.practiceCrossedOutPerQ[q.id]) this.practiceCrossedOutPerQ[q.id] = new Set();
    const crossedOutSet = this.practiceCrossedOutPerQ[q.id];

    const btn = document.getElementById(`practiceOpt_${letter}`);
    if (!btn) return;

    if (crossedOutSet.has(letter)) {
      crossedOutSet.delete(letter);
      btn.classList.remove('crossed-out', 'opacity-40', 'line-through');
    } else {
      crossedOutSet.add(letter);
      btn.classList.add('crossed-out', 'opacity-40', 'line-through');
      if (this.practiceSelectedChoice === letter) {
        this.practiceSelectedChoice = null;
        delete this.skillTestAnswers[q.id];
        btn.classList.remove('selected', 'border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/40');
        const confirmBtn = document.getElementById('btnConfirmPractice');
        if (confirmBtn) confirmBtn.disabled = true;
        this.renderPracticePalette();
      }
    }
  },

  selectPracticeOption(letter) {
    if (this.practiceConfirmed) return;
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;

    if (!this.practiceCrossedOutPerQ) this.practiceCrossedOutPerQ = {};
    if (!this.practiceCrossedOutPerQ[q.id]) this.practiceCrossedOutPerQ[q.id] = new Set();
    const crossedOutSet = this.practiceCrossedOutPerQ[q.id];

    if (crossedOutSet.has(letter)) {
      this.togglePracticeCrossOut(letter);
    }

    this.practiceSelectedChoice = letter;
    this.skillTestAnswers[q.id] = letter;

    ['أ', 'ب', 'ج', 'د'].forEach(l => {
      const btn = document.getElementById(`practiceOpt_${l}`);
      if (btn) {
        if (l === letter) {
          btn.classList.add('selected', 'border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/40');
        } else {
          btn.classList.remove('selected', 'border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-950/40');
        }
      }
    });

    const confirmBtn = document.getElementById('btnConfirmPractice');
    if (confirmBtn) confirmBtn.disabled = false;

    this.renderPracticePalette();
  },

  async confirmPracticeAnswer() {
    if (!this.practiceSelectedChoice || this.practiceConfirmed) return;
    this.practiceConfirmed = true;

    const q = this.practiceQuestions[this.practiceIndex];
    if (!this.practiceConfirmedAnswers) this.practiceConfirmedAnswers = {};
    this.practiceConfirmedAnswers[q.id] = true;

    const correctLetter = q.correct || q.correctAnswer || 'أ';
    const isCorrect = (this.practiceSelectedChoice === correctLetter);

    this.skillTestAnswers[q.id] = this.practiceSelectedChoice;

    if (isCorrect) App.playSuccessSound();
    else App.playMistakeSound();

    ['أ', 'ب', 'ج', 'د'].forEach(l => {
      const btn = document.getElementById(`practiceOpt_${l}`);
      if (btn) {
        btn.disabled = true;
        if (l === correctLetter) {
          btn.classList.add('correct-choice', 'border-emerald-500', 'bg-emerald-100', 'dark:bg-emerald-900/60');
          btn.querySelector('.practice-status-icon').className = 'practice-status-icon fa-solid fa-circle-check text-emerald-600 block text-lg';
        } else if (l === this.practiceSelectedChoice && !isCorrect) {
          btn.classList.add('wrong-choice', 'border-rose-500', 'bg-rose-100', 'dark:bg-rose-900/60');
          btn.querySelector('.practice-status-icon').className = 'practice-status-icon fa-solid fa-circle-xmark text-rose-600 block text-lg';
        }
      }
    });

    const feedbackBox = document.getElementById('practiceFeedbackBox');
    const cheerEl = document.getElementById('practiceCheerMessage');
    const explEl = document.getElementById('practiceExplanationText');
    const ruleEl = document.getElementById('practiceRuleText');

    if (isCorrect) {
      feedbackBox.className = 'p-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 transition-all';
      cheerEl.innerHTML = `<span class="text-emerald-700 dark:text-emerald-300 font-black text-lg"><i class="fa-solid fa-award mr-2"></i> أحسنت يا بطل! إجابة صحيحة وموفقة 🌟</span>`;
    } else {
      feedbackBox.className = 'p-6 rounded-3xl border-2 border-rose-400 bg-rose-50 dark:bg-rose-950/40 transition-all';
      cheerEl.innerHTML = `<span class="text-rose-700 dark:text-rose-300 font-black text-lg"><i class="fa-solid fa-lightbulb mr-2"></i> محاولة جيدة! الإجابة الصحيحة هي (${correctLetter}) 💡</span>`;
    }

    explEl.textContent = q.explanation || 'تحليل لغوي دقيق واستبعاد للخيارات غير المنسجمة.';
    ruleEl.textContent = q.rule || 'القاعدة المنهجية لاختبارات القدرات العامة.';
    feedbackBox.classList.remove('hidden');

    document.getElementById('btnConfirmPractice').classList.add('hidden');
    this.renderPracticePalette();
  },

  nextPracticeQuestion() {
    if (this.practiceIndex + 1 < this.practiceQuestions.length) {
      this.practiceIndex++;
      this.renderPracticeQuestion();
      this.renderPracticePalette();
    } else {
      this.confirmSubmitSkillTest();
    }
  },

  confirmSubmitSkillTest() {
    const modal = document.getElementById('modalConfirmSubmitSkillTest');
    const bodyEl = document.getElementById('skillTestSubmitModalBody');
    const answeredCount = Object.keys(this.skillTestAnswers || {}).length;
    const totalCount = this.practiceQuestions ? this.practiceQuestions.length : 20;

    if (bodyEl) {
      bodyEl.textContent = `هل أنت متأكد من رغبتك في إنهاء الاختبار وتسليمه الآن؟ سيتم احتساب نتيجتك بناءً على الأسئلة التي أجبت عنها (أجبت على ${answeredCount} من ${totalCount} سؤالاً).`;
    }

    if (modal) {
      modal.classList.remove('hidden');
    } else {
      this.finishSkillTest();
    }
  },

  executeSubmitSkillTest() {
    const modal = document.getElementById('modalConfirmSubmitSkillTest');
    if (modal) modal.classList.add('hidden');
    this.finishSkillTest();
  },

  confirmExitSkillTest() {
    const modal = document.getElementById('modalConfirmExitSkillTest');
    if (modal) {
      modal.classList.remove('hidden');
    } else {
      App.exitRunner('skills');
    }
  },

  confirmExitExam() {
    const modal = document.getElementById('modalConfirmExitExam');
    if (modal) {
      modal.classList.remove('hidden');
    } else {
      App.exitRunner('exams');
    }
  },

  async finishSkillTest() {
    const durationSeconds = Math.round((Date.now() - this.skillTestStartTime) / 1000);
    App.showLoading(true);

    const res = await API.post(`/skills/${this.currentSkillId}/tests/${this.currentTestId}/submit`, {
      answers: this.skillTestAnswers,
      durationSeconds
    });

    App.showLoading(false);

    if (!res.success || !res.attempt) {
      App.showToast(res.message || 'حدث خطأ في حفظ نتيجة الاختبار.', 'error');
      App.exitRunner('skills');
      return;
    }

    const att = res.attempt;
    if (att.passed) App.playSuccessSound();
    else App.playMistakeSound();

    // Show result view
    this.isSkillTestMode = true;
    App.switchView('viewExamResults');

    document.getElementById('resExamTitle').textContent = att.testTitle;
    document.getElementById('resScorePercent').textContent = `${att.scorePercent}%`;
    document.getElementById('resCorrectCount').textContent = `${att.correctCount} من ${att.totalQuestions}`;
    document.getElementById('resTimeTaken').textContent = `${Math.round(att.durationSeconds / 60)} دقيقة`;

    const statusBadge = document.getElementById('resStatusBadge');
    if (att.passed) {
      statusBadge.className = 'px-5 py-2.5 rounded-full font-black text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-2 shadow-sm';
      statusBadge.innerHTML = `<i class="fa-solid fa-circle-check text-lg"></i> مبارك يا بطل! تم اجتياز الاختبار التدريبي بنجاح وحفظ في إنجازاتك 🌟`;
    } else {
      statusBadge.className = 'px-5 py-2.5 rounded-full font-black text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-2 shadow-sm';
      statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-lg"></i> محاولة جيدة! تم حفظ النتيجة في ملف إنجازاتك ويمكنك إعادة التدريب للوصول للإتقان 💪`;
    }

    const breakdownContainer = document.getElementById('resBreakdownContainer');
    breakdownContainer.innerHTML = (res.breakdown || []).map(q => {
      const isCorrect = q.isCorrect;
      const letters = ['أ', 'ب', 'ج', 'د'];
      return `
        <div class="pplx-card p-6 sm:p-7 border ${isCorrect ? 'border-emerald-500/40' : 'border-rose-500/40'} mb-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold px-3 py-1 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'}">
              ${isCorrect ? '<i class="fa-solid fa-check mr-1"></i> إجابة صحيحة' : '<i class="fa-solid fa-xmark mr-1"></i> إجابة خاطئة'} (سؤال ${q.num})
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400">إجابتك: <strong>${q.studentChoice || 'لم تجب'}</strong> | الإجابة النموذجية: <strong>${q.correctChoice}</strong></span>
          </div>

          ${q.passage ? `<div class="p-3 mb-3 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${q.passage}</div>` : ''}

          <h4 class="text-base font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">${q.question}</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            ${q.options.map((opt, idx) => {
              const letter = letters[idx];
              let optStyle = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300';
              if (letter === q.correctChoice) {
                optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (letter === q.studentChoice && !isCorrect) {
                optStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200';
              }

              return `
                <div class="p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${optStyle}">
                  <span><strong>${letter})</strong> ${opt}</span>
                  ${letter === q.correctChoice ? '<i class="fa-solid fa-circle-check text-emerald-600"></i>' : (letter === q.studentChoice ? '<i class="fa-solid fa-circle-xmark text-rose-600"></i>' : '')}
                </div>
              `;
            }).join('')}
          </div>

          <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs">
            <div class="font-bold text-slate-800 dark:text-slate-200 mb-1"><i class="fa-solid fa-lightbulb text-amber-500 ml-1"></i> الشرح والتعليل:</div>
            <p class="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">${q.explanation || 'تحليل لغوي سليم واستبعاد للخيارات غير المناسبة.'}</p>
            <div class="text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 font-mono">
              <strong>قاعدة الحل:</strong> ${q.rule || 'القواعد المنهجية لاختبار القدرات.'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // 5. AL-FARIS 25 COMPREHENSIVE EXAMS
  async loadFarisExams() {
    const res = await API.get('/exams');
    const container = document.getElementById('farisLevelsContainer');
    if (!container) return;

    if (res.success && res.levels) {
      container.innerHTML = res.levels.map(lvl => {
        const completedCount = lvl.exams.filter(e => e.completed && e.passed).length;
        const progressPct = Math.round((completedCount / lvl.exams.length) * 100);

        return `
          <div class="mb-12 bg-white dark:bg-slate-800/60 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-3 py-1 rounded-full text-xs font-bold ${lvl.isUnlocked ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
                    ${lvl.isUnlocked ? '<i class="fa-solid fa-lock-open mr-1"></i> متاح للدخول' : '<i class="fa-solid fa-lock mr-1"></i> مقفل (يتطلب اجتياز المستوى السابق)'}
                  </span>
                  <h3 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">${lvl.title}</h3>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400">${lvl.description}</p>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="text-xs font-bold text-slate-400 block">إنجاز المستوى</span>
                  <span class="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">${completedCount} من ${lvl.exams.length} (${progressPct}%)</span>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-200 dark:border-amber-800" title="${lvl.badge}">
                  <i class="fa-solid fa-medal"></i>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              ${lvl.exams.map(e => `
                <div class="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border ${e.completed ? (e.passed ? 'border-emerald-300 dark:border-emerald-800' : 'border-amber-300 dark:border-amber-800') : 'border-slate-200 dark:border-slate-700/80'} shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold text-slate-400">النموذج (${e.examNumber})</span>
                      ${e.completed ? `
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${e.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}">
                          ${e.passed ? 'ناجح' : 'يحتاج إعادة'}: ${e.bestScorePercent}%
                        </span>
                      ` : ''}
                    </div>

                    <h4 class="text-base font-bold text-slate-800 dark:text-white mb-3">${e.title}</h4>
                    
                    <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-6">
                      <span><i class="fa-solid fa-list-check ml-1 text-slate-400"></i> ${e.questionCount} سؤالاً</span>
                      <span><i class="fa-solid fa-clock ml-1 text-slate-400"></i> 65 دقيقة (أو مفتوح)</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-2">
                    <button ${!lvl.isUnlocked ? 'disabled' : ''} onclick="StudentApp.startExam('${e.id}')" 
                      class="flex-1 py-2.5 px-3 text-xs font-bold rounded-xl ${lvl.isUnlocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'} transition text-center">
                      ${e.completed ? 'إعادة الاختبار' : 'بدء الاختبار'}
                    </button>
                    ${e.completed ? `
                      <button onclick="StudentApp.reviewExamResult('${e.id}')" class="py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition">
                        مراجعة
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }
  },

  // 6. TIMED & UNTIMED EXAM ENGINE
  startExam(examId) {
    if (!API.getToken()) {
      App.openAuthModal('يرجى تسجيل الدخول بكود الطالب لبدء الاختبار.');
      return;
    }

    this.pendingExamId = examId;
    const modal = document.getElementById('modalExamModeSelect');
    if (modal) {
      const titleEl = document.getElementById('modeModalExamTitle');
      if (titleEl) {
        titleEl.textContent = `الاختبار المجمع الشامل (${examId.replace('faris-', '')})`;
      }
      modal.classList.remove('hidden');
    } else {
      // Fallback
      this.confirmStartExam(true);
    }
  },

  async confirmStartExam(isTimed = true) {
    const modal = document.getElementById('modalExamModeSelect');
    if (modal) modal.classList.add('hidden');

    this.isTimedMode = isTimed;
    const examId = this.pendingExamId;

    App.showLoading(true);
    const res = await API.get(`/exams/${examId}/start`);
    App.showLoading(false);

    if (!res.success || !res.questions) {
      if (res.unauthorized) {
        App.openAuthModal('يرجى إدخال كود الطالب أولاً للوصول للاختبار.');
        return;
      }
      App.showToast(res.message || 'تعذر بدء الاختبار.', 'error');
      return;
    }

    this.activeExam = res.exam;
    this.activeQuestions = res.questions;
    this.currentQuestionIndex = 0;
    this.studentAnswers = {};
    this.flaggedQuestions = new Set();
    this.crossedOutOptions = {};
    this.examStartTime = Date.now();
    this.examSecondsRemaining = (res.exam.durationMinutes || 65) * 60;

    App.switchView('viewExamRunner');
    this.renderQuestionPalette();
    this.renderExamQuestion();

    if (this.isTimedMode) {
      this.startExamTimer();
    } else {
      if (this.examTimerInterval) clearInterval(this.examTimerInterval);
      const timerDisplay = document.getElementById('examTimerDisplay');
      if (timerDisplay) {
        timerDisplay.innerHTML = `<span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"><i class="fa-solid fa-infinity"></i> <span>حل بدون وقت</span></span>`;
        timerDisplay.className = 'font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400';
      }
    }
  },

  startExamTimer() {
    if (this.examTimerInterval) clearInterval(this.examTimerInterval);
    const timerDisplay = document.getElementById('examTimerDisplay');

    this.examTimerInterval = setInterval(() => {
      this.examSecondsRemaining--;

      const mins = Math.floor(this.examSecondsRemaining / 60);
      const secs = this.examSecondsRemaining % 60;
      if (timerDisplay) {
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (this.examSecondsRemaining <= 120) {
          timerDisplay.className = 'font-mono text-base font-black text-rose-500 animate-pulse';
        } else if (this.examSecondsRemaining <= 300) {
          timerDisplay.className = 'font-mono text-base font-black text-amber-500';
        } else {
          timerDisplay.className = 'font-mono text-base font-black text-slate-800 dark:text-slate-100';
        }
      }

      if (this.examSecondsRemaining <= 0) {
        clearInterval(this.examTimerInterval);
        App.showToast('انتهى الوقت المحدد للاختبار! سيتم تسليم إجاباتك تلقائياً الآن.', 'info');
        this.submitExam(true);
      }
    }, 1000);
  },

  renderQuestionPalette() {
    const palette = document.getElementById('examQuestionPalette');
    if (!palette) return;

    palette.innerHTML = this.activeQuestions.map((q, idx) => {
      const isAnswered = !!this.studentAnswers[q.id];
      const isFlagged = this.flaggedQuestions.has(q.id);
      const isCurrent = idx === this.currentQuestionIndex;

      let bgClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      if (isCurrent) {
        bgClass = 'ring-2 ring-emerald-500 font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200';
      } else if (isFlagged) {
        bgClass = 'bg-amber-400 text-amber-950 font-bold';
      } else if (isAnswered) {
        bgClass = 'bg-emerald-600 text-white font-bold';
      }

      return `
        <button onclick="StudentApp.jumpToQuestion(${idx})" 
          class="palette-btn w-9 h-9 rounded flex items-center justify-center font-mono text-xs font-bold transition ${bgClass}">
          ${idx + 1}
        </button>
      `;
    }).join('');
  },

  renderExamQuestion() {
    const q = this.activeQuestions[this.currentQuestionIndex];
    if (!q) return;

    document.getElementById('examTitleDisplay').textContent = this.activeExam.title;
    document.getElementById('examProgressCounter').textContent = `السؤال ${this.currentQuestionIndex + 1} من ${this.activeQuestions.length}`;

    const skillTag = document.getElementById('examSkillTag');
    if (skillTag) {
      skillTag.textContent = q.skillTitle || 'سؤال مجمع';
    }

    // Passage (if any)
    const passageBox = document.getElementById('examPassageBox');
    if (passageBox) {
      if (q.passage) {
        passageBox.classList.remove('hidden');
        document.getElementById('examPassageText').textContent = q.passage;
      } else {
        passageBox.classList.add('hidden');
      }
    }

    document.getElementById('examQuestionText').textContent = q.question;

    const flagBtn = document.getElementById('btnFlagQuestion');
    const isFlagged = this.flaggedQuestions.has(q.id);
    if (flagBtn) {
      flagBtn.innerHTML = isFlagged 
        ? `<i class="fa-solid fa-bookmark text-amber-500"></i> <span class="text-amber-600 dark:text-amber-400">مميز للمراجعة</span>`
        : `<i class="fa-regular fa-bookmark"></i> <span>تمييز للمراجعة</span>`;
    }

    const letters = ['أ', 'ب', 'ج', 'د'];
    const currentSelected = this.studentAnswers[q.id];
    const crossedOutSet = this.crossedOutOptions[q.id] || new Set();

    const optionsContainer = document.getElementById('examOptionsContainer');
    optionsContainer.innerHTML = q.options.map((opt, idx) => {
      const letter = letters[idx];
      const isSelected = (currentSelected === letter);
      const isCrossed = crossedOutSet.has(letter);

      return `
        <div class="relative group">
          <button onclick="StudentApp.selectExamOption('${letter}')" 
            class="option-btn w-full p-4 text-right rounded-2xl border-2 ${isSelected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 selected' : (isCrossed ? 'crossed-out border-slate-200' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800')} text-slate-800 dark:text-slate-100 font-semibold flex items-center justify-between hover:border-emerald-500 transition">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'} flex items-center justify-center font-bold">
                ${letter}
              </span>
              <span class="text-base">${opt}</span>
            </div>
            ${isSelected ? '<i class="fa-solid fa-circle-check text-emerald-600 text-xl"></i>' : ''}
          </button>

          <!-- Cross-out Button in Exam Mode -->
          <button onclick="StudentApp.toggleExamCrossOut('${letter}', event)" title="استبعاد خيار" class="absolute left-3 top-3.5 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center text-xs transition z-10">
            <i class="fa-solid fa-strikethrough"></i>
          </button>
        </div>
      `;
    }).join('');

    document.getElementById('btnPrevQuestion').disabled = (this.currentQuestionIndex === 0);
    this.renderQuestionPalette();
  },

  toggleExamCrossOut(letter, e) {
    if (e) e.stopPropagation();
    const q = this.activeQuestions[this.currentQuestionIndex];
    if (!q) return;

    if (!this.crossedOutOptions[q.id]) {
      this.crossedOutOptions[q.id] = new Set();
    }
    const set = this.crossedOutOptions[q.id];

    if (set.has(letter)) {
      set.delete(letter);
    } else {
      set.add(letter);
      if (this.studentAnswers[q.id] === letter) {
        delete this.studentAnswers[q.id];
      }
    }
    this.renderExamQuestion();
  },

  selectExamOption(letter) {
    const q = this.activeQuestions[this.currentQuestionIndex];
    if (!q) return;

    if (this.crossedOutOptions[q.id] && this.crossedOutOptions[q.id].has(letter)) {
      this.crossedOutOptions[q.id].delete(letter);
    }

    this.studentAnswers[q.id] = letter;
    this.renderExamQuestion();
  },

  toggleFlagQuestion() {
    const q = this.activeQuestions[this.currentQuestionIndex];
    if (!q) return;

    if (this.flaggedQuestions.has(q.id)) {
      this.flaggedQuestions.delete(q.id);
    } else {
      this.flaggedQuestions.add(q.id);
    }
    this.renderExamQuestion();
  },

  jumpToQuestion(index) {
    if (index >= 0 && index < this.activeQuestions.length) {
      this.currentQuestionIndex = index;
      this.renderExamQuestion();
    }
  },

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderExamQuestion();
    }
  },

  nextQuestion() {
    if (this.currentQuestionIndex + 1 < this.activeQuestions.length) {
      this.currentQuestionIndex++;
      this.renderExamQuestion();
    }
  },

  confirmSubmitExam() {
    const total = this.activeQuestions.length;
    const answered = Object.keys(this.studentAnswers).length;
    const unanswered = total - answered;
    const flagged = this.flaggedQuestions.size;

    let message = `هل أنت متأكد من تسليم الاختبار؟\n\n- عدد الأسئلة المجابة: ${answered} من ${total}\n`;
    if (unanswered > 0) {
      message += `- تنبيه: لديك ${unanswered} سؤالاً لم تجب عليها بعد!\n`;
    }
    if (flagged > 0) {
      message += `- لديك ${flagged} سؤالاً قمت بتمييزها للمراجعة.\n`;
    }

    if (confirm(message)) {
      this.submitExam(false);
    }
  },

  async submitExam(auto = false) {
    if (this.examTimerInterval) clearInterval(this.examTimerInterval);

    const durationSeconds = Math.round((Date.now() - this.examStartTime) / 1000);

    App.showLoading(true);
    const res = await API.post(`/exams/${this.activeExam.id}/submit`, {
      durationSeconds,
      answers: this.studentAnswers,
      studentAnswers: this.studentAnswers,
      isTimed: this.isTimedMode
    });
    App.showLoading(false);

    if (!res.success || !res.results) {
      App.showToast(res.message || 'حدث خطأ أثناء حفظ النتيجة.', 'error');
      return;
    }

    if (res.results.passed) App.playSuccessSound();
    else App.playMistakeSound();

    this.showExamResults(res.results);
  },

  // 7. DISPLAY DETAILED RESULTS
  showExamResults(results) {
    this.isSkillTestMode = false;
    App.switchView('viewExamResults');

    document.getElementById('resExamTitle').textContent = results.examTitle;
    document.getElementById('resScorePercent').textContent = `${results.scorePercent}%`;
    document.getElementById('resCorrectCount').textContent = `${results.correctCount} من ${results.totalQuestions}`;
    document.getElementById('resTimeTaken').textContent = `${Math.round(results.durationSeconds / 60)} دقيقة`;

    const statusBadge = document.getElementById('resStatusBadge');
    if (results.passed) {
      statusBadge.className = 'px-5 py-2.5 rounded-full font-black text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 flex items-center gap-2 shadow-sm';
      statusBadge.innerHTML = `<i class="fa-solid fa-circle-check text-lg"></i> مبارك يا بطل! تم اجتياز الاختبار بنجاح (المعيار: ${results.passingThreshold}%)`;
    } else {
      statusBadge.className = 'px-5 py-2.5 rounded-full font-black text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-2 shadow-sm';
      statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-lg"></i> يحتاج لمزيد من التدريب والتمكين (المعيار: ${results.passingThreshold}%)`;
    }

    const breakdownContainer = document.getElementById('resBreakdownContainer');
    breakdownContainer.innerHTML = (results.breakdown || []).map(q => {
      const isCorrect = q.isCorrect;
      const letters = ['أ', 'ب', 'ج', 'د'];
      return `
        <div class="pplx-card p-6 sm:p-7 border ${isCorrect ? 'border-emerald-500/40' : 'border-rose-500/40'} mb-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold px-3 py-1 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'}">
              ${isCorrect ? '<i class="fa-solid fa-check mr-1"></i> إجابة صحيحة' : '<i class="fa-solid fa-xmark mr-1"></i> إجابة خاطئة'} (سؤال ${q.num})
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400">إجابتك: <strong>${q.studentChoice || 'لم تجب'}</strong> | الإجابة الصحيحة: <strong>${q.correctChoice}</strong></span>
          </div>

          ${q.passage ? `<div class="p-3 mb-3 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">${q.passage}</div>` : ''}

          <h4 class="text-base font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">${q.question}</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            ${q.options.map((opt, idx) => {
              const letter = letters[idx];
              let optStyle = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300';
              if (letter === q.correctChoice) {
                optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (letter === q.studentChoice && !isCorrect) {
                optStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200';
              }

              return `
                <div class="p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${optStyle}">
                  <span><strong>${letter})</strong> ${opt}</span>
                  ${letter === q.correctChoice ? '<i class="fa-solid fa-circle-check text-emerald-600"></i>' : (letter === q.studentChoice ? '<i class="fa-solid fa-circle-xmark text-rose-600"></i>' : '')}
                </div>
              `;
            }).join('')}
          </div>

          <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs">
            <div class="font-bold text-slate-800 dark:text-slate-200 mb-1"><i class="fa-solid fa-lightbulb text-amber-500 ml-1"></i> الشرح والتعليل:</div>
            <p class="text-slate-600 dark:text-slate-300 leading-relaxed mb-2">${q.explanation || 'تم اختيار هذه الإجابة وفقاً للعلاقة البلاغية والمنطقية المعتمدة.'}</p>
            <div class="text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 font-mono">
              <strong>قاعدة الحل:</strong> ${q.rule || 'القاعدة المنهجية لاختبارات قياس.'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async reviewExamResult(examId) {
    App.showLoading(true);
    const res = await API.get('/auth/me');
    App.showLoading(false);
    App.showToast('يمكنك استعراض تفاصيل إجاباتك السابقة فوراً.', 'info');
  },

  // 8. FULL ACHIEVEMENTS & PORTFOLIO ENGINE ("إنجازاتي")
  async loadAchievements() {
    const container = document.getElementById('studentAchievementsFullContainer');
    if (!container) return;

    App.showLoading(true);
    const res = await API.get('/students/achievements');
    App.showLoading(false);

    if (!res.success) {
      container.innerHTML = `
        <div class="text-center py-10 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
          <p class="text-xs text-rose-500">تعذر تحميل بيانات الإنجازات حالياً.</p>
        </div>
      `;
      return;
    }

    const { overall, skillsSummary, recentSkillAttempts, recentExamAttempts } = res;

    container.innerHTML = `
      <!-- 1. Top KPI Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div class="pplx-card p-5 sm:p-6 border border-slate-200 dark:border-fog/15 text-center">
          <div class="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            ${overall.completedSkillTestsCount} <span class="text-sm font-normal text-slate-400 font-sans">/ 30</span>
          </div>
          <div class="text-xs font-bold font-serif text-slate-700 dark:text-parchment">اختبار تدريبي منجز</div>
        </div>

        <div class="pplx-card p-5 sm:p-6 border border-slate-200 dark:border-fog/15 text-center">
          <div class="text-3xl sm:text-4xl font-black font-mono text-blue-600 dark:text-blue-400 mb-1">
            ${overall.completedExamsCount} <span class="text-sm font-normal text-slate-400 font-sans">/ 25</span>
          </div>
          <div class="text-xs font-bold font-serif text-slate-700 dark:text-parchment">اختبار مجمع شامل</div>
        </div>

        <div class="pplx-card p-5 sm:p-6 border border-slate-200 dark:border-fog/15 text-center">
          <div class="text-3xl sm:text-4xl font-black font-mono text-amber-500 mb-1">
            ${overall.overallAccuracyPercent}%
          </div>
          <div class="text-xs font-bold font-serif text-slate-700 dark:text-parchment">نسبة الدقة العامة</div>
        </div>

        <div class="pplx-card p-5 sm:p-6 border border-slate-200 dark:border-fog/15 text-center">
          <div class="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 mb-1">
            ${overall.totalQuestionsAnswered || 0}
          </div>
          <div class="text-xs font-bold font-serif text-slate-700 dark:text-parchment">سؤالاً تم حله بالكامل</div>
        </div>
      </div>

      <!-- 2. Skills Mastery Progress Cards -->
      <div class="mb-10 pplx-card p-6 sm:p-8 border border-slate-200 dark:border-fog/15">
        <h4 class="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <i class="fa-solid fa-chart-pie text-emerald-600"></i>
          <span>مستوى إتقان مهارات القدرات الخمس</span>
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${(skillsSummary || []).map(s => `
            <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-bold text-slate-800 dark:text-white">${s.name}</span>
                  <span class="text-xs font-bold text-emerald-600">${s.completedTestsCount} / ${s.totalTests} اختبارات</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mb-3 overflow-hidden">
                  <div class="bg-emerald-500 h-2 rounded-full" style="width: ${Math.round((s.completedTestsCount / s.totalTests) * 100)}%"></div>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <span>أفضل نتيجة: <strong>${s.bestScore} / 20</strong></span>
                <button onclick="StudentApp.switchDashboardTab('skills'); StudentApp.openSkillTests('${s.skillId}')" class="text-emerald-600 font-bold hover:underline">
                  استعراض ←
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Completed Skill Training Tests (20 Questions each) -->
      <div class="mb-10 pplx-card p-6 sm:p-8 border border-slate-200 dark:border-fog/15">
        <h4 class="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <i class="fa-solid fa-list-check text-blue-600"></i>
          <span>سجل الاختبارات التدريبية للمهارات (20 سؤالاً بالتمام)</span>
        </h4>
        ${recentSkillAttempts && recentSkillAttempts.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="w-full text-right text-xs">
              <thead class="bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="p-3">الاختبار التدريبي</th>
                  <th class="p-3">المهارة</th>
                  <th class="p-3">النتيجة</th>
                  <th class="p-3">النسبة</th>
                  <th class="p-3">الحالة</th>
                  <th class="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                ${recentSkillAttempts.map(att => `
                  <tr>
                    <td class="p-3 font-bold text-slate-800 dark:text-white">${att.testTitle}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${att.skillName}</td>
                    <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">${att.correctCount} / ${att.totalQuestions}</td>
                    <td class="p-3 font-mono font-bold text-emerald-600">${att.scorePercent}%</td>
                    <td class="p-3">
                      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${att.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
                        ${att.passed ? 'ناجح ✓' : 'يحتاج تدريب'}
                      </span>
                    </td>
                    <td class="p-3 font-mono text-slate-400">${new Date(att.submittedAt).toLocaleDateString('ar-SA')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-center py-8 text-xs text-slate-400">
            لم تسجل أي اختبارات مهارات بعد. انتقل إلى تبويب "مهارات القدرات" وابدأ أول اختبار تدريبي مكون من 20 سؤالاً.
          </div>
        `}
      </div>

      <!-- 4. Completed Aggregated Exams (65 Questions each) -->
      <div class="mb-10 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h4 class="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <i class="fa-solid fa-medal text-amber-500"></i>
          <span>سجل الاختبارات المجمعة الشاملة</span>
        </h4>
        ${recentExamAttempts && recentExamAttempts.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="w-full text-right text-xs">
              <thead class="bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th class="p-3">النموذج المجمع</th>
                  <th class="p-3">الدرجة</th>
                  <th class="p-3">النسبة</th>
                  <th class="p-3">الحالة</th>
                  <th class="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                ${recentExamAttempts.map(att => `
                  <tr>
                    <td class="p-3 font-bold text-slate-800 dark:text-white">${att.examTitle}</td>
                    <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">${att.correctAnswersCount} / ${att.totalQuestions}</td>
                    <td class="p-3 font-mono font-bold text-emerald-600">${att.scorePercent}%</td>
                    <td class="p-3">
                      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${att.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
                        ${att.passed ? 'اجتياز معتمد ✓' : 'يحتاج إعادة'}
                      </span>
                    </td>
                    <td class="p-3 font-mono text-slate-400">${new Date(att.submittedAt).toLocaleDateString('ar-SA')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-center py-8 text-xs text-slate-400">
            لم تكمل أي اختبار مجمع حتى الآن. خض نماذج الاختبارات المجمعة من تبويب "الاختبارات المجمعة".
          </div>
        `}
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.StudentApp = StudentApp;
}
