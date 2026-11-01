/**
 * «Міфи про українську енергетику» — статистика проходжень.
 *
 * Як у попередніх тестах Хмарочоса: тест шле дані прямо в Google Form
 * (formResponse, без квот Apps Script), форма пише їх у Google-таблицю,
 * а аркуш «stats» рахує зведення формулами.
 *
 * ЗАПУСК (один раз, ~2 хвилини):
 *   1. script.google.com → «Новий проєкт» → вставити цей файл замість коду.
 *   2. Вибрати функцію setup → «Виконати» → дозволити доступ до Форм і Таблиць.
 *   3. «Журнал виконання» → скопіювати блок FORM у app/stats.ts.
 *
 * Що створиться: форма «Міфи про енергетику — статистика», яка пише відповіді в
 * таблицю STATS_SS_ID (аркуш відповідей форми) + аркуш «stats» зі зведенням.
 * Повторно зведення перебудовує функція setupStats; ручні правки в «stats» вона зітре.
 */

/** Перебудувати аркуш «stats». Стоїть першою, щоб меню Run за замовчуванням пропонувало її. */
function rebuildStats() { setupStats(); }

/** Поля форми = поля, які шле тест (app/stats.ts). */
var FIELDS = [
  'run_id',  // випадковий ідентифікатор проходження
  'event',   // start | finish
  'score',   // бали 0–8 (лише для finish)
  'level',   // назва рівня (лише для finish)
  'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', // обрана відповідь: П (правда) або Н (неправда)
  'host',    // де проходили: hmarochos.kiev.ua, yakovina.github.io…
];

// [тема, правильна відповідь П/Н] — у порядку тверджень data/quiz.ts
var QUESTIONS = [
  ['Експорт електроенергії', 'Н'],
  ['Рахунки для бізнесу', 'Н'],
  ['Бетонний саркофаг для ТЕС', 'П'],
  ['Синхронізація з ЄС у 2022', 'П'],
  ['Промислові батареї', 'П'],
  ['Стійкість вітрових станцій', 'П'],
  ['Більше живлення Києву', 'Н'],
  ['Обленерго й графіки', 'Н'],
];

var LEVELS = [
  ['Заручник інфопростору', '0–3'],
  ['Уважний спостерігач', '4–6'],
  ['Енергетичний аналітик', '7–8'],
];

var TITLE = 'Міфи про енергетику — статистика';
// Таблиця, яку дала користувачка: форма пише в неї, тут же аркуш «stats».
// https://docs.google.com/spreadsheets/d/1aVn3tzbI7LuGtY2-udyNOYW5LxVmlVkjX-qO8Q38ud0/edit
var STATS_SS_ID = '1aVn3tzbI7LuGtY2-udyNOYW5LxVmlVkjX-qO8Q38ud0';
// Підключено 03.11.2026: проєкт Apps Script script.google.com/home/projects/1rYe258e2rY__0Oifyg_W66SjnAfWcnFNYOyur0H4sjH9B_gJAzbx4KZ5

function setup() {
  if (PropertiesService.getScriptProperties().getProperty('FORM_ID')) {
    throw new Error('Форму вже створено. Для перебудови аркуша запускайте setupStats.');
  }
  var form = FormApp.create(TITLE);
  form.setDescription('Службова форма: сюди тест «Міфи про українську енергетику» автоматично пише старти й результати проходжень. Вручну не заповнювати.');
  form.setCollectEmail(false);
  form.setShowLinkToRespondAgain(false);
  form.setAcceptingResponses(true);

  var items = FIELDS.map(function (f) { return form.addTextItem().setTitle(f); });

  var ss = SpreadsheetApp.openById(STATS_SS_ID);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  PropertiesService.getScriptProperties().setProperty('FORM_ID', form.getId());
  SpreadsheetApp.flush();

  // entry-ідентифікатори: беремо з передзаповненого посилання (порядок = порядок полів)
  var resp = form.createResponse();
  items.forEach(function (it) { resp.withItemResponse(it.createResponse('x')); });
  var ids = (resp.toPrefilledUrl().match(/entry\.\d+/g) || []);
  var entries = {};
  FIELDS.forEach(function (f, i) { entries[f] = ids[i] || ''; });
  var action = form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse');

  setupStats_(ss);

  Logger.log('Форма:   ' + form.getPublishedUrl());
  Logger.log('Таблиця: ' + ss.getUrl());
  Logger.log('\n——— вставити в app/stats.ts ———\nexport const FORM = ' + JSON.stringify({ action: action, entries: entries }, null, 2) + ';');
}

/** Аркуш відповідей саме нашої форми (назва залежить від мови акаунта, тож шукаємо за звʼязком із формою). */
function responsesSheet_(ss) {
  var fid = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var u = sheets[i].getFormUrl();
    if (u && (!fid || u.indexOf(fid) >= 0 || FormApp.openByUrl(u).getId() === fid)) return sheets[i];
  }
  for (var j = 0; j < sheets.length; j++) if (sheets[j].getFormUrl()) return sheets[j];
  return sheets[0];
}

