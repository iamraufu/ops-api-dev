const STOTrackingModel = require('../models/STOTrackingModel');
const STOTrackingModel2 = require('../models/new_models/STOTrackingV2Model');
const ChildPackingModel = require("../models/ChildPackingModel");
const { json } = require('express');

const createDN = async (req, res) => {
      try {

            const { sto } = req.body

            const requestOptions = {
                  method: 'POST',
                  body: JSON.stringify({ sto })
            }

            const response = await fetch(`${process.env.SAP_QS}create_dn.php`, requestOptions)
            const data = await response.json()

            if (data?.RETURN[0]?.TYPE === 'E' && data?.RETURN.find(result => result.NUMBER === '001') && data?.RETURN.find(result => result.NUMBER === '051')) {
                  res.status(404).json({
                        status: false,
                        message: 'Delivery Note not created as DN cannot be created against PO'
                  })
            }

            else if (data?.RETURN[0]?.TYPE === 'E' && data?.RETURN.find(result => result.NUMBER === '001') && data?.RETURN.find(result => result.NUMBER === '420')) {
                  res.status(404).json({
                        status: false,
                        message: 'Delivery Note not created as DN has already created with this STO'
                  })
            }

            else if (data?.RETURN[0]?.TYPE === 'E') {
                  res.status(404).json({
                        status: false,
                        message: 'Delivery Note not created',
                        data: data.RETURN.map(item => ({
                              message: item.MESSAGE.trim()
                        }))
                  })
            }
            else {

                  const filter = {
                        sto
                  }

                  let STOTracking = await STOTrackingModel2.findOne(filter)

                  if (!STOTracking) {

                        return res.status(404).json({
                              status: false,
                              message: `STO tracking status not updated but converted to DN`,
                              data: {
                                    dn: data.DELIVERY.trim(),
                                    items: data.CREATED_ITEMS.map(item => ({
                                          sto: item.REF_DOC.trim(),
                                          stoItem: item.REF_ITEM.trim(),
                                          dn: item.DELIV_NUMB.trim(),
                                          dnItem: item.DELIV_ITEM.trim(),
                                          material: item.MATERIAL.trim(),
                                          deliveringQuantity: item.DLV_QTY,
                                          salesQuantity: item.SALES_UNIT.trim(),
                                          salesUnitISO: item.SALES_UNIT_ISO.trim()
                                    })
                                    )
                              }
                        })
                  }
                  else {
                        STOTracking.status = "in dn"
                        STOTracking.dn = data.DELIVERY.trim()
                  }

                  await STOTracking.save()

                  res.status(200).json({
                        status: true,
                        message: `STO ${sto} converted to DN ${data.DELIVERY.trim()}`,
                        data: {
                              dn: data.DELIVERY.trim(),
                              items: data.CREATED_ITEMS.map(item => ({
                                    sto: item.REF_DOC.trim(),
                                    stoItem: item.REF_ITEM.trim(),
                                    dn: item.DELIV_NUMB.trim(),
                                    dnItem: item.DELIV_ITEM.trim(),
                                    material: item.MATERIAL.trim(),
                                    deliveringQuantity: item.DLV_QTY,
                                    salesQuantity: item.SALES_UNIT.trim(),
                                    salesUnitISO: item.SALES_UNIT_ISO.trim()
                              })
                              )
                        }
                  })
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
// const createDN = async (req, res) => {
//       try {

//             const { sto } = req.body

//             const requestOptions = {
//                   method: 'POST',
//                   body: JSON.stringify({ sto })
//             }

//             const response = await fetch(`${process.env.SAP_QS}create_dn.php`, requestOptions)
//             const data = await response.json()

//             if (data?.RETURN[0]?.TYPE === 'E' && data?.RETURN.find(result => result.NUMBER === '001') && data?.RETURN.find(result => result.NUMBER === '051')) {
//                   res.status(404).json({
//                         status: false,
//                         message: 'Delivery Note not created as DN cannot be created against PO'
//                   })
//             }

//             else if (data?.RETURN[0]?.TYPE === 'E' && data?.RETURN.find(result => result.NUMBER === '001') && data?.RETURN.find(result => result.NUMBER === '420')) {
//                   res.status(404).json({
//                         status: false,
//                         message: 'Delivery Note not created as DN has already created with this STO'
//                   })
//             }

//             else if (data?.RETURN[0]?.TYPE === 'E') {
//                   res.status(404).json({
//                         status: false,
//                         message: 'Delivery Note not created',
//                         data: data.RETURN.map(item => ({
//                               message: item.MESSAGE.trim()
//                         }))
//                   })
//             }
//             else {

//                   const filter = {
//                         sto
//                   }

//                   let STOTracking = await STOTrackingModel.findOne(filter)

//                   if (!STOTracking) {

//                         return res.status(404).json({
//                               status: false,
//                               message: `STO tracking status not updated but converted to DN`,
//                               data: {
//                                     dn: data.DELIVERY.trim(),
//                                     items: data.CREATED_ITEMS.map(item => ({
//                                           sto: item.REF_DOC.trim(),
//                                           stoItem: item.REF_ITEM.trim(),
//                                           dn: item.DELIV_NUMB.trim(),
//                                           dnItem: item.DELIV_ITEM.trim(),
//                                           material: item.MATERIAL.trim(),
//                                           deliveringQuantity: item.DLV_QTY,
//                                           salesQuantity: item.SALES_UNIT.trim(),
//                                           salesUnitISO: item.SALES_UNIT_ISO.trim()
//                                     })
//                                     )
//                               }
//                         })
//                   }
//                   else {
//                         STOTracking.status = "in dn"
//                         STOTracking.dn = data.DELIVERY.trim()
//                   }

//                   await STOTracking.save()

//                   res.status(200).json({
//                         status: true,
//                         message: `STO ${sto} converted to DN ${data.DELIVERY.trim()}`,
//                         data: {
//                               dn: data.DELIVERY.trim(),
//                               items: data.CREATED_ITEMS.map(item => ({
//                                     sto: item.REF_DOC.trim(),
//                                     stoItem: item.REF_ITEM.trim(),
//                                     dn: item.DELIV_NUMB.trim(),
//                                     dnItem: item.DELIV_ITEM.trim(),
//                                     material: item.MATERIAL.trim(),
//                                     deliveringQuantity: item.DLV_QTY,
//                                     salesQuantity: item.SALES_UNIT.trim(),
//                                     salesUnitISO: item.SALES_UNIT_ISO.trim()
//                               })
//                               )
//                         }
//                   })
//             }
//       }
//       catch (err) {
//             res.status(500).json({
//                   status: false,
//                   message: `${err.message === 'fetch failed' ? 'MIS Logged Off the PC where BAPI is Hosted' : err}`
//             })
//       }
// }

const dnDisplay = async (req, res) => {
      try {
            const { dn } = req.body

            const requestOptions = {
                  method: 'POST',
                  body: JSON.stringify({ dn })
            }

            const response = await fetch(`${process.env.SAP_QS}dn_display.php`, requestOptions)
            const data = await response.json()

            if (data?.RETURN[0]?.TYPE === 'E') {
                  res.status(404).json({
                        status: false,
                        message: 'Delivery Note not fetched',
                        data: data.RETURN.map(item => ({
                              message: item.MESSAGE.trim()
                        }))
                  })
            }

            else if (data?.RETURN[0]?.TYPE === 'I') {
                  res.status(404).json({
                        status: false,
                        message: 'Delivery Note not fetched',
                        data: data.RETURN.map(item => ({
                              message: item.MESSAGE.trim()
                        }))
                  })
            }

            else {
                  await res.status(200).json({
                        status: true,
                        data: {
                              dn: data.ET_DELIVERY_HEADER[0].VBELN.trim(),
                              createdBy: data.ET_DELIVERY_HEADER[0].ERNAM.trim(),
                              supplyingPlant: data.ET_DELIVERY_HEADER[0].VSTEL.trim(),
                              receivingPlant: data.ET_DELIVERY_HEADER[0].KUNNR.trim(),
                              items: data.ET_DELIVERY_ITEM.map(item => (
                                    {
                                          sto: item.VGBEL.trim(),
                                          dn: item.VBELN.trim(),
                                          dnItem: item.POSNR.trim(),
                                          createdBy: item.ERNAM.trim(),
                                          supplyingPlant: data.ET_DELIVERY_HEADER[0].VSTEL.trim(),
                                          receivingPlant: data.ET_DELIVERY_HEADER[0].KUNNR.trim(),
                                          material: item.MATNR.trim(),
                                          description: item.ARKTX.trim(),
                                          quantity: item.LFIMG,
                                          unit: item.MEINS.trim()
                                    }
                              ))
                        }
                  })
            }
      }
      catch (err) {
            res.status(500).json({
                  status: false,
                  message: `${err.message === 'fetch failed' ? 'MIS Logged Off the PC where BAPI is Hosted' : err}`
            })
      }
}


function fillMissingItems(data) {
      const { totalSKU, dnData } = data;
      
      // Create an array to store the final dnData with missing items filled
      const filledData = [];
      
      // Create a map to quickly check existing dnItems
      const existingItems = new Map(dnData.map(item => [item.dnItem, item]));
    
      // Iterate to check for missing dnItems in multiples of 10 (e.g., 000010, 000020)
      for (let i = 1; i <= totalSKU; i++) {
        // Create the dnItem in the format with multiples of 10
        const dnItem = (i * 10).toString().padStart(6, '0');
        
        // Check if this dnItem exists in the input dnData
        if (existingItems.has(dnItem)) {
          // If it exists, push the existing item to the filledData array
          filledData.push(existingItems.get(dnItem));
        } else {
          // If it doesn't exist, create a new item with quantity 0 and add it to the filledData array
          filledData.push({ dnItem, quantity: 0 });
        }
      }
    
      // Return the updated object with the filled data
      return { ...data, dnData: filledData };
}


const dnUpdate = async (req, res) => {
      // console.log(req.body);

      let unexpectedReturn = [];

      const newDnData = fillMissingItems(req.body) 

      try {
            const requestOptions = {
                  method: 'POST',
                  body: JSON.stringify(
                        {
                              dn: newDnData.dn,
                              DNData: newDnData.dnData
                        }
                  )
            }
            

            const response = await fetch(`${process.env.SAP_QS}create_dn_update.php`, requestOptions)
            const data = await response.json()
            const SAPError = await data.RETURN.filter(data => data.TYPE === "E")
            const test = await data.RETURN.filter(data => data.TYPE === "A")
            const SAPSuccess = await data.RETURN.filter(data => data.TYPE === "S")
            const SAPDNUpdatedFail = await data.RETURN.filter(data => data.NUMBER === "347")
            const SAPDNUpdatedSuccessful = await data.RETURN.filter(data => data.NUMBER === "311")


            // console.log(SAPError,Sa);
            unexpectedReturn = data

            
            if(SAPError.length > 0) {
                  res.status(400).json({
                        status: false,
                        message: 'DN Quantity not edited',
                        data: SAPError.map(item => ({
                              message: item.MESSAGE.trim()
                        })),
                        data
                  })
            }

            else if(SAPDNUpdatedFail.length > 0) {
                  res.status(400).json({
                        status: false,
                        message: 'DN Quantity already edited',
                        data: SAPDNUpdatedFail.map(item => ({
                              message: item.MESSAGE.trim()
                        })),
                        data
                  })
            }

            else if(SAPDNUpdatedSuccessful.length > 0) {


                  // let ChildPacking = await ChildPackingModel.findOne({ barcode: req.body.barcode })
                  let ChildPacking = await ChildPackingModel.updateMany({ dn: req.body.dn },{ $set: { status: 'dn reupdated' } } )
                  let STOTracking = await STOTrackingModel.findOne({ dn: req.body.dn })

                

                  STOTracking.status = "dn reupdated",
                  STOTracking.isReupdated = true,
                  STOTracking.reupdatedDate = new Date()
                  // ChildPacking.status = "dn reupdated"

                  // await ChildPacking.save()
                  await STOTracking.save()

                  res.status(201).json({
                        status: true,
                        message: `DN Edited`,
                        data: SAPDNUpdatedSuccessful.map(item => ({
                              message: item.MESSAGE.trim()
                        })),
                        data
                  })
            }
            
            else if(SAPSuccess.length > 0) {
                  res.status(400).json({
                        status: false,
                        message: `DN Quantity not edited`,
                        data: SAPSuccess.map(item => ({
                              message: item.MESSAGE.trim()
                        })),
                        data,
                  })
            }else{
                  res.status(400).json({
                        status: false,
                        // message: `DN Quantity not edited`,
                        message:data?.RETURN[0].MESSAGE,
                        data
                  })
            }
      }
      catch (err) {
            res.status(500).json({
                  status: false,
                  message: `${err.message === 'fetch failed' ? 'MIS Logged Off the PC where BAPI is Hosted' : "unexpected return:"}`,
                  unexpectedReturn,
            })
      }
}
// const dnUpdate = async (req, res) => {

//       console.log(req.body);
//       try {
//             let STOTracking = await STOTrackingModel2.findOne({ dn: req.body.dn })
//             let ChildPacking = await ChildPackingModel.findOne({ barcode: req.body.barcode })

          

//             STOTracking.status = "dn reupdated",
//             STOTracking.isReupdated = true,
//             STOTracking.reupdatedDate = new Date()
//             ChildPacking.status = "dn reupdated"

//             await ChildPacking.save()
//             await STOTracking.save()
            
//             res.status(201).json({
//                   status: true,
//                   message: `DN Edited`,
//                   // data: SAPDNUpdatedSuccessful.map(item => ({
//                   //       message: item.MESSAGE.trim()
//                   // }))
//             })
            
           
//       }
//       catch (err) {
//             console.log(err);
//             res.status(500).json({
//                   status: false,
//                   message: `${err.message === 'fetch failed' ? 'MIS Logged Off the PC where BAPI is Hosted' : err}`
//             })
//       }
// }

module.exports = {
      createDN,
      dnDisplay,
      dnUpdate
}