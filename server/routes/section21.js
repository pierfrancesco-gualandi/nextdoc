/**
 * Endpoint per servire la lista componenti della sezione 2.1
 */
const express = require('express');
const router = express.Router();
const { getSection21ComponentsHtml } = require('../api/section21components');

// Endpoint per la lista componenti della sezione 2.1
router.get('/api/section21/components', (req, res) => {
  const htmlContent = getSection21ComponentsHtml();
  res.send(htmlContent);
});

module.exports = router;