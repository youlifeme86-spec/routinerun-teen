/**
 * 루틴런 중고등 · 서버 (Google Apps Script + 구글 시트)
 *
 * 이 파일은 구글 시트의 [확장 프로그램 > Apps Script]에 붙여 넣어 씁니다.
 * 시트 메뉴 [루틴런 > 1. 처음 설정]을 한 번 실행하면 필요한 탭과 관리자 계정이 만들어져요.
 * 그다음 [배포 > 새 배포 > 웹 앱]으로 배포하고, 나온 주소를 깃허브의 config.js 에 넣으면 끝.
 *
 * 탭 구성
 *   계정  : 학생·관리자 계정 (비밀번호는 솔트 + SHA-256 반복 해시로만 저장, 원문 없음)
 *   기록  : 학생마다 한 줄. 앱 전체 상태(JSON)를 여러 칸에 나눠 저장
 *   승인  : 암기 인증 승인 내역
 *   오류  : 학생 폰에서 난 오류가 실시간으로 쌓이는 곳
 */

var SERVER_VERSION = '2026.11.26';
var TZ = 'Asia/Seoul';
var CHUNK = 45000;            // 시트 한 칸 최대 50,000자라 45,000자씩 나눠 저장
var MAX_CHUNKS = 40;          // 학생 한 명 최대 약 1.8MB
var HASH_ROUNDS = 500;
var TOKEN_DAYS = 60;
var ERROR_ROWS_MAX = 5000;

var SHEETS = {
  acc:  { name: '계정', head: ['아이디', '이름', '역할', 'salt', 'hash', '학부모코드', '사용', '만든날', '마지막접속', '토큰버전', '메모'] },
  st:   { name: '기록', head: ['아이디', 'rev', '저장시각', '요약', '비공개', '상태1'] },
  ap:   { name: '승인', head: ['아이디', '날짜', '승인시각', '승인자'] },
  err:  { name: '오류', head: ['시각', '아이디', '버전', '화면', '탭', '내용', '스택', '기기'] }
};
var A = { id: 0, name: 1, role: 2, salt: 3, hash: 4, code: 5, active: 6, created: 7, last: 8, tv: 9, memo: 10 };

/* ===================== 시트 메뉴 ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('루틴런')
    .addItem('1. 처음 설정 (탭 + 관리자 계정)', 'setupMenu')
    .addItem('관리자 비밀번호 다시 정하기', 'resetAdminMenu')
    .addItem('오류 탭 비우기', 'clearErrorsMenu')
    .addToUi();
}

function setupMenu() {
  var ui = SpreadsheetApp.getUi();
  ensureSheets_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  var r1 = ui.prompt('관리자 아이디', '선생님이 쓸 로그인 아이디 (영문·숫자, 예: teacher)', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var id = normId_(r1.getResponseText());
  if (!id) { ui.alert('아이디는 영문 소문자·숫자·_ 3~20자로 해 주세요.'); return; }
  var r2 = ui.prompt('관리자 비밀번호', '8자 이상. 이 창을 닫으면 어디에도 원문이 남지 않아요.', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var pw = r2.getResponseText();
  if (pw.length < 8) { ui.alert('비밀번호는 8자 이상으로 해 주세요.'); return; }
  var found = findAccount_(id);
  if (found) { ui.alert('이미 있는 아이디예요. [관리자 비밀번호 다시 정하기]를 쓰세요.'); return; }
  addAccount_(id, '선생님', 'admin', pw, '');
  ui.alert('준비 완료!\n\n이제 [배포 > 새 배포 > 웹 앱]을 눌러\n- 다음 사용자로 실행: 나\n- 액세스 권한: 모든 사용자\n로 배포하고, 나온 웹 앱 주소를 config.js 에 넣어 주세요.');
}

function resetAdminMenu() {
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('관리자 아이디', '비밀번호를 바꿀 관리자 아이디', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var f = findAccount_(normId_(r1.getResponseText()));
  if (!f || f.row[A.role] !== 'admin') { ui.alert('관리자 계정을 찾지 못했어요.'); return; }
  var r2 = ui.prompt('새 비밀번호', '8자 이상', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  if (r2.getResponseText().length < 8) { ui.alert('8자 이상으로 해 주세요.'); return; }
  setPassword_(f, r2.getResponseText());
  ui.alert('바꿨어요. 다른 기기의 로그인은 모두 풀립니다.');
}

function clearErrorsMenu() {
  var sh = sheet_('err');
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
}

/* ===================== 웹 앱 입구 ===================== */
function doGet() {
  return json_({ ok: true, app: 'routinerun-teen', version: SERVER_VERSION, time: new Date().toISOString() });
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = ROUTES[body.action];
    if (!fn) return json_({ ok: false, error: '알 수 없는 요청이에요', code: 'bad_action' });
    var out = fn(body) || {};
    out.ok = true;
    return json_(out);
  } catch (err) {
    var code = err && err.rrCode ? err.rrCode : 'server';
    if (code === 'server') {
      try { appendError_({ id: 'server', ver: SERVER_VERSION, page: 'Code.gs', tab: body.action || '', msg: String(err && err.message || err), stack: String(err && err.stack || '') }); } catch (x) {}
    }
    return json_({ ok: false, error: err && err.rrCode ? err.message : '서버 오류가 났어요. 잠시 후 다시 해 주세요', code: code });
  }
}

