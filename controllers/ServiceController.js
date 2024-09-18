const mongoose = require('mongoose');
const InventoryModel = require('../models/InventoryModel')
// const ArticleTrackingModel = require('../models/ArticleTrackingModel');
const ArticleTrackingModel2 = require('../models/new_models/ArticleTrackingV2Model');
const TempDataModel = require('../models/TempDataModel');
const ProductShelvingModel = require('../models/ProductShelvingModel')


const submitforShelvingAndUpdateTempData = async (req, res) => {
      // Start a session
      const session = await mongoose.startSession();

      let filterTempData = {}
      const {tempObj, shelvingObj} = req.body
      
      const filterShelving = {
            po:shelvingObj.po,
            sto:shelvingObj.sto,
            code: shelvingObj.code,
            quantity: shelvingObj.quantity
      }

      let receivedQuantity = shelvingObj.receivedQuantity

      console.log({filterShelving});

      if(tempObj.type === "grn data" ){

            filterTempData = {
                        userId:tempObj.userId, 
                        type:tempObj.type,
                        "data.po": tempObj.po,
                     }
      }


      const mongoTempData = await TempDataModel.findOne(filterTempData)
      const alreadyReadyForShelving = await ProductShelvingModel.findOne(filterShelving)
      const isAlreadyReadyForShelving = Boolean(alreadyReadyForShelving)

      // console.log({mongoTempData});

      try {
            // Start the transaction
             session.startTransaction();


             if (isAlreadyReadyForShelving) {
                  if (alreadyReadyForShelving.receivedQuantity <= alreadyReadyForShelving.quantity) {

                        alreadyReadyForShelving.receivedQuantity += receivedQuantity

                        if (alreadyReadyForShelving.receivedQuantity > alreadyReadyForShelving.quantity) {
                              return res.status(409).send({
                                    status: false,
                                    message: `Received Quantity ${alreadyReadyForShelving.receivedQuantity} cannot exceed PO Quantity ${alreadyReadyForShelving.quantity}`
                              })
                        }
                        else {
                              await alreadyReadyForShelving.save({session})
                        }
                  }
            }
            else {
                  const data = await ProductShelvingModel.create([shelvingObj],{session})
            }

            if(!mongoTempData){

                  const formattedData = {
                        userId:tempObj.userId, 
                        type:tempObj.type, 
                        data:[
                              tempObj
                        ]
                  }
                  // create
                  const tempData = await TempDataModel.create([formattedData], {session})

                  
            }

            if(mongoTempData){
                  const materialFound = mongoTempData.data.find( item => item.material === req.body.tempObj.material )

                  const index = mongoTempData.data.findIndex(item => item.material === req.body.tempObj.material );

                  // console.log({index});

                  let key = `data.${index}.quantity`

                  console.log({materialFound,index,key});

                  if(materialFound){
                        const tempData = await TempDataModel.findOneAndUpdate(
                              filterTempData,
                              {
                                  $inc: { [key]: req.body.tempObj.quantity }
                              },
                              {session}
                          );

                        console.log({tempData});
      
                  }else{
                        mongoTempData.data.push(tempObj)
                        await mongoTempData.save({session})
                  }
            }



            


            await session.commitTransaction();
            res.status(201).send({status: true, message: 'Transaction successful'});
      } catch (error) {
            console.log(error);
            await session.abortTransaction();
            res.status(500).send({status: false, message: 'Transaction failed', error });
      }finally{
            // End the session
            session.endSession();
      }
}
      


const pickingSTO = async (req, res) => {
      try {
            const { sto, site } = req.body
            console.log({ sto, site });
            let stoDetails = await getStoDetails(sto,res)
            if(!stoDetails){
                  return;
            }
            const articles = stoDetails.items.map(item => item.material)
            const articlesInInventory = await groupInventoryArticles(articles, site)
            const articleInTracking = await ArticleTrackingModel2.find({ sto })
            // console.log({articleInTracking});
            // console.log({stoDetails});
            const finalStoDetails = stoDetails.items.map(stoItem => {
                  let matchedItem = articleInTracking.find(trackingItem => trackingItem.code === stoItem.material && trackingItem.dnItem === "0" + stoItem.stoItem)
                  // console.log({matchedItem});
                  let matchedBin = articlesInInventory.find(inventory => inventory.material === stoItem.material)
                  if (matchedItem) {
                        return {
                              ...stoItem,
                              remainingQuantity: stoItem.quantity - matchedItem.picking.inboundPickedQuantity,
                              bins: articlesInInventory.length ? matchedBin.bins : []
                        }
                  }
                  else {
                        return {
                              ...stoItem,
                              remainingQuantity: stoItem.quantity,
                              bins: articlesInInventory.length ? matchedBin.bins : []
                        }
                  }
            }).filter(item => item.remainingQuantity !==0 )

            const responseObject = {
                  status: true,
                  message: `STO Details updated with Article Tracking and Inventory`,
                  totalItems: finalStoDetails.length,
                  items: finalStoDetails,
            };

            if (finalStoDetails.length) {
                  return res.status(200).json(responseObject);
            }
      
            else {
                  return res.status(401).json({
                        status: false,
                        message: "Nothing found",
                        items: finalStoDetails,
                  });
            }
      }
      catch (err) {
            console.log(err);
            res.status(500).json({
                  status: false,
                  message: `${err.message === 'fetch failed' ? 'MIS Logged Off the PC where BAPI is Hosted' : err}`
            })
      }
}

