const express = require("express");
const router = express.Router();

const { tokenVerify } = require('../utilities/tokenVerify')

const {
      pickingSTO,
      submitforShelvingAndUpdateTempData
} = require("../controllers/ServiceController");

router.post("/sto-picking", tokenVerify, pickingSTO);
router.post("/upsert-shelving", tokenVerify, submitforShelvingAndUpdateTempData);

module.exports = router