var ROUTES = {
  ping: function () { return { version: SERVER_VERSION }; },
  login: login_,
  load: load_,
  save: save_,
  savePrivate: savePrivate_,
  roster: roster_,
  parent: parent_,
  changePassword: changePassword_,
  logError: logError_,
  adminOverview: adminOverview_,
  adminCreate: adminCreate_,
  adminReset: adminReset_,
  adminSetActive: adminSetActive_,
  adminRename: adminRename_,
  adminApprove: adminApprove_,
  adminStudent: adminStudent_,
  adminClearErrors: function (b) { auth_(b, 'admin'); clearErrorsMenu(); return {}; }
};

/* ===================== 학생 ===================== */
function login_(b) {
  var id = normId_(b.id);
  var cache = CacheService.getScriptCache();
  var failKey = 'fail:' + id;
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= 8) fail_('비밀번호를 여러 번 틀렸어요. 10분 뒤에 다시 해 주세요', 'locked');
  var f = id && findAccount_(id);
  if (!f || !checkPassword_(f.row, String(b.pw || ''))) {
    cache.put(failKey, String(fails + 1), 600);
    fail_('아이디나 비밀번호가 맞지 않아요', 'login');
  }
  if (!isActive_(f.row)) fail_('사용이 멈춘 계정이에요. 선생님께 물어봐 주세요', 'inactive');
  cache.remove(failKey);
  sheet_('acc').getRange(f.rowNo, A.last + 1).setValue(new Date());
  return { token: makeToken_(f.row), id: id, name: f.row[A.name], role: f.row[A.role], parentCode: f.row[A.code] };
}

function load_(b) {
  var u = auth_(b);
  var rec = readState_(u.id);
  return {
    id: u.id, name: u.row[A.name], parentCode: u.row[A.code],
    state: rec ? rec.state : null, rev: rec ? rec.rev : 0,
    priv: rec ? rec.priv : null, approved: approvedDates_(u.id)
  };
}

function save_(b) {
  var u = auth_(b, 'student');
  if (typeof b.state !== 'string' || b.state.length > CHUNK * MAX_CHUNKS) fail_('저장할 기록이 너무 커요. 선생님께 알려 주세요', 'too_big');
  var st = JSON.parse(b.state);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var prev = readState_(u.id, true);
    var approved = approvedDates_(u.id);
    applyApprovals_(st, approved);
    var rev = Math.max(Number(b.rev) || 0, prev ? prev.rev + 1 : 1);
    st.rev = rev;
    writeState_(u.id, st, rev, prev ? prev.rowNo : 0, prev ? prev.privRaw : '');
    return { rev: rev, approved: approved, savedAt: new Date().toISOString() };
  } finally { lock.releaseLock(); }
}

function savePrivate_(b) {
  var u = auth_(b, 'student');
  var raw = JSON.stringify(b.priv || {});
  if (raw.length > CHUNK) fail_('남긴 말이 너무 많아요', 'too_big');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var prev = readState_(u.id, true);
    if (prev) sheet_('st').getRange(prev.rowNo, 5).setValue(raw);
    else writeState_(u.id, { logs: {} }, 0, 0, raw);
  } finally { lock.releaseLock(); }
  return {};
}

