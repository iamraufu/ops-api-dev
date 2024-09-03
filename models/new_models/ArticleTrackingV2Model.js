const mongoose = require('mongoose');

const articleTrackingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    default: ""
  },
  sto: {
    type: String,
    required: true
  },
  stoDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'STOV2Tracking', // Reference to STOTracking
    default: null
  },
  dn: {
    type: String,
    default: null
  },
  dnItem: {
    type: String,
    default: null
  },
  grn: {
    type: String,
    default: null
  },
  supplyingSite: {
    type: String,
    required: true
  },
  receivingSite: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "in document",
  },
  expiryDate: {
    type: Date,
    default: null
  },
  quantity: {
    type: Number,
    required: true
  },
  picking: {
    inboundPickedQuantity: {
      type: Number,
      default: 0
    },
    picker: {
      type: String,
      default: null
    },
    pickerId: {
      type: String,
      default: ''
    },
    startedAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    },
  },
  packing: {
    inboundPackedQuantity: {
      type: Number,
      default: 0
    },
    packer: {
      type: String,
      default: ''
    },
    packerId: {
      type: String,
      default: ''
    },
    startedAt: {
      type: Date,
      default: null
    },
    endedAt: {
      type: Date,
      default: null
    },
    childPackedQuantity: {
      type: Number,
      default: 0
    }
  },
 
}, { timestamps: true });

module.exports = mongoose.model('ArticleV2Tracking', articleTrackingSchema);