/** Перебудувати зведення (можна запускати повторно): Run → setupStats */
function setupStats() {
  var id = STATS_SS_ID || PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!id) throw new Error('Спершу запустіть setup.');
  setupStats_(SpreadsheetApp.openById(id));
}

function setupStats_(ss) {
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  var src = "'" + responsesSheet_(ss).getName() + "'!";
  // колонки аркуша відповідей: A позначка часу, далі FIELDS по порядку (B, C, D…)
  var col = {};
  FIELDS.forEach(function (f, i) { col[f] = String.fromCharCode(66 + i); });
  var R = function (f) { return src + col[f] + '2:' + col[f]; };
  var HOST = '$B$3'; // фільтр за сайтом — клітинка B3 на аркуші stats
  // + записи з host=test (перевірки підключення) у зведення не потрапляють
  var H = R('host') + ',' + HOST + ',' + R('host') + ',"<>test"';
  var cnt = function (f, v) { return 'COUNTIFS(' + R(f) + ',"' + v + '",' + H + ')'; };
  var cnt2 = function (f, v, f2, v2) { return 'COUNTIFS(' + R(f) + ',"' + v + '",' + R(f2) + ',"' + v2 + '",' + H + ')'; };
  var pct = function (a, b) { return '=IFERROR(' + a + '/' + b + ',"")'; };

  var sh = ss.getSheetByName('stats') || ss.insertSheet('stats', 0);
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.clear(); sh.clearNotes(); sh.clearConditionalFormatRules();
  var rows = [], heads = [], pcts = [];
  var head = function (a, b, c, d, e, f) { heads.push(rows.length + 1); rows.push([a, b || '', c || '', d || '', e || '', f || '']); return rows.length; };
  var row = function (a, b, c, d, e, f) {
    var v = [a, b, c, d, e, f].map(function (x) { return x === undefined ? '' : x; });
    rows.push(v); return rows.length;
  };
  var B = function (r) { return 'B' + r; };

  // ---------- 1. головне ----------
  head('Міфи про українську енергетику — статистика');
  row('Рахувати проходження з сайту (* — з усіх):');
  row('Сайт', '*');
  row('');
  head('Головне', 'Людей', 'Від стартів');
  var rStart = row('Почали тест', '=' + cnt('event', 'start'));
  var rFin = row('Дійшли до результату', '=' + cnt('event', 'finish'), pct(B(rStart + 1), B(rStart)));
  row('Покинули на півдорозі', '=MAX(0,' + B(rStart) + '-' + B(rFin) + ')', pct(B(rFin + 1), B(rStart)));
  pcts.push('C' + rFin + ':C' + (rFin + 1));
  row('Середній бал (з 8)', '=IFERROR(ROUND(AVERAGEIFS(' + R('score') + ',' + R('event') + ',"finish",' + H + '),1),"—")');
  row('Перевірочні проходження (адреса з ?test) — у цифри вище не входять',
    '=COUNTIFS(' + R('event') + ',"start",' + R('host') + ',"test")');
  row('');

  // ---------- 2. рівні ----------
  var rLvHead = head('Рівні', 'Людей', 'Від тих, хто дійшов', 'Бали');
  var rLv0 = rows.length + 1;
  LEVELS.forEach(function (l) {
    var r = rows.length + 1;
    row(l[0], '=' + cnt2('event', 'finish', 'level', l[0]), pct(B(r), B(rFin)), l[1]);
  });
  pcts.push('C' + rLv0 + ':C' + (rLv0 + LEVELS.length - 1));
  row('');

  // ---------- 3. бали ----------
  var rScHead = head('Бали', 'Людей', 'Від тих, хто дійшов');
  var rSc0 = rows.length + 1;
  for (var s = 0; s <= 8; s++) {
    var r = rows.length + 1;
    row(s + ' з 8', '=COUNTIFS(' + R('event') + ',"finish",' + R('score') + ',' + s + ',' + H + ')', pct(B(r), B(rFin)));
  }
  pcts.push('C' + rSc0 + ':C' + (rSc0 + 8));
  row('');

  // ---------- 4. питання ----------
  var rQHead = head('Твердження', 'Відповіли правильно', 'Обрали «Правда»', 'Обрали «Неправда»');
  var rQ0 = rows.length + 1;
  QUESTIONS.forEach(function (q, i) {
    var f = 'q' + (i + 1);
    var base = 'COUNTIFS(' + R('event') + ',"finish",' + R(f) + ',"<>",' + H + ')';
    var share = function (letter) { return '=IFERROR(COUNTIFS(' + R('event') + ',"finish",' + R(f) + ',"' + letter + '",' + H + ')/' + base + ',"")'; };
    row((i + 1) + '. ' + q[0] + ' (правильно: ' + (q[1] === 'П' ? 'правда' : 'неправда') + ')', share(q[1]), share('П'), share('Н'));
  });
  pcts.push('B' + rQ0 + ':D' + (rQ0 + QUESTIONS.length - 1));
  row('');
  row('Частки — від тих, хто дійшов до результату. Найоманливіше твердження — з найменшою часткою в колонці «Відповіли правильно».');

  sh.getRange(1, 1, rows.length, 6).setValues(rows);

  // оформлення
  sh.setColumnWidth(1, 330); sh.setColumnWidths(2, 5, 110);
  sh.getRange('A1').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2').setFontColor('#555555');
  sh.getRange('B3').setBackground('#fff2cc').setFontWeight('bold');
  heads.slice(1).forEach(function (r) {
    sh.getRange(r, 1, 1, 6).setFontWeight('bold').setBackground('#d6e8eb');
  });
  pcts.forEach(function (a) { sh.getRange(a).setNumberFormat('0%'); });
  sh.getRange(rows.length, 1).setFontColor('#555555').setFontStyle('italic');
  sh.setFrozenRows(0);

  // правильні відповіді — зеленим
  var rules = [];
  QUESTIONS.forEach(function (q, i) {
    var colIdx = { 'П': 3, 'Н': 4 }[q[1]];
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=TRUE')
      .setBackground('#d9ead3').setRanges([sh.getRange(rQ0 + i, colIdx)]).build());
  });
  sh.setConditionalFormatRules(rules);

  // графік рівнів
  var chart = sh.newChart().asPieChart()
    .addRange(sh.getRange(rLv0, 1, LEVELS.length, 2))
    .setPosition(rLvHead, 8, 0, 0)
    .setOption('title', 'Рівні')
    .setOption('legend', { position: 'right' })
    .build();
  sh.insertChart(chart);
  // графік балів
  var chart2 = sh.newChart().asColumnChart()
    .addRange(sh.getRange(rSc0, 1, 9, 2))
    .setPosition(rScHead, 8, 0, 0)
    .setOption('title', 'Розподіл балів')
    .setOption('legend', { position: 'none' })
    .build();
  sh.insertChart(chart2);

  ss.setActiveSheet(sh);
  ss.moveActiveSheet(1);
}

