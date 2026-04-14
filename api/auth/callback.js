module.exports = function handler(req, res) {
  res.status(410).json({ error: 'Use appLogin() SDK instead' })
}