function changePassword_(b) {
  var u = auth_(b);
  if (!checkPassword_(u.row, String(b.oldPw || ''))) fail_('지금 비밀번호가 맞지 않아요', 'login');
  var pw = String(b.newPw || '');
  if (pw.length < 6) fail_('새 비밀번호는 6자 이상으로 해 주세요', 'weak');
  var row = setPassword_(u, pw);
  return { token: makeToken_(row) };
}

/** 랭킹용: 모든 학생의 이름·색·왕국·하루 점수만 (감정·기록 내용은 안 보냄) */
function roster_(b) {
  var u = auth_(b);
  var cache = CacheService.getScriptCache();
  var mine = u.role === 'student' ? approvedDates_(u.id) : [];
  var hit = cache.get('roster');
  if (hit) return { students: JSON.parse(hit), approved: mine, cached: true };
  var since = dayKey_(-62);
  var out = {};
  eachState_(function (id, sum) {
    if (!sum || !sum.char) return;
    var daily = {};
    Object.keys(sum.daily || {}).forEach(function (k) { if (k >= since) daily[k] = { r: sum.daily[k].r || 0 }; });
    out[id] = { char: { name: sum.char.name, color: sum.char.color, kingdom: sum.char.kingdom }, daily: daily };
  });
  try { cache.put('roster', JSON.stringify(out), 30); } catch (x) {}
  return { students: out, approved: mine };
}

/** 학부모 링크: 학부모코드로 그 학생 기록만 읽기 전용 */
function parent_(b) {
  var code = String(b.code || '').toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(code)) fail_('링크가 올바르지 않아요', 'bad_code');
  var accs = rows_('acc');
  for (var i = 0; i < accs.length; i++) {
    if (String(accs[i][A.code]) === code && accs[i][A.role] === 'student' && isActive_(accs[i])) {
      var rec = readState_(accs[i][A.id]);
      return { state: rec ? rec.state : null, name: accs[i][A.name] };
    }
  }
  fail_('이 링크에 연결된 학생을 찾지 못했어요', 'no_student');
}

/** 학생 폰에서 난 오류 기록 (로그인 안 해도 받음) */
function logError_(b) {
  var id = '';
  try { if (b.token) id = verifyToken_(b.token).id; } catch (x) { id = '(토큰 오류)'; }
  var cache = CacheService.getScriptCache();
  var key = 'err:' + (id || 'anon');
  var n = Number(cache.get(key) || 0);
  if (n >= 30) return { dropped: true };
  cache.put(key, String(n + 1), 600);
  appendError_({ id: id || '(로그인 전)', ver: b.ver, page: b.page, tab: b.tab, msg: b.msg, stack: b.stack, ua: b.ua });
  return {};
}

/* ===================== 관리자 ===================== */
function adminOverview_(b) {
  auth_(b, 'admin');
  var today = dayKey_(0), since = dayKey_(-13);
  var states = {};
  eachState_(function (id, sum, rev, savedAt, rowNo) { states[id] = { sum: sum, rev: rev, savedAt: savedAt }; });
  var approved = {};
  rows_('ap').forEach(function (r) { approved[r[0] + '|' + r[1]] = true; });
  var students = [], pending = [];
  rows_('acc').forEach(function (r) {
    if (!r[A.id]) return;
    var s = states[r[A.id]] || {};
    var sum = s.sum || {};
    var daily = {};
    Object.keys(sum.daily || {}).forEach(function (k) { if (k >= since) daily[k] = sum.daily[k]; });
    (sum.hiddenReq || []).forEach(function (d) {
      if (!approved[r[A.id] + '|' + d] && d >= dayKey_(-14)) pending.push({ id: r[A.id], name: r[A.name], char: sum.char ? sum.char.name : '', date: d });
    });
    students.push({
      id: r[A.id], name: r[A.name], role: r[A.role], active: isActive_(r), parentCode: r[A.code],
      created: iso_(r[A.created]), lastLogin: iso_(r[A.last]), savedAt: s.savedAt || '', memo: r[A.memo] || '',
      char: sum.char || null, daily: daily, bless: sum.bless || null, monthPts: sum.monthPts || 0
    });
  });
  var errSh = sheet_('err');
  var last = errSh.getLastRow(), errors = [];
  if (last > 1) {
    var from = Math.max(2, last - 99);
    errors = errSh.getRange(from, 1, last - from + 1, 8).getValues().reverse().map(function (r) {
      return { time: iso_(r[0]), id: r[1], ver: r[2], page: r[3], tab: r[4], msg: r[5], stack: r[6], ua: r[7] };
    });
  }
  return { today: today, students: students, pending: pending, errors: errors, errorCount: Math.max(0, last - 1), serverVersion: SERVER_VERSION };
}

