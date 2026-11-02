// Main Client Application Controller - Enhanced with Modern UX
const App = {
  currentView: 'viewHome',
  currentUser: null,
  isDarkMode: false,
  soundEnabled: true,
  fontScale: 'md', // sm, md, lg, xl

  // Sample landing placement test questions
  demoPlacementQuestions: [
    {
      q: 'رئة : تنفس',
      options: ['عين : رؤية', 'قلب : نبض', 'يد : كتابة', 'قدم : حذاء'],
      correct: 0,
      expl: 'العلاقة: وظيفة العضو؛ الرئة للتنفس والعين للرؤية.'
    },
    {
      q: 'القراءة تغذي ......... كما يغذي الطعام .........',
      options: ['العقل - الجسد', 'الروح - الفكر', 'القلب - العين', 'اللسان - المعدة'],
      correct: 0,
      expl: 'تشبيه بليغ متناظر؛ القراءة غذاء العقل والطعام غذاء الجسد.'
    },
    {
      q: 'الابتسامة كلمة طيبة بغير حروف، وهي مفتاح لإغلاق قلوب الآخرين.',
      options: ['الابتسامة', 'طيبة', 'إغلاق', 'الآخرين'],
      correct: 2,
      expl: 'الخطأ السياقي: (إغلاق) والصواب (فتح)، فالابتسامة مفتاح لفتح القلوب.'
    }
  ],
  demoCurrentIdx: 0,
  demoScore: 0,

  init() {
    this.initTheme();
    this.initPreferences();
    this.initAuth();
    this.initRouter();
  },

  // PREFERENCES (Sound & Font scale)
  initPreferences() {
    const savedSound = localStorage.getItem('alqimmah_sound');
    this.soundEnabled = savedSound !== 'false';
    this.updateSoundIcon();

    const savedScale = localStorage.getItem('alqimmah_font_scale') || 'md';
    this.setFontScale(savedScale);
  },

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('alqimmah_sound', this.soundEnabled);
    this.updateSoundIcon();
    this.showToast(this.soundEnabled ? 'تم تفعيل المؤثرات الصوتية 🔔' : 'تم كتم المؤثرات الصوتية 🔕', 'info');
  },

  updateSoundIcon() {
    document.querySelectorAll('#soundToggleIcon, .student-sound-icon').forEach(el => {
      el.className = this.soundEnabled ? 'fa-solid fa-volume-high text-emerald-600 dark:text-emerald-400' : 'fa-solid fa-volume-xmark text-slate-400';
    });
  },

  openPublicDrawer(tabId = 'roadmap') {
    this.switchLayout('public');
    const targetEl = document.getElementById(tabId);
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  },

  closePublicDrawer() {},

  switchPublicDrawerTab(tabId) {
    this.openPublicDrawer(tabId);
  },

  togglePublicMobileMenu() {
    this.openPublicDrawer('roadmap');
  },

  closePublicMobileMenu() {
    this.closePublicDrawer();
  },

  // NATIVE SYNTHESIZED AUDIO (Web Audio API - No external mp3 files needed)
  playSuccessSound() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Pleasant chord progression (E5 to A5)
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5

      osc2.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc2.frequency.exponentialRampToValueAtTime(698.46, ctx.currentTime + 0.15); // F5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // AudioContext not allowed or not supported
    }
  },

  playMistakeSound() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  },

  // FONT SIZE SCALING
  setFontScale(scale) {
    this.fontScale = scale;
    localStorage.setItem('alqimmah_font_scale', scale);
    
    // Apply font scale class to all question containers
    const questionContainers = document.querySelectorAll('.scalable-text');
    questionContainers.forEach(el => {
      el.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg', 'font-scale-xl');
      el.classList.add(`font-scale-${scale}`);
    });

    // Sync select dropdowns
    document.querySelectorAll('.font-scale-select').forEach(sel => {
      sel.value = scale;
    });
  },

  // THEME (Dark Nocturnal Forest & Warm Parchment / Light Classic Parchment)
  initTheme() {
    const saved = localStorage.getItem('alqimmah_theme');
    // Default to Nocturnal Deep Forest & Warm Parchment (Dark) unless explicitly set to light
    this.isDarkMode = saved ? (saved === 'dark') : true;
    this.applyTheme();
  },

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('alqimmah_theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  },

  applyTheme() {
    const html = document.documentElement;
    const navIcon = document.getElementById('navThemeIcon');
    const navText = document.getElementById('navThemeText');

    if (this.isDarkMode) {
      html.classList.add('dark');
      if (navIcon) navIcon.className = 'fa-solid fa-sun text-amber-400 text-xs';
      if (navText) navText.textContent = 'النهاري';
      document.querySelectorAll('#themeToggleIcon, .student-theme-icon, .float-theme-icon').forEach(icon => {
        icon.className = 'fa-solid fa-sun text-amber-400 text-xs sm:text-base';
      });
      document.querySelectorAll('.student-theme-text').forEach(el => {
        el.textContent = 'النهاري';
      });
    } else {
      html.classList.remove('dark');
      if (navIcon) navIcon.className = 'fa-solid fa-moon text-amber-300 text-xs';
      if (navText) navText.textContent = 'الليلي';
      document.querySelectorAll('#themeToggleIcon, .student-theme-icon, .float-theme-icon').forEach(icon => {
        icon.className = 'fa-solid fa-moon text-slate-700 text-xs sm:text-base';
      });
      document.querySelectorAll('.student-theme-text').forEach(el => {
        el.textContent = 'الليلي';
      });
    }
  },

  // ROUTER & VIEW SWITCHING
  initRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('auth:expired', () => {
      this.showToast('انتهت جلسة تسجيل الدخول، يرجى الدخول مجدداً.', 'info');
      this.switchLayout('public');
      this.updateNavbar();
    });

    // Intercept clicks on links to ensure returning from runners/modals always works seamlessly
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#student"]');
      if (link) {
        const href = link.getAttribute('href');
        const activeRunner = ['viewPracticeRunner', 'viewExamRunner', 'viewExamResults'].some(id => {
          const el = document.getElementById(id);
          return el && !el.classList.contains('hidden');
        });
        if (activeRunner) {
          e.preventDefault();
          const target = href.replace('#student/', '').replace('#student', 'dashboard') || 'dashboard';
          this.exitRunner(target);
        }
      }
    });

    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash || '#home';



    // 2. Admin Route (#admin) - Strict Protection
    if (hash === '#admin') {
      if (this.currentUser && this.currentUser.role === 'admin') {
        this.switchLayout('admin');
        AdminApp.initDashboard();
      } else if (this.currentUser && this.currentUser.role === 'student') {
        this.showToast('غير مصرح لك بالوصول إلى لوحة التحكم.', 'error');
        window.location.hash = '#student';
      } else {
        window.location.hash = '#home';
        this.switchLayout('public');
        this.openAuthModal('يرجى إدخال كود الدخول للمتابعة');
      }
      return;
    }

    // 3. Authenticated Student Routes (#student, #student/*)
    if (hash === '#student' || hash.startsWith('#student/') || hash === '#dashboard') {
      // Route Guard: Require authentication
      if (!this.currentUser) {
        window.location.hash = '#home';
        this.switchLayout('public');
        this.openAuthModal('يرجى إدخال كود الدخول أولاً للوصول لمنطقة الطلاب');
        return;
      }

      this.switchLayout('student');

      if (hash === '#student/skills') {
        this.switchStudentSubview('viewStudentSkills');
        StudentApp.loadSkillsOverview();
      } else if (hash === '#student/aggregated-tests') {
        this.switchStudentSubview('viewStudentExams');
        StudentApp.loadFarisExams();
      } else if (hash === '#student/achievements') {
        this.switchStudentSubview('viewStudentAchievements');
        StudentApp.loadAchievements();
      } else if (hash === '#student/foundation-book') {
        this.switchStudentSubview('viewStudentBook');
      } else if (hash === '#student/profile') {
        this.switchStudentSubview('viewStudentProfile');
        StudentApp.loadStudentProfile();
      } else {
        // Default #student
        this.switchStudentSubview('viewStudentDashboard');
        StudentApp.initDashboard();
      }
      return;
    }

    // 4. Public Landing Page (#home or hash anchors)
    // If user is already authenticated:
    if (this.currentUser && (hash === '#home' || hash === '' || hash === '#')) {
      if (this.currentUser.role === 'admin') {
        window.location.hash = '#admin';
        return;
      }
      if (this.currentUser.role === 'student') {
        window.location.hash = '#student';
        return;
      }
    }

    this.switchLayout('public');

    // Update active glowing nav link indicator on public navbar
    const publicNavLinks = document.querySelectorAll('#publicNavbar .nav-pill[href^="#"]');
    if (publicNavLinks.length > 0) {
      publicNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === hash || ((hash === '' || hash === '#home' || hash === '#') && linkHref === '#home')) {
          link.classList.add('nav-link-active');
          link.classList.remove('text-fog');
        } else {
          link.classList.remove('nav-link-active');
          link.classList.add('text-fog');
        }
      });
    }

    const cleanHash = hash.replace('#', '');
    const homeSections = ['skills', 'book', 'exams', 'faq'];
    if (homeSections.includes(cleanHash) || (hash && hash !== '#home' && hash !== '')) {
      const targetEl = document.getElementById(cleanHash) || document.querySelector(hash);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  },

  switchLayout(layout) {
    const publicLayout = document.getElementById('publicLayout');
    const studentLayout = document.getElementById('studentLayout');
    const adminLayout = document.getElementById('adminLayout');
    const runners = [
      'viewPracticeRunner',
      'viewExamRunner',
      'viewExamResults'
    ];

    // Hide runner and standalone views
    runners.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    if (layout === 'public') {
      if (publicLayout) publicLayout.classList.remove('hidden');
      if (studentLayout) studentLayout.classList.add('hidden');
      if (adminLayout) adminLayout.classList.add('hidden');
    } else if (layout === 'student') {
      if (publicLayout) publicLayout.classList.add('hidden');
      if (studentLayout) studentLayout.classList.remove('hidden');
      if (adminLayout) adminLayout.classList.add('hidden');
    } else if (layout === 'admin') {
      if (publicLayout) publicLayout.classList.add('hidden');
      if (studentLayout) studentLayout.classList.add('hidden');
      if (adminLayout) adminLayout.classList.remove('hidden');
    } else if (layout === 'runner') {
      if (publicLayout) publicLayout.classList.add('hidden');
      if (studentLayout) studentLayout.classList.add('hidden');
      if (adminLayout) adminLayout.classList.add('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.updateNavbar();
  },

  switchStudentSubview(subviewId) {
    const subviews = [
      'viewStudentDashboard',
      'viewStudentSkills',
      'viewStudentExams',
      'viewStudentAchievements',
      'viewStudentBook',
      'viewStudentProfile'
    ];

    subviews.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === subviewId) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    });

    this.updateStudentNavActive(subviewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateStudentNavActive(subviewId) {
    const map = {
      viewStudentDashboard: ['snav_home', 'snav_m_home'],
      viewStudentSkills: ['snav_skills', 'snav_m_skills'],
      viewStudentExams: ['snav_exams', 'snav_m_exams'],
      viewStudentAchievements: ['snav_achievements', 'snav_m_achievements'],
      viewStudentBook: ['snav_book', 'snav_m_book'],
      viewStudentProfile: ['snav_profile', 'snav_m_profile']
    };

    // Remove active state, indicator line, borders, and halos from ALL student navigation links
    document.querySelectorAll('#studentNavbar a[id^="snav_"]').forEach(link => {
      link.classList.remove('nav-link-active', 'active', 'bg-emerald-50', 'dark:bg-emerald-950/60', 'text-emerald-700', 'dark:text-emerald-300', 'bg-emerald-600', 'text-white');
      link.classList.add('text-slate-600', 'dark:text-fog');
    });

    const activeIds = map[subviewId];
    if (activeIds) {
      activeIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('text-slate-600', 'dark:text-fog');
          el.classList.add('nav-link-active');
        }
      });
    }
  },

  // Backwards compatibility for switchView
  switchView(viewId) {
    const studentSubviews = [
      'viewStudentDashboard',
      'viewStudentSkills',
      'viewStudentExams',
      'viewStudentAchievements',
      'viewStudentBook',
      'viewStudentProfile'
    ];

    if (viewId === 'viewHome') {
      this.switchLayout('public');
      return;
    }
    if (viewId === 'viewAdminDashboard') {
      this.switchLayout('admin');
      return;
    }
    if (studentSubviews.includes(viewId)) {
      this.switchLayout('student');
      this.switchStudentSubview(viewId);
      return;
    }

    // Runner views
    this.switchLayout('runner');
    const runnerEl = document.getElementById(viewId);
    if (runnerEl) runnerEl.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  copyStudentCode() {
    const code = (this.currentUser && this.currentUser.accessCode) ? this.currentUser.accessCode : '';
    if (!code) {
      this.showToast('تعذر العثور على كود الطالب.', 'error');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        this.showToast(`تم نسخ كود الطالب بنجاح: ${code} 📋`, 'success');
      }).catch(() => {
        this.showToast(`كود الطالب الخاص بك: ${code}`, 'info');
      });
    } else {
      this.showToast(`كود الطالب الخاص بك: ${code}`, 'info');
    }
  },

  exitRunner(returnTo) {
    let targetHash = '#student';
    if (returnTo === 'skills') targetHash = '#student/skills';
    else if (returnTo === 'exams' || returnTo === 'aggregated-tests') targetHash = '#student/aggregated-tests';
    else if (returnTo === 'achievements') targetHash = '#student/achievements';
    else if (returnTo === 'book' || returnTo === 'foundation-book') targetHash = '#student/foundation-book';
    else if (returnTo === 'profile') targetHash = '#student/profile';
    else targetHash = '#student';

    // 1. Clear any active exam timer intervals
    if (window.StudentApp && StudentApp.examTimerInterval) {
      clearInterval(StudentApp.examTimerInterval);
      StudentApp.examTimerInterval = null;
    }

    // 2. Hide all modals and runners explicitly
    ['modalConfirmSubmitSkillTest', 'modalConfirmExitSkillTest', 'modalConfirmExitExam', 'modalExamModeSelect'].forEach(mId => {
      const m = document.getElementById(mId);
      if (m) m.classList.add('hidden');
    });

    const runners = ['viewPracticeRunner', 'viewExamRunner', 'viewExamResults'];
    runners.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // 3. Switch layout to student
    this.switchLayout('student');

    // 4. Force route handling even if hash is already the target
    if (window.location.hash === targetHash) {
      this.handleRoute();
    } else {
      window.location.hash = targetHash;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // AUTH STATE
  initAuth() {
    this.currentUser = API.getUser();
    this.updateNavbar();
  },

  updateNavbar() {
    const guestNav = document.getElementById('navGuestActions');
    const userNav = document.getElementById('navUserActions');
    const userBadge = document.getElementById('navUserBadge');
    const adminLink = document.getElementById('navAdminLink');

    if (this.currentUser) {
      if (guestNav) guestNav.classList.add('hidden');
      if (userNav) userNav.classList.remove('hidden');
      if (userBadge) {
        userBadge.textContent = this.currentUser.role === 'admin' ? `أ. ${this.currentUser.name}` : this.currentUser.name;
      }
      if (adminLink) {
        if (this.currentUser.role === 'admin') adminLink.classList.remove('hidden');
        else adminLink.classList.add('hidden');
      }

      const adminReturnBtn = document.getElementById('studentAdminReturnBtn');
      if (adminReturnBtn) {
        if (this.currentUser.role === 'admin') adminReturnBtn.classList.remove('hidden');
        else adminReturnBtn.classList.add('hidden');
      }

      // Update student layout details
      document.querySelectorAll('.student-name-display').forEach(el => el.textContent = this.currentUser.name || 'طالب القمة');
      document.querySelectorAll('.student-code-display').forEach(el => el.textContent = this.currentUser.accessCode || '-');
      document.querySelectorAll('.student-group-display').forEach(el => el.textContent = this.currentUser.group || 'مجموعة التميز');
    } else {
      if (guestNav) guestNav.classList.remove('hidden');
      if (userNav) userNav.classList.add('hidden');
      if (adminLink) adminLink.classList.add('hidden');
    }
  },

  openAuthModal(customNotice = null) {
    const modal = document.getElementById('modalAuth');
    if (!modal) return;
    modal.classList.remove('hidden');
    const input = document.getElementById('loginAccessCode');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
    const errBox = document.getElementById('studentLoginError');
    if (errBox) {
      if (customNotice) {
        errBox.textContent = customNotice;
        errBox.className = 'p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-300 text-center leading-relaxed mb-4';
        errBox.classList.remove('hidden');
      } else {
        errBox.classList.add('hidden');
        errBox.textContent = '';
      }
    }
  },

  handleSkillClick(skillId) {
    const skillNames = {
      analogy: 'التناظر اللفظي',
      completion: 'إكمال الجمل',
      context_error: 'الخطأ السياقي',
      comprehension: 'استيعاب المقروء',
      odd_word: 'المفردة الشاذة'
    };
    const name = skillNames[skillId] || 'المهارة';

    if (!API.getToken()) {
      this.openAuthModal(`سجل دخولك بكود الطالب لبدء تدريب مهارة ${name}`);
      return;
    }

    window.location.hash = '#student/skills';
    setTimeout(() => {
      StudentApp.openSkillTests(skillId);
    }, 150);
  },

  navigateToProtected(section) {
    if (!API.getToken()) {
      this.openAuthModal();
      return;
    }
    if (section === 'skills') window.location.hash = '#student/skills';
    else if (section === 'exams') window.location.hash = '#student/aggregated-tests';
    else if (section === 'achievements') window.location.hash = '#student/achievements';
    else if (section === 'book') window.location.hash = '#student/foundation-book';
    else if (section === 'profile') window.location.hash = '#student/profile';
    else window.location.hash = '#student';
  },

  closeAuthModal() {
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.add('hidden');
  },

  // UNIFIED ACCESS CODE LOGIN (STUDENTS & SECRET ADMIN)
  async submitCodeLogin() {
    const input = document.getElementById('loginAccessCode');
    const errBox = document.getElementById('studentLoginError');
    const rawCode = input ? input.value : '';

    if (errBox) {
      errBox.classList.add('hidden');
      errBox.textContent = '';
    }

    if (!rawCode || !rawCode.trim()) {
      const msg = 'يرجى إدخال كود الدخول للمتابعة.';
      if (errBox) {
        errBox.textContent = msg;
        errBox.classList.remove('hidden');
      }
      this.showToast(msg, 'error');
      if (input) input.focus();
      return;
    }

    // Normalize code: remove outer and accidental inner whitespace
    const cleanCode = rawCode.trim().replace(/\s+/g, '').toUpperCase();

    this.showLoading(true);
    try {
      const res = await API.post('/auth/code-login', { accessCode: cleanCode });

      if (res && res.success && res.token && res.user) {
        API.setAuth(res.token, res.user);
        this.currentUser = res.user;
        this.closeAuthModal();
        this.showToast(res.message || 'تم تسجيل الدخول بنجاح.', 'success');

        if (res.user.role === 'admin') {
          window.location.hash = '#admin';
          this.switchLayout('admin');
          AdminApp.initDashboard();
        } else {
          window.location.hash = '#student';
          this.switchLayout('student');
          StudentApp.initDashboard();
        }
      } else {
        const msg = (res && res.message) ? res.message : 'كود الدخول غير صحيح أو غير مسجل.';
        if (errBox) {
          errBox.textContent = msg;
          errBox.classList.remove('hidden');
        }
        this.showToast(msg, 'error');
        if (input) {
          input.select();
          input.focus();
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      this.showToast('حدث خطأ أثناء الاتصال، يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      this.showLoading(false);
    }
  },

  // Alias for backward compatibility
  submitStudentLogin() {
    return this.submitCodeLogin();
  },

  // Unified logout with confirmation modal
  async logout() {
    // Show confirmation modal
    if (!confirm('هل أنت متأكد من تسجيل الخروج؟\nسيتم مسح بيانات الجلسة وإرجاعك للصفحة الرئيسية.')) {
      return;
    }

    // Show loading while clearing
    App.showLoading(true);

    // Clear authentication
    API.clearAuth();
    this.currentUser = null;

    // Reset StudentApp state to prevent data leakage
    if (typeof StudentApp !== 'undefined' && typeof StudentApp.resetState === 'function') {
      StudentApp.resetState();
    }

    // Clear any pending exam/timer data
    if (App.examTimerInterval) {
      clearInterval(App.examTimerInterval);
      App.examTimerInterval = null;
    }
    App.examSecondsRemaining = 0;
    App.examStartTime = null;
    App.isTimedMode = true;

    App.showLoading(false);

    this.showToast('تم تسجيل الخروج بنجاح.', 'info');
    window.location.hash = '#home';
    this.switchLayout('public');
    this.updateNavbar();
  },

  // DEMO PLACEMENT QUIZ ON HOMEPAGE
  renderDemoPlacement() {
    const container = document.getElementById('demoPlacementBox');
    if (!container) return;

    if (this.demoCurrentIdx >= this.demoPlacementQuestions.length) {
      container.innerHTML = `
        <div class="text-center py-6">
          <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center text-2xl font-bold animate-bounce">
            <i class="fa-solid fa-trophy"></i>
          </div>
          <h4 class="text-xl font-black text-slate-800 dark:text-white mb-1">أحسنت التجربة! درجتك: ${this.demoScore} من ${this.demoPlacementQuestions.length}</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
            هذا نموذج مصغر؛ المنصة الكاملة توفر لك 25 اختباراً كاملاً من الاختبارات المجمعة الشاملة وتدريباً متخصصاً على كافة المهارات مع الأستاذ جابر القاضي.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button onclick="App.openAuthModal()" class="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-600/20">
              ادخل بكودك وابدأ الآن
            </button>
            <button onclick="App.resetDemo()" class="py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition">
              إعادة التجربة
            </button>
          </div>
        </div>
      `;
      return;
    }

    const q = this.demoPlacementQuestions[this.demoCurrentIdx];
    const letters = ['أ', 'ب', 'ج', 'د'];
    container.innerHTML = `
      <div class="mb-4 flex items-center justify-between">
        <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
          سؤال تجريبي سريع (${this.demoCurrentIdx + 1} من ${this.demoPlacementQuestions.length})
        </span>
        <span class="text-xs text-slate-400 font-mono font-bold">النقاط: ${this.demoScore}</span>
      </div>
      <h4 class="text-lg font-black text-slate-800 dark:text-white mb-4 leading-relaxed">${q.q}</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        ${q.options.map((opt, idx) => `
          <button onclick="App.answerDemo(${idx})" class="p-3.5 text-right rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition flex items-center gap-3">
            <span class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold flex items-center justify-center">${letters[idx]}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
      <div id="demoFeedback" class="hidden p-3.5 rounded-xl text-xs font-semibold"></div>
    `;
  },

  answerDemo(selectedIdx) {
    const q = this.demoPlacementQuestions[this.demoCurrentIdx];
    const feedback = document.getElementById('demoFeedback');
    const isCorrect = (selectedIdx === q.correct);

    if (isCorrect) {
      this.demoScore++;
      this.playSuccessSound();
      feedback.className = 'p-3.5 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 mb-3';
      feedback.innerHTML = `✓ أحسنت! إجابة ممتازة ومطابقة للقاعدة. ${q.expl}`;
    } else {
      this.playMistakeSound();
      feedback.className = 'p-3.5 rounded-xl text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 mb-3';
      feedback.innerHTML = `✗ محاولة جيدة. الإجابة الصحيحة هي (${q.options[q.correct]}). ${q.expl}`;
    }
    feedback.classList.remove('hidden');

    setTimeout(() => {
      this.demoCurrentIdx++;
      this.renderDemoPlacement();
    }, 2200);
  },

  resetDemo() {
    this.demoCurrentIdx = 0;
    this.demoScore = 0;
    this.renderDemoPlacement();
  },

  // FAQ ACCORDION HELPER
  toggleFAQ(idx) {
    const answer = document.getElementById(`faqAnswer_${idx}`);
    const icon = document.getElementById(`faqIcon_${idx}`);
    if (answer) {
      if (answer.classList.contains('hidden')) {
        answer.classList.remove('hidden');
        if (icon) icon.className = 'fa-solid fa-chevron-up text-xs text-emerald-600';
      } else {
        answer.classList.add('hidden');
        if (icon) icon.className = 'fa-solid fa-chevron-down text-xs text-slate-400';
      }
    }
  },

  

  // UTILS
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-600/30' : (type === 'error' ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-slate-800 text-white shadow-slate-800/30');
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');

    toast.className = `flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl font-bold text-xs sm:text-sm transform transition duration-300 translate-y-2 opacity-0 border border-white/10 ${bg}`;
    toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 50);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  showLoading(show = true) {
    const spinner = document.getElementById('globalLoadingSpinner');
    if (spinner) {
      if (show) spinner.classList.remove('hidden');
      else spinner.classList.add('hidden');
    }
  }
};

if (typeof window !== 'undefined') {
  window.App = App;
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
