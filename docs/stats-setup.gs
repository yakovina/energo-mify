/**
 * «Міфи про українську енергетику» — статистика проходжень.
 *
 * Як у попередніх тестах Хмарочоса: тест шле дані прямо в Google Form
 * (formResponse, без квот Apps Script), форма пише їх у Google-таблицю,
 * а аркуш «Статистика» рахує зведення формулами.
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
  var resp = responsesSheet_(ss);
  // аркуш сирих відповідей — зрозуміла назва, закріплений заголовок
  if (resp.getName() !== 'Відповіді') resp.setName('Відповіді');
  resp.setFrozenRows(1);
  var src = "'" + resp.getName() + "'!";
  // колонки аркуша відповідей: A позначка часу, далі FIELDS по порядку (B, C, D…).
  // Цілі колонки (C:C), а не C2:C: форма вставляє нові рядки, і Таблиці зсували б C2 → C5…
  // Заголовок у першому рядку жодній умові не відповідає, тож рахунку не заважає.
  var col = {};
  FIELDS.forEach(function (f, i) { col[f] = String.fromCharCode(66 + i); });
  var R = function (f) { return src + col[f] + ':' + col[f]; };

  var sh = ss.getSheetByName('stats') || ss.getSheetByName('Статистика') || ss.insertSheet('Статистика', 0);
  if (sh.getName() !== 'Статистика') sh.setName('Статистика');
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.clear(); sh.clearNotes(); sh.clearConditionalFormatRules();
  sh.getRange('A:F').clearDataValidations();

  var rows = [], heads = [], pcts = [], fmts = [];
  var head = function (a, b, c, d, e, f) { heads.push(rows.length + 1); rows.push([a, b || '', c || '', d || '', e || '', f || '']); return rows.length; };
  var row = function (a, b, c, d, e, f) {
    rows.push([a, b, c, d, e, f].map(function (x) { return x === undefined ? '' : x; })); return rows.length;
  };

  // ---------- шапка й налаштування ----------
  row('Міфи про українську енергетику — статистика');
  var rLast = row('Оновлюється сама з кожним проходженням. Остання відповідь:', '=IFERROR(MAX(' + src + 'A:A),"")');
  row('');
  head('Налаштування', 'Значення');
  var rSite = row('Рахувати проходження з сайту (* — з усіх)', '*');
  var rTest = row('Рахувати перевірочні проходження (адреса з ?test)', 'ні');
  row('');
  var SITE = '$B$' + rSite, TEST = '$B$' + rTest;
  // фільтр: сайт + (перевірочні рахуємо лише якщо так обрано)
  var H = R('host') + ',' + SITE + ',' + R('host') + ',IF(' + TEST + '="так","*","<>test")';
  var cnt = function (f, v) { return 'COUNTIFS(' + R(f) + ',"' + v + '",' + H + ')'; };
  var cnt2 = function (f, v, f2, v2) { return 'COUNTIFS(' + R(f) + ',"' + v + '",' + R(f2) + ',"' + v2 + '",' + H + ')'; };
  var pct = function (a, b) { return '=IFERROR(' + a + '/' + b + ',"")'; };

  // ---------- головне ----------
  head('Головне', 'Людей', 'Частка');
  var rStart = row('Почали тест', '=' + cnt('event', 'start'));
  var rFin = row('Дійшли до результату', '=' + cnt('event', 'finish'), pct('B' + (rStart + 1), 'B' + rStart));
  var rDrop = row('Кинули на півдорозі', '=MAX(0,B' + rStart + '-B' + rFin + ')', pct('B' + (rFin + 1), 'B' + rStart));
  pcts.push('C' + rFin + ':C' + rDrop);
  var rAvg = row('Середній бал (з 8)', '=IFERROR(ROUND(AVERAGEIFS(' + R('score') + ',' + R('event') + ',"finish",' + H + '),1),"—")');
  row('Перевірочних проходжень (?test) усього', '=COUNTIFS(' + R('event') + ',"start",' + R('host') + ',"test")');
  row('');

  // ---------- рівні ----------
  var rLvHead = head('Рівні', 'Людей', 'Від тих, хто дійшов', 'Бали');
  var rLv0 = rows.length + 1;
  LEVELS.forEach(function (l) {
    var r = rows.length + 1;
    row(l[0], '=' + cnt2('event', 'finish', 'level', l[0]), pct('B' + r, 'B' + rFin), l[1]);
  });
  pcts.push('C' + rLv0 + ':C' + (rLv0 + LEVELS.length - 1));
  row('');

  // ---------- бали ----------
  var rScHead = head('Бали', 'Людей', 'Від тих, хто дійшов');
  var rSc0 = rows.length + 1;
  for (var s = 0; s <= 8; s++) {
    var r = rows.length + 1;
    row(s + ' з 8', '=COUNTIFS(' + R('event') + ',"finish",' + R('score') + ',' + s + ',' + H + ')', pct('B' + r, 'B' + rFin));
  }
  pcts.push('C' + rSc0 + ':C' + (rSc0 + 8));
  row('');

  // ---------- твердження ----------
  var rQHead = head('Твердження', 'Відповіли правильно', 'Шкала', 'Обрали «Правда»', 'Обрали «Неправда»', 'Відповідей');
  var rQ0 = rows.length + 1;
  QUESTIONS.forEach(function (q, i) {
    var f = 'q' + (i + 1), r = rows.length + 1;
    var base = 'COUNTIFS(' + R('event') + ',"finish",' + R(f) + ',"<>",' + H + ')';
    var share = function (v) { return '=IFERROR(COUNTIFS(' + R('event') + ',"finish",' + R(f) + ',"' + v + '",' + H + ')/' + base + ',"")'; };
    row((i + 1) + '. ' + q[0] + ' — це ' + (q[1] === 'П' ? 'правда' : 'міф'), share(q[1]),
      '=IF(B' + r + '="","",SPARKLINE(B' + r + ',{"charttype","bar";"max",1;"color1","#8aa23a"}))',
      share('П'), share('Н'), '=' + base);
  });
  pcts.push('B' + rQ0 + ':B' + (rQ0 + QUESTIONS.length - 1));
  pcts.push('D' + rQ0 + ':E' + (rQ0 + QUESTIONS.length - 1));
  row('');
  row('Частки — від тих, хто дійшов до результату. Найоманливіший міф — твердження з найкоротшою зеленою шкалою.');
  row('Перевірочні проходження записуються з сайтом «test», тож щоб їх бачити, лиште сайт «*».');

  sh.getRange(1, 1, rows.length, 6).setValues(rows);

  // ---------- оформлення ----------
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 380); sh.setColumnWidth(2, 150); sh.setColumnWidth(3, 170); sh.setColumnWidths(4, 3, 140);
  sh.getRange(1, 1, rows.length, 6).setFontFamily('Arial').setFontSize(11).setVerticalAlignment('middle');
  sh.getRange('A1').setFontSize(18).setFontWeight('bold');
  sh.getRange(rLast, 1, 1, 2).setFontColor('#666666');
  sh.getRange('B' + rLast).setNumberFormat('dd.mm.yyyy hh:mm').setHorizontalAlignment('left');
  heads.forEach(function (r) {
    sh.getRange(r, 1, 1, 6).setFontWeight('bold').setBackground('#232b4a').setFontColor('#ffffff');
    sh.setRowHeight(r, 30);
  });
  // налаштування — жовті клітинки з випадними списками
  sh.getRange('B' + rSite + ':B' + rTest).setBackground('#fff2a8').setFontWeight('bold');
  sh.getRange('B' + rSite).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['*', '*github.io', '*hmarochos.kiev.ua'], true).setAllowInvalid(true).build());
  sh.getRange('B' + rTest).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['ні', 'так'], true).build());
  // головні цифри — великі
  sh.getRange('B' + rStart + ':B' + rAvg).setFontSize(16).setFontWeight('bold');
  sh.getRange('B' + rStart + ':C' + rAvg).setHorizontalAlignment('left');
  pcts.forEach(function (a) { sh.getRange(a).setNumberFormat('0%'); });
  sh.getRange('B' + rLv0 + ':D' + (rQ0 + QUESTIONS.length - 1)).setHorizontalAlignment('left');
  sh.getRange(rows.length - 1, 1, 2, 1).setFontColor('#666666').setFontStyle('italic');
  sh.setFrozenRows(0);

  // правильні відповіді — зеленим
  var rules = [];
  QUESTIONS.forEach(function (q, i) {
    var colIdx = { 'П': 4, 'Н': 5 }[q[1]];
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=TRUE')
      .setBackground('#e7efc4').setRanges([sh.getRange(rQ0 + i, colIdx)]).build());
  });
  sh.setConditionalFormatRules(rules);

  // графіки — праворуч від таблиць
  sh.insertChart(sh.newChart().asPieChart()
    .addRange(sh.getRange(rLv0, 1, LEVELS.length, 2))
    .setPosition(rLvHead, 8, 0, 0)
    .setOption('title', 'Рівні')
    .setOption('colors', ['#b5531f', '#f8e840', '#8aa23a'])
    .setOption('legend', { position: 'right' })
    .build());
  sh.insertChart(sh.newChart().asColumnChart()
    .addRange(sh.getRange(rSc0, 1, 9, 2))
    .setPosition(rScHead, 8, 0, 0)
    .setOption('title', 'Розподіл балів')
    .setOption('colors', ['#5f74c4'])
    .setOption('legend', { position: 'none' })
    .build());

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
  (ss.getSheetByName('Статистика') || ss.getSheetByName('stats')).getRange('B5').setValue('*hmarochos.kiev.ua');
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
