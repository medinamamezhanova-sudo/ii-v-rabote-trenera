/* Чек-лист занятия «ИИ в работе тренера».
   Прогресс, счётчики блоков, оглавление с подсветкой, копирование промптов.

   Прогресс хранится по явным data-id шага, а не по его месту в списке:
   добавили шаг в середину — у тех, кто уже ходил по чек-листу, галочки
   остаются на своих шагах. */

(function () {
  'use strict';

  var STORAGE_KEY = 'pif-ai-trener-v1';

  // Пороги привязаны к смысловым рубежам дня, а не к круглым числам:
  // 12% — помощник настроен, 30% — программа утверждена вами,
  // 45% — есть мини-лекция, 62% — есть презентация, 80% — есть упражнение.
  var RANKS = [
    { min: 0,   icon: '🌱', title: 'Начало',      sub: 'Чек-лист открыт' },
    { min: 12,  icon: '🧩', title: 'Методолог',   sub: 'Навыки сформулированы' },
    { min: 30,  icon: '🏗', title: 'Архитектор',  sub: 'Программа утверждена вами' },
    { min: 45,  icon: '🎤', title: 'Лектор',      sub: 'Мини-лекция и слайды готовы' },
    { min: 62,  icon: '🧪', title: 'Практик',     sub: 'Презентация собрана' },
    { min: 80,  icon: '🎲', title: 'Игротехник',  sub: 'Упражнение и кейс на руках' },
    { min: 100, icon: '🚀', title: 'Готово',      sub: 'Тренинг собран и упакован' }
  ];

  var steps = Array.prototype.slice.call(document.querySelectorAll('.step[data-id]'));
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.block[data-name]'));
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { return {}; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* приватный режим — молча, страница работает и без сохранения */ }
  }

  /* ---------- шаги ---------- */

  function paint(step, done) {
    var check = step.querySelector('.step__check');
    step.classList.toggle('completed', done);
    if (check) check.classList.toggle('done', done);
  }

  function toggle(step) {
    var id = step.getAttribute('data-id');
    var done = !state[id];
    state[id] = done;
    paint(step, done);
    save();
    refresh();
  }

  steps.forEach(function (step) {
    paint(step, !!state[step.getAttribute('data-id')]);
    step.addEventListener('click', function (e) {
      // клик по промпту и по кнопке копирования галочку не ставит
      if (e.target.closest('.cmd') || e.target.closest('.ref')) return;
      toggle(step);
    });
  });

  /* ---------- оглавление ---------- */

  var toc = document.getElementById('toc');
  blocks.forEach(function (block, i) {
    var a = document.createElement('a');
    a.className = 'toc__link';
    a.href = '#' + block.id;
    a.setAttribute('data-for', block.id);
    a.innerHTML = '<span class="toc__num">' + i + '</span>' +
                  '<span class="toc__name"></span>' +
                  '<span class="toc__count"></span>';
    a.querySelector('.toc__name').textContent = block.getAttribute('data-name');
    toc.appendChild(a);
  });

  /* ---------- счётчики и ранг ---------- */

  function refresh() {
    var total = steps.length;
    var done = steps.filter(function (s) { return state[s.getAttribute('data-id')]; }).length;

    document.getElementById('doneNum').textContent = done;
    document.getElementById('totalNum').textContent = total;
    document.getElementById('barFill').style.width = (total ? (done / total * 100) : 0) + '%';

    blocks.forEach(function (block) {
      var inside = Array.prototype.slice.call(block.querySelectorAll('.step[data-id]'));
      var d = inside.filter(function (s) { return state[s.getAttribute('data-id')]; }).length;
      var box = block.querySelector('[data-count]');
      if (box) box.textContent = d + ' / ' + inside.length;
      var link = toc.querySelector('.toc__link[data-for="' + block.id + '"] .toc__count');
      if (link) link.textContent = d + '/' + inside.length;
    });

    var pct = total ? (done / total * 100) : 0;
    var rank = RANKS[0];
    RANKS.forEach(function (r) { if (pct >= r.min) rank = r; });
    document.querySelector('.rank__icon').textContent = rank.icon;
    document.getElementById('rankTitle').textContent = rank.title;
    document.getElementById('rankSub').textContent = rank.sub;
  }

  /* ---------- копирование промптов ---------- */

  document.querySelectorAll('.cmd__copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = btn.closest('.cmd').querySelector('.cmd__code');
      var text = code ? code.textContent : '';
      var ok = function () {
        var was = btn.textContent;
        btn.textContent = 'Скопировано';
        btn.classList.add('ok');
        setTimeout(function () { btn.textContent = was; btn.classList.remove('ok'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { fallback(text, ok); });
      } else {
        fallback(text, ok);
      }
    });
  });

  function fallback(text, ok) {
    // file:// и старые браузеры: clipboard API недоступен
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { /* молча */ }
    document.body.removeChild(ta);
  }

  /* ---------- подсветка активного блока ---------- */

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        toc.querySelectorAll('.toc__link').forEach(function (l) { l.classList.remove('active'); });
        var link = toc.querySelector('.toc__link[data-for="' + en.target.id + '"]');
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-130px 0px -60% 0px' });
    blocks.forEach(function (b) { io.observe(b); });
  }

  /* ---------- сброс ---------- */

  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!confirm('Снять все галочки и начать чек-лист заново?')) return;
    state = {};
    save();
    steps.forEach(function (s) { paint(s, false); });
    refresh();
  });

  refresh();
})();