/**
 * Перед запуском на сайті Хмарочоса: видаляє всі тестові записи (з github.io, ?test,
 * локальних збірок) з аркуша відповідей і з самої форми, а зведення перемикає на
 * рахунок лише з hmarochos.kiev.ua. Якщо вже є записи з hmarochos.kiev.ua — нічого не чіпає.
 */
function clearTestData() {
  var ss = SpreadsheetApp.openById(STATS_SS_ID);
  var sh = responsesSheet_(ss);
  var last = sh.getLastRow();
  var hostCol = FIELDS.indexOf('host') + 2;
  var hosts = last > 1 ? sh.getRange(2, hostCol, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var real = hosts.filter(function (h) { return /hmarochos\.kiev\.ua$/.test(h); });
  Logger.log('Записів: ' + hosts.length + ', з hmarochos.kiev.ua: ' + real.length);
  if (real.length) throw new Error('Є справжні записи з hmarochos.kiev.ua — автоматично не чищу.');
  if (last > 1) {
    try { sh.deleteRows(2, last - 1); }
    catch (e) { // аркуш-таблиця не дає видалити всі рядки — лишаємо один порожній
      if (last > 2) sh.deleteRows(3, last - 2);
      sh.getRange(2, 1, 1, sh.getLastColumn()).clearContent();
    }
  }
  FormApp.openByUrl(sh.getFormUrl()).deleteAllResponses();
  ss.getSheetByName('stats').getRange('B3').setValue('*hmarochos.kiev.ua');
  Logger.log('Видалено тестових записів: ' + hosts.length + '. Фільтр зведення: *hmarochos.kiev.ua');
}

/** Вивести в журнал блок FORM для app/stats.ts — для вже створеної форми (і перебудувати «stats»). */
function printForm() {
  var form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  var items = form.getItems();
  var resp = form.createResponse();
  items.forEach(function (it) { resp.withItemResponse(it.asTextItem().createResponse('x')); });
  var ids = (resp.toPrefilledUrl().match(/entry\.\d+/g) || []);
  var entries = {};
  items.forEach(function (it, i) { entries[it.getTitle()] = ids[i] || ''; });
  var action = form.getPublishedUrl().replace(/\/viewform.*$/, '/formResponse');
  setupStats_(SpreadsheetApp.openById(STATS_SS_ID));
  Logger.log('FORMJSON ' + JSON.stringify({ action: action, entries: entries }));
}
