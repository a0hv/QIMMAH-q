// Administrator & Teacher Management Engine - Unified Student Management
const AdminApp = {
  currentTab: 'overview',
  studentsList: [],
  filteredStudents: [],
  selectedStudentIds: new Set(),
  currentPage: 1,
  pageSize: 10,
  searchQuery: '',
  statusFilter: 'all', // 'all', 'active', 'disabled'
  sortOption: 'newest', // 'newest', 'name_asc', 'exams_desc', 'score_desc'
  examsList: [],
  pendingDeleteId: null,

  // Skills & Questions State
  currentSkillId: null,
  currentSkillData: null,
  activeQuestionContext: null, // { type: 'skill' | 'exam', parentId, testId, title }
  allCurrentQuestions: [],
  filteredQuestionsList: [],
  currentQuestionSearchQuery: '',
  currentQuestionCategory: 'all',
  pendingDeleteAction: null,

  async initDashboard() {
    this.switchTab('overview');
    await this.loadMetrics();
    await this.loadStudents();
    await this.loadExams();
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    const qWrap = document.getElementById('adminQuestionManagerWrap');
    if (qWrap) qWrap.classList.add('hidden');

    const tabs = ['overview', 'students', 'skills', 'exams', 'book', 'settings'];
    tabs.forEach(t => {
      const pane = document.getElementById(`adminTabPane_${t}`);
      const btn = document.getElementById(`adminTabBtn_${t}`);
      if (pane) {
        if (t === tabName) pane.classList.remove('hidden');
        else pane.classList.add('hidden');
      }
      if (btn) {
        if (t === tabName) {
          btn.className = 'admin-nav-btn active px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 text-white shadow-md transition flex items-center gap-2 whitespace-nowrap';
        } else {
          btn.className = 'admin-nav-btn px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-2 whitespace-nowrap';
        }
      }
    });

    if (tabName === 'overview') this.loadMetrics();
    if (tabName === 'students') this.loadStudents();
    if (tabName === 'skills') this.loadSkillsManagement();
    if (tabName === 'exams') this.loadExams();
    if (tabName === 'settings') this.loadPlatformSettings();
  },

  // ==========================================
  // 1. OVERVIEW & METRICS
  // ==========================================
  async loadMetrics() {
    const res = await API.get('/admin/metrics');
    if (res.success && res.metrics) {
      const m = res.metrics;
      const elTotal = document.getElementById('admTotalStudents');
      const elActive = document.getElementById('admActiveStudents');
      const elDisabled = document.getElementById('admDisabledStudents');
      const elAttempts = document.getElementById('admTotalAttempts');
      const elPassRate = document.getElementById('admPassRate');
      const elAvgScore = document.getElementById('admAvgScore');
        const elActiveToday = document.getElementById('admActiveToday');

      if (elTotal) elTotal.textContent = m.totalStudents !== undefined ? m.totalStudents : 0;
      if (elActive) elActive.textContent = m.activeStudents !== undefined ? m.activeStudents : 0;
      if (elDisabled) elDisabled.textContent = m.disabledStudents !== undefined ? m.disabledStudents : 0;
      if (elAttempts) elAttempts.textContent = m.totalAttempts !== undefined ? m.totalAttempts : (m.totalExamsCompleted || 0);
      if (elPassRate) elPassRate.textContent = `${m.passRate !== undefined ? m.passRate : (m.averageScorePercent || 0)}%`;
      if (elAvgScore) elAvgScore.textContent = `${m.averageScore !== undefined ? m.averageScore : (m.averageScorePercent || 0)}%`;
        if (elActiveToday) elActiveToday.textContent = m.activeToday !== undefined ? m.activeToday : 0;
    }
  },

  // ==========================================
  // 2. UNIFIED STUDENT MANAGEMENT
  // ==========================================
  async loadStudents() {
    const res = await API.get('/admin/students');
    if (res.success && res.students) {
      this.studentsList = res.students;
      this.applyFiltersAndRender();
    }
  },

  filterStudents(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
    this.currentPage = 1;
    this.applyFiltersAndRender();
  },

  filterStatus(status) {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFiltersAndRender();
  },

  sortStudents(sort) {
    this.sortOption = sort;
    this.currentPage = 1;
    this.applyFiltersAndRender();
  },

  applyFiltersAndRender() {
    let list = [...this.studentsList];

    // 1. Search Query
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.accessCode && s.accessCode.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (this.statusFilter === 'active') {
      list = list.filter(s => s.isActive);
    } else if (this.statusFilter === 'disabled') {
      list = list.filter(s => !s.isActive);
    }

    // 3. Sorting
    if (this.sortOption === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    } else if (this.sortOption === 'exams_desc') {
      list.sort((a, b) => b.examsCompleted - a.examsCompleted);
    } else if (this.sortOption === 'score_desc') {
      list.sort((a, b) => b.averageScore - a.averageScore);
    } else {
      // Default: newest first
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    this.filteredStudents = list;
    this.renderStudentsTable();
    this.renderPagination();
    this.updateBulkToolbar();
  },

  renderStudentsTable() {
    const tbody = document.getElementById('adminStudentsTableBody');
    if (!tbody) return;

    if (this.filteredStudents.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <i class="fa-solid fa-user-slash text-3xl mb-2 block text-slate-300 dark:text-slate-600"></i>
            لا يوجد طلاب يطابقون خيارات البحث أو التصفية الحالية.
          </td>
        </tr>`;
      return;
    }

    // Pagination slice
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginated = this.filteredStudents.slice(startIndex, startIndex + this.pageSize);

    tbody.innerHTML = paginated.map((s, idx) => {
      const rowNum = startIndex + idx + 1;
      const isChecked = this.selectedStudentIds.has(s.id);
      const createdDate = s.createdAt ? s.createdAt.slice(0, 10) : '-';
      const lastAccess = s.lastLogin ? s.lastLogin.slice(0, 10) : 'لم يسجل دخول بعد';

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${!s.isActive ? 'opacity-65 bg-slate-50/50 dark:bg-slate-900/30' : ''}">
          <!-- Checkbox -->
          <td class="py-3 px-3 text-center">
            <input type="checkbox" onchange="AdminApp.toggleStudentSelect('${s.id}', this.checked)" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer">
          </td>
          <!-- Index -->
          <td class="py-3 px-2 font-bold text-xs text-slate-400 text-center">${rowNum}</td>
          <!-- Student Name -->
          <td class="py-3 px-4">
            <div class="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-rose-400'}"></span>
              ${s.name}
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              <span>تاريخ الإضافة: ${createdDate}</span>
              <span class="mx-1">•</span>
              <span>آخر دخول: ${lastAccess}</span>
            </div>
          </td>
          <!-- Access Code with Copy Button -->
          <td class="py-3 px-4">
            <div class="inline-flex items-center gap-1.5 p-1 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span class="font-mono text-xs font-black text-slate-900 dark:text-emerald-400 tracking-wider">
                ${s.accessCode || '-'}
              </span>
              <button onclick="AdminApp.copyCode('${s.accessCode}', this)" title="نسخ الكود بنقرة واحدة" class="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700 transition">
                <i class="fa-regular fa-copy text-xs"></i>
              </button>
            </div>
          </td>
          <!-- Status Badge -->
          <td class="py-3 px-4">
            <button onclick="AdminApp.toggleStudentStatus('${s.id}')" title="انقر لتغيير الحالة" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${s.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-200'}">
              <i class="fa-solid ${s.isActive ? 'fa-check' : 'fa-ban'} text-[10px]"></i>
              ${s.isActive ? 'مفعّل' : 'معطّل'}
            </button>
          </td>
          <!-- Exam Statistics -->
          <td class="py-3 px-4">
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">
              ${s.examsCompleted !== undefined && s.examsCompleted !== null ? s.examsCompleted : (s.examsCount || 0)} اختبار مكتمل
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">
              متوسط: <span class="font-bold text-emerald-600">${s.averageScore !== undefined && s.averageScore !== null ? s.averageScore : (s.avgScore || 0)}%</span>
              (الأعلى: ${s.bestScore !== undefined && s.bestScore !== null ? s.bestScore : (s.averageScore || 0)}%)
            </div>
          </td>
          <!-- Actions -->
          <td class="py-3 px-4">
            <div class="flex items-center gap-1.5 justify-end">
              <!-- Edit -->
              <button onclick="AdminApp.openEditStudentModal('${s.id}')" title="تعديل اسم أو كود الطالب" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 flex items-center justify-center transition">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <!-- Regenerate Code -->
              <button onclick="AdminApp.promptRegenerateCode('${s.id}', '${s.name}')" title="إعادة توليد كود جديد (يحافظ على كافة الدرجات)" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-950/60 dark:hover:text-amber-400 flex items-center justify-center transition">
                <i class="fa-solid fa-arrows-rotate text-xs"></i>
              </button>
              <!-- Toggle Active -->
              <button onclick="AdminApp.toggleStudentStatus('${s.id}')" title="${s.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-100 hover:text-purple-600 flex items-center justify-center transition">
                <i class="fa-solid ${s.isActive ? 'fa-pause' : 'fa-play'} text-xs"></i>
              </button>
              <!-- Delete -->
              <button onclick="AdminApp.openDeleteStudentModal('${s.id}', '${s.name}')" title="حذف نهائي للطالب" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 flex items-center justify-center transition">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderPagination() {
    const container = document.getElementById('adminPaginationContainer');
    if (!container) return;

    const total = this.filteredStudents.length;
    const totalPages = Math.ceil(total / this.pageSize) || 1;

    const start = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, total);

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 text-xs text-slate-500 dark:text-slate-400">
        <div>
          عرض <span class="font-bold text-slate-800 dark:text-white">${start}</span> إلى <span class="font-bold text-slate-800 dark:text-white">${end}</span> من إجمالي <span class="font-bold text-slate-800 dark:text-white">${total}</span> طالب
        </div>
        <div class="flex items-center gap-2">
          <button onclick="AdminApp.changePage(${this.currentPage - 1})" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-200 dark:hover:bg-slate-700"'} class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold transition">
            السابق
          </button>
          <span class="px-3 py-1.5 font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-xl">
            صفحة ${this.currentPage} من ${totalPages}
          </span>
          <button onclick="AdminApp.changePage(${this.currentPage + 1})" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-200 dark:hover:bg-slate-700"'} class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold transition">
            التالي
          </button>
        </div>
      </div>
    `;
  },

  changePage(newPage) {
    const totalPages = Math.ceil(this.filteredStudents.length / this.pageSize) || 1;
    if (newPage < 1 || newPage > totalPages) return;
    this.currentPage = newPage;
    this.renderStudentsTable();
    this.renderPagination();
  },

  // One-Click Code Copy with Visual Feedback
  async copyCode(code, btn) {
    if (!code || code === '-') return;
    try {
      await navigator.clipboard.writeText(code);
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-check text-emerald-500 text-xs"></i>`;
        setTimeout(() => { btn.innerHTML = originalHtml; }, 1800);
      }
      App.showToast(`تم نسخ كود الطالب (${code}) للحافظة بنجاح!`, 'success');
    } catch (e) {
      prompt('انسخ كود الطالب:', code);
    }
  },

  // Multi-Selection and Bulk Actions
  toggleSelectAll(checked) {
    if (checked) {
      this.filteredStudents.forEach(s => this.selectedStudentIds.add(s.id));
    } else {
      this.selectedStudentIds.clear();
    }
    this.renderStudentsTable();
    this.updateBulkToolbar();
  },

  toggleStudentSelect(id, checked) {
    if (checked) this.selectedStudentIds.add(id);
    else this.selectedStudentIds.delete(id);
    this.updateBulkToolbar();
  },

  updateBulkToolbar() {
    const toolbar = document.getElementById('adminBulkToolbar');
    const countEl = document.getElementById('adminSelectedCount');
    const selectAllCheckbox = document.getElementById('selectAllStudentsHeader');

    const count = this.selectedStudentIds.size;
    if (countEl) countEl.textContent = count;

    if (toolbar) {
      if (count > 0) toolbar.classList.remove('hidden');
      else toolbar.classList.add('hidden');
    }

    if (selectAllCheckbox) {
      selectAllCheckbox.checked = count > 0 && count === this.filteredStudents.length;
    }
  },

  clearSelection() {
    this.selectedStudentIds.clear();
    this.renderStudentsTable();
    this.updateBulkToolbar();
  },

  async bulkSetStatus(isActive) {
    const ids = Array.from(this.selectedStudentIds);
    if (ids.length === 0) return;

    App.showLoading(true);
    const res = await API.post('/admin/students/bulk-status', { studentIds: ids, isActive });
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      this.clearSelection();
      this.loadStudents();
      this.loadMetrics();
    } else {
      App.showToast(res.message || 'حدث خطأ أثناء التحديث.', 'error');
    }
  },

  // Add Student
  openAddStudentModal() {
    document.getElementById('newStudentName').value = '';
    document.getElementById('newStudentCode').value = '';
    document.getElementById('newStudentAutoCode').checked = true;
    document.getElementById('newStudentCodeContainer').classList.add('hidden');
    document.getElementById('modalAddStudent').classList.remove('hidden');
    setTimeout(() => document.getElementById('newStudentName').focus(), 100);
  },

  toggleCustomCodeInput(isAuto) {
    const container = document.getElementById('newStudentCodeContainer');
    if (container) {
      if (isAuto) container.classList.add('hidden');
      else container.classList.remove('hidden');
    }
  },

  async saveNewStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    const isAuto = document.getElementById('newStudentAutoCode').checked;
    const customCode = isAuto ? '' : document.getElementById('newStudentCode').value.trim();

    if (!name) {
      App.showToast('يرجى إدخال اسم الطالب.', 'error');
      return;
    }

    App.showLoading(true);
    const res = await API.post('/admin/students', { name, accessCode: customCode });
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      document.getElementById('modalAddStudent').classList.add('hidden');
      this.loadStudents();
      this.loadMetrics();
    } else {
      App.showToast(res.message || 'فشل إضافة الطالب.', 'error');
    }
  },

  // Edit Student
  openEditStudentModal(id) {
    const student = this.studentsList.find(s => s.id === id);
    if (!student) return;

    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editStudentCode').value = student.accessCode;
    document.getElementById('modalEditStudent').classList.remove('hidden');
  },

  async saveEditStudent() {
    const id = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value.trim();
    const accessCode = document.getElementById('editStudentCode').value.trim();

    if (!name) {
      App.showToast('اسم الطالب مطلوب.', 'error');
      return;
    }

    App.showLoading(true);
    const res = await API.put(`/admin/students/${id}`, { name, accessCode });
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      document.getElementById('modalEditStudent').classList.add('hidden');
      this.loadStudents();
    } else {
      App.showToast(res.message || 'فشل تحديث بيانات الطالب.', 'error');
    }
  },

  // Regenerate Code
  async promptRegenerateCode(id, studentName) {
    if (!confirm(`هل تريد توليد كود وصول جديد للطالب (${studentName})؟\n\nملاحظة هامة: سيتم حفظ كافة سجلات الطالب ودرجاته في الاختبارات بالكامل دون أي تأثير.`)) {
      return;
    }

    App.showLoading(true);
    const res = await API.post(`/admin/students/${id}/regenerate-code`);
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      this.loadStudents();
    } else {
      App.showToast(res.message || 'فشل توليد الكود.', 'error');
    }
  },

  // Toggle Active Status
  async toggleStudentStatus(studentId) {
    const res = await API.patch(`/admin/students/${studentId}/toggle-status`);
    if (res.success) {
      App.showToast(res.message, 'success');
      this.loadStudents();
      this.loadMetrics();
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  },

  // Delete Student with Explicit Confirmation
  openDeleteStudentModal(id, studentName) {
    this.pendingDeleteId = id;
    document.getElementById('deleteStudentNameDisplay').textContent = studentName;
    document.getElementById('modalDeleteStudent').classList.remove('hidden');
  },

  async confirmDisableInsteadOfDelete() {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.pendingDeleteId = null;
    document.getElementById('modalDeleteStudent').classList.add('hidden');

    // Make inactive
    const student = this.studentsList.find(s => s.id === id);
    if (student && student.isActive) {
      await this.toggleStudentStatus(id);
    } else {
      App.showToast('الحساب معطل بالفعل.', 'info');
    }
  },

  async confirmPermanentDelete() {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.pendingDeleteId = null;

    App.showLoading(true);
    const res = await API.delete(`/admin/students/${id}`);
    App.showLoading(false);

    document.getElementById('modalDeleteStudent').classList.add('hidden');

    if (res.success) {
      App.showToast(res.message, 'success');
      this.selectedStudentIds.delete(id);
      this.loadStudents();
      this.loadMetrics();
    } else {
      App.showToast(res.message || 'فشل حذف الطالب.', 'error');
    }
  },

  // Generic Confirmation Modal Helper
  openDeleteConfirmModal(title, message, confirmAction) {
    const modal = document.getElementById('modalConfirmDeleteGeneral');
    if (!modal) return;
    const tEl = document.getElementById('deleteGeneralTitle');
    const mEl = document.getElementById('deleteGeneralMessage');
    const btn = document.getElementById('btnConfirmDeleteGeneral');
    if (tEl) tEl.textContent = title;
    if (mEl) mEl.textContent = message;
    this.pendingDeleteAction = confirmAction;
    btn.onclick = async () => {
      if (this.pendingDeleteAction) {
        await this.pendingDeleteAction();
        this.pendingDeleteAction = null;
      }
      modal.classList.add('hidden');
    };
    modal.classList.remove('hidden');
  },

  // ==========================================
  // 3. SKILLS & TRAINING TESTS CRUD MANAGEMENT
  // ==========================================
  async loadSkillsManagement() {
    App.showLoading(true);
    const res = await API.get('/admin/skills-overview');
    App.showLoading(false);

    if (res.success && res.skills) {
      const container = document.getElementById('adminSkillsGridContainer');
      const statsSubtitle = document.getElementById('adminSkillsSummaryStats');
      
      const totalTests = res.skills.reduce((acc, s) => acc + (s.testsCount || 0), 0);
      const totalQuestions = res.skills.reduce((acc, s) => acc + (s.questionsCount || 0), 0);
      if (statsSubtitle) {
        statsSubtitle.textContent = `5 مهارات رئيسية • ${totalTests} تدريباً مستقلاً • إجمالي ${totalQuestions} سؤالاً`;
      }

      const skillIcons = {
        analogy: 'fa-arrows-split-up-and-left text-blue-400 bg-blue-500/10',
        completion: 'fa-pen-nib text-emerald-400 bg-emerald-500/10',
        context: 'fa-magnifying-glass-chart text-rose-400 bg-rose-500/10',
        reading: 'fa-book-open-reader text-purple-400 bg-purple-500/10',
        odd: 'fa-shapes text-amber-400 bg-amber-500/10'
      };

      if (container) {
        container.innerHTML = res.skills.map(s => {
          const iconClass = skillIcons[s.id] || 'fa-brain text-emerald-400 bg-emerald-500/10';
          return `
            <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl ${iconClass} flex items-center justify-center text-2xl font-bold">
                    <i class="fa-solid ${iconClass.split(' ')[0]}"></i>
                  </div>
                  <div>
                    <h4 class="text-base font-black text-white">${s.name}</h4>
                    <span class="text-xs text-slate-400">${s.testsCount} تدريبات • ${s.questionsCount} سؤالاً</span>
                  </div>
                </div>
                <div class="text-xs text-slate-400 leading-relaxed">
                  تدريبات تصاعدية وتطبيقية مع تحكم كامل بإضافة وحذف وتعديل التدريبات والأسئلة يدوياً.
                </div>
              </div>
              <div class="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-emerald-400">${s.testsCount} تدريبات مفعلة</span>
                <button onclick="AdminApp.openSkillTestsManagement('${s.id}')" class="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 font-bold text-xs transition flex items-center gap-1.5 group">
                  <span>إدارة التدريبات والأسئلة</span>
                  <i class="fa-solid fa-arrow-left text-[10px] transition-transform group-hover:-translate-x-1"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      const overviewWrap = document.getElementById('adminSkillsOverviewWrap');
      const detailWrap = document.getElementById('adminSkillDetailWrap');
      if (overviewWrap) overviewWrap.classList.remove('hidden');
      if (detailWrap) detailWrap.classList.add('hidden');
    }
  },

  async openSkillTestsManagement(skillId) {
    this.currentSkillId = skillId;
    App.showLoading(true);
    const res = await API.get(`/admin/skills/${skillId}/tests`);
    App.showLoading(false);

    if (res.success && res.tests) {
      this.currentSkillData = res;
      const titleEl = document.getElementById('adminCurrentSkillTitle');
      const subEl = document.getElementById('adminCurrentSkillSubtitle');
      const container = document.getElementById('adminSkillTestsCardsContainer');

      const totalQ = res.tests.reduce((acc, t) => acc + (t.questionCount || 0), 0);
      if (titleEl) titleEl.textContent = `إدارة تدريبات: ${res.skill.name}`;
      if (subEl) subEl.textContent = `${res.tests.length} اختبارات تدريبية • إجمالي ${totalQ} سؤالاً`;

      if (container) {
        if (res.tests.length === 0) {
          container.innerHTML = `
            <div class="col-span-full p-8 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
              <i class="fa-solid fa-folder-open text-3xl mb-2 text-slate-600 block"></i>
              لا توجد تدريبات في هذه المهارة حالياً. اضغط "إضافة اختبار تدريبي جديد" للبدء.
            </div>
          `;
        } else {
          container.innerHTML = res.tests.map(t => `
            <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    تدريب #${t.testNumber || ''}
                  </span>
                  <span class="text-xs font-bold text-slate-400">اجتياز ${t.passingScorePercent || 80}%</span>
                </div>
                <h4 class="text-base font-black text-white">${t.title}</h4>
                <p class="text-xs text-slate-400 leading-relaxed">${t.description || 'تدريب متخصص في المهارة'}</p>
                <div class="text-xs font-bold text-emerald-400 bg-emerald-500/5 py-1.5 px-2.5 rounded-lg border border-emerald-500/10 inline-block">
                  <i class="fa-solid fa-circle-question ml-1"></i> ${t.questionCount} سؤالاً مسجلاً
                </div>
              </div>

              <div class="pt-4 mt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
                <button onclick="AdminApp.openQuestionManager('skill', '${skillId}', '${t.id}', '${t.title.replace(/'/g, "\\'")}')" class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-sm">
                  <i class="fa-solid fa-list-check"></i>
                  <span>إدارة الأسئلة</span>
                </button>
                <button onclick="AdminApp.openEditSkillTestModal('${skillId}', '${t.id}', '${t.title.replace(/'/g, "\\'")}', '${(t.description || '').replace(/'/g, "\\'")}', ${t.passingScorePercent || 80})" class="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition" title="تعديل بيانات التدريب">
                  <i class="fa-solid fa-gear"></i>
                </button>
                <button onclick="AdminApp.openDeleteSkillTestModal('${skillId}', '${t.id}', '${t.title.replace(/'/g, "\\'")}')" class="py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs transition border border-rose-500/30" title="حذف التدريب بالكامل">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('');
        }
      }

      const overviewWrap = document.getElementById('adminSkillsOverviewWrap');
      const detailWrap = document.getElementById('adminSkillDetailWrap');
      if (overviewWrap) overviewWrap.classList.add('hidden');
      if (detailWrap) detailWrap.classList.remove('hidden');
    }
  },

  backToSkillsOverview() {
    this.currentSkillId = null;
    this.currentSkillData = null;
    this.loadSkillsManagement();
  },

  openAddSkillTestModal() {
    const titleIn = document.getElementById('newSkillTestTitle');
    const descIn = document.getElementById('newSkillTestDesc');
    const passIn = document.getElementById('newSkillTestPassPercent');
    const nextNum = (this.currentSkillData && this.currentSkillData.tests) ? (this.currentSkillData.tests.length + 1) : 1;
    if (titleIn) titleIn.value = `الاختبار التدريبي (${nextNum})`;
    if (descIn) descIn.value = `تدريبات متخصصة في مهارة ${this.currentSkillData ? this.currentSkillData.skill.name : ''}`;
    if (passIn) passIn.value = 80;
    document.getElementById('modalAddSkillTest').classList.remove('hidden');
  },

  async saveNewSkillTest() {
    const title = (document.getElementById('newSkillTestTitle').value || '').trim();
    const description = (document.getElementById('newSkillTestDesc').value || '').trim();
    const passingScorePercent = parseInt(document.getElementById('newSkillTestPassPercent').value || 80, 10);

    if (!title) {
      App.showToast('يرجى إدخال عنوان التدريب.', 'error');
      return;
    }

    App.showLoading(true);
    const res = await API.post(`/admin/skills/${this.currentSkillId}/tests`, { title, description, passingScorePercent });
    App.showLoading(false);

    if (res.success) {
      App.showToast('تم إنشاء الاختبار التدريبي بنجاح!', 'success');
      document.getElementById('modalAddSkillTest').classList.add('hidden');
      await this.openSkillTestsManagement(this.currentSkillId);
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  },

  openEditSkillTestModal(skillId, testId, title, desc, passPercent) {
    document.getElementById('editSkillTestSkillId').value = skillId;
    document.getElementById('editSkillTestId').value = testId;
    document.getElementById('editSkillTestTitle').value = title;
    document.getElementById('editSkillTestDesc').value = desc;
    document.getElementById('editSkillTestPassPercent').value = passPercent;
    document.getElementById('modalEditSkillTest').classList.remove('hidden');
  },

  async saveEditSkillTest() {
    const skillId = document.getElementById('editSkillTestSkillId').value;
    const testId = document.getElementById('editSkillTestId').value;
    const title = (document.getElementById('editSkillTestTitle').value || '').trim();
    const description = (document.getElementById('editSkillTestDesc').value || '').trim();
    const passingScorePercent = parseInt(document.getElementById('editSkillTestPassPercent').value || 80, 10);

    if (!title) {
      App.showToast('يرجى إدخال عنوان التدريب.', 'error');
      return;
    }

    App.showLoading(true);
    const res = await API.put(`/admin/skills/${skillId}/tests/${testId}`, { title, description, passingScorePercent });
    App.showLoading(false);

    if (res.success) {
      App.showToast('تم تحديث التدريب بنجاح!', 'success');
      document.getElementById('modalEditSkillTest').classList.add('hidden');
      await this.openSkillTestsManagement(skillId);
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  },

  openDeleteSkillTestModal(skillId, testId, title) {
    this.openDeleteConfirmModal(
      'تأكيد حذف الاختبار التدريبي',
      `هل أنت متأكد من رغبتك في حذف "${title}" وكافة أسئلته نهائياً؟`,
      async () => {
        App.showLoading(true);
        const res = await API.delete(`/admin/skills/${skillId}/tests/${testId}`);
        App.showLoading(false);
        if (res.success) {
          App.showToast('تم حذف الاختبار التدريبي بنجاح.', 'success');
          await this.openSkillTestsManagement(skillId);
        } else {
          App.showToast(res.message || 'فشل حذف الاختبار.', 'error');
        }
      }
    );
  },

  // ==========================================
  // 4. COMBINED EXAMS CRUD MANAGEMENT
  // ==========================================
  async loadExams() {
    App.showLoading(true);
    const res = await API.get('/admin/exams-list');
    App.showLoading(false);

    if (res.success && res.exams) {
      this.examsList = res.exams;
      const container = document.getElementById('adminExamsTableBody');
      const statsSub = document.getElementById('adminExamsSummaryStats');
      const totalQ = res.exams.reduce((acc, e) => acc + (e.questionCount || 0), 0);
      if (statsSub) {
        statsSub.textContent = `${res.exams.length} نموذجاً مجمعاً مقسمة على 5 مستويات • إجمالي ${totalQ} سؤالاً`;
      }

      if (!container) return;

      container.innerHTML = res.exams.map(e => `
        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <td class="py-3 px-4 font-bold text-xs text-slate-400">${e.examNumber}</td>
          <td class="py-3 px-4 font-bold text-slate-800 dark:text-white">${e.title}</td>
          <td class="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">${e.levelTitle}</td>
          <td class="py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-300">${e.questionCount} سؤال</td>
          <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">${e.durationMinutes} دقيقة</td>
          <td class="py-3 px-4 text-xs font-bold text-emerald-600">${e.passingScorePercent}%</td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="AdminApp.openQuestionManager('exam', null, '${e.id}', '${e.title.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-sm" title="إدارة الأسئلة">
                <i class="fa-solid fa-list-check"></i>
                <span class="hidden sm:inline">إدارة الأسئلة</span>
              </button>
              <button onclick="AdminApp.openEditExamModal('${e.id}', '${e.title.replace(/'/g, "\\'")}', ${e.durationMinutes}, ${e.passingScorePercent})" class="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition" title="ضبط الاختبار">
                <i class="fa-solid fa-gear"></i>
                <span class="hidden sm:inline">ضبط</span>
              </button>
              <button onclick="AdminApp.openDeleteExamModal('${e.id}', '${e.title.replace(/'/g, "\\'")}')" class="px-2 py-1.5 text-xs font-bold rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition border border-rose-500/30" title="حذف الاختبار">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  },

  openAddExamModal() {
    const nextNum = this.examsList.length > 0 ? (Math.max(...this.examsList.map(e => e.examNumber || 0)) + 1) : 1;
    document.getElementById('newExamTitle').value = `الاختبار المجمع (${nextNum})`;
    document.getElementById('newExamLevel').value = '1';
    document.getElementById('newExamDuration').value = 60;
    document.getElementById('newExamPassPercent').value = 65;
    document.getElementById('modalAddExam').classList.remove('hidden');
  },

  async saveNewExam() {
    const title = (document.getElementById('newExamTitle').value || '').trim();
    const level = parseInt(document.getElementById('newExamLevel').value || 1, 10);
    const durationMinutes = parseInt(document.getElementById('newExamDuration').value || 60, 10);
    const passingScorePercent = parseInt(document.getElementById('newExamPassPercent').value || 65, 10);

    if (!title) {
      App.showToast('يرجى إدخال عنوان الاختبار.', 'error');
      return;
    }

    App.showLoading(true);
    const res = await API.post('/admin/exams', { title, level, durationMinutes, passingScorePercent });
    App.showLoading(false);

    if (res.success) {
      App.showToast('تم إنشاء الاختبار المجمع بنجاح!', 'success');
      document.getElementById('modalAddExam').classList.add('hidden');
      await this.loadExams();
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  },

  openDeleteExamModal(id, title) {
    this.openDeleteConfirmModal(
      'تأكيد حذف الاختبار المجمع',
      `هل أنت متأكد من حذف "${title}" وكافة الأسئلة المرتبطة به نهائياً؟`,
      async () => {
        App.showLoading(true);
        const res = await API.delete(`/admin/exams/${id}`);
        App.showLoading(false);
        if (res.success) {
          App.showToast('تم حذف الاختبار بنجاح.', 'success');
          await this.loadExams();
        } else {
          App.showToast(res.message || 'فشل حذف الاختبار.', 'error');
        }
      }
    );
  },

  openEditExamModal(id, title, duration, passPercent) {
    document.getElementById('editExamId').value = id;
    document.getElementById('editExamTitle').value = title;
    document.getElementById('editExamDuration').value = duration;
    document.getElementById('editExamPassPercent').value = passPercent;
    document.getElementById('modalEditExam').classList.remove('hidden');
  },

  async saveExamSettings() {
    const id = document.getElementById('editExamId').value;
    const title = document.getElementById('editExamTitle').value;
    const durationMinutes = document.getElementById('editExamDuration').value;
    const passingScorePercent = document.getElementById('editExamPassPercent').value;

    App.showLoading(true);
    const res = await API.put(`/admin/exams/${id}/settings`, { title, durationMinutes, passingScorePercent });
    App.showLoading(false);

    if (res.success) {
      App.showToast('تم تحديث إعدادات الاختبار بنجاح!', 'success');
      document.getElementById('modalEditExam').classList.add('hidden');
      this.loadExams();
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  },

  // ==========================================
  // 5. UNIVERSAL QUESTION MANAGER VIEW
  // ==========================================
  async openQuestionManager(type, parentId, testId, title) {
    this.activeQuestionContext = { type, parentId, testId, title };
    this.currentQuestionSearchQuery = '';
    this.currentQuestionCategory = 'all';

    // Hide all tab panes
    const tabs = ['overview', 'students', 'skills', 'exams', 'book', 'settings'];
    tabs.forEach(t => {
      const pane = document.getElementById(`adminTabPane_${t}`);
      if (pane) pane.classList.add('hidden');
    });

    const wrap = document.getElementById('adminQuestionManagerWrap');
    if (wrap) wrap.classList.remove('hidden');

    const titleEl = document.getElementById('adminQManagerTitle');
    const typeBadge = document.getElementById('adminQManagerTypeBadge');
    const searchInput = document.getElementById('adminQSearchInput');
    const categorySelect = document.getElementById('adminQCategoryFilter');

    if (titleEl) titleEl.textContent = `إدارة أسئلة: ${title}`;
    if (typeBadge) {
      typeBadge.textContent = type === 'skill' ? 'تدريب مهارة' : 'اختبار مجمع شامل';
      typeBadge.className = type === 'skill'
        ? 'text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30'
        : 'text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = 'all';

    await this.fetchQuestionsForCurrentContext();
  },

  async fetchQuestionsForCurrentContext() {
    if (!this.activeQuestionContext) return;
    const { type, parentId, testId } = this.activeQuestionContext;

    App.showLoading(true);
    let res;
    if (type === 'skill') {
      res = await API.get(`/admin/skills/${parentId}/tests/${testId}/questions`);
    } else {
      res = await API.get(`/admin/exams/${testId}/questions`);
    }
    App.showLoading(false);

    if (res.success && res.questions) {
      this.allCurrentQuestions = res.questions;
      this.applyQuestionFiltersAndRender();
    }
  },

  closeQuestionManager() {
    const wrap = document.getElementById('adminQuestionManagerWrap');
    if (wrap) wrap.classList.add('hidden');

    if (!this.activeQuestionContext) {
      this.switchTab('overview');
      return;
    }

    const { type, parentId } = this.activeQuestionContext;
    this.activeQuestionContext = null;
    this.allCurrentQuestions = [];

    if (type === 'skill') {
      this.switchTab('skills');
      if (parentId) this.openSkillTestsManagement(parentId);
    } else {
      this.switchTab('exams');
    }
  },

  filterQuestions(query) {
    this.currentQuestionSearchQuery = (query || '').trim().toLowerCase();
    this.applyQuestionFiltersAndRender();
  },

  filterQuestionsByCategory(category) {
    this.currentQuestionCategory = category;
    this.applyQuestionFiltersAndRender();
  },

  applyQuestionFiltersAndRender() {
    let list = this.allCurrentQuestions || [];

    if (this.currentQuestionCategory && this.currentQuestionCategory !== 'all') {
      list = list.filter(q => q.skill === this.currentQuestionCategory);
    }

    if (this.currentQuestionSearchQuery) {
      const q = this.currentQuestionSearchQuery;
      list = list.filter(item => {
        const qText = (item.question || '').toLowerCase();
        const pText = (item.passage || '').toLowerCase();
        const optsText = (item.options || []).join(' ').toLowerCase();
        return qText.includes(q) || pText.includes(q) || optsText.includes(q);
      });
    }

    this.filteredQuestionsList = list;
    this.renderQuestionsList();
  },

  renderQuestionsList() {
    const container = document.getElementById('adminQuestionsListContainer');
    const countBadge = document.getElementById('adminQManagerCountBadge');
    if (countBadge) {
      countBadge.textContent = `${this.allCurrentQuestions.length} سؤال إجمالي`;
    }

    if (!container) return;

    if (!this.filteredQuestionsList || this.filteredQuestionsList.length === 0) {
      container.innerHTML = `
        <div class="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400 text-xs">
          <i class="fa-solid fa-file-circle-question text-3xl mb-3 text-slate-600 block"></i>
          لا توجد أسئلة تطابق البحث أو التصنيف. اضغط "إضافة سؤال جديد" لإضافة أسئلة.
        </div>
      `;
      return;
    }

    const skillNames = {
      analogy: 'التناظر اللفظي',
      completion: 'إكمال الجمل',
      context: 'الخطأ السياقي',
      reading: 'استيعاب المقروء',
      odd: 'المفردة الشاذة'
    };

    container.innerHTML = this.filteredQuestionsList.map((q, idx) => {
      const qSkillTitle = q.skillTitle || skillNames[q.skill] || q.skill || 'لفظي';
      const isFirst = idx === 0;
      const isLast = idx === this.filteredQuestionsList.length - 1;

      return `
        <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4 hover:border-slate-700 transition">
          <!-- Top Row: Number, Badge, Reorder & Actions -->
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-xl bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                #${q.num || (idx + 1)}
              </span>
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ${qSkillTitle}
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <!-- Reorder Buttons -->
              <button onclick="AdminApp.moveQuestion('${q.id}', 'up')" ${isFirst ? 'disabled' : ''} class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-xs transition" title="تحريك لأعلى">
                <i class="fa-solid fa-chevron-up"></i>
              </button>
              <button onclick="AdminApp.moveQuestion('${q.id}', 'down')" ${isLast ? 'disabled' : ''} class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-xs transition" title="تحريك لأسفل">
                <i class="fa-solid fa-chevron-down"></i>
              </button>

              <div class="h-4 w-px bg-slate-800 mx-1"></div>

              <!-- Edit & Delete -->
              <button onclick="AdminApp.openEditQuestionModal('${q.id}')" class="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 transition">
                <i class="fa-solid fa-pen-to-square"></i>
                <span>تعديل</span>
              </button>
              <button onclick="AdminApp.deleteQuestion('${q.id}')" class="py-1.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1 transition border border-rose-500/30">
                <i class="fa-solid fa-trash"></i>
                <span>حذف</span>
              </button>
            </div>
          </div>

          <!-- Reading Passage (if present) -->
          ${q.passage ? `
            <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
              <span class="font-bold text-purple-400 block mb-1"><i class="fa-solid fa-book-open ml-1"></i> نص القطعة:</span>
              <div class="max-h-36 overflow-y-auto whitespace-pre-line text-slate-300 text-[11px]">${q.passage}</div>
            </div>
          ` : ''}

          <!-- Question Prompt -->
          <div class="text-sm font-bold text-white leading-relaxed">
            ${q.question}
          </div>

          <!-- Options Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            ${(q.options || []).map((opt, optIdx) => {
              const letter = ['أ', 'ب', 'ج', 'د'][optIdx] || '';
              const isCorrect = (q.correct === letter || q.correctAnswer === letter || q.correct === opt || q.correctAnswer === opt);
              return `
                <div class="p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                  isCorrect 
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 ring-1 ring-emerald-500/30' 
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'} flex items-center justify-center font-bold text-xs">
                      ${letter}
                    </span>
                    <span>${opt}</span>
                  </div>
                  ${isCorrect ? `<span class="text-[11px] font-black text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-check"></i> الإجابة الصحيحة</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Explanation & Rule (if present) -->
          ${(q.explanation || q.rule) ? `
            <div class="pt-3 border-t border-slate-800/60 flex flex-wrap gap-4 text-[11px] text-slate-400">
              ${q.explanation ? `<div><strong class="text-slate-300">الشرح:</strong> ${q.explanation}</div>` : ''}
              ${q.rule ? `<div><strong class="text-emerald-400">القاعدة:</strong> ${q.rule}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  async moveQuestion(qId, direction) {
    if (!this.activeQuestionContext) return;
    const { type, parentId, testId } = this.activeQuestionContext;

    App.showLoading(true);
    let res;
    if (type === 'skill') {
      res = await API.post(`/admin/skills/${parentId}/tests/${testId}/questions/reorder`, { qId, direction });
    } else {
      res = await API.post(`/admin/exams/${testId}/questions/reorder`, { qId, direction });
    }
    App.showLoading(false);

    if (res.success && res.questions) {
      this.allCurrentQuestions = res.questions;
      this.applyQuestionFiltersAndRender();
    } else {
      App.showToast(res.message || 'تعذر تغيير الترتيب.', 'error');
    }
  },

  openAddQuestionModal() {
    document.getElementById('qEditId').value = '';
    document.getElementById('modalQuestionEditorTitle').textContent = 'إضافة سؤال جديد';
    document.getElementById('modalQuestionEditorSubtitle').textContent = 'أدخل نص السؤال والخيارات وحدد الإجابة الصحيحة';

    const skillSelect = document.getElementById('qEditSkill');
    if (this.activeQuestionContext && this.activeQuestionContext.type === 'skill') {
      skillSelect.value = this.activeQuestionContext.parentId;
    } else {
      skillSelect.value = 'analogy';
    }

    document.getElementById('qEditPassage').value = '';
    document.getElementById('qEditQuestion').value = '';
    document.getElementById('qEditOptionA').value = '';
    document.getElementById('qEditOptionB').value = '';
    document.getElementById('qEditOptionC').value = '';
    document.getElementById('qEditOptionD').value = '';
    
    // check radio 'أ'
    const radios = document.getElementsByName('qEditCorrect');
    radios.forEach(r => { r.checked = (r.value === 'أ'); });

    document.getElementById('qEditExplanation').value = '';
    document.getElementById('qEditRule').value = '';

    document.getElementById('modalQuestionEditor').classList.remove('hidden');
  },

  openEditQuestionModal(qId) {
    const q = this.allCurrentQuestions.find(item => item.id === qId);
    if (!q) return;

    document.getElementById('qEditId').value = q.id;
    document.getElementById('modalQuestionEditorTitle').textContent = `تعديل السؤال #${q.num || ''}`;
    document.getElementById('modalQuestionEditorSubtitle').textContent = 'تعديل نص السؤال والخيارات والإجابة الصحيحة';

    document.getElementById('qEditSkill').value = q.skill || 'analogy';
    document.getElementById('qEditPassage').value = q.passage || '';
    document.getElementById('qEditQuestion').value = q.question || '';

    const opts = q.options || [];
    document.getElementById('qEditOptionA').value = opts[0] || '';
    document.getElementById('qEditOptionB').value = opts[1] || '';
    document.getElementById('qEditOptionC').value = opts[2] || '';
    document.getElementById('qEditOptionD').value = opts[3] || '';

    const correct = q.correct || q.correctAnswer || 'أ';
    const radios = document.getElementsByName('qEditCorrect');
    radios.forEach(r => {
      r.checked = (r.value === correct || (correct === opts[0] && r.value === 'أ') || (correct === opts[1] && r.value === 'ب') || (correct === opts[2] && r.value === 'ج') || (correct === opts[3] && r.value === 'د'));
    });

    document.getElementById('qEditExplanation').value = q.explanation || '';
    document.getElementById('qEditRule').value = q.rule || '';

    document.getElementById('modalQuestionEditor').classList.remove('hidden');
  },

  async saveQuestion() {
    if (!this.activeQuestionContext) return;
    const { type, parentId, testId } = this.activeQuestionContext;

    const qId = document.getElementById('qEditId').value;
    const skill = document.getElementById('qEditSkill').value;
    const passage = document.getElementById('qEditPassage').value.trim();
    const question = document.getElementById('qEditQuestion').value.trim();
    const optA = document.getElementById('qEditOptionA').value.trim();
    const optB = document.getElementById('qEditOptionB').value.trim();
    const optC = document.getElementById('qEditOptionC').value.trim();
    const optD = document.getElementById('qEditOptionD').value.trim();

    if (!question) {
      App.showToast('يرجى كتابة نص السؤال.', 'error');
      return;
    }
    if (!optA || !optB || !optC || !optD) {
      App.showToast('يرجى ملء الخيارات الأربعة كاملة.', 'error');
      return;
    }

    let correct = 'أ';
    const radios = document.getElementsByName('qEditCorrect');
    for (const r of radios) {
      if (r.checked) {
        correct = r.value;
        break;
      }
    }

    const explanation = document.getElementById('qEditExplanation').value.trim();
    const rule = document.getElementById('qEditRule').value.trim();

    const payload = {
      skill,
      passage: passage || null,
      question,
      options: [optA, optB, optC, optD],
      correct,
      explanation,
      rule
    };

    App.showLoading(true);
    let res;
    if (!qId) {
      // Create
      if (type === 'skill') {
        res = await API.post(`/admin/skills/${parentId}/tests/${testId}/questions`, payload);
      } else {
        res = await API.post(`/admin/exams/${testId}/questions`, payload);
      }
    } else {
      // Update
      if (type === 'skill') {
        res = await API.put(`/admin/skills/${parentId}/tests/${testId}/questions/${qId}`, payload);
      } else {
        res = await API.put(`/admin/exams/${testId}/questions/${qId}`, payload);
      }
    }
    App.showLoading(false);

    if (res.success) {
      App.showToast(qId ? 'تم تحديث السؤال بنجاح!' : 'تمت إضافة السؤال بنجاح!', 'success');
      document.getElementById('modalQuestionEditor').classList.add('hidden');
      await this.fetchQuestionsForCurrentContext();
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  },

  deleteQuestion(qId) {
    if (!this.activeQuestionContext) return;
    const { type, parentId, testId } = this.activeQuestionContext;

    this.openDeleteConfirmModal(
      'تأكيد حذف السؤال',
      'هل أنت متأكد من رغبتك في حذف هذا السؤال نهائياً؟ سيتم إعادة ترقيم الأسئلة المتبقية تلقائياً.',
      async () => {
        App.showLoading(true);
        let res;
        if (type === 'skill') {
          res = await API.delete(`/admin/skills/${parentId}/tests/${testId}/questions/${qId}`);
        } else {
          res = await API.delete(`/admin/exams/${testId}/questions/${qId}`);
        }
        App.showLoading(false);

        if (res.success) {
          App.showToast('تم حذف السؤال بنجاح.', 'success');
          await this.fetchQuestionsForCurrentContext();
        } else {
          App.showToast(res.message || 'فشل حذف السؤال.', 'error');
        }
      }
    );
  },

  async exportJsonBackup() {
    App.showLoading(true);
    const res = await API.get('/admin/backup/export');
    App.showLoading(false);

    if (res.success) {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `qimmah_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      App.showToast('تم تصدير نسخة احتياطية من المنصة بنجاح!', 'success');
    } else {
      App.showToast('فشل تصدير البيانات.', 'error');
    }
  },

  async exportBundleJs() {
    App.showLoading(true);
    let bundleData = null;
    const res = await API.get('/admin/backup/export');
    if (res && res.success && res.data) {
      bundleData = res.data;
    } else {
      try {
        const raw = localStorage.getItem('alqimmah_db_v2');
        if (raw) bundleData = JSON.parse(raw);
      } catch (e) {}
    }
    App.showLoading(false);

    if (bundleData) {
      const bundleContent = `window.QIMMAH_DATA = ${JSON.stringify(bundleData, null, 2)};\n`;
      const blob = new Blob([bundleContent], { type: 'application/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', 'bundle.js');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      App.showToast('تم تصدير ملف bundle.js بنجاح! ضعه في مسار assets/data/bundle.js لتثبيت التحديثات.', 'success');
    } else {
      App.showToast('تعذر تصدير قاعدة البيانات.', 'error');
    }
  },

  // ==========================================
  // 4. IMPORT QUESTIONS
  // ==========================================
  async handleFileImport(input) {
    const file = input.files[0];
    if (!file) return;

    const targetEl = document.getElementById('importTargetExamSelect');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('examId', targetEl ? targetEl.value : '');

    App.showLoading(true);
    const res = await API.post('/admin/questions/import', formData);
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      input.value = '';
      this.loadExams();
    } else {
      App.showToast(res.message || 'فشل استيراد الأسئلة.', 'error');
    }
  },

  // ==========================================
  // 5. EXPORTS & BACKUP
  // ==========================================
  exportExcel() {
    window.location.href = '/api/admin/reports/export-excel';
  },

  exportCSV() {
    window.location.href = '/api/admin/reports/export-csv';
  },

  downloadBackup() {
    window.location.href = '/api/admin/backup/download';
  },

  async handleBackupRestore(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm('تحذير: استعادة النسخة الاحتياطية ستقوم بدمج/استبدال بيانات النظام الحالية بالبيانات المستعادة. هل تريد المتابعة؟')) {
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('backupFile', file);

    App.showLoading(true);
    const res = await API.post('/admin/backup/restore', formData);
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      input.value = '';
      this.initDashboard();
    } else {
      App.showToast(res.message || 'فشلت الاستعادة.', 'error');
    }
  },

  // ==========================================
  // 6. PLATFORM SETTINGS
  // ==========================================
  async loadPlatformSettings() {
    const res = await API.get('/admin/settings');
    if (res && res.success && res.settings) {
      const s = res.settings;
      const elName = document.getElementById('settingInstructorName');
      const elPhone = document.getElementById('settingInstructorPhone');
      const elPass = document.getElementById('settingPassThreshold');
      if (elName) elName.value = s.instructorName || 'الأستاذ جابر القاضي';
      if (elPhone) elPhone.value = s.instructorPhone || '0541378802';
      if (elPass) elPass.value = s.passingThresholdPercent || 75;
    }
  },

  async savePlatformSettings() {
    const instructorName = (document.getElementById('settingInstructorName').value || '').trim();
    const instructorPhone = (document.getElementById('settingInstructorPhone').value || '').trim();
    const passingThresholdPercent = parseInt(document.getElementById('settingPassThreshold').value || 75, 10);

    App.showLoading(true);
    const res = await API.put('/admin/settings', {
      instructorName,
      instructorPhone,
      passingThresholdPercent,
    });
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
    } else {
      App.showToast(res.message || 'فشل حفظ الإعدادات.', 'error');
    }
  },

  async resetDatabaseToDefault() {
    if (!confirm('تحذير هام: هل أنت متأكد من استعادة قاعدة البيانات الأصلية للمنصة؟\n\nسيتم إلغاء أي تعديلات مخصصة على الأسئلة أو النماذج واستعادة النسخة المعتمدة الرسمية.')) {
      return;
    }

    App.showLoading(true);
    const res = await API.post('/admin/reset-database');
    App.showLoading(false);

    if (res.success) {
      App.showToast(res.message, 'success');
      this.initDashboard();
    } else {
      App.showToast(res.message || 'حدث خطأ.', 'error');
    }
  }
};
