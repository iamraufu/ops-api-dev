const ArticleTrackingModel = require("../models/ArticleTrackingModel");
const ArticleTrackingModel2 = require("../models/new_models/ArticleTrackingV2Model");
const STOTrackingModel = require("../models/STOTrackingModel");
const STOTrackingModel2 = require("../models/new_models/STOTrackingV2Model");

const postArticleTracking = async (req, res) => {
  try {
    const {
      po,
      sto,
      code,
      quantity,
      inboundPickedQuantity,
      inboundPackedQuantity,
    } = req.body;

    const filter = {
      po: po,
      sto: sto,
      code,
      quantity,
    };

    let articleInTracking = await ArticleTrackingModel.findOne(filter);
    const isAlreadyArticleInTracking = Boolean(articleInTracking);

    if (isAlreadyArticleInTracking) {
      if (
        articleInTracking.inboundPickedQuantity + inboundPickedQuantity >
        quantity
      ) {
        return res.status(409).json({
          status: false,
          message: `Inbound Picked Quantity exceeds quantity`,
        });
      }

      if (
        articleInTracking.inboundPackedQuantity + inboundPackedQuantity >
        articleInTracking.inboundPickedQuantity
      ) {
        return res.status(409).json({
          status: false,
          message: `Inbound Packed Quantity exceeds Inbound Picked Quantity`,
        });
      }

      if (
        articleInTracking.inboundPackedQuantity + inboundPackedQuantity >
        quantity
      ) {
        return res.status(409).json({
          status: false,
          message: `Inbound Packed Quantity exceeds quantity`,
        });
      }

      articleInTracking.inboundPickedQuantity += inboundPickedQuantity
        ? inboundPickedQuantity
        : 0;
      articleInTracking.inboundPackedQuantity += inboundPackedQuantity
        ? inboundPackedQuantity
        : 0;

      await articleInTracking.save();

      return res.status(409).send({
        status: true,
        message: `Material ${code} with quantity of ${quantity} of ${
          po || sto
        } has been tracked`,
        data: articleInTracking,
      });
    } else {
      const data = await ArticleTrackingModel.create(req.body);

      return res.status(201).send({
        status: true,
        message: `Material ${code} with quantity of ${quantity} in ${
          po || sto
        } is ready for tracking`,
        data,
      });
    }
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const upsertArticleTracking = async (req, res) => {
  try {
    const {
      sto,
      code,
      quantity,
      inboundPickedQuantity,
      inboundPackedQuantity,
    } = req.body;

    const filter = {
      sto,
      code,
    };

    let STOTracking = await STOTrackingModel.findOne({ sto });

    if (STOTracking.pickingStartingTime === null) {
      STOTracking.pickingStartingTime = new Date();
    }

    if (quantity === inboundPickedQuantity) {
      if (STOTracking.pickedSku === null) {
        STOTracking.pickedSku = 1;
        STOTracking.status = "inbound picking";
      } else {
        STOTracking.pickedSku = STOTracking.pickedSku + 1;
      }
    }

    // console.log({STOTracking});

    if (STOTracking.sku === STOTracking.pickedSku) {
      STOTracking.status = "inbound picked";
    }
    // console.log({"NewSTOTracking": STOTracking});

    let articleInTracking = await ArticleTrackingModel.findOne(filter);

    // console.log({articleInTracking});

    const isAlreadyArticleInTracking = Boolean(articleInTracking);

    // console.log({isAlreadyArticleInTracking});

    if (isAlreadyArticleInTracking) {
      // console.log("update");

      if (
        articleInTracking.inboundPickedQuantity + inboundPickedQuantity >
        quantity
      ) {
        return res.status(409).json({
          status: false,
          message: `Inbound Picked Quantity exceeds quantity`,
        });
      }

      if (
        inboundPickedQuantity > 0 &&
        inboundPickedQuantity < articleInTracking.quantity
      ) {
        articleInTracking.status = "inbound picking";
      }

      if (
        inboundPickedQuantity + articleInTracking.inboundPickedQuantity ===
        articleInTracking.quantity
      ) {
        articleInTracking.status = "inbound picked";
        articleInTracking.inboundPickingEndingTime = new Date();
      }

      articleInTracking.inboundPickedQuantity += inboundPickedQuantity
        ? inboundPickedQuantity
        : 0;
      await articleInTracking.save();

      console.log(
        quantity,
        articleInTracking.inboundPickedQuantity,
        inboundPickedQuantity
      );
      if (quantity === articleInTracking.inboundPickedQuantity) {
        if (STOTracking.pickedSku === null) {
          STOTracking.pickedSku = 1;
          STOTracking.status = "inbound picking";
          console.log("first time ", { STOTracking });
        } else {
          STOTracking.pickedSku = STOTracking.pickedSku + 1;
          console.log("update: ", { STOTracking });
        }
      }

      // console.log({STOTracking});

      if (STOTracking.sku === STOTracking.pickedSku) {
        STOTracking.status = "inbound picked";
        STOTracking.pickingEndingTime = new Date();
      }

      await STOTracking.save();

      return res.status(200).send({
        status: true,
        message: `Material ${code} with quantity of ${inboundPickedQuantity} of ${sto} has been tracked`,
        data: articleInTracking,
      });
    } else {
      // console.log("create");

      let postObj = req.body;

      if (inboundPickedQuantity > 0 && inboundPickedQuantity < quantity) {
        postObj.status = "inbound picking";
        postObj.inboundPickingStartingTime = new Date();
        postObj.dn = STOTracking.dn;
      }

      // for full push
      if (inboundPickedQuantity === quantity) {
        postObj.status = "inbound picked";
        postObj.inboundPickingEndingTime = new Date();
        postObj.inboundPickingStartingTime = new Date();
        postObj.dn = STOTracking.dn;
      }

      // console.log("final data:", postObj)

      postObj = {
        ...postObj,
        inboundPickerId: STOTracking.pickerId,
        inboundPicker: STOTracking.picker,
      };

      const data = await ArticleTrackingModel.create(postObj);

      const wasNull = STOTracking.pickedSku === null;

      if (wasNull && STOTracking.pickedSku < STOTracking.sku) {
        // STOTracking.pickedSku =  1
        STOTracking.status = "inbound picking";
      }

      // if (quantity === data.inboundPickedQuantity) {
      //   if (STOTracking.pickedSku === null) {
      //     STOTracking.pickedSku = 1;
      //     STOTracking.status = "inbound picking";
      //   }

      //   if (STOTracking.pickedSku < STOTracking.sku) {
      //     STOTracking.pickedSku = STOTracking.pickedSku + 1;
      //   }
      // }

      // console.log({STOTracking});

      if (STOTracking.sku === STOTracking.pickedSku) {
        STOTracking.status = "inbound picked";
        STOTracking.pickingEndingTime = new Date();
      }

      await STOTracking.save();

      return res.status(201).send({
        status: true,
        message: `Material ${code} with quantity of ${inboundPickedQuantity} in ${sto} is ready for tracking`,
        data,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const pickingArticles = async (req, res) => {
  const now = new Date();

  try {
    const { code, name, quantity, inboundPickedQuantity, sto, dnItem, unit } =
      req.body;

      console.log({ code, name, quantity, inboundPickedQuantity, sto, dnItem, unit });

    // 1. Check if the STO exists in STOTracking
    const stoTracking = await STOTrackingModel2.findOne({ sto });
    if (!stoTracking) {
      return res.status(404).json({ message: "STO not found" });
    }

    console.log({stoTracking});

    // 2. Check if an ArticleV2Tracking already exists with the provided code
    let articleTracking = await ArticleTrackingModel2.findOne({ sto, code });

    if (articleTracking) {
      // Update logic if the article already exists
      // articleTracking.quantity += quantity;
      articleTracking.picking.inboundPickedQuantity += inboundPickedQuantity;

      // 1. Update the status if quantity equals inbound picked quantity
      if (
        articleTracking.quantity ===
        articleTracking.picking.inboundPickedQuantity
      ) {
        articleTracking.status = "inbound picked";
        articleTracking.picking.endedAt = now;
      }
    } else {
      // 3. If the article does not exist, create a new one
      articleTracking = new ArticleTrackingModel2({
        code,
        name,
        quantity,
        "picking.inboundPickedQuantity": inboundPickedQuantity,
        "picking.picker": stoTracking.picking.picker,
        "picking.pickerId": stoTracking.picking.pickerId,
        "picking.startedAt": now, // Set picking starting time
        "picking.endedAt": quantity === inboundPickedQuantity ? now : null, // Set picking starting time
        sto: stoTracking.sto,
        stoDetails: stoTracking._id,
        dn: stoTracking.dn,
        unit,
        dnItem: "0" + dnItem,
        supplyingSite: stoTracking.supplyingPlant,
        receivingSite: stoTracking.receivingPlant,
        status:
          quantity === inboundPickedQuantity
            ? "inbound picked"
            : "inbound picking", // Set initial status
      });

      // Set picking details on the STO
      stoTracking.picking.startedAt = now;

      stoTracking.status = "inbound picking";

      // Increase the picked SKU count on the STO
      stoTracking.picking.pickedSku += 1;
    }

    // Save the article tracking
    await articleTracking.save();

    // Update the stoTracking's articleTrackings array if it's a new article
    if (!stoTracking.articleTrackings.includes(articleTracking._id)) {
      stoTracking.articleTrackings.push(articleTracking._id);
    }

    // Update the status of the STO based on the conditions
    if (stoTracking.picking.pickedSku === stoTracking.sku) {
      // Check if all related articles have status 'inbound picked'
      const allArticlesPicked =
        (await ArticleTrackingModel2.find({
          _id: { $in: stoTracking.articleTrackings },
          status: { $eq: "inbound picking" },
        }).countDocuments()) === 0;

      console.log({ allArticlesPicked });

      if (allArticlesPicked) {
        stoTracking.status = "inbound picked";
        stoTracking.picking.endedAt = new Date();
      }
    }

    // Save the updated stoTracking
    await stoTracking.save();

    return res
      .status(200)
      .json({
        message: "Article tracking processed successfully",
        articleTracking,
        status: true,
      });
  } catch (error) {
    console.error("Error in createOrUpdateArticleTracking:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", status: false });
  }
};



// const pickingArticles = async (req, res) => {
//   try {
//     const { sto, code, quantity, inboundPickedQuantity } = req.body;

//     console.log(req.body);

//     const filter = {
//       sto,
//       code,
//     };

//     let STOTracking = await STOTrackingModel.findOne({ sto });

//     console.log({sto});

//     let articleInTracking = await ArticleTrackingModel.findOne(filter);

//     // console.log({articleInTracking});

//     if (Boolean(articleInTracking)) {
//       if (
//         articleInTracking.inboundPickedQuantity + inboundPickedQuantity >
//         quantity
//       ) {
//         return res.status(409).json({
//           status: false,
//           message: `Inbound Picked Quantity exceeds quantity`,
//         });
//       }

//       if (
//         inboundPickedQuantity + articleInTracking.inboundPickedQuantity ===
//         articleInTracking.quantity
//       ) {
//         articleInTracking.status = "inbound picked";
//         articleInTracking.inboundPickingEndingTime = new Date();
//       }

//       articleInTracking.inboundPickedQuantity += inboundPickedQuantity  ? inboundPickedQuantity  : 0;

//       await articleInTracking.save();

//       let articleInTrackingUpdated = await ArticleTrackingModel.find({sto: filter.sto}).countDocuments();

//       if (STOTracking.sku === articleInTrackingUpdated) {
//         STOTracking.status = "inbound picked";
//         STOTracking.pickingEndingTime = new Date();
//       }

//       await STOTracking.save();

//       return res.status(200).send({
//         status: true,
//         message: `Material ${code} with quantity of ${inboundPickedQuantity} of ${sto} has been tracked`,
//         data: articleInTracking,
//       });
//     } else {

//       let postObj = req.body;

//       if(STOTracking.pickedSku == null){
//         STOTracking.pickedSku = 0
//       }

//       if (inboundPickedQuantity > 0 && inboundPickedQuantity < quantity) {
//         postObj.status = "inbound picking";
//         postObj.inboundPickingStartingTime = new Date();
//         postObj.dn = STOTracking.dn;

//         STOTracking.pickingStartingTime = new Date();
//         STOTracking.status = "inbound picking";
//         STOTracking.pickedSku += 1;
//       }

//       // for full push
//       if (inboundPickedQuantity === quantity) {
//         postObj.status = "inbound picked";
//         postObj.inboundPickingEndingTime = new Date();
//         postObj.inboundPickingStartingTime = new Date();
//         postObj.dn = STOTracking.dn;

//         STOTracking.pickingStartingTime = new Date();
//         STOTracking.status = "inbound picking";
//         STOTracking.pickedSku += 1;

//         if (STOTracking.sku == STOTracking.pickedSku) {
//           STOTracking.pickingEndingTime = new Date();
//           STOTracking.status = "inbound picked";
//         }
//       }

//       postObj = {
//         ...postObj,
//         inboundPickerId: STOTracking.pickerId,
//         inboundPicker: STOTracking.picker,
//       };

//       const data = await ArticleTrackingModel.create(postObj);

//       if (STOTracking.sku === STOTracking.pickedSku) {
//         STOTracking.status = "inbound picked";
//         STOTracking.pickingEndingTime = new Date();
//       }

//       await STOTracking.save();

//       return res.status(201).send({
//         status: true,
//         message: `Material ${code} with quantity of ${inboundPickedQuantity} in ${sto} is ready for tracking`,
//         data,
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({
//       status: false,
//       message: `${err}`,
//     });
//   }
// };

const upsertArticleTrackingPacking = async (req, res) => {
  try {
    const { sto, code, quantity, inboundPackedQuantity } = req.body;

    const filter = {
      sto,
      code,
    };

    console.log({ filter });

    let STOTracking = await STOTrackingModel.findOne({ sto });

    // console.log({STOTracking});

    if (STOTracking.packingStartingTime === null) {
      STOTracking.packingStartingTime = new Date();
    }

    // if (quantity === inboundPackedQuantity) {
    //   if (STOTracking.packedSku === null) {
    //     STOTracking.packedSku = 1;
    //     STOTracking.status = "inbound packing";
    //   } else {
    //     STOTracking.packedSku = STOTracking.packedSku + 1;
    //   }
    // }

    // // console.log({STOTracking});

    // if (STOTracking.sku === STOTracking.packedSku) {
    //   STOTracking.status = "inbound packed";
    //   STOTracking.packingEndingTime = new Date();
    // }
    // console.log({"NewSTOTracking": STOTracking});

    let articleInTracking = await ArticleTrackingModel.findOne(filter);

    // console.log({articleInTracking});

    const isAlreadyArticleInTracking = Boolean(articleInTracking);

    // console.log({isAlreadyArticleInTracking});

    if (isAlreadyArticleInTracking) {
      if (
        articleInTracking.inboundPackedQuantity + inboundPackedQuantity >
        quantity
      ) {
        return res.status(409).json({
          status: false,
          message: `Inbound packed Quantity exceeds quantity`,
        });
      }

      if (
        inboundPackedQuantity > 0 &&
        inboundPackedQuantity < articleInTracking.quantity
      ) {
        console.log("partially packing");
        articleInTracking.status = "inbound packing";
        articleInTracking.inboundPackingStartingTime = new Date();
      }

      if (
        inboundPackedQuantity + articleInTracking.inboundPackedQuantity ===
        articleInTracking.quantity
      ) {
        console.log("1b1 packed");
        articleInTracking.status = "inbound packed";
        articleInTracking.inboundPackingEndingTime = new Date();
      }

      if (inboundPackedQuantity === quantity) {
        console.log("fully packed");
        articleInTracking.status = "inbound packed";
        articleInTracking.inboundPackingEndingTime = new Date();
        articleInTracking.inboundPackingStartingTime = new Date();
      }

      articleInTracking.inboundPackedQuantity += inboundPackedQuantity
        ? inboundPackedQuantity
        : 0;

      //     articleInTracking = { ...articleInTracking, inboundPackerId: STOTracking.packerId, inboundPacker: STOTracking.packer}
      articleInTracking.inboundPackerId = STOTracking.packerId;
      articleInTracking.inboundPacker = STOTracking.packer;

      await articleInTracking.save();
      // articleInTracking.inboundPackedQuantity += inboundPackedQuantity ? inboundPackedQuantity : 0
      console.log(quantity, articleInTracking.inboundPackedQuantity);
      console.log({ STOTracking });
      if (quantity === articleInTracking.inboundPackedQuantity) {
        if (STOTracking.packedSku === null) {
          console.log("sto pack first");
          STOTracking.packedSku = 1;
          STOTracking.status = "inbound packing";
        } else {
          console.log("sto pack increasing");
          STOTracking.packedSku = STOTracking.packedSku + 1;
        }
      }

      // console.log({STOTracking});

      if (STOTracking.sku === STOTracking.packedSku) {
        STOTracking.status = "inbound packed";
        STOTracking.packingEndingTime = new Date();
      }

      // if (STOTracking.sku === STOTracking.packedSku) {
      //   STOTracking.status = "inbound packed";
      //   STOTracking.packingEndingTime = new Date();
      // }

      await STOTracking.save();

      return res.status(200).send({
        status: true,
        message: `Material ${code} with quantity of ${inboundPackedQuantity} of ${sto} has been tracked`,
        data: articleInTracking,
      });
    } else {
      return res.status(202).send({
        status: false,
        message: `No Article Data availeable for Packing`,
        //     data
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const packingArticles = async (req, res) => {
  try {
    const { sto, code, quantity, inboundPackedQuantity } = req.body;

    const filter = {
      sto,
      code,
    };

    // console.log({ filter });

    let STOTracking = await STOTrackingModel.findOne({ sto });

    let articleInTracking = await ArticleTrackingModel.findOne(filter);

    if (Boolean(articleInTracking)) {
      // if(STOTracking.packedSku == null){
      //   STOTracking.packedSku = 0
      // }

      if (
        articleInTracking.inboundPackedQuantity + inboundPackedQuantity >
        quantity
      ) {
        return res.status(409).json({
          status: false,
          message: `Inbound packed Quantity exceeds quantity`,
        });
      }

      // if (inboundPackedQuantity > 0 && inboundPackedQuantity < articleInTracking.quantity) {
      //   console.log("partially packing");
      //   articleInTracking.status = "inbound packing";
      //   articleInTracking.inboundPackingStartingTime = new Date();

      //   STOTracking.packingStartingTime = new Date();
      //   STOTracking.status = "inbound packing";
      //   STOTracking.packedSku += 1;
      // }

      // if ( inboundPackedQuantity + articleInTracking.inboundPackedQuantity === articleInTracking.quantity ) {
      //   articleInTracking.status = "inbound packed";
      //   articleInTracking.inboundPackingEndingTime = new Date();
      // }

      // if (inboundPackedQuantity === quantity){
      //   // console.log("fully packed");
      //   // articleInTracking.status = "inbound packed";
      //   // articleInTracking.inboundPackingEndingTime = new Date();
      //   articleInTracking.inboundPackingStartingTime = new Date();

      //   STOTracking.packingStartingTime = new Date();
      //   // STOTracking.packingEndingTime = new Date();
      //   STOTracking.status = "inbound packing";
      //   // STOTracking.packedSku += 1;
      // }

      articleInTracking.inboundPackingStartingTime = new Date();
      articleInTracking.status = "inbound packing";

      STOTracking.packingStartingTime = new Date();
      // STOTracking.packingEndingTime = new Date();
      STOTracking.status = "inbound packing";

      // articleInTracking.inboundPackedQuantity += inboundPackedQuantity ? inboundPackedQuantity : 0;
      articleInTracking.inboundPackedQuantity = inboundPackedQuantity;

      //     articleInTracking = { ...articleInTracking, inboundPackerId: STOTracking.packerId, inboundPacker: STOTracking.packer}
      articleInTracking.inboundPackerId = STOTracking.packerId;
      articleInTracking.inboundPacker = STOTracking.packer;

      await articleInTracking.save();

      // if (STOTracking.sku === STOTracking.packedSku) {
      //   STOTracking.status = "inbound packed";
      //   STOTracking.packingEndingTime = new Date();
      // }

      await STOTracking.save();

      return res.status(200).send({
        status: true,
        message: `Material ${code} with quantity of ${inboundPackedQuantity} of ${sto} has been tracked`,
        data: articleInTracking,
      });
    } else {
      return res.status(202).send({
        status: false,
        message: `No Article Data availeable for Packing`,
        //     data
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const updateArticleTracking = async (req, res) => {
  try {
    const {
      po,
      sto,
      code,
      picker,
      pickerId,
      packer,
      packerId,
      pickingStartingTime,
      pickingEndingTime,
      packingStartingTime,
      packingEndingTime,
      pickedQuantity,
      status,
      childPackedQuantity,
    } = req.body;

    const filter = {
      po: po,
      sto: sto,
      code,
    };

    let articleInTracking = await ArticleTrackingModel.findOne(filter);
    const isAlreadyArticleInTracking = Boolean(articleInTracking);

    if (!isAlreadyArticleInTracking) {
      return res.status(404).json({
        status: false,
        message: `Article Tracking Not Found`,
      });
    }

    // const {
    //       inboundPicker: hasPicker,
    //       inboundPacker: hasPacker,
    //       inboundPickingStartingTime: hasPickingStartingTime,
    //       inboundPickingEndingTime: hasPickingEndingTime,
    //       inboundPackingStartingTime: hasPackingStartingTime,
    //       inboundPackingEndingTime: hasPackingEndingTime
    // } = ArticleTracking

    // console.log(hasPicker,
    //       hasPacker,
    //       hasPickingStartingTime,
    //       hasPickingEndingTime,
    //       hasPackingStartingTime,
    //       hasPackingEndingTime);

    // if (hasPicker && hasPickingStartingTime) {
    //       ArticleTracking.status = "inbound picking"
    //       ArticleTracking.pickingStartingTime = pickingStartingTime || new Date()
    // }
    // else if (!hasPicker) {
    //       if (!picker && !pickerId) {
    //             throw new Error('Picker & Picker Id is required')
    //       }
    //       ArticleTracking.inboundPicker = picker
    //       ArticleTracking.inboundPickerId = pickerId
    //       ArticleTracking.status = "task assigned"
    // }
    // else if (hasPacker && hasPackingStartingTime) {
    //       ArticleTracking.status = "inbound packing"
    //       ArticleTracking.inboundPackingStartingTime = packingStartingTime || new Date()
    // }
    // else if (!hasPacker) {
    //       if (!packer && !packerId) {
    //             throw new Error('Packer & Packer Id is required')
    //       }
    //       ArticleTracking.inboundPacker = packer
    //       ArticleTracking.inboundPackerId = packerId
    //       ArticleTracking.status = "task assigned"
    //       console.log(107, ArticleTracking);
    // }
    // else if (hasPicker && hasPickingStartingTime && hasPickingEndingTime) {
    //       ArticleTracking.inboundPickingEndingTime = pickingEndingTime || new Date()
    //       ArticleTracking.status = "inbound picked"
    //       console.log(112, ArticleTracking);
    // }
    // else if (hasPacker && hasPackingStartingTime && hasPackingEndingTime) {
    //       ArticleTracking.inboundPackingEndingTime = packingEndingTime || new Date()
    //       ArticleTracking.status = "inbound packed"
    //       console.log(117, ArticleTracking);
    // }
    else {
      articleInTracking.inboundPicker = picker
        ? picker
        : articleInTracking.inboundPicker || null;
      articleInTracking.inboundPickerId = pickerId
        ? pickerId
        : articleInTracking.inboundPickerId || null;
      articleInTracking.inboundPacker = packer
        ? packer
        : articleInTracking.inboundPacker || null;
      articleInTracking.inboundPackerId = packerId
        ? packerId
        : articleInTracking.inboundPackerId || null;
      articleInTracking.inboundPickingStartingTime = pickingStartingTime
        ? pickingStartingTime
        : articleInTracking.inboundPickingStartingTime || null;
      articleInTracking.inboundPickingEndingTime = pickingEndingTime
        ? pickingEndingTime
        : articleInTracking.inboundPickingEndingTime || null;
      articleInTracking.inboundPackingStartingTime = packingStartingTime
        ? packingStartingTime
        : articleInTracking.inboundPackingStartingTime || null;
      articleInTracking.inboundPackingEndingTime = packingEndingTime
        ? packingEndingTime
        : articleInTracking.inboundPackingEndingTime || null;
      articleInTracking.pickedQuantity = pickedQuantity
        ? pickedQuantity
        : articleInTracking.pickedQuantity || null;
      articleInTracking.childPackedQuantity = childPackedQuantity
        ? childPackedQuantity
        : articleInTracking.childPackedQuantity || null;
      articleInTracking.status = status
        ? status
        : articleInTracking.status || null;
      articleInTracking.updatedAt = new Date();
    }

    await articleInTracking.save();

    return res.status(201).send({
      status: true,
      message: "Updated Article Tracking",
      data: articleInTracking,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

// // Get all article
// const getAllArticleTracking = async (req, res) => {
//   try {
//     await search(req, res, "");
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       message: `${err}`,
//     });
//   }
// };




// Get all article
const getAllArticleTracking = async (req, res) => {
  try {
    await search2(req, res, "");
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

// Get in document article
const getArticleInDocument = async (req, res) => {
  try {
    await search(req, res, "in document");
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

// Get article inbound picking
const getArticleInboundPicking = async (req, res) => {
  try {
    await search(req, res, "inbound picking");
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

// Get article inbound packing
const getArticleInboundPacking = async (req, res) => {
  try {
    await search(req, res, "inbound packing");
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

// Get article inbound picked
const getArticleInboundPicked = async (req, res) => {
  try {
    await search(req, res, "inbound picked");
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

// Get article inbound packed
const getArticleInboundPacked = async (req, res) => {
  try {
    await search(req, res, "inbound packed");
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const search = async (req, res, status) => {
  let filter = {
    status,
  };
  if (status === "") {
    filter = {};
  }
  if (req.query.filterBy && req.query.value) {
    filter[req.query.filterBy] = req.query.value;
  }

  const pageSize = +req.query.pageSize || 10;
  const currentPage = +req.query.currentPage || 1;
  const sortBy = req.query.sortBy || "_id"; // _id or description or code or po or etc.
  const sortOrder = req.query.sortOrder || "desc"; // asc or desc

  const totalItems = await ArticleTrackingModel.find(filter).countDocuments();
  const items = await ArticleTrackingModel.find(filter)
    .skip(pageSize * (currentPage - 1))
    .limit(pageSize)
    .sort({ [sortBy]: sortOrder })
    .exec();

  const responseObject = {
    status: true,
    items,
    totalPages: Math.ceil(totalItems / pageSize),
    totalItems,
  };

  if (items.length) {
    return res.status(200).json(responseObject);
  } else {
    return res.status(401).json({
      status: false,
      message: "Nothing found",
      items,
    });
  }
};

const search2 = async (req, res, status) => {
  let filter = {
    status,
  };
  if (status === "") {
    filter = {};
  }
  if (req.query.filterBy && req.query.value) {
    filter[req.query.filterBy] = req.query.value;
  }

  const pageSize = +req.query.pageSize || 10;
  const currentPage = +req.query.currentPage || 1;
  const sortBy = req.query.sortBy || "_id"; // _id or description or code or po or etc.
  const sortOrder = req.query.sortOrder || "desc"; // asc or desc

  const totalItems = await ArticleTrackingModel2.find(filter).countDocuments();
  const items = await ArticleTrackingModel2.find(filter)
    .skip(pageSize * (currentPage - 1))
    .limit(pageSize)
    .sort({ [sortBy]: sortOrder })
    .exec();

  const responseObject = {
    status: true,
    items,
    totalPages: Math.ceil(totalItems / pageSize),
    totalItems,
  };

  if (items.length) {
    return res.status(200).json(responseObject);
  } else {
    return res.status(401).json({
      status: false,
      message: "Nothing found",
      items,
    });
  }
};

module.exports = {
  postArticleTracking,
  getAllArticleTracking,
  getArticleInDocument,
  getArticleInboundPicking,
  getArticleInboundPacking,
  getArticleInboundPicked,
  getArticleInboundPacked,
  updateArticleTracking,
  upsertArticleTracking,
  upsertArticleTrackingPacking,

  // new
  pickingArticles,
  packingArticles,
  // sendToPackingZone,
  
};
