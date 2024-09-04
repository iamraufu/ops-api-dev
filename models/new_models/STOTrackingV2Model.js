const mongoose = require("mongoose");

const stoTrackingSchema = new mongoose.Schema(
  {
    sto: {
      type: String,
      required: true,
    },
    dn: {
      type: String,
      default: "",
    },
    grn: {
      type: String,
      default: "",
    },
    createdOnSAP: {
      type: String,
      required: true,
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    supplyingPlant: {
      type: String,
      required: true,
    },
    receivingPlant: {
      type: String,
      required: true,
    },
    sku: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "pending for dn",
    },
    picking: {
      pickedSku: {
        type: Number,
        default: 0,
      },
      picker: {
        type: String,
        default: null,
      },
      pickerId: {
        type: String,
        default: null,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      endedAt: {
        type: Date,
        default: null,
      },
    },
    packing: {
      packedSku: {
        type: Number,
        default: 0,
      },
      packer: {
        type: String,
        default: null,
      },
      packerId: {
        type: String,
        default: null,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      endedAt: {
        type: Date,
        default: null,
      },
    },
    isReupdated: {
      type: Boolean,
      default: false,
    },
    reupdatedDate: {
      type: Date,
      default: null,
    },
    articleTrackings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ArticleV2Tracking",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("STOV2Tracking", stoTrackingSchema);
