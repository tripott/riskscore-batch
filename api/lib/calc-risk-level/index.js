/*
  veryLow => 0-5
  low => 6-12
  moderate => 13-19
  high => 20-35
  veryHigh => 36-50
*/
const { cond, gte, lte, and, always } = require('ramda')
const isVeryLow = score => and(gte(score, 0), lte(score, 5))
const isLow = score => and(gte(score, 6), lte(score, 12))
const isModerate = score => and(gte(score, 13), lte(score, 19))
const isHigh = score => and(gte(score, 20), lte(score, 35))
const isVeryHigh = score => and(gte(score, 36), lte(score, 50))

module.exports = score =>
  cond([
    [isVeryLow, always('veryLow')],
    [isLow, always('low')],
    [isModerate, always('moderate')],
    [isHigh, always('high')],
    [isVeryHigh, always('veryHigh')]
  ])(score)
