const express = require('express')
const router = express.Router()

const { tokenVerify } = require('../utilities/tokenVerify')

const {
      postPendingForTPN,
      getPendingForTPN,
      updatePendingForTPN,
      getPendingForTPNByPost
} = require('../controllers/PendingForTPNController')

router.post('/get', tokenVerify, getPendingForTPNByPost)
router.post('/', tokenVerify, postPendingForTPN)
router.get('/', tokenVerify, getPendingForTPN)
router.patch('/:id', tokenVerify, updatePendingForTPN)

module.exports = router