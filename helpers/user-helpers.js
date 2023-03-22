var db=require('../config/connection')
var collection=require('../config/collections')
var moment=require('moment')
const bcrypt=require('bcrypt')
const { ObjectId } = require('mongodb')
const { response } = require('express')
module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.password=await bcrypt.hash(userData.password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then(()=>{
            resolve(userData)
           })
        })
           
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
             let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
             if(user){
                   bcrypt.compare(userData.password,user.password).then((status)=>{
                           if(status){
                            console.log('login success')
                            response.user=user
                            response.status=true
                            resolve(response)
                           }
                           else{
                            console.log('login failed')
                            resolve({status:false})
                           } 
                   })
                   
             }
             else{
                console.log('login failed')
                resolve({status:false})
             }
        })
    },addToCart:(proId,userId)=>{
        let proObj={
            item:ObjectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                console.log(proExist);
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId),'products.item':ObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId)},
                {
                   $push:{products:proObj} 
                }
                ).then((response)=>{ 
                    resolve()
                })      
            }
            }else{
                 let cartObj={
                    user:ObjectId(userId),
                    products:[proObj]
                 }
                 db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                 })
            }
        })
    },getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
                
            ]).toArray()
        
            resolve(cartItems)
        })
    },getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },changeProductQuantity:(details)=>{
        
        let count=parseInt(details.count)
        let quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>{
            if(count==-1 && quantity<=1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:ObjectId(details.cart)},
            {
                $pull:{products:{item:ObjectId(details.product)}}
            }).then((response)=>{
                
                resolve({removeProduct:true})
            })
            }
            else{
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:ObjectId(details.cart),
                'products.item':ObjectId(details.product)},
                    {
                        $inc:{'products.$.quantity':count}
                    }).then((response)=>{
                        resolve({response})
                    })
                }
        })
    },
    removeProduct:(details)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:ObjectId(details.cart)},
            {
                $pull:{products:{item:ObjectId(details.product)}}
            }).then((response)=>{
                resolve({removeProduct:true})
            })
        })
    },getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let Total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        Total:{$sum:{$multiply:["$quantity",{$toDouble:"$product.price"}]}}
                    }
                }
                
            ]).toArray()
            
            resolve(Total[0].Total)
        })
    },
    placeOrder:(order,products,total)=>{
       return new Promise((resolve,reject)=>{
        let status=order['payment-method']==='COD'?'shipped':'pending'
        let nwdate=new Date()
        var date=moment(nwdate).format('MMM Do YY');
        var time=moment(nwdate).format('LT')
        let orderObj={
            delivery:{
                mobile:order.mobile,
                address:order.address,
                pincode:order.pincode
            },
            userId:ObjectId(order.userId),
            paymentMethod:order['payment-method'],
            products:products,
            TotalAmount:total,
            status:status,
            date:date,
            time:time
        }
        db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
            db.get().collection(collection.CART_COLLECTION).deleteOne({user:ObjectId(order.userId)})
            resolve()
        })
       })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            console.log(cart)
            resolve(cart.products)
        })
    },
    getOrderDetails:(userId)=>{
        return new Promise(async(resolve,reject)=>{
           let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:ObjectId(userId)}).toArray()
            resolve(orders)
        })
    },
    getOrderedProducts:(orderId)=>{
      return  new Promise(async(resolve,reject)=>{
        let products=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{_id:ObjectId(orderId)}
            },
            {
              $unwind:'$products'
            },
            {
                $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                      }
            },
            {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
            },
            {
               $project:{
                item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
               }
            }
           
        ]).toArray()
        console.log(products)
        resolve(products)
      })
    }

}