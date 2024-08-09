const upsertArticleTrackingPacking = async (req, res) => {
    try {
        const { sto, code, quantity, inboundPackedQuantity } = req.body
        
        const filter = {
              sto,
              code
        }

        // console.log({filter});

        let STOTracking = await STOTrackingModel.findOne({sto})

        // console.log({STOTracking});

        if(STOTracking.packingStartingTime === null){
              STOTracking.packingStartingTime = new Date()
        }
        

        if(quantity === inboundPackedQuantity){
              if(STOTracking.packedSku === null){
                    STOTracking.packedSku = 1 
                    STOTracking.status = "inbound packing"

              }else{
                    STOTracking.packedSku = STOTracking.packedSku + 1
              }      
        }

        // console.log({STOTracking});

        if(STOTracking.sku === STOTracking.packedSku){
              STOTracking.status = "inbound packed"
        }
        // console.log({"NewSTOTracking": STOTracking});

        let articleInTracking = await ArticleTrackingModel.findOne(filter)




        // console.log({articleInTracking});

        const isAlreadyArticleInTracking = Boolean(articleInTracking)

        // console.log({isAlreadyArticleInTracking});

        if (isAlreadyArticleInTracking) {

              if((articleInTracking.inboundPackedQuantity + inboundPackedQuantity) > quantity){
                    return res.status(409).json({
                          status: false,
                          message: `Inbound packed Quantity exceeds quantity`
                    })
              }

        

              if(inboundPackedQuantity > 0 && inboundPackedQuantity < articleInTracking.quantity){
                    articleInTracking.status = "inbound packing"
              }

              if(inboundPackedQuantity + articleInTracking.inboundPackedQuantity   === articleInTracking.quantity){
                    articleInTracking.status = "inbound packed"
                    articleInTracking.inboundPackingEndingTime = new Date()
              }

              articleInTracking.inboundPackedQuantity += inboundPackedQuantity ? inboundPackedQuantity : 0
              await articleInTracking.save()
              // articleInTracking.inboundPackedQuantity += inboundPackedQuantity ? inboundPackedQuantity : 0
              
              if(quantity === articleInTracking.inboundPackedQuantity){
                    if(STOTracking.packedSku === null){
                          STOTracking.packedSku = 1 
                          STOTracking.status = "inbound packing"
                          
                    }else{
                          STOTracking.packedSku = STOTracking.packedSku + 1
                    }      
              }

              // console.log({STOTracking});

              if(STOTracking.sku === STOTracking.packedSku){
                    STOTracking.status = "inbound packed"
                    STOTracking.packingEndingTime = new Date()
                    
              }
              
              await STOTracking.save()

              return res.status(200).send({
                    status: true,
                    message: `Material ${code} with quantity of ${inboundPackedQuantity} of ${sto} has been tracked`,
                    data: articleInTracking
              })

        }
        else {
              // console.log("create");

              let postObj = req.body
              

              if(inboundPackedQuantity > 0 && inboundPackedQuantity < quantity){
                    postObj.status = "inbound packing"
                    postObj.inboundPackingStartingTime = new Date()
                    postObj.dn = STOTracking.dn
              }
              
              // for full push
              if(inboundPackedQuantity === quantity){
                    postObj.status = "inbound packed"
                    postObj.inboundPackingEndingTime = new Date()
                    postObj.inboundPackingStartingTime = new Date()
                    postObj.dn = STOTracking.dn
              }


              // console.log("final data:", postObj)


              postObj = { ...postObj, inboundPackerId: STOTracking.packerId, inboundPacker: STOTracking.packer}

              const data = await ArticleTrackingModel.create(postObj)

              const wasNull = STOTracking.packedSku === null

              if(wasNull &&  STOTracking.packedSku <  STOTracking.sku ){
                    // STOTracking.packedSku =  1
                    STOTracking.status = "inbound packing"
              }
              
              if(quantity === data.inboundPackedQuantity){
                    if(STOTracking.packedSku === null){
                          STOTracking.packedSku = 1 
                          STOTracking.status = "inbound packing"  
                    }
                    
                    if( STOTracking.packedSku <  STOTracking.sku ){
                          STOTracking.packedSku = STOTracking.packedSku + 1
                    }
              }

              // console.log({STOTracking});

              if(STOTracking.sku === STOTracking.packedSku){
                    STOTracking.status = "inbound packed"
                    STOTracking.packingEndingTime = new Date()
              }

              
              
              await STOTracking.save()

              

              return res.status(201).send({
                    status: true,
                    message: `Material ${code} with quantity of ${inboundPackedQuantity} in ${sto} is ready for tracking`,
                    data
              })
        }
  }
  catch (err) {
         console.log(err);
        res.status(500).json({
              status: false,
              message: `${err}`
        });
  }
}