﻿const { normalize } = require('./_utils.js')

function dateTester (pattern) {
  /**
   * Checks that a string matches the pattern given. Doesn't check that string is a valid date,
   * just that it has this form.
   * @param {string} s The string to check
   * @returns {boolean} true if the given string matches the pattern for an ISO date (YYYY-MM-DD).
   */
  const tester = s => pattern.test(normalize(s))
  return tester
}

module.exports = {
  isoDate: dateTester(/^\d{4}-\d{2}-\d{2}$/),
  YYYYMD: dateTester(/^\d{4}-\d{1,2}-\d{1,2}$/),
  MDYYYY: dateTester(/^\d{1,2}-\d{1,2}-\d{4}$/),
  MDYY: dateTester(/^\d{1,2}-\d{1,2}-\d{2}$/)
}