function adminCreate_(b) {
  auth_(b, 'admin');
  var id = normId_(b.id);
  if (!id) fail_('아이디는 영문 소문자·숫자·_ 3~20자로 해 주세요', 'bad_id');
  var name = String(b.name || '').trim().slice(0, 20);
  if (!name) fail_('학생 이름(관리용)을 넣어 주세요', 'bad_name');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (findAccount_(id)) fail_('이미 있는 아이디예요', 'dup');
    var pw = String(b.pw || '') || randomPw_();
    if (pw.length < 6) fail_('비밀번호는 6자 이상으로 해 주세요', 'weak');
    var code = addAccount_(id, name, 'student', pw, String(b.memo || '').slice(0, 100));
    return { id: id, name: name, pw: pw, parentCode: code };
  } finally { lock.releaseLock(); }
}

function adminReset_(b) {
  auth_(b, 'admin');
  var f = findAccount_(normId_(b.id));
  if (!f) fail_('계정을 찾지 못했어요', 'no_account');
  var pw = String(b.pw || '') || randomPw_();
  if (pw.length < 6) fail_('비밀번호는 6자 이상으로 해 주세요', 'weak');
  setPassword_(f, pw);
  return { id: f.row[A.id], pw: pw };
}

function adminSetActive_(b) {
  var me = auth_(b, 'admin');
  var f = findAccount_(normId_(b.id));
  if (!f) fail_('계정을 찾지 못했어요', 'no_account');
  if (f.row[A.id] === me.id) fail_('내 관리자 계정은 멈출 수 없어요', 'self');
  sheet_('acc').getRange(f.rowNo, A.active + 1).setValue(b.active ? 'Y' : 'N');
  sheet_('acc').getRange(f.rowNo, A.tv + 1).setValue(Number(f.row[A.tv] || 0) + 1);
  CacheService.getScriptCache().remove('roster');
  return {};
}

function adminRename_(b) {
  auth_(b, 'admin');
  var f = findAccount_(normId_(b.id));
  if (!f) fail_('계정을 찾지 못했어요', 'no_account');
  var sh = sheet_('acc');
  if (b.name != null) sh.getRange(f.rowNo, A.name + 1).setValue(String(b.name).trim().slice(0, 20));
  if (b.memo != null) sh.getRange(f.rowNo, A.memo + 1).setValue(String(b.memo).slice(0, 100));
  if (b.newCode) sh.getRange(f.rowNo, A.code + 1).setValue(randomCode_());
  return {};
}

function adminApprove_(b) {
  var me = auth_(b, 'admin');
  var id = normId_(b.id), d = String(b.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) fail_('날짜가 올바르지 않아요', 'bad_date');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (approvedDates_(id).indexOf(d) < 0) sheet_('ap').appendRow([id, d, new Date(), me.id]);
    // 학생 기록에도 바로 반영 (학생이 다음에 저장할 때도 서버가 다시 합쳐 줌)
    var rec = readState_(id, true);
    if (rec && rec.state) {
      var st = JSON.parse(rec.state);
      applyApprovals_(st, [d]);
      st.rev = rec.rev + 1;
      writeState_(id, st, st.rev, rec.rowNo, rec.privRaw);
    }
  } finally { lock.releaseLock(); }
  return {};
}

function adminStudent_(b) {
  auth_(b, 'admin');
  var rec = readState_(normId_(b.id));
  return { state: rec ? rec.state : null, rev: rec ? rec.rev : 0 };
}

