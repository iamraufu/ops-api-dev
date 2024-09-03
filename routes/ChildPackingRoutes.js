const express = require('express')
const router = express.Router()

const { tokenVerify } = require('../utilities/tokenVerify')

const {
      generateChildPackingList,
      getChildPackingList,
      updateChildPackingList,
      getChildPackingByPost,
      sendToPackingZone
} = require('../controllers/ChildPackingController')

router.post('/', tokenVerify, generateChildPackingList)
router.get('/', tokenVerify, getChildPackingList)
router.post('/get', tokenVerify, getChildPackingByPost)
router.patch('/:id', tokenVerify, updateChildPackingList)

router.post('/send-to-packing-zone', tokenVerify, sendToPackingZone)

module.exports = router