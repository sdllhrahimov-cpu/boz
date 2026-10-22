/**
 * QOG'OZ ESLATMA — VINTAGE MOBILE NOTES LOGIC
 * Minimalist natural paper notes with direct Telegram integration.
 */

// Sound Engine using Web Audio API (Synthesized vintage sounds)
class SoundEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playPaperRustle() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch (e) {}
  }

  playSendSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playPencilScratch() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + Math.random() * 40, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch (e) {}
  }
}

// Initial Sample Notes (Work & Tasks)
const DEFAULT_SAMPLE_NOTES = [
  {
    id: 'note_1',
    title: 'Ish rejalari va vazifalar 📋',
    textContent: '1. Asosiy vazifalarni belgilash va rejalashtirish\n2. Ma\'lumotlarni umumlashtirish\n3. Telegram orqali xabar va hisobotni yuborish',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class NotesApp {
  constructor() {
    this.sound = new SoundEngine();
    this.notes = [];
    this.currentNote = null;
    this.autoSaveTimer = null;
    this.activeFilter = 'all';
    this.searchQuery = '';
    
    // Telegram Bot settings from storage
    this.tgBotToken = localStorage.getItem('penco_tg_bot_token') || '';
    this.tgChatId = localStorage.getItem('penco_tg_chat_id') || '';

    // DOM Elements
    this.dom = {
      // Top nav
      addNoteBtn: document.getElementById('add-note-btn'),
      openSavedBtn: document.getElementById('open-saved-btn'),
      notesCountBadge: document.getElementById('notesCountBadge'),
      statusTime: document.getElementById('statusTime'),
      
      // Paper inputs
      paperSurface: document.getElementById('paperSurface'),
      paperDateStamp: document.getElementById('paperDateStamp'),
      paperTimeStamp: document.getElementById('paperTimeStamp'),
      telegramConfigBtn: document.getElementById('telegram-config-btn'),
      tgConfigStatus: document.getElementById('tgConfigStatus'),
      noteTitleInput: document.getElementById('noteTitleInput'),
      noteTextInput: document.getElementById('noteTextInput'),
      sendTelegramBtn: document.getElementById('sendTelegramBtn'),
      
      // Drawer
      savedDrawerOverlay: document.getElementById('savedDrawerOverlay'),
      savedDrawerSheet: document.getElementById('savedDrawerSheet'),
      closeDrawerBtn: document.getElementById('closeDrawerBtn'),
      drawerNotesCount: document.getElementById('drawerNotesCount'),
      drawerSearchInput: document.getElementById('drawerSearchInput'),
      clearSearchBtn: document.getElementById('clearSearchBtn'),
      filterChips: document.querySelectorAll('.filter-chip'),
      drawerNotesList: document.getElementById('drawerNotesList'),
      drawerNewNoteBtn: document.getElementById('drawerNewNoteBtn'),
      
      // Telegram modal
      tgModalOverlay: document.getElementById('tgModalOverlay'),
      closeTgModalBtn: document.getElementById('closeTgModalBtn'),
      tgBotTokenInput: document.getElementById('tgBotTokenInput'),
      tgChatIdInput: document.getElementById('tgChatIdInput'),
      saveTgSettingsBtn: document.getElementById('saveTgSettingsBtn'),
      testTgBtn: document.getElementById('testTgBtn'),

      // Toast
      toastCard: document.getElementById('toastCard'),
      toastMessage: document.getElementById('toastMessage'),
      
      // Desktop controls
      phoneFrame: document.getElementById('phoneFrame'),
      toggleFrameBtn: document.getElementById('toggle-frame-btn'),
      toggleSoundBtn: document.getElementById('toggle-sound-btn')
    };

    this.init();
  }

  init() {
    this.loadNotesFromStorage();
    this.setupEventListeners();
    this.startClock();
    this.updateTgBadge();

    // Select first note or create new one
    if (this.notes.length > 0) {
      this.loadNoteToPaper(this.notes[0], false);
    } else {
      this.createNewNote(false);
    }

    this.updateNotesCount();
  }

  loadNotesFromStorage() {
    const raw = localStorage.getItem('penco_paper_notes');
    if (raw) {
      try {
        let parsed = JSON.parse(raw);
        // Ro'zg'orlik/bozorlikka oid eski ma'lumotlarni tozalab tashlash
        parsed = parsed.filter(n => {
          const t = (n.title || '').toLowerCase();
          const c = (n.textContent || '').toLowerCase();
          return !t.includes('bozorlik') && !t.includes('ro\'zg\'or') && !c.includes('mol go\'shti') && !c.includes('pomidor');
        });
        this.notes = parsed.length > 0 ? parsed : [...DEFAULT_SAMPLE_NOTES];
        this.saveNotesToStorage();
      } catch (e) {
        this.notes = [...DEFAULT_SAMPLE_NOTES];
        this.saveNotesToStorage();
      }
    } else {
      this.notes = [...DEFAULT_SAMPLE_NOTES];
      this.saveNotesToStorage();
    }
  }

  saveNotesToStorage() {
    localStorage.setItem('penco_paper_notes', JSON.stringify(this.notes));
    this.updateNotesCount();
  }

  updateNotesCount() {
    const count = this.notes.length;
    if (this.dom.notesCountBadge) {
      this.dom.notesCountBadge.textContent = count;
    }
    if (this.dom.drawerNotesCount) {
      this.dom.drawerNotesCount.textContent = `Jami: ${count} ta eslatma`;
    }
  }

  updateTgBadge() {
    if (this.dom.tgConfigStatus) {
      if (this.tgBotToken && this.tgChatId) {
        this.dom.tgConfigStatus.textContent = 'Bot ulangan ✓';
        this.dom.telegramConfigBtn.style.borderColor = '#2AABEE';
        this.dom.telegramConfigBtn.style.color = '#2AABEE';
      } else {
        this.dom.tgConfigStatus.textContent = 'Telegram';
        this.dom.telegramConfigBtn.style.borderColor = 'rgba(42, 171, 238, 0.35)';
      }
    }
  }

  setupEventListeners() {
    // Top Bar: "+ Qo'shish" button
    this.dom.addNoteBtn.addEventListener('click', () => {
      this.createNewNote(true);
      this.showToast('Yangi bo\'sh qog\'oz ochildi ✨');
    });

    // Top Bar: "Saqlanganlar" button
    this.dom.openSavedBtn.addEventListener('click', () => {
      this.openDrawer();
    });

    // QOG'OZ PASTIDAGI 'JO'NATISH' BUTTONI (TELEGRAM)
    this.dom.sendTelegramBtn.addEventListener('click', () => {
      this.sendToTelegram();
    });

    // Telegram Config modal triggers
    this.dom.telegramConfigBtn.addEventListener('click', () => {
      this.openTgModal();
    });

    this.dom.closeTgModalBtn.addEventListener('click', () => {
      this.closeTgModal();
    });

    this.dom.tgModalOverlay.addEventListener('click', (e) => {
      if (e.target === this.dom.tgModalOverlay) {
        this.closeTgModal();
      }
    });

    this.dom.saveTgSettingsBtn.addEventListener('click', () => {
      this.saveTgSettings();
    });

    this.dom.testTgBtn.addEventListener('click', () => {
      this.testTgBot();
    });

    // Drawer close buttons
    this.dom.closeDrawerBtn.addEventListener('click', () => this.closeDrawer());
    this.dom.savedDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === this.dom.savedDrawerOverlay) {
        this.closeDrawer();
      }
    });

    // Drawer New Note button
    this.dom.drawerNewNoteBtn.addEventListener('click', () => {
      this.closeDrawer();
      this.createNewNote(true);
      this.showToast('Yangi eslatma ochildi');
    });

    // Title Input changes
    this.dom.noteTitleInput.addEventListener('input', () => {
      if (!this.currentNote) return;
      this.currentNote.title = this.dom.noteTitleInput.value.trim() || 'Nomsiz eslatma';
      this.triggerAutoSave();
    });

    // Textarea input changes
    this.dom.noteTextInput.addEventListener('input', () => {
      if (!this.currentNote) return;
      this.currentNote.textContent = this.dom.noteTextInput.value;
      this.sound.playPencilScratch();
      this.triggerAutoSave();
    });

    // Search input in drawer
    this.dom.drawerSearchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.dom.clearSearchBtn.classList.toggle('hidden', !this.searchQuery);
      this.renderDrawerNotes();
    });

    this.dom.clearSearchBtn.addEventListener('click', () => {
      this.dom.drawerSearchInput.value = '';
      this.searchQuery = '';
      this.dom.clearSearchBtn.classList.add('hidden');
      this.renderDrawerNotes();
    });


    // Desktop frame toggle
    this.dom.toggleFrameBtn.addEventListener('click', () => {
      this.dom.phoneFrame.classList.toggle('fullscreen-mode');
      const isFull = this.dom.phoneFrame.classList.contains('fullscreen-mode');
      this.dom.toggleFrameBtn.querySelector('span').textContent = isFull ? 'Kompakt ko\'rinish' : 'Telefon ko\'rinishi';
    });

    // Desktop sound toggle
    this.dom.toggleSoundBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      const onIcon = this.dom.toggleSoundBtn.querySelector('.sound-on-icon');
      const offIcon = this.dom.toggleSoundBtn.querySelector('.sound-off-icon');
      const text = this.dom.toggleSoundBtn.querySelector('.sound-text');
      if (this.sound.enabled) {
        onIcon.classList.remove('hidden');
        offIcon.classList.add('hidden');
        text.textContent = 'Ovoz: Yoqilgan';
        this.sound.playPaperRustle();
      } else {
        onIcon.classList.add('hidden');
        offIcon.classList.remove('hidden');
        text.textContent = 'Ovoz: O\'chirilgan';
      }
    });
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      if (this.dom.statusTime) {
        this.dom.statusTime.textContent = `${hours}:${minutes}`;
      }
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  formatDate(isoString) {
    const date = isoString ? new Date(isoString) : new Date();
    const monthsUz = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];
    return `${date.getDate()}-${monthsUz[date.getMonth()]}, ${date.getFullYear()}`;
  }

  formatTime(isoString) {
    const date = isoString ? new Date(isoString) : new Date();
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  createNewNote(playSound = true) {
    const newNote = {
      id: 'note_' + Date.now(),
      title: '',
      textContent: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.notes.unshift(newNote);
    this.saveNotesToStorage();
    this.loadNoteToPaper(newNote, playSound);
    
    setTimeout(() => {
      this.dom.noteTitleInput.focus();
    }, 120);
  }

  loadNoteToPaper(note, playSound = true) {
    this.currentNote = note;

    if (playSound) {
      this.sound.playPaperRustle();
    }

    // Set date and time
    this.dom.paperDateStamp.textContent = this.formatDate(note.updatedAt || note.createdAt);
    this.dom.paperTimeStamp.textContent = this.formatTime(note.updatedAt || note.createdAt);

    // Set title and text content
    this.dom.noteTitleInput.value = note.title === 'Nomsiz eslatma' ? '' : (note.title || '');
    this.dom.noteTextInput.value = note.textContent || '';
  }

  triggerAutoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.saveCurrentNoteImmediately();
    }, 500);
  }

  saveCurrentNoteImmediately() {
    if (!this.currentNote) return;

    this.currentNote.updatedAt = new Date().toISOString();
    
    // Auto title if empty
    if (!this.currentNote.title || !this.currentNote.title.trim()) {
      if (this.currentNote.textContent?.trim()) {
        const firstLine = this.currentNote.textContent.trim().split('\n')[0];
        this.currentNote.title = firstLine.substring(0, 35);
      } else {
        this.currentNote.title = 'Nomsiz eslatma';
      }
    }

    const idx = this.notes.findIndex(n => n.id === this.currentNote.id);
    if (idx !== -1) {
      this.notes[idx] = { ...this.currentNote };
    } else {
      this.notes.unshift({ ...this.currentNote });
    }

    this.saveNotesToStorage();
  }

  // =========================================================================
  // TELEGRAM INTEGRATION
  // =========================================================================
  async sendToTelegram() {
    const title = this.dom.noteTitleInput.value.trim();
    const content = this.dom.noteTextInput.value.trim();

    if (!title && !content) {
      this.showToast('Iltimos, avval qog\'ozga biror narsa yozing! ✍️');
      this.dom.noteTextInput.focus();
      return;
    }

    // Save note first
    this.saveCurrentNoteImmediately();

    // Prepare message format
    const noteTitle = title || 'Qog\'oz Eslatma';
    const dateFormatted = `${this.dom.paperDateStamp.textContent}, ${this.dom.paperTimeStamp.textContent}`;
    
    const message = `📜 *${noteTitle}*\n📅 _${dateFormatted}_\n\n${content}`;

    // Visual button feedback
    const btn = this.dom.sendTelegramBtn;
    const originalText = btn.querySelector('span').textContent;
    btn.querySelector('span').textContent = 'Yuborilmoqda...';
    btn.style.opacity = '0.85';

    // 1. Direct Telegram Bot API if configured
    if (this.tgBotToken && this.tgChatId) {
      try {
        const apiUrl = `https://api.telegram.org/bot${this.tgBotToken}/sendMessage`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.tgChatId,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        const data = await res.json();
        if (data.ok) {
          this.sound.playSendSuccess();
          this.showToast('Telegram botingizga muvaffaqiyatli yuborildi! 🚀');
          btn.querySelector('span').textContent = 'Yuborildi! ✓';
          setTimeout(() => {
            btn.querySelector('span').textContent = originalText;
            btn.style.opacity = '1';
          }, 1800);
          return;
        } else {
          console.warn('Bot API error:', data);
          this.showToast(`Bot xatosi: ${data.description || 'Xatolik'}. Telegram ulashish ochilmoqda.`);
        }
      } catch (err) {
        console.warn('Fetch error:', err);
      }
    }

    // 2. Fallback to Telegram Web / App Direct Share
    this.sound.playSendSuccess();
    const shareText = `📜 ${noteTitle}\n📅 ${dateFormatted}\n\n${content}`;
    const shareUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`;
    
    window.open(shareUrl, '_blank');
    this.showToast('Telegram ochilmoqda... ✈️');

    btn.querySelector('span').textContent = 'Yuborildi! ✈️';
    setTimeout(() => {
      btn.querySelector('span').textContent = originalText;
      btn.style.opacity = '1';
    }, 1800);
  }

  openTgModal() {
    this.dom.tgBotTokenInput.value = this.tgBotToken;
    this.dom.tgChatIdInput.value = this.tgChatId;
    this.dom.tgModalOverlay.classList.add('active');
  }

  closeTgModal() {
    this.dom.tgModalOverlay.classList.remove('active');
  }

  saveTgSettings() {
    this.tgBotToken = this.dom.tgBotTokenInput.value.trim();
    this.tgChatId = this.dom.tgChatIdInput.value.trim();

    localStorage.setItem('penco_tg_bot_token', this.tgBotToken);
    localStorage.setItem('penco_tg_chat_id', this.tgChatId);

    this.updateTgBadge();
    this.closeTgModal();
    this.showToast('Telegram sozlamalari saqlandi! 💾');
  }

  async testTgBot() {
    const token = this.dom.tgBotTokenInput.value.trim();
    const chat = this.dom.tgChatIdInput.value.trim();

    if (!token || !chat) {
      alert('Iltimos, avval Bot Token va Chat ID maydonlarini to\'ldiring!');
      return;
    }

    const testBtn = this.dom.testTgBtn;
    testBtn.textContent = 'Tekshirilmoqda...';

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text: 'Salom! Bu "Qog\'oz Eslatma" ilovasidan yuborilgan sinov xabari 📜✨'
        })
      });

      const data = await res.json();
      if (data.ok) {
        testBtn.textContent = 'Muvaffaqiyatli! ✓';
        this.showToast('Sinov xabari yetib bordi! 🚀');
      } else {
        testBtn.textContent = 'Xato yuz berdi';
        alert(`Telegram xatoligi: ${data.description}`);
      }
    } catch (e) {
      testBtn.textContent = 'Ulanish xatosi';
      alert('Telegram serveriga ulanishda xatolik yuz berdi.');
    }

    setTimeout(() => {
      testBtn.textContent = 'Sinov xabari yuborish';
    }, 2500);
  }

  // =========================================================================
  // SAVED NOTES DRAWER (STORAGE)
  // =========================================================================
  openDrawer() {
    this.sound.playPaperRustle();
    this.renderDrawerNotes();
    this.dom.savedDrawerOverlay.classList.add('active');
  }

  closeDrawer() {
    this.dom.savedDrawerOverlay.classList.remove('active');
  }

  renderDrawerNotes() {
    const list = this.dom.drawerNotesList;
    list.innerHTML = '';

    let filtered = this.notes.filter(note => {
      const matchSearch = !this.searchQuery || 
        (note.title && note.title.toLowerCase().includes(this.searchQuery)) ||
        (note.textContent && note.textContent.toLowerCase().includes(this.searchQuery));
      return matchSearch;
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-notes-view">
          <span class="empty-icon">📭</span>
          <h3 class="empty-title">Eslatmalar topilmadi</h3>
          <p class="empty-desc">Hali saqlangan eslatmalar yo'q yoki qidiruv bo'yicha topilmadi.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(note => {
      const isCurrent = this.currentNote && this.currentNote.id === note.id;
      const card = document.createElement('div');
      card.className = `saved-note-card ${isCurrent ? 'active-note' : ''}`;

      const excerpt = note.textContent || 'Matn mavjud emas...';

      card.innerHTML = `
        <div class="card-top-row">
          <span class="card-category-tag">📜 Eslatma</span>
          <span class="card-date">${this.formatDate(note.updatedAt || note.createdAt)}</span>
        </div>
        <h4 class="card-title">${this.escapeHtml(note.title || 'Nomsiz eslatma')}</h4>
        <p class="card-excerpt">${this.escapeHtml(excerpt)}</p>
        <div class="card-actions-row">
          <span class="card-mode-badge">✈️ Telegramga tayyor</span>
          <button class="card-delete-btn" title="Eslatmani o'chirish">🗑️ O'chirish</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-delete-btn')) return;
        this.loadNoteToPaper(note, true);
        this.closeDrawer();
        this.showToast(`"${note.title || 'Eslatma'}" qog'ozga yuklandi! 📜`);
      });

      const deleteBtn = card.querySelector('.card-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`"${note.title || 'Eslatma'}"ni o'chirishni xohlaysizmi?`)) {
          this.deleteNote(note.id);
        }
      });

      list.appendChild(card);
    });
  }

  deleteNote(noteId) {
    this.notes = this.notes.filter(n => n.id !== noteId);
    this.saveNotesToStorage();
    this.renderDrawerNotes();
    this.showToast('Eslatma o\'chirildi 🗑️');

    if (this.currentNote && this.currentNote.id === noteId) {
      if (this.notes.length > 0) {
        this.loadNoteToPaper(this.notes[0], true);
      } else {
        this.createNewNote(false);
      }
    }
  }

  showToast(message) {
    if (!this.dom.toastCard || !this.dom.toastMessage) return;
    this.dom.toastMessage.textContent = message;
    this.dom.toastCard.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toastCard.classList.remove('show');
    }, 2400);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new NotesApp();
});