const getStoDetails = async (sto,res) => {
      const requestOptions = {
            method: 'POST',
            body: JSON.stringify({ sto })
      }

      const response = await fetch(`${process.env.SAP_QS}sto_display.php`, requestOptions)
      const data = await response.json()

      if (data === 'Could not open connection') {
            res.status(503).json({
                  status: false,
                  message: `${data}`
            })
            
      }
      else if (data?.RETURN[0]?.TYPE === 'E') {
            res.status(404).json({
                  status: false,
                  message: data.RETURN[0].MESSAGE
            })
      }
      else {
            const stoDetails = {
                  sto: data.POHEADER.PO_NUMBER.trim(),
                  companyCode: data.POHEADER.COMP_CODE.trim(),
                  documentType: data.POHEADER.DOC_TYPE.trim(),
                  createdDate: data.POHEADER.CREAT_DATE.trim(),
                  createdBy: data.POHEADER.CREATED_BY.trim(),
                  documentDate: data.POHEADER.DOC_DATE.trim(),
                  supplyingPlant: data.POHEADER.VENDOR.trim().length > 0 ? data.POHEADER.VENDOR.trim() : data.POHEADER.SUPPL_PLNT.trim(), // upol bolse tai
                  items: data.POITEM.map(item => (
                        {
                              sto: data.POHEADER.PO_NUMBER.trim(),
                              stoItem: item.PO_ITEM.trim(),
                              material: item.MATERIAL.trim(),
                              description: item.SHORT_TEXT.trim(),
                              receivingPlant: item.PLANT.trim(),
                              storageLocation: item.STGE_LOC.trim(),
                              quantity: item.QUANTITY,
                              unit: item.PO_UNIT.trim(),
                              orderPricingUnit: item.ORDERPR_UN.trim(),
                              poUnit: item.PO_UNIT_ISO.trim(),
                              orderPricingUnit: item.ORDERPR_UN_ISO.trim(),
                              weightUnit: item.WEIGHTUNIT_ISO.trim(),
                              netPrice: item.NET_PRICE,
                              pricingUnit: item.PRICE_UNIT,
                              weightUnit: item.WEIGHTUNIT.trim(),
                              pricingDate: item.PRICE_DATE.trim()
                        }
                  )),
                  // history: data.POHISTORY.map(item => (
                  //       {
                  //             sto: item.REF_DOC_NO.trim(),
                  //             stoItem: item.PO_ITEM.trim(),
                  //             grn: item.MAT_DOC.trim(),
                  //             grnItem: item.MATDOC_ITM.trim(),
                  //             postingDate: item.PSTNG_DATE.trim(),
                  //             quantity: item.QUANTITY,
                  //             value: item.VAL_LOCCUR,
                  //             entryDate: item.ENTRY_DATE.trim(),
                  //             entryTime: item.ENTRY_TIME.trim(),
                  //             material: item.MATERIAL.trim(),
                  //             plant: item.PLANT.trim(),
                  //             documentYear: item.DOC_YEAR.trim(),
                  //             documentDate: item.DOC_DATE.trim(),
                  //       }
                  // )),
                  // historyTotal: data.POHISTORY_TOTALS.map(item => (
                  //       {
                  //             stoItem: item.PO_ITEM.trim(),
                  //             material: data.POITEM.find(innerItem => item.PO_ITEM.trim() === innerItem.PO_ITEM.trim()).MATERIAL.trim(),
                  //             description: data.POITEM.find(innerItem => item.PO_ITEM.trim() === innerItem.PO_ITEM.trim()).SHORT_TEXT.trim(),
                  //             quantity: data.POITEM.find(innerItem => item.PO_ITEM.trim() === innerItem.PO_ITEM.trim()).QUANTITY,
                  //             grnQuantity: item.DELIV_QTY,
                  //             value: item.VAL_GR_LOC,
                  //       }
                  // ))
            }
            return stoDetails
      }
}

const groupInventoryArticles = async (articles, site) => {

      const articlesInInventory = await InventoryModel.aggregate([
            // Match documents with the specified material
            {
                  $match:
                  {
                        material: { $in: articles },
                        site
                  }
            },
            // Project the required fields
            {
                  $project: {
                        bin: 1,
                        gondola: 1,
                        quantity: 1,
                        material: 1
                  }
            },
            // Group the results into the desired format
            {
                  $group: {
                        _id: "$material",
                        bins: {
                              $push: {
                                    bin: "$bin",
                                    gondola: "$gondola",
                                    quantity: "$quantity"
                              }
                        }
                  }
            },
            // Rename the _id field to material
            {
                  $project: {
                        _id: 0,
                        material: "$_id",
                        bins: 1
                  }
            }
      ])

      return articlesInInventory
}


module.exports = {
      pickingSTO,
      submitforShelvingAndUpdateTempData
}