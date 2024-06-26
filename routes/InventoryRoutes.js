const express = require('express')
const router = express.Router()

const { tokenVerify } = require('../utilities/tokenVerify')

const {
      addStock,
      removeStock,
      addHoldStock,
      removeHoldStock,
      getStock,
      getAllInventory
} = require('../controllers/InventoryController')

router.post('/', tokenVerify, addStock)
router.post('/all', tokenVerify, getAllInventory)
router.get('/', tokenVerify, getStock)
router.post('/hold', tokenVerify, addHoldStock)
router.delete('/hold', tokenVerify, removeHoldStock)
router.delete('/', tokenVerify, removeStock)

module.exports = router