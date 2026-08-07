const MINUTE_MS = 60 * 1000;

/**
 * Convert a Date to a "YYYY-MM-DD" key in UTC.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function dateToKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse "HH:mm" into minutes since midnight.
 * @param {string} hhmm
 * @returns {number}
 */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Build a UTC Date for `dateKey` (YYYY-MM-DD) at `hhmm` ("HH:mm").
 * @param {string} dateKey
 * @param {string} hhmm
 * @returns {Date}
 */
function combineWithDate(dateKey, hhmm) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, m, 0, 0));
}

/**
 * Find the schedule slot whose weekday matches `dateKey`.
 * @param {Array<{dayOfWeek:number,startTime:string,endTime:string}>} schedule
 * @param {string} dateKey - "YYYY-MM-DD".
 * @returns {{dayOfWeek:number,startTime:string,endTime:string}|null}
 */
function findSlotForDate(schedule, dateKey) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  const dayOfWeek = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return schedule.find((slot) => slot.dayOfWeek === dayOfWeek) || null;
}

/**
 * True when `now` falls inside [start, end] inclusive.
 * @param {Date} now
 * @param {Date} start
 * @param {Date} end
 * @returns {boolean}
 */
function isWithinSession(now, start, end) {
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * Compute attendance status: late when `now` is more than
 * `lateThresholdMinutes` after session start.
 * @param {Date} now
 * @param {Date} sessionStart
 * @param {number} lateThresholdMinutes
 * @returns {'on-time'|'late'}
 */
function computeAttendanceStatus(now, sessionStart, lateThresholdMinutes = 5) {
  const lateBoundary = new Date(sessionStart).getTime() + (lateThresholdMinutes || 5) * MINUTE_MS;
  return now.getTime() > lateBoundary ? 'late' : 'on-time';
}

module.exports = {
  MINUTE_MS,
  dateToKey,
  toMinutes,
  combineWithDate,
  findSlotForDate,
  isWithinSession,
  computeAttendanceStatus,
};