/* ===================== 기록 저장 ===================== */
function readState_(id, withRow) {
  var sh = sheet_('st');
  var last = sh.getLastRow();
  if (last < 2) return null;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      var rowNo = i + 2;
      var width = Math.max(6, sh.getLastColumn());
      var r = sh.getRange(rowNo, 1, 1, width).getValues()[0];
      var state = r.slice(5).map(function (x) { return String(x).replace(/^~/, ''); }).join('');
      return { rowNo: rowNo, rev: Number(r[1]) || 0, state: state || null, privRaw: r[4] || '', priv: r[4] ? JSON.parse(r[4]) : null };
    }
  }
  return null;
}

function writeState_(id, st, rev, rowNo, privRaw) {
  var sh = sheet_('st');
  var raw = JSON.stringify(st);
  var parts = [];
  // 칸마다 앞에 ~ 를 붙여서 = + - 로 시작하는 조각이 수식으로 바뀌지 않게 함
  for (var i = 0; i < raw.length; i += CHUNK) parts.push('~' + raw.slice(i, i + CHUNK));
  if (!parts.length) parts.push('~');
  if (parts.length > MAX_CHUNKS) fail_('저장할 기록이 너무 커요', 'too_big');
  if (!rowNo) rowNo = sh.getLastRow() + 1;
  var oldWidth = sh.getLastColumn();
  var row = [id, rev, new Date(), JSON.stringify(summary_(st)), privRaw || ''].concat(parts);
  var width = Math.max(row.length, oldWidth);
  while (row.length < width) row.push('');
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  sh.getRange(rowNo, 1, 1, width).setValues([row]);
}

function eachState_(fn) {
  var sh = sheet_('st');
  var last = sh.getLastRow();
  if (last < 2) return;
  sh.getRange(2, 1, last - 1, 4).getValues().forEach(function (r, i) {
    var sum = null;
    try { sum = r[3] ? JSON.parse(r[3]) : null; } catch (x) {}
    fn(String(r[0]), sum, Number(r[1]) || 0, iso_(r[2]), i + 2);
  });
}

/** 랭킹·관리자 화면에서 쓰는 작은 요약 (요약 칸에 저장) */
function summary_(st) {
  var c = st.char || null;
  var daily = st.daily || {};
  var mk = dayKey_(0).slice(0, 7), pts = 0;
  Object.keys(daily).forEach(function (k) { if (k.slice(0, 7) === mk) pts += Number(daily[k].raw || 0); });
  var hiddenReq = [];
  Object.keys(st.logs || {}).forEach(function (k) { var L = st.logs[k]; if (L && L.hiddenReq && !L.hidden) hiddenReq.push(k); });
  return {
    char: c ? { name: c.name, color: c.color, kingdom: c.kingdom, job: c.job } : null,
    daily: daily, bless: st.bless || null, monthPts: pts, hiddenReq: hiddenReq
  };
}

function applyApprovals_(st, dates) {
  st.logs = st.logs || {};
  dates.forEach(function (d) { if (st.logs[d]) st.logs[d].hidden = 1; });
}

function approvedDates_(id) {
  return rows_('ap').filter(function (r) { return String(r[0]) === id; }).map(function (r) { return String(r[1]); });
}

/* ===================== 계정·비밀번호·토큰 ===================== */
function addAccount_(id, name, role, pw, memo) {
  var salt = Utilities.getUuid();
  var code = role === 'student' ? randomCode_() : '';
  sheet_('acc').appendRow([id, name, role, salt, hash_(pw, salt), code, 'Y', new Date(), '', 0, memo || '']);
  return code;
}

function setPassword_(f, pw) {
  var salt = Utilities.getUuid();
  var tv = Number(f.row[A.tv] || 0) + 1;
  var sh = sheet_('acc');
  sh.getRange(f.rowNo, A.salt + 1, 1, 2).setValues([[salt, hash_(pw, salt)]]);
  sh.getRange(f.rowNo, A.tv + 1).setValue(tv);
  var row = f.row.slice();
  row[A.salt] = salt; row[A.tv] = tv;
  return row;
}

function hash_(pw, salt) {
  var h = salt + ':' + pw;
  for (var i = 0; i < HASH_ROUNDS; i++) {
    h = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

function checkPassword_(row, pw) {
  if (!row[A.salt] || !row[A.hash]) return false;
  var a = hash_(pw, String(row[A.salt])), b = String(row[A.hash]);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function makeToken_(row) {
  var exp = Date.now() + TOKEN_DAYS * 864e5;
  var payload = [row[A.id], row[A.role], exp, Number(row[A.tv] || 0)].join('|');
  var p64 = Utilities.base64EncodeWebSafe(payload, Utilities.Charset.UTF_8);
  return p64 + '.' + sign_(p64);
}

function verifyToken_(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2 || sign_(parts[0]) !== parts[1]) fail_('다시 로그인해 주세요', 'auth');
  var f = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString().split('|');
  if (Number(f[2]) < Date.now()) fail_('로그인이 만료됐어요. 다시 로그인해 주세요', 'auth');
  return { id: f[0], role: f[1], tv: Number(f[3]) };
}

function auth_(b, role) {
  var t = verifyToken_(b.token);
  var acc = findAccount_(t.id);
  if (!acc || !isActive_(acc.row) || Number(acc.row[A.tv] || 0) !== t.tv) fail_('다시 로그인해 주세요', 'auth');
  if (role && acc.row[A.role] !== role) fail_('권한이 없어요', 'forbidden');
  return { id: t.id, role: acc.row[A.role], row: acc.row, rowNo: acc.rowNo };
}

function sign_(s) {
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret) fail_('서버 처음 설정을 아직 안 했어요', 'setup');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, secret)).replace(/=+$/, '');
}

function findAccount_(id) {
  if (!id) return null;
  var rs = rows_('acc');
  for (var i = 0; i < rs.length; i++) if (String(rs[i][A.id]) === id) return { row: rs[i], rowNo: i + 2 };
  return null;
}

function isActive_(row) { return String(row[A.active]) !== 'N'; }

/* ===================== 도우미 ===================== */
function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (k) {
    var def = SHEETS[k];
    var sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, def.head.length).setValues([def.head]).setFontWeight('bold');
      sh.setFrozenRows(1);
      // 아이디·날짜·코드가 숫자나 날짜로 바뀌지 않게 글자 형식으로 고정
      var textCols = { acc: 'A:G', st: 'A:A', ap: 'A:B', err: 'B:B' }[k];
      if (textCols) sh.getRange(textCols).setNumberFormat('@');
    }
  });
  var first = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function sheet_(k) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEETS[k].name);
  if (!sh) { ensureSheets_(); sh = ss.getSheetByName(SHEETS[k].name); }
  return sh;
}

function rows_(k) {
  var sh = sheet_(k);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, SHEETS[k].head.length).getValues();
}

function appendError_(e) {
  var sh = sheet_('err');
  sh.appendRow([new Date(), cut_(e.id, 40), cut_(e.ver, 30), cut_(e.page, 200), cut_(e.tab, 30), cut_(e.msg, 1000), cut_(e.stack, 3000), cut_(e.ua, 300)]);
  if (sh.getLastRow() > ERROR_ROWS_MAX + 1) sh.deleteRows(2, 1000);
}

function dayKey_(offsetDays) {
  // 앱과 같은 규칙: 새벽 2시까지는 전날
  var t = new Date(Date.now() - 2 * 3600e3 + (offsetDays || 0) * 864e5);
  return Utilities.formatDate(t, TZ, 'yyyy-MM-dd');
}

function normId_(s) {
  s = String(s || '').trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(s) ? s : '';
}

function randomPw_() {
  var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 8; i++) s += a.charAt(Math.floor(Math.random() * a.length));
  return s;
}

function randomCode_() {
  var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 10; i++) s += a.charAt(Math.floor(Math.random() * a.length));
  return s;
}

function hex_(bytes) {
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function iso_(d) { return d instanceof Date ? d.toISOString() : String(d || ''); }
function cut_(s, n) { return String(s == null ? '' : s).slice(0, n); }
function fail_(msg, code) { var e = new Error(msg); e.rrCode = code; throw e; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
