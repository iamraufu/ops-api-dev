const ChildPackingModel = require("../models/ChildPackingModel");
const STOTrackingModel2 = require("../models/new_models/STOTrackingV2Model");
const ArticleTrackingModel2 = require("../models/new_models/ArticleTrackingV2Model");

// const generateChildPackingList = async (req, res) => {
//   try {
//     const { sto, receivingSite } = req.body;

//     const foundChildPackingList = await ChildPackingModel.find({ sto })
//       .sort({ _id: -1 })
//       .limit(1);

//     // console.log({foundChildPackingList});
//     let updatedCount =
//       foundChildPackingList.length > 0 ? foundChildPackingList[0].count : 1;

//     if (foundChildPackingList.length > 0) {
//       updatedCount = foundChildPackingList[0].count + 1;
//     }

//     let padding;
//     if (updatedCount >= 1 && updatedCount <= 9) {
//       padding = "00";
//     } else if (updatedCount >= 10 && updatedCount <= 99) {
//       padding = "0";
//     } else {
//       return updatedCount;
//     }

//     updatedCount = padding + updatedCount;
//     const barcode = `${receivingSite}-${sto.slice(-6)}-${updatedCount}`;

//     const updatedData = {
//       ...req.body,
//       barcode,
//       count: parseInt(updatedCount),
//     };

//     const data = await ChildPackingModel.create(updatedData);

//     return res.status(201).send({
//       status: true,
//       message: `Child Packing Created Successfully`,
//       data,
//     });
//   } catch (err) {
//     res.status(500).json({
//       status: false,
//       message: `${err}`,
//     });
//   }
// };

const generateChildPackingList = async (req, res) => {
  try {
    const data = req.body;

    // console.log(data);

    const stoDetails = await STOTrackingModel2.findOne({ sto: data.sto });

    // console.log({stoDetails});

    let newObj = {
      sto: stoDetails.sto,
      dn: stoDetails.dn,
      supplyingSite: stoDetails.supplyingPlant,
      receivingSite: stoDetails.receivingPlant,
      packedBy: stoDetails.packing.packerId,
      dateTimePacked: new Date(),
      list: req.body.list,
      status: "child packed",
    };

    // console.log({newObj});

    const foundChildPackingList = await ChildPackingModel.find({
      sto: newObj.sto,
    })
      .sort({ _id: -1 })
      .limit(1);

    // console.log({ foundChildPackingList });
    let updatedCount =
      foundChildPackingList.length > 0 ? foundChildPackingList[0].count : 1;

    // console.log({ updatedCount });

    if (foundChildPackingList.length > 0) {
      updatedCount = foundChildPackingList[0].count + 1;
    }

    let padding;
    if (updatedCount >= 1 && updatedCount <= 9) {
      padding = "00";
    } else if (updatedCount >= 10 && updatedCount <= 99) {
      padding = "0";
    } else {
      return updatedCount;
    }

    updatedCount = padding + updatedCount;

    console.log({ updatedCount });
    const barcode = `${newObj.receivingSite}${newObj.sto.slice(
      -6
    )}${updatedCount}`;

    const updatedData = {
      ...newObj,
      ...req.body,
      barcode,
      count: parseInt(updatedCount),
    };


    let skuCount = 0
    let date = null
    let status = "inbound packed"
    let index = 1
    updatedData.list.map(async (item) => {
      let article = await ArticleTrackingModel2.findOne({
        sto: updatedData.sto,
        code: item.material,
      });

      article.packing.childPackedQuantity += item.quantity;



      if (
        article.packing.inboundPackedQuantity ===
        article.packing.childPackedQuantity
      ) {
          article.status = "inbound packed";
          article.packing.endedAt = new Date();
          skuCount += 1

          if (stoDetails.sku === skuCount) {
            // stoDetails.packing.packedSku += 1;
            date = new Date();
          }
      }

      if(updatedData.list.length === index ){
        
        console.log(date,skuCount);

        stoDetails.packing.packedSku += skuCount,
        stoDetails.packing.endedAt = date,
        stoDetails.status = date? stoDetails.status : status

        
        console.log({stoDetails});
        await stoDetails.save()
      }

      index += 1
      await article.save();
      
    });



    const newdata = await ChildPackingModel.create(updatedData);

    return res.status(201).send({
      status: true,
      message: `Child Packing Created Successfully`,
      data: newdata,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const getChildPackingList = async (req, res) => {
  try {
    await search(req, res);
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `${err}`,
    });
  }
};

const updateChildPackingList = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Find the document by _id and update it with the new data
    const updatedDocument = await ChildPackingModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedDocument) {
      return res.status(404).send({ message: "Document not found" });
    }

    res
      .status(200)
      .send({ status: true, message: "Updated Successfully", updatedDocument });
  } catch (error) {
    res.status(500).send({ message: "Error updating document", error });
  }
};
const getChildPackingByPost = async (req, res) => {
  const filter = req.body;

  console.log(filter);
  try {
    // Find documents matching the filter criteria
    const filteredData = await ChildPackingModel.find(filter).sort({createdAt: -1});

    if (filteredData.length === 0) {
      return res
        .status(404)
        .send({ message: "No data found matching the criteria" });
    }

    res.status(200).send({ status: true, data: filteredData });
  } catch (error) {
    res.status(500).send({ message: "Error fetching data", error });
  }
};

const sendToPackingZone = async (req, res) => {
  const now = new Date();

  try {
    const { sto } = req.body;

    // 1. Check if the STO exists in STOTracking
    const stoTracking = await STOTrackingModel2.findOne({ sto }).populate([
      {
        path: "articleTrackings",
      },
    ]);

    if (!stoTracking) {
      return res.status(404).json({ status: false, message: "STO not found" });
    }

    const articlesToUpdate = stoTracking.articleTrackings;

    // const updatedArticles = []
    articlesToUpdate.map(async (item) => {
      let updateObj = {
        status: "inbound packing",
        "packing.startedAt": now,
        "packing.inboundPackedQuantity": item.picking.inboundPickedQuantity,
        "packing.packer": stoTracking.packing.packer,
        "packing.packerId": stoTracking.packing.packerId,
        "packing.childPackedQuantity": 0,
      };

      await ArticleTrackingModel2.findOneAndUpdate(
        { _id: item._id },
        { $set: updateObj },
        { new: true }
      );
      // console.log(updatedData);
    });

    // Set picking details on the STO
    stoTracking.packing.startedAt = now;

    stoTracking.status = "inbound packing";

    await stoTracking.save();

    return res
      .status(200)
      .json({ message: "Successfully Submitted", stoTracking, status: true });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", status: false });
  }
};

const search = async (req, res) => {
  let filter = {};

  if (req.query.filterBy && req.query.value) {
    filter[req.query.filterBy] = req.query.value;
  }

  const pageSize = +req.query.pageSize || 10;
  const currentPage = +req.query.currentPage || 1;
  const sortBy = req.query.sortBy || "_id"; // _id or description or code or po or etc.
  const sortOrder = req.query.sortOrder || "desc"; // asc or desc

  const totalItems = await ChildPackingModel.find(filter).countDocuments();
  const items = await ChildPackingModel.find(filter)
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
  generateChildPackingList,
  getChildPackingList,
  updateChildPackingList,
  getChildPackingByPost,

  sendToPackingZone,
};